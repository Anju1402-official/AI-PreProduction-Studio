"""
One-time downloader for the emotion-classification model used by
`backend/app/ai/emotion.py`.

Run this once before starting the backend for the first time:

    python ml_models/emotion_model/download.py

It caches the model + tokenizer into ./cache so subsequent boots don't need
to hit the network (unless the cache directory doesn't persist between
deploys, in which case the model is fetched lazily on first request instead).
"""
import os
from pathlib import Path

MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"

CACHE_DIR = Path(__file__).parent / "cache"


def main() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("HF_HOME", str(CACHE_DIR))

    from transformers import AutoTokenizer, AutoModelForSequenceClassification

    print(f"Downloading '{MODEL_NAME}' into {CACHE_DIR} ...")
    AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir=CACHE_DIR)
    AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, cache_dir=CACHE_DIR)
    print("Done. Model is cached locally.")


if __name__ == "__main__":
    main()
