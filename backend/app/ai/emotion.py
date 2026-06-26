"""
Scene-level emotion classification.

Uses `j-hartmann/emotion-english-distilroberta-base`, a DistilRoBERTa model
fine-tuned on the Ekman six-emotion taxonomy (anger, disgust, fear, joy,
sadness, surprise + neutral). We map its output onto the four labels the
rest of the app already understands (joy, fear, sadness, anger) and derive
a fifth, "tension", since pre-production teams care a lot about tension but
it isn't one of the model's native classes.

The model is loaded once per process (module-level singleton) and reused for
every scene in every script — loading it per-request would be far too slow
and would repeatedly pay the ~1-2s model-load cost.
"""
from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)

_pipeline = None
_pipeline_lock = threading.Lock()

# Ekman labels the model actually outputs.
_MODEL_LABELS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]


@dataclass
class EmotionScores:
    joy: float
    fear: float
    sadness: float
    anger: float
    tension: float
    dominant_emotion: str
    model_name: str


def _get_pipeline():
    """Lazily load and cache the HF text-classification pipeline."""
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    with _pipeline_lock:
        if _pipeline is not None:  # re-check after acquiring the lock
            return _pipeline

        os.environ.setdefault("HF_HOME", settings.EMOTION_MODEL_CACHE_DIR)

        try:
            from transformers import pipeline
        except ImportError as exc:  # pragma: no cover - import guard
            raise RuntimeError(
                "transformers is not installed. Run `pip install -r requirements.txt` "
                "in backend/ before starting the server."
            ) from exc

        logger.info("Loading emotion model '%s' (first call only)...", settings.EMOTION_MODEL_NAME)
        _pipeline = pipeline(
            "text-classification",
            model=settings.EMOTION_MODEL_NAME,
            top_k=None,  # return scores for every label, not just the top one
        )
        logger.info("Emotion model loaded.")
        return _pipeline


def _scores_from_labels(label_scores: dict[str, float]) -> EmotionScores:
    """
    Map the model's 7-way Ekman scores onto our 5 labels.

    `disgust`, `surprise`, and `neutral` don't have a direct home in our
    schema. We fold a portion of `disgust` into `anger` (they co-occur in a
    lot of confrontational screenplay dialogue) and treat `surprise` as a
    contributor to `tension` (a sudden surprising beat reads as tense),
    rather than just discarding that signal.

    `tension` is computed as a weighted blend rather than a raw label,
    since "is this scene tense" in screenwriting terms is really about
    unresolved threat/conflict, which correlates with fear + anger +
    surprise rather than any single Ekman class.
    """
    joy = label_scores.get("joy", 0.0)
    fear = label_scores.get("fear", 0.0)
    sadness = label_scores.get("sadness", 0.0)
    anger = label_scores.get("anger", 0.0) + 0.4 * label_scores.get("disgust", 0.0)
    surprise = label_scores.get("surprise", 0.0)

    tension = (0.5 * fear) + (0.3 * anger) + (0.2 * surprise)

    as_pct = {
        "joy": round(joy * 100, 2),
        "fear": round(fear * 100, 2),
        "sadness": round(sadness * 100, 2),
        "anger": round(min(anger, 1.0) * 100, 2),
        "tension": round(min(tension, 1.0) * 100, 2),
    }
    dominant = max(as_pct, key=as_pct.get)

    return EmotionScores(
        joy=as_pct["joy"],
        fear=as_pct["fear"],
        sadness=as_pct["sadness"],
        anger=as_pct["anger"],
        tension=as_pct["tension"],
        dominant_emotion=dominant,
        model_name=settings.EMOTION_MODEL_NAME,
    )


def analyze_scene_emotion(text: str) -> EmotionScores:
    """
    Run emotion classification on one scene's text (action lines + dialogue
    concatenated). Falls back to a neutral, zeroed score for empty/very
    short scenes rather than calling the model on nothing meaningful.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return EmotionScores(0.0, 0.0, 0.0, 0.0, 0.0, "neutral", settings.EMOTION_MODEL_NAME)

    clf = _get_pipeline()

    # The model has a 512-token limit; truncate very long scenes rather than
    # erroring. Truncation happens at the tokenizer level via the pipeline's
    # own `truncation=True` default for this task, but we also cap the raw
    # character count up front so we don't pass pathologically long strings.
    truncated = cleaned[:4000]

    raw = clf(truncated, truncation=True)
    # `top_k=None` returns either a flat list of {label, score} dicts, or a
    # nested [[...]] list depending on transformers version — normalize both.
    if raw and isinstance(raw[0], list):
        raw = raw[0]

    label_scores = {item["label"].lower(): item["score"] for item in raw}
    return _scores_from_labels(label_scores)


def analyze_script_emotions(scene_texts: list[tuple[int, str]]) -> list[dict]:
    """
    Convenience batch wrapper used by the pipeline service.

    `scene_texts` is a list of (scene_number, text) tuples. Returns a list of
    dicts ready to attach to SceneEmotion rows / the EmotionAnalysisResponse
    schema.
    """
    results = []
    for scene_number, text in scene_texts:
        scores = analyze_scene_emotion(text)
        results.append(
            {
                "scene_number": scene_number,
                "joy": scores.joy,
                "fear": scores.fear,
                "sadness": scores.sadness,
                "anger": scores.anger,
                "tension": scores.tension,
                "dominant_emotion": scores.dominant_emotion,
                "model_name": scores.model_name,
            }
        )
    return results
