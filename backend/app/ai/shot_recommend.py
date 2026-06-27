"""
Shot suggestion engine.

Primary path: OpenAI (gpt-5-nano), given the scene's actual action-line
text plus its dominant emotion/time-of-day/character count, and asked for
concrete camera coverage ideas. This generally produces more specific,
scene-aware suggestions than a fixed lookup table can (e.g. picking up on
a specific prop or blocking detail mentioned in the action text).

Fallback path: a rule-based engine keyed off dominant emotion (primary),
time-of-day and character count (secondary) via static lookup tables. Used
automatically if OpenAI is unconfigured, rate-limited, or unreachable.
Shot grammar (what shot serves what emotional beat) is well-established
cinematographic convention, so the fallback's quality floor is reasonable
even without an LLM in the loop.
"""
from __future__ import annotations

import logging

from app.services import openai_service

logger = logging.getLogger(__name__)

# Each entry: shots to suggest when this emotion dominates, keyed by
# normalized emotion label (matches the labels emotion.py produces).
EMOTION_SHOT_MAP: dict[str, list[str]] = {
    "fear": ["Low Angle Shot", "Dutch Tilt", "Extreme Close-up", "Shadow Play Shot"],
    "tension": ["Close-up Shot", "Slow Push-In", "Over-the-Shoulder Shot", "Handheld Shot"],
    "anger": ["Tight Close-up", "Whip Pan", "Low Angle Shot", "Hard Side Lighting"],
    "sadness": ["Slow Zoom Out", "Static Wide Shot", "Reflection Shot", "Soft Focus Close-up"],
    "joy": ["Wide Establishing Shot", "Tracking Shot", "Warm Two-Shot", "High Angle Shot"],
    "neutral": ["Medium Shot", "Wide Establishing Shot", "Over-the-Shoulder Shot"],
}

TIME_OF_DAY_FLAVOR: dict[str, list[str]] = {
    "NIGHT": ["Silhouette Shot", "Practical-Light Close-up"],
    "DAWN": ["Golden Hour Wide Shot", "Backlit Silhouette"],
    "DUSK": ["Sunset Wide Shot", "Rim-Lit Profile Shot"],
    "DAY": ["Natural Light Wide Shot"],
}

EMOTION_LABEL_DISPLAY = {
    "fear": "Fear",
    "tension": "Tension",
    "anger": "Anger",
    "sadness": "Sadness",
    "joy": "Joy",
    "neutral": "Neutral",
}

_SHOT_SCHEMA = {
    "type": "object",
    "properties": {
        "suggested_shots": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2-4 specific camera shot/angle names for this scene, e.g. 'Low Angle Shot', 'Over-the-Shoulder Shot'",
        }
    },
    "required": ["suggested_shots"],
    "additionalProperties": False,
}

_SHOT_INSTRUCTIONS = (
    "You are a director of photography planning camera coverage for one screenplay scene. "
    "Given the scene's action description, its dominant emotional tone, time of day, and "
    "number of characters present, suggest 2-4 specific, concrete shot types (e.g. "
    "'Low Angle Shot', 'Extreme Close-up', 'Wide Establishing Shot', 'Dutch Tilt') that would "
    "serve this scene's tone and content well. Use standard cinematography terminology. "
    "Be specific to what's actually happening in the scene where possible, not generic."
)


def _build_scene_prompt_text(action_lines: str | None, dominant_emotion: str | None, time_of_day: str | None, character_count: int) -> str:
    return (
        f"Scene action: {(action_lines or 'No action description available.').strip()[:2000]}\n"
        f"Dominant emotion: {dominant_emotion or 'neutral'}\n"
        f"Time of day: {time_of_day or 'DAY'}\n"
        f"Characters present: {character_count}"
    )


def _suggest_shots_openai(
    action_lines: str | None, dominant_emotion: str | None, time_of_day: str | None, character_count: int
) -> list[str] | None:
    """Try OpenAI first. Returns None (rather than raising) on any
    OpenAI-side failure, so the caller falls back to the rule-based engine."""
    try:
        result = openai_service.generate_structured(
            instructions=_SHOT_INSTRUCTIONS,
            input_text=_build_scene_prompt_text(action_lines, dominant_emotion, time_of_day, character_count),
            schema_name="shot_suggestions",
            schema=_SHOT_SCHEMA,
            max_output_tokens=200,
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("OpenAI shot suggestion failed, falling back to rule-based engine: %s", exc)
        return None

    shots = [s.strip() for s in result.data.get("suggested_shots", []) if s and s.strip()]
    return shots[:4] if shots else None


def suggest_shots_for_scene_rule_based(
    dominant_emotion: str | None,
    time_of_day: str | None,
    character_count: int,
) -> tuple[str, list[str]]:
    """
    Rule-based fallback. Returns (display_emotion_label, list_of_suggested_shots)
    for one scene.
    """
    emotion_key = (dominant_emotion or "neutral").lower()
    base_shots = list(EMOTION_SHOT_MAP.get(emotion_key, EMOTION_SHOT_MAP["neutral"]))

    flavor = TIME_OF_DAY_FLAVOR.get((time_of_day or "DAY").upper(), [])
    if flavor:
        base_shots.append(flavor[0])

    if character_count >= 3:
        base_shots.append("Group Wide Shot")
    elif character_count == 2:
        base_shots.append("Two-Shot")
    elif character_count == 1:
        base_shots.append("Single Close-up")

    # De-dupe while preserving order, cap at 4 so the UI stays scannable.
    seen: dict[str, None] = {}
    for shot in base_shots:
        if shot not in seen:
            seen[shot] = None
    deduped = list(seen.keys())[:4]

    display_label = EMOTION_LABEL_DISPLAY.get(emotion_key, "Neutral")
    return display_label, deduped


def build_shot_suggestions(scenes: list[dict]) -> list[dict]:
    """
    `scenes` is a list of dicts with: scene_number, heading, time_of_day,
    action_lines, dominant_emotion, character_count. Returns suggestions in
    the shape the ShotSuggestion schema expects.

    Tries OpenAI per scene (if USE_OPENAI_FOR_EMOTION... actually this uses
    its own check, see below) and falls back to the rule-based engine on
    any failure, per scene -- a transient OpenAI failure on one scene
    doesn't take down suggestions for the rest of the script.
    """
    use_openai = openai_service.is_configured()
    suggestions = []
    for scene in scenes:
        dominant_emotion = scene.get("dominant_emotion")
        time_of_day = scene.get("time_of_day")
        character_count = scene.get("character_count", 0)
        display_label = EMOTION_LABEL_DISPLAY.get((dominant_emotion or "neutral").lower(), "Neutral")

        shots = None
        if use_openai:
            shots = _suggest_shots_openai(scene.get("action_lines"), dominant_emotion, time_of_day, character_count)

        if shots is None:
            display_label, shots = suggest_shots_for_scene_rule_based(dominant_emotion, time_of_day, character_count)

        suggestions.append(
            {
                "scene_number": scene["scene_number"],
                "scene_heading": scene.get("heading") or "",
                "emotion": display_label,
                "suggested_shots": shots,
            }
        )
    return suggestions
