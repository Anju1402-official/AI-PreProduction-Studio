# Studio Build-Out — Coming Soon pages are now real features

This change turns the previously "Coming Soon" pages into working,
OpenAI-powered features, with results persisted to the database and surfaced
through the asset libraries. Nothing in the existing upload→pipeline→dashboard
flow was changed; this is purely additive.

## What's new

### Generators (OpenAI-powered, results saved to DB)
| Page | Route | Endpoint |
|------|-------|----------|
| Story Generator | `/story-generator` | `POST /studio/generate/story` |
| Script Generator | `/script-generator` | `POST /studio/generate/script` |
| Character Generator | `/characters` | `POST /studio/generate/character` |
| World Builder | `/world-builder` | `POST /studio/generate/world` |
| Storyboard Generator | `/storyboard` | `POST /studio/generate/storyboard` |

Each generation is saved as a `GeneratedArtifact` owned by the current user
and returned to the UI. Re-generating makes a fresh call (no caching for
generation).

### Asset Libraries (list / view / delete saved artifacts)
| Page | Route | Shows |
|------|-------|-------|
| Media Library | `/media-library` | everything you've generated |
| Character Library | `/character-library` | `character` artifacts |
| Location Library | `/location-library` | `world` artifacts |
| Storyboard Library | `/sound-library` | `storyboard` artifacts |
| Script Library | `/props` | `script` artifacts |

All backed by `GET /studio/library?kind=…`, `GET /studio/library/{id}`,
`DELETE /studio/library/{id}`.

### Templates
`/templates` browses system-seeded starting points (`GET /studio/templates`).
Seeded idempotently on first request — works with no OpenAI key. "Use this
template" routes to the matching generator.

### Script Correction & Shot List (read your uploaded scripts)
- `/script-correction` → `POST /studio/scripts/{id}/correct` runs an AI
  continuity/formatting/dialogue/grammar pass over the first 12 scenes.
- `/shot-list` → reads the existing pipeline's shot suggestions
  (`GET /analysis/{id}/shots`) for a picked script. No new endpoint.

## Backend files
- `app/models/generated_artifact.py` — one table for all generated content.
- `app/schemas/generation.py` — request + content + response schemas.
- `app/ai/generators.py` — OpenAI generators (reuse `openai_service`).
- `app/api/studio.py` — all `/studio/*` routes.
- `app/services/template_seed.py` — idempotent template seeding.
- `app/main.py` — registers the model + router (2-line change).
- `.env.example` — documents that generators reuse `OPENAI_API_KEY`.

## Frontend files
- `src/lib/api.ts` — `api.studio.*` methods + types.
- `src/components/studio/ArtifactContent.tsx` — renders any artifact kind.
- `src/components/studio/GeneratorShell.tsx` — shared generator form/result.
- `src/components/studio/LibraryShell.tsx` — shared library grid + drawer.
- `src/routes/*` — the 13 routes above rewritten from stubs to real pages.

## How to run

Backend:
```bash
cd backend
cp .env.example .env          # then edit .env
# set OPENAI_API_KEY=sk-...    (your key)
# set DATABASE_URL, SECRET_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload
```
The `generated_artifacts` table is created automatically at startup
(`Base.metadata.create_all`). No migration step needed for SQLite/dev; for an
existing Postgres deploy the table is created on next boot too.

Frontend:
```bash
cd frontend
bun install
# point VITE_API_URL at your backend (defaults to the Render URL in api.ts)
bun dev
```

## Notes / honest caveats
- I couldn't run the stack in my environment (no network to install deps, and
  I won't put a live OpenAI key in a sandbox). All Python is `py_compile`-clean
  and all TSX passes a `tsc` syntax check; the live run is yours to do.
- The model defaults to `gpt-5-nano` per your choice. If your account doesn't
  have that model, set `OPENAI_MODEL` in `.env` to one you do (e.g.
  `gpt-4o-mini`). The service uses the Responses API with strict JSON Schema.
- Generators have no offline fallback by design — with no key they return 503
  and the UI shows a clear message. Templates + libraries work without a key.
- "Storyboard" generation is text/shot-list based (shot type, angle, framing),
  not AI image generation. Say the word if you want real image generation
  (DALL·E / `gpt-image-1`) wired into the storyboard panels — that's a small
  additional endpoint.
