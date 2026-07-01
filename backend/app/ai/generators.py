"""
AI generators for the studio's creative tools (Story / Script / Character /
World / Storyboard).

Every function here goes through the shared app.services.openai_service.
generate_structured() helper with a strict JSON Schema, so the model's
output shape is guaranteed and matches the *Content Pydantic models in
app/schemas/generation.py one-to-one.

Unlike the analysis modules in this package (emotion, ner, etc.), the
generators have no rule-based local fallback — generating an original story
or character with a heuristic would produce something worthless, so when
OpenAI is unconfigured or a call fails these raise GeneratorUnavailable and
the API layer turns that into a clear 503 the UI can show, rather than
returning fake content.
"""
from __future__ import annotations

import logging

from app.core.config import settings
from app.services import openai_service

logger = logging.getLogger(__name__)


class GeneratorUnavailable(Exception):
    """Raised when generation can't be performed (no OpenAI key, or the call
    failed after retries). The API layer maps this to a 503 with the
    message, so the frontend can tell the user to check the key / try
    again rather than showing a generic 500."""


def _generate(*, instructions: str, input_text: str, schema_name: str, schema: dict, max_output_tokens: int) -> dict:
    if not openai_service.is_configured():
        raise GeneratorUnavailable(
            "AI generation isn't configured on the server. Set OPENAI_API_KEY in the backend .env file."
        )
    try:
        result = openai_service.generate_structured(
            instructions=instructions,
            input_text=input_text,
            schema_name=schema_name,
            schema=schema,
            max_output_tokens=max_output_tokens,
            # Creative generation benefits from a little more reasoning than
            # the terse extraction tasks the analysis pipeline runs.
            reasoning_effort="low",
            verbosity="medium",
            # Always generate fresh: two users asking for "a heist story"
            # should not get the byte-identical cached result.
            use_cache=False,
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("Generation (%s) failed: %s", schema_name, exc)
        raise GeneratorUnavailable(str(exc)) from exc
    return result.data


# --------------------------------------------------------------------------
# Story
# --------------------------------------------------------------------------

_STORY_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "logline": {"type": "string"},
        "genre": {"type": "string"},
        "tone": {"type": "string"},
        "synopsis": {"type": "string", "description": "2-4 paragraph synopsis"},
        "themes": {"type": "array", "items": {"type": "string"}},
        "main_characters": {"type": "array", "items": {"type": "string"}},
        "three_act_beats": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Key beats across act 1, 2, and 3 (roughly 6-9 beats)",
        },
    },
    "required": ["title", "logline", "genre", "tone", "synopsis", "themes", "main_characters", "three_act_beats"],
    "additionalProperties": False,
}


def generate_story(prompt: str, genre: str | None, tone: str | None) -> dict:
    extra = []
    if genre:
        extra.append(f"Preferred genre: {genre}.")
    if tone:
        extra.append(f"Preferred tone: {tone}.")
    instructions = (
        "You are a film development executive generating an original story concept from a "
        "filmmaker's prompt. Produce a memorable title, a one-sentence logline, the genre and "
        "tone, a 2-4 paragraph synopsis, 3-5 themes, the main characters by name + one-word role, "
        "and 6-9 act beats spanning a three-act structure. Make it specific and producible, not "
        "generic. " + " ".join(extra)
    )
    data = _generate(
        instructions=instructions,
        input_text=prompt,
        schema_name="story_generation",
        schema=_STORY_SCHEMA,
        max_output_tokens=1100,
    )
    return data


# --------------------------------------------------------------------------
# Script
# --------------------------------------------------------------------------

_SCRIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "logline": {"type": "string"},
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "scene_number": {"type": "integer"},
                    "heading": {"type": "string", "description": "Standard slugline, e.g. INT. KITCHEN - NIGHT"},
                    "action": {"type": "string", "description": "Action/description lines for the scene"},
                    "dialogue": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Lines formatted as 'CHARACTER: line of dialogue'",
                    },
                },
                "required": ["scene_number", "heading", "action", "dialogue"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "logline", "scenes"],
    "additionalProperties": False,
}


def generate_script(premise: str, genre: str | None, num_scenes: int) -> dict:
    extra = f" Preferred genre: {genre}." if genre else ""
    instructions = (
        f"You are a screenwriter. From the given premise, write a short screenplay of exactly "
        f"{num_scenes} scene(s) in standard format. Each scene needs a proper slugline heading "
        f"(INT./EXT. LOCATION - TIME), a few lines of action, and a handful of dialogue lines "
        f"formatted as 'CHARACTER: line'. Keep continuity of characters across scenes. Give the "
        f"piece a title and a one-line logline." + extra
    )
    data = _generate(
        instructions=instructions,
        input_text=premise,
        schema_name="script_generation",
        schema=_SCRIPT_SCHEMA,
        # Scales with scene count; capped generously.
        max_output_tokens=min(900 + num_scenes * 350, 4000),
    )
    return data


# --------------------------------------------------------------------------
# Character
# --------------------------------------------------------------------------

_CHARACTER_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "role": {"type": "string", "description": "e.g. Protagonist, Antagonist, Mentor"},
        "age_range": {"type": "string"},
        "one_line": {"type": "string", "description": "One-sentence character summary"},
        "backstory": {"type": "string"},
        "personality_traits": {"type": "array", "items": {"type": "string"}},
        "motivations": {"type": "array", "items": {"type": "string"}},
        "flaws": {"type": "array", "items": {"type": "string"}},
        "arc": {"type": "string", "description": "How the character changes across the story"},
        "visual_description": {"type": "string", "description": "Casting/wardrobe visual notes"},
    },
    "required": [
        "name", "role", "age_range", "one_line", "backstory",
        "personality_traits", "motivations", "flaws", "arc", "visual_description",
    ],
    "additionalProperties": False,
}


def generate_character(brief: str, role: str | None) -> dict:
    extra = f" Intended role: {role}." if role else ""
    instructions = (
        "You are a character designer for film. From the brief, create one deep, castable "
        "character: name, dramatic role, age range, a one-sentence summary, a backstory paragraph, "
        "3-5 personality traits, 2-3 motivations, 1-3 flaws, a character arc, and a visual "
        "description usable for casting and wardrobe. Be specific and avoid clichés." + extra
    )
    return _generate(
        instructions=instructions,
        input_text=brief,
        schema_name="character_generation",
        schema=_CHARACTER_SCHEMA,
        max_output_tokens=1000,
    )


# --------------------------------------------------------------------------
# World
# --------------------------------------------------------------------------

_WORLD_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "overview": {"type": "string"},
        "geography": {"type": "string"},
        "history": {"type": "string"},
        "rules": {"type": "array", "items": {"type": "string"}, "description": "Rules of the world / magic / tech"},
        "locations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"name": {"type": "string"}, "description": {"type": "string"}},
                "required": ["name", "description"],
                "additionalProperties": False,
            },
        },
        "factions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"name": {"type": "string"}, "description": {"type": "string"}},
                "required": ["name", "description"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["name", "overview", "geography", "history", "rules", "locations", "factions"],
    "additionalProperties": False,
}


def generate_world(concept: str, genre: str | None) -> dict:
    extra = f" Genre context: {genre}." if genre else ""
    instructions = (
        "You are a worldbuilder. From the concept, build a cohesive story world: a name, an "
        "overview, its geography, a brief history, 3-6 governing rules (of magic, technology, or "
        "society), 3-5 notable locations (name + description each), and 2-4 factions/groups (name "
        "+ description each). Keep it internally consistent." + extra
    )
    return _generate(
        instructions=instructions,
        input_text=concept,
        schema_name="world_generation",
        schema=_WORLD_SCHEMA,
        max_output_tokens=1400,
    )


# --------------------------------------------------------------------------
# Storyboard
# --------------------------------------------------------------------------

_STORYBOARD_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "panels": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "panel_number": {"type": "integer"},
                    "shot_type": {"type": "string", "description": "e.g. Wide, Medium, Close-up, Insert"},
                    "camera_angle": {"type": "string", "description": "e.g. Eye-level, Low angle, Over-the-shoulder"},
                    "description": {"type": "string", "description": "What happens in this panel"},
                    "mood_lighting": {"type": "string"},
                    "key_visual_elements": {"type": "string"},
                },
                "required": ["panel_number", "shot_type", "camera_angle", "description", "mood_lighting", "key_visual_elements"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["summary", "panels"],
    "additionalProperties": False,
}


def generate_storyboard(scene_description: str, num_panels: int) -> dict:
    instructions = (
        f"You are a storyboard artist breaking a scene into a shot list. From the scene "
        f"description, produce exactly {num_panels} sequential storyboard panels. For each panel "
        f"give a shot type, camera angle, a one-to-two sentence description of the action framed, "
        f"the mood/lighting, and the key visual elements in frame. Also give a one-line summary of "
        f"the sequence. Think like a cinematographer planning coverage."
    )
    return _generate(
        instructions=instructions,
        input_text=scene_description,
        schema_name="storyboard_generation",
        schema=_STORYBOARD_SCHEMA,
        max_output_tokens=min(500 + num_panels * 200, 3500),
    )
