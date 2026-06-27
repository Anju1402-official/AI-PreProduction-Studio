"""
Background music recommendation engine.

Primary path: OpenAI (gpt-5-nano), given the scene's actual action-line
text plus its dominant emotion and time of day, asked for a mood label and
specific music/instrumentation cues.

Fallback path: a static lookup table keyed off dominant emotion (primary)
and time-of-day (secondary). Used automatically if OpenAI is unconfigured,
rate-limited, or unreachable, so two night scenes with different emotional
tones still get reasonable, if more generic, musical direction instead of
an identical "Dark Ambient" tag in every case.
"""
from __future__ import annotations

import logging

from app.services import openai_service

logger = logging.getLogger(__name__)

EMOTION_MUSIC_MAP: dict[str, dict] = {
    "fear": {"mood": "Suspenseful", "music": ["Dark Ambient", "Tension Strings", "Low Drone"]},
    "tension": {"mood": "Tense", "music": ["Rising Strings", "Percussive Pulse", "Minimal Synth"]},
    "anger": {"mood": "Aggressive", "music": ["Distorted Bass", "Heavy Percussion", "Industrial Drums"]},
    "sadness": {"mood": "Melancholic", "music": ["Solo Piano", "Slow Strings", "Cinematic Swell"]},
    "joy": {"mood": "Uplifting", "music": ["Acoustic Guitar", "Light Orchestra", "Warm Strings"]},
    "neutral": {"mood": "Understated", "music": ["Ambient Pad", "Soft Piano", "Subtle Texture"]},
}

TIME_OF_DAY_ACCENT: dict[str, str] = {
    "NIGHT": "Low Pulse Bed",
    "DAWN": "Soft Choir Swell",
    "DUSK": "Warm Pad Layer",
    "DAY": "Open Acoustic Layer",
}

_BGM_SCHEMA = {
    "type": "object",
    "properties": {
        "mood": {"type": "string", "description": "A one or two-word mood label for this scene's music, e.g. 'Suspenseful', 'Uplifting'"},
        "recommended_music": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2-4 specific music/instrumentation cues, e.g. 'Dark Ambient', 'Solo Piano', 'Rising Strings'",
        },
    },
    "required": ["mood", "recommended_music"],
    "additionalProperties": False,
}

_BGM_INSTRUCTIONS = (
    "You are a music supervisor choosing background music direction for one screenplay scene. "
    "Given the scene's action description, its dominant emotional tone, and time of day, give a "
    "short mood label (1-2 words, e.g. 'Suspenseful', 'Melancholic', 'Uplifting') and 2-4 specific "
    "music/instrumentation cues (e.g. 'Dark Ambient', 'Solo Piano', 'Rising Strings', 'Acoustic "
    "Guitar'). Be specific to the scene's actual content and tone, not generic."
)


def _build_scene_prompt_text(action_lines: str | None, dominant_emotion: str | None, time_of_day: str | None) -> str:
    return (
        f"Scene action: {(action_lines or 'No action description available.').strip()[:2000]}\n"
        f"Dominant emotion: {dominant_emotion or 'neutral'}\n"
        f"Time of day: {time_of_day or 'DAY'}"
    )


def _recommend_bgm_openai(
    action_lines: str | None, dominant_emotion: str | None, time_of_day: str | None
) -> tuple[str, list[str]] | None:
    """Try OpenAI first. Returns None (rather than raising) on any
    OpenAI-side failure, so the caller falls back to the lookup table."""
    try:
        result = openai_service.generate_structured(
            instructions=_BGM_INSTRUCTIONS,
            input_text=_build_scene_prompt_text(action_lines, dominant_emotion, time_of_day),
            schema_name="bgm_recommendations",
            schema=_BGM_SCHEMA,
            max_output_tokens=200,
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("OpenAI BGM recommendation failed, falling back to lookup table: %s", exc)
        return None

    mood = (result.data.get("mood") or "").strip()
    tracks = [t.strip() for t in result.data.get("recommended_music", []) if t and t.strip()]
    if not mood or not tracks:
        return None
    return mood, tracks[:4]


def recommend_bgm_for_scene_rule_based(dominant_emotion: str | None, time_of_day: str | None) -> tuple[str, list[str]]:
    """Lookup-table fallback."""
    emotion_key = (dominant_emotion or "neutral").lower()
    info = EMOTION_MUSIC_MAP.get(emotion_key, EMOTION_MUSIC_MAP["neutral"])

    tracks = list(info["music"])
    accent = TIME_OF_DAY_ACCENT.get((time_of_day or "DAY").upper())
    if accent and accent not in tracks:
        tracks.append(accent)

    return info["mood"], tracks[:4]


def build_bgm_recommendations(scenes: list[dict]) -> list[dict]:
    """
    `scenes` is a list of dicts with: scene_number, heading, time_of_day,
    action_lines, dominant_emotion. Returns recommendations in the shape
    the BGMRecommendation schema expects.

    Tries OpenAI per scene and falls back to the lookup table on any
    failure, per scene -- a transient OpenAI failure on one scene doesn't
    take down recommendations for the rest of the script.
    """
    use_openai = openai_service.is_configured()
    recommendations = []
    for scene in scenes:
        dominant_emotion = scene.get("dominant_emotion")
        time_of_day = scene.get("time_of_day")

        result = None
        if use_openai:
            result = _recommend_bgm_openai(scene.get("action_lines"), dominant_emotion, time_of_day)

        if result is None:
            result = recommend_bgm_for_scene_rule_based(dominant_emotion, time_of_day)
        mood, tracks = result

        recommendations.append(
            {
                "scene_number": scene["scene_number"],
                "scene_heading": scene.get("heading") or "",
                "mood": mood,
                "recommended_music": tracks,
            }
        )
    return recommendations
