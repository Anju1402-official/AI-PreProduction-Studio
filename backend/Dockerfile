# AI Pre-Production Studio backend.
#
# Builds an image with the CPU-only torch wheel (much smaller than the
# default CUDA build pulled from PyPI) plus both pretrained models baked in
# at build time, so the container never needs network access at runtime to
# fetch model weights.
#
# Needs a host with at least 2 GB RAM to run comfortably (see
# ml_models/README.md for why). Render's free tier (512 MB) will not work --
# use at least a Standard instance, or an equivalent VM elsewhere.

FROM python:3.11-slim

WORKDIR /app

# System deps needed by some transformers/spaCy wheels at build time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt

# Install CPU-only torch explicitly first (its own index has a much smaller
# wheel with no bundled CUDA libraries), then the rest of requirements.txt.
RUN pip install --no-cache-dir torch==2.12.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download both models into the image so first request doesn't pay the
# download cost (only the load-into-RAM cost, handled by main.py's startup
# event).
COPY ml_models ./ml_models
RUN python ./ml_models/emotion_model/download.py \
    && python -m spacy download en_core_web_trf

COPY backend/app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
