"""
Scene-level emotion classification.

Primary path: OpenAI (gpt-5-nano via app/services/openai_service.py), asked
to score the scene directly against the same 5 labels the rest of the app
already understands (joy, fear, sadness, anger, tension) -- no taxonomy
remapping needed, since we control the prompt's output schema directly.

Fallback path: `j-hartmann/emotion-english-distilroberta-base`, a local
DistilRoBERTa model fine-tuned on the Ekman six-emotion taxonomy. Used
automatically if OpenAI is unconfigured, rate-limited, or unreachable, so a
missing/invalid API key or a transient outage degrades gracefully instead
of failing the whole analysis pipeline. Ekman's labels don't include
"tension", so the fallback path derives it from a weighted blend (see
`_scores_from_labels`) -- this remapping is fallback-only; the OpenAI path
scores tension directly.

The local model is loaded once per process (module-level singleton) and
reused for every scene in every script that falls back to it -- loading it
per-request would be far too slow and would repeatedly pay the ~1-2s
model-load cost.
"""
from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass

from app.core.config import settings
from app.services import openai_service

logger = logging.getLogger(__name__)

_pipeline = None
_pipeline_lock = threading.Lock()

# Ekman labels the local fallback model actually outputs.
_MODEL_LABELS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]

_EMOTION_SCHEMA = {
    "type": "object",
    "properties": {
        "joy": {"type": "number", "description": "0-100 score for joy/happiness in this scene"},
        "fear": {"type": "number", "description": "0-100 score for fear/dread in this scene"},
        "sadness": {"type": "number", "description": "0-100 score for sadness/grief in this scene"},
        "anger": {"type": "number", "description": "0-100 score for anger/hostility in this scene"},
        "tension": {"type": "number", "description": "0-100 score for suspense/unresolved conflict in this scene"},
        "dominant_emotion": {
            "type": "string",
            "enum": ["joy", "fear", "sadness", "anger", "tension"],
            "description": "Whichever of the five scores above is highest",
        },
    },
    "required": ["joy", "fear", "sadness", "anger", "tension", "dominant_emotion"],
    "additionalProperties": False,
}

_EMOTION_INSTRUCTIONS = (
    "You are a script supervisor scoring the emotional tone of a single screenplay scene. "
    "Read the scene text (action lines and dialogue) and score joy, fear, sadness, anger, and "
    "tension, each as a 0-100 percentage. Scores do not need to sum to 100 -- a scene can be "
    "low on every emotion (flat/neutral) or high on several at once (e.g. a tense, angry "
    "confrontation). Base scores only on what's in the text; do not invent plot details. "
    "Set dominant_emotion to whichever of the five scores you gave is highest."
)


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
    """Lazily load and cache the local HF text-classification pipeline
    (fallback path only)."""
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

        logger.info("Loading local fallback emotion model '%s' (first call only)...", settings.EMOTION_MODEL_NAME)
        _pipeline = pipeline(
            "text-classification",
            model=settings.EMOTION_MODEL_NAME,
            top_k=None,  # return scores for every label, not just the top one
        )
        logger.info("Local fallback emotion model loaded.")
        return _pipeline


def _scores_from_labels(label_scores: dict[str, float]) -> EmotionScores:
    """
    Map the local fallback model's 7-way Ekman scores onto our 5 labels.

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


def _analyze_scene_emotion_openai(text: str) -> EmotionScores | None:
    """Try OpenAI first. Returns None (rather than raising) on any
    OpenAI-side failure, so the caller can fall back to the local model
    without needing its own try/except around every call site."""
    try:
        result = openai_service.generate_structured(
            instructions=_EMOTION_INSTRUCTIONS,
            input_text=text[:4000],
            schema_name="emotion_analysis",
            schema=_EMOTION_SCHEMA,
            max_output_tokens=200,
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("OpenAI emotion analysis failed, falling back to local model: %s", exc)
        return None

    data = result.data
    return EmotionScores(
        joy=float(data["joy"]),
        fear=float(data["fear"]),
        sadness=float(data["sadness"]),
        anger=float(data["anger"]),
        tension=float(data["tension"]),
        dominant_emotion=data["dominant_emotion"],
        model_name=settings.OPENAI_MODEL,
    )


def _analyze_scene_emotion_local(text: str) -> EmotionScores:
    clf = _get_pipeline()

    # The local model has a 512-token limit; truncate very long scenes
    # rather than erroring. Truncation also happens at the tokenizer level
    # via the pipeline's own `truncation=True`, but we cap the raw
    # character count up front too so we never pass pathologically long
    # strings into it.
    truncated = text[:4000]

    raw = clf(truncated, truncation=True)
    # `top_k=None` returns either a flat list of {label, score} dicts, or a
    # nested [[...]] list depending on transformers version -- normalize both.
    if raw and isinstance(raw[0], list):
        raw = raw[0]

    label_scores = {item["label"].lower(): item["score"] for item in raw}
    return _scores_from_labels(label_scores)


def analyze_scene_emotion(text: str) -> EmotionScores:
    """
    Run emotion classification on one scene's text (action lines + dialogue
    concatenated). Falls back to a neutral, zeroed score for empty/very
    short scenes rather than calling any model on nothing meaningful.

    Tries OpenAI first (if USE_OPENAI_FOR_EMOTION is enabled and an API key
    is configured), then falls back to the local transformer model on any
    OpenAI-side failure.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return EmotionScores(0.0, 0.0, 0.0, 0.0, 0.0, "neutral", settings.EMOTION_MODEL_NAME)

    if settings.USE_OPENAI_FOR_EMOTION and openai_service.is_configured():
        result = _analyze_scene_emotion_openai(cleaned)
        if result is not None:
            return result

    return _analyze_scene_emotion_local(cleaned)


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
