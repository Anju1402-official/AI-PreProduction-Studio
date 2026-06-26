"""
Storyboard panel generation.

Produces *descriptive* storyboard panels (shot type, camera angle,
composition notes, key visual elements, mood/lighting) rather than
AI-generated images. See StoryboardPanel model docstring for why image
generation is out of scope for this pass.

Composition notes are built from a small template grammar driven by the
scene's dominant emotion + shot type, plus a lightweight extraction of
notable nouns/visual cues from the action line text (capitalized nouns,
the VFX-style keywords already used in script_review.py) so panels aren't
totally generic even without a vision model in the loop.
"""
from __future__ import annotations

import re

_CAMERA_ANGLE_BY_SHOT = {
    "Low Angle Shot": "Low angle, looking up",
    "Dutch Tilt": "Tilted/canted angle",
    "Extreme Close-up": "Eye-level, extreme close-up",
    "Shadow Play Shot": "Side angle, high contrast",
    "Close-up Shot": "Eye-level close-up",
    "Tight Close-up": "Eye-level, tight close-up",
    "Slow Push-In": "Eye-level, slow dolly-in",
    "Over-the-Shoulder Shot": "Over-the-shoulder, eye-level",
    "Handheld Shot": "Handheld, eye-level",
    "Whip Pan": "Eye-level, fast whip pan",
    "Slow Zoom Out": "Eye-level, slow zoom-out",
    "Static Wide Shot": "Eye-level, static wide",
    "Reflection Shot": "Eye-level, framed through reflection",
    "Soft Focus Close-up": "Eye-level, soft focus close-up",
    "Wide Establishing Shot": "High/wide establishing angle",
    "Tracking Shot": "Eye-level, lateral tracking",
    "Warm Two-Shot": "Eye-level two-shot",
    "High Angle Shot": "High angle, looking down",
    "Group Wide Shot": "Eye-level, wide group framing",
    "Two-Shot": "Eye-level, balanced two-shot",
    "Single Close-up": "Eye-level, single subject close-up",
}

_MOOD_LIGHTING_BY_EMOTION = {
    "fear": "Low-key, hard shadows",
    "tension": "Cool tones, harsh contrast",
    "anger": "Hard side lighting, red/orange accents",
    "sadness": "Soft, desaturated, blue-grey tones",
    "joy": "Bright, warm, high-key lighting",
    "neutral": "Balanced, naturalistic lighting",
}

_PROPER_NOUN_RE = re.compile(r"\b[A-Z][a-zA-Z']{2,}\b")
_STOPWORDS = {"The", "And", "But", "She", "His", "Her", "Their", "They", "Then", "With", "Into", "From"}


def _extract_visual_elements(action_text: str, max_items: int = 4) -> list[str]:
    """
    Pull plausible visual nouns/elements out of the action line text via a
    cheap heuristic (capitalized words that aren't common sentence-starters
    or already-known character names), to give each panel at least a
    little bit of scene-specific texture instead of being pure boilerplate.
    """
    if not action_text:
        return []

    candidates = []
    seen: dict[str, None] = {}
    for match in _PROPER_NOUN_RE.finditer(action_text):
        word = match.group(0)
        if word in _STOPWORDS:
            continue
        if word not in seen:
            seen[word] = None
            candidates.append(word)
        if len(candidates) >= max_items:
            break
    return candidates


def build_storyboard_panel(
    panel_number: int,
    shot_type: str,
    dominant_emotion: str | None,
    action_text: str,
    character_names: list[str],
) -> dict:
    """
    Returns a dict matching the StoryboardPanel model's fields, ready to
    persist or serialize directly into the StoryboardResponse schema.
    """
    emotion_key = (dominant_emotion or "neutral").lower()
    camera_angle = _CAMERA_ANGLE_BY_SHOT.get(shot_type, "Eye-level, medium shot")
    mood_lighting = _MOOD_LIGHTING_BY_EMOTION.get(emotion_key, _MOOD_LIGHTING_BY_EMOTION["neutral"])

    visual_elements = _extract_visual_elements(action_text)
    # Characters present are visual elements too — lead with them since
    # they're the most reliably-correct part of this heuristic.
    combined_elements = list(dict.fromkeys([*character_names[:3], *visual_elements]))

    if character_names:
        subject_clause = f"{', '.join(character_names[:2])}" + (
            " and others" if len(character_names) > 2 else ""
        )
    else:
        subject_clause = "the scene's setting"

    composition_notes = (
        f"{shot_type} on {subject_clause}. {camera_angle.capitalize()}. "
        f"Framing should emphasize the scene's {emotion_key} tone."
    )

    return {
        "panel_number": panel_number,
        "shot_type": shot_type,
        "camera_angle": camera_angle,
        "composition_notes": composition_notes,
        "key_visual_elements": ", ".join(combined_elements) if combined_elements else None,
        "mood_lighting": mood_lighting,
    }


def build_storyboard(scenes: list[dict]) -> list[dict]:
    """
    `scenes` is a list of dicts with: scene_number, heading, action_lines,
    dominant_emotion, primary_shot (the first suggested shot for that scene
    from shot_recommend.py), character_names. Returns one panel per scene.
    """
    panels = []
    for scene in scenes:
        panel = build_storyboard_panel(
            panel_number=scene["scene_number"],
            shot_type=scene.get("primary_shot") or "Medium Shot",
            dominant_emotion=scene.get("dominant_emotion"),
            action_text=scene.get("action_lines") or "",
            character_names=scene.get("character_names") or [],
        )
        panel["scene_number"] = scene["scene_number"]
        panel["scene_heading"] = scene.get("heading") or ""
        panels.append(panel)
    return panels
