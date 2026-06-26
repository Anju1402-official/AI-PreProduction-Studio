"""
Shot suggestion engine.

The previous implementation keyed suggestions purely off time-of-day
(DAY/NIGHT/DAWN/DUSK) via a static lookup table, which meant two
emotionally opposite scenes set at night got identical advice. This version
keys primarily off the scene's *actual* dominant emotion (from
app/ai/emotion.py) and secondarily off time-of-day and character count, so
suggestions reflect what's really happening in the scene.

This is intentionally rule-based rather than a trained model: shot
grammar (what shot serves what emotional beat) is well-established
cinematographic convention, not something that benefits from being
learned from scratch on a single screenplay with no labeled training data.
"""
from __future__ import annotations

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


def suggest_shots_for_scene(
    dominant_emotion: str | None,
    time_of_day: str | None,
    character_count: int,
) -> tuple[str, list[str]]:
    """
    Returns (display_emotion_label, list_of_suggested_shots) for one scene.
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
    dominant_emotion, character_count. Returns suggestions in the shape the
    ShotSuggestion schema expects.
    """
    suggestions = []
    for scene in scenes:
        emotion_label, shots = suggest_shots_for_scene(
            scene.get("dominant_emotion"),
            scene.get("time_of_day"),
            scene.get("character_count", 0),
        )
        suggestions.append(
            {
                "scene_number": scene["scene_number"],
                "scene_heading": scene.get("heading") or "",
                "emotion": emotion_label,
                "suggested_shots": shots,
            }
        )
    return suggestions
