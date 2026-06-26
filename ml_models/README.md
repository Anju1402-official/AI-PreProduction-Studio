# ML Models

This directory holds **cached model weights** for the two pretrained models the
backend loads at startup. Weights are *not* committed to version control (they're
hundreds of MB each) — instead, each subfolder has a `download.py` script that
pulls the model from HuggingFace / spaCy's model hub into a local cache the
first time you set up the project, or automatically during the Docker/Render
build step.

## Why pretrained, not training from scratch

Both `emotion.py` and the character/entity recognizer in `script_review.py`
need to work well on a *single* screenplay upload with no training data of
its own — there's nothing to train on per-user. So both use strong, general
pretrained models instead:

| Model | Used for | Size (on disk) | RAM at inference |
|---|---|---|---|
| `j-hartmann/emotion-english-distilroberta-base` | Scene-level emotion scoring (joy / fear / sadness / anger / + tension derived from a custom blend) | ~330 MB | ~600 MB–1 GB |
| `en_core_web_trf` (spaCy transformer pipeline) | Named-entity recognition for character/location detection beyond the regex heading parser | ~500 MB | ~800 MB–1.5 GB |

**Resource note:** loading both models simultaneously needs roughly
**1.5–2.5 GB of RAM**, plus normal FastAPI/Postgres overhead. This will not
run on Render's free web service tier (512 MB). Deploy on at least a
**Standard** Render instance (2 GB RAM) or equivalent (a small EC2/Fly.io/
Railway box with 2 GB+ RAM). See `backend/README.md` for deployment notes.

## One-time setup

```bash
# from the backend/ directory, with your virtualenv active
pip install -r requirements.txt

python ../ml_models/emotion_model/download.py
python ../ml_models/ner_model/download.py
```

This downloads the models into:

```
ml_models/emotion_model/cache/   (HuggingFace cache — transformers + tokenizer files)
ml_models/ner_model/cache/       (spaCy pipeline package)
```

Both `app/ai/emotion.py` and `app/ai/script_review.py` point `HF_HOME` /
spaCy's loader at these local cache folders so the model only needs to be
downloaded once, even across container restarts if the directory is on a
persistent volume. If the cache folder is empty (first boot, ephemeral
filesystem, etc.) the model is downloaded on first use and the request that
triggers it will simply take longer.

## Running fully offline / air-gapped

If you need to build a Docker image with no internet access at runtime, run
the two `download.py` scripts during the image *build* step (see the `Dockerfile`
in `backend/`) so the weights are baked into the image layer instead of
fetched lazily on first request.
