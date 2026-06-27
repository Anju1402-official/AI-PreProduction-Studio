"""
Storyboard panel generation.

Produces *descriptive* storyboard panels (shot type, camera angle,
composition notes, key visual elements, mood/lighting) rather than
AI-generated images. See StoryboardPanel model docstring for why image
generation is out of scope for this pass.

Primary path: OpenAI (gpt-5-nano), given the scene's action text, dominant
emotion, and chosen shot type, asked to write the composition notes and
list real key visual elements directly -- this reads the scene's actual
content rather than guessing at nouns via regex, so notes are meaningfully
scene-specific (props, blocking, setting details actually mentioned in the
text) rather than templated.

Fallback path: a template grammar driven by the scene's dominant emotion +
shot type, plus a lightweight regex extraction of capitalized words from
the action text as a rough proxy for "visual elements". Used automatically
if OpenAI is unconfigured, rate-limited, or unreachable.
"""
from __future__ import annotations

import logging
import re

from app.services import openai_service

logger = logging.getLogger(__name__)

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

_STORYBOARD_SCHEMA = {
    "type": "object",
    "properties": {
        "composition_notes": {
            "type": "string",
            "description": "1-2 sentences describing how this shot should be composed/framed for this specific scene",
        },
        "key_visual_elements": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Up to 4 specific visual elements (props, setting details, character positions) actually mentioned or implied in the scene text",
        },
    },
    "required": ["composition_notes", "key_visual_elements"],
    "additionalProperties": False,
}

_STORYBOARD_INSTRUCTIONS = (
    "You are a storyboard artist describing one panel for a screenplay scene. Given the scene's "
    "action text, its dominant emotion, the chosen shot type, and which characters are present, "
    "write 1-2 concise sentences of composition notes (how the shot should be framed for this "
    "specific scene's content) and list up to 4 key visual elements actually mentioned or clearly "
    "implied by the scene text (props, setting details, notable staging) -- not generic filler."
)


def _extract_visual_elements(action_text: str, max_items: int = 4) -> list[str]:
    """
    Pull plausible visual nouns/elements out of the action line text via a
    cheap heuristic (capitalized words that aren't common sentence-starters
    or already-known character names), to give each panel at least a
    little bit of scene-specific texture instead of being pure boilerplate.
    Fallback path only.
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


def _build_panel_openai(
    shot_type: str, camera_angle: str, dominant_emotion: str | None, action_text: str, character_names: list[str]
) -> tuple[str, list[str]] | None:
    """Try OpenAI first. Returns None (rather than raising) on any
    OpenAI-side failure, so the caller falls back to the template grammar."""
    input_text = (
        f"Shot type: {shot_type}\n"
        f"Camera angle: {camera_angle}\n"
        f"Dominant emotion: {dominant_emotion or 'neutral'}\n"
        f"Characters present: {', '.join(character_names) if character_names else 'none specified'}\n"
        f"Scene action: {(action_text or 'No action description available.').strip()[:2000]}"
    )
    try:
        result = openai_service.generate_structured(
            instructions=_STORYBOARD_INSTRUCTIONS,
            input_text=input_text,
            schema_name="storyboard_panel",
            schema=_STORYBOARD_SCHEMA,
            max_output_tokens=250,
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("OpenAI storyboard panel generation failed, falling back to template: %s", exc)
        return None

    notes = (result.data.get("composition_notes") or "").strip()
    elements = [e.strip() for e in result.data.get("key_visual_elements", []) if e and e.strip()]
    if not notes:
        return None
    return notes, elements[:4]


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

    Tries OpenAI first (per panel) and falls back to the template grammar
    on any failure.
    """
    emotion_key = (dominant_emotion or "neutral").lower()
    camera_angle = _CAMERA_ANGLE_BY_SHOT.get(shot_type, "Eye-level, medium shot")
    mood_lighting = _MOOD_LIGHTING_BY_EMOTION.get(emotion_key, _MOOD_LIGHTING_BY_EMOTION["neutral"])

    openai_result = None
    if openai_service.is_configured():
        openai_result = _build_panel_openai(shot_type, camera_angle, dominant_emotion, action_text, character_names)

    if openai_result is not None:
        composition_notes, ai_visual_elements = openai_result
        combined_elements = list(dict.fromkeys([*character_names[:3], *ai_visual_elements]))
    else:
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
