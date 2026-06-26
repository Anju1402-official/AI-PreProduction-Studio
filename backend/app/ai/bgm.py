"""
Background music recommendation engine.

Like shot_recommend.py, this keys primarily off the scene's real dominant
emotion rather than just time-of-day, so two night scenes with different
emotional tones (e.g. a tense night chase vs. a sad night confession) get
different musical direction instead of an identical "Dark Ambient" tag.
"""
from __future__ import annotations

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


def recommend_bgm_for_scene(dominant_emotion: str | None, time_of_day: str | None) -> tuple[str, list[str]]:
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
    dominant_emotion. Returns recommendations in the shape the
    BGMRecommendation schema expects.
    """
    recommendations = []
    for scene in scenes:
        mood, tracks = recommend_bgm_for_scene(scene.get("dominant_emotion"), scene.get("time_of_day"))
        recommendations.append(
            {
                "scene_number": scene["scene_number"],
                "scene_heading": scene.get("heading") or "",
                "mood": mood,
                "recommended_music": tracks,
            }
        )
    return recommendations
