# AI Pre-Production Studio

Upload a screenplay once. The backend automatically runs character
tracking, emotion analysis, shot suggestions, BGM recommendations,
storyboard generation, scene-importance ranking, and cost estimation — no
separate "run this analysis" steps. The frontend shows it all in one
per-script dashboard with four tabs: **Overview, Analysis, Recommendations,
Storyboard**.

```
ai-preproduction-studio/
├── frontend/              React 19 + TanStack Start app
│   └── src/
│       ├── routes/        file-based routes (TanStack Router)
│       ├── pages/         page-level building blocks used by routes
│       ├── components/    shared UI (incl. components/dashboard/ shell)
│       ├── dashboard/      the unified per-script dashboard feature
│       │                  (tabs, pipeline polling, progress UI)
│       └── lib/           api client, auth context
├── backend/
│   └── app/
│       ├── api/           FastAPI route handlers
│       ├── services/      parsing + pipeline orchestration
│       ├── models/        SQLAlchemy models
│       ├── ai/
│       │   ├── emotion.py         HuggingFace transformer emotion classifier
│       │   ├── ner.py             spaCy transformer NER (character tracking)
│       │   ├── script_review.py   scene importance + cost estimation
│       │   ├── shot_recommend.py  emotion-informed shot suggestions
│       │   ├── bgm.py             emotion-informed music recommendations
│       │   └── storyboard.py      descriptive storyboard panel generation
│       └── main.py
├── database/
│   └── schema.sql          Postgres schema, generated from the SQLAlchemy
│                            models (not hand-written — see note below)
└── ml_models/
    ├── emotion_model/       download.py + cache/ for the HF model
    └── ner_model/           download.py for the spaCy pipeline
```

## How upload → unified dashboard works

1. `POST /scripts/upload` (multipart: title, description, user_id, file) —
   parses the screenplay into scenes/characters/dialogue immediately, then
   either runs the full AI pipeline synchronously or kicks it off as a
   background task (`RUN_PIPELINE_SYNC` env var), depending on your
   tolerance for upload-request latency vs. polling.
2. The pipeline (`backend/app/services/pipeline_service.py`) runs, in
   order: character tracking → emotion analysis → dialogue density → shot
   suggestions → BGM recommendations → storyboard → scene importance + cost
   estimation. Each stage writes structured rows plus a cached
   `AnalysisResult` JSON blob.
3. The frontend navigates straight to `/scripts/{id}` after upload, which
   polls `GET /scripts/{id}/dashboard` every 2s while `status` is
   `"processing"`, showing live `pipeline_stage` progress, and renders the
   four tabs once `status` is `"completed"`.

The original five analysis endpoints (`/analysis/{id}/emotion`,
`/dialogue`, `/shots`, `/bgm`, `/scene-importance`, `/cost-estimation`) are
preserved for any existing integrations, plus two new ones
(`/characters`, `/storyboard`) — but nothing in the frontend calls them
individually anymore; everything goes through the one dashboard endpoint.

## Why schema.sql isn't hand-written

`database/schema.sql` is generated directly from the SQLAlchemy models
using SQLAlchemy's own DDL compiler (`CreateTable`/`CreateIndex` against the
Postgres dialect), not typed out by hand. That guarantees it's an accurate
reflection of what `Base.metadata.create_all()` actually produces. The
backend still creates/migrates its own schema on startup — treat
`schema.sql` as a readable reference, or a starting point if you'd rather
manage schema changes with a dedicated migration tool instead of
`create_all`.

To regenerate it after changing a model, run (from `backend/`, with deps
installed):

```python
from sqlalchemy.schema import CreateTable, CreateIndex
from sqlalchemy.dialects import postgresql
from app.database import Base
from app.models import *  # noqa -- import every model module first
# ... iterate Base.metadata.sorted_tables and print CreateTable/CreateIndex DDL
```

## Resource requirements (read this before deploying)

The two local fallback AI models loaded by `app/ai/emotion.py` and
`app/ai/ner.py` need roughly **1.5–2.5 GB of RAM** together. This will not
run on Render's free tier (512 MB) or similar free-tier hosts — see
`ml_models/README.md` for the breakdown and `backend/render.yaml` (set to
Render's Standard plan) for a working configuration. A Dockerfile is
included at `backend/Dockerfile` that installs the CPU-only torch build
and bakes both models into the image at build time, so the deployed
container needs no network access to fetch weights at runtime — only
enough RAM to load them.

If `OPENAI_API_KEY` is set (see below), most analysis happens via OpenAI
instead and the local models are only loaded/used as a fallback — so a
deployment with a configured OpenAI key has much lighter RAM requirements
in practice, though the local models still need to be installed/downloaded
so the fallback path works when OpenAI is unavailable.

## OpenAI integration

Emotion analysis, character tracking, shot suggestions, BGM
recommendations, scene importance, cost estimation, and storyboard
generation are all backed by OpenAI (model: `gpt-5-nano` by default) via
`app/services/openai_service.py`, using the Responses API with strict JSON
Schema structured output (`text.format.type = "json_schema"`) so every
response matches the existing backend schemas exactly — no API endpoints
or response contracts changed.

**Setup:**

1. Get an API key at https://platform.openai.com/api-keys
2. Add it to `backend/.env`:
   ```
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-5-nano
   ```
3. That's it — no other config required. Restart the backend and new
   script uploads will use OpenAI automatically.

**If you don't set a key:** the app does not fail to start, and uploads
don't fail either. Every OpenAI-backed analysis stage automatically falls
back to its pre-existing local model or deterministic heuristic:

| Feature | Primary (OpenAI) | Fallback (no key / OpenAI failure) |
|---|---|---|
| Emotion analysis | gpt-5-nano | Local DistilRoBERTa transformer |
| Character tracking | gpt-5-nano | Local spaCy NER (`en_core_web_trf`) |
| Shot suggestions | gpt-5-nano | Rule-based lookup table |
| BGM recommendations | gpt-5-nano | Rule-based lookup table |
| Scene importance | gpt-5-nano (batched, whole script) | Deterministic weighted scorer |
| Cost estimation | gpt-5-nano (batched, whole script) | Deterministic heuristic |
| Storyboard panels | gpt-5-nano | Template grammar + regex extraction |
| Dialogue density | N/A — pure aggregation, no AI involved either way | |

Each `app/ai/*.py` module tries OpenAI first (per-call, with retries on
transient failures), and falls back automatically and silently to the
right-hand column on any unrecoverable failure — a bad/missing API key,
rate limiting, a timeout, or a network error never breaks script upload or
produces a 500; it just means that script's results came from the local
fallback instead. Failures are logged (`logger.warning(...)`) so you can
tell which path actually ran.

**Performance choices worth knowing about:**
- The OpenAI client is constructed once per process (singleton in
  `openai_service.py`), not per request.
- Responses are cached in-memory for 6 hours, keyed by a hash of the exact
  prompt — re-viewing a script's dashboard before anything about it has
  changed won't trigger new API calls.
- Scene importance and cost estimation send **one batched request for the
  whole script** rather than one call per scene, since importance scoring
  is inherently relative across scenes anyway — this is both more correct
  and far cheaper in tokens than per-scene calls. Scripts over ~60 scenes
  skip the batched call and use the local heuristic directly, to keep
  prompt size bounded.
- Reasoning effort is set to `"minimal"` (a `gpt-5`-family-specific
  parameter) and verbosity to `"low"` on every call, since these are short,
  well-defined extraction/classification tasks that don't benefit from
  deep reasoning — only latency and cost.
- Two new service-layer-only modules, `app/ai/story_analysis.py` and
  `app/ai/script_correction.py`, implement "Story Analysis" and "Script
  Corrections" but are **not wired to any API route**, since neither
  feature has an existing endpoint and this integration was scoped to not
  add or change API endpoints. They're ready to call from a future route.

## Local setup

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install torch==2.12.1 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
python ../ml_models/emotion_model/download.py
python -m spacy download en_core_web_trf
cp .env.example .env   # fill in DATABASE_URL, SECRET_KEY, OPENAI_API_KEY, etc.
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL to your backend
npm run dev
```

## What changed from the previous version of this backend

The previous `analysis_service.py` used `random.uniform()` / `random.randint()`
to generate emotion scores, scene importance, and cost-estimation risk —
meaning the same script would get different "analysis" results on every
request. That's gone. Every score now comes from OpenAI (when configured)
or, as a fallback, either a real pretrained model (emotion, character NER)
or a deterministic heuristic grounded in the script's actual structure
(scene importance, cost estimation, shot/BGM suggestions) — see the
docstring at the top of each `app/ai/*.py` file for exactly what each one
does and why, and see "OpenAI integration" above for the OpenAI-specific
behavior and fallback chain.
#   A I - P r e P r o d u c t i o n - S t u d i o  
 