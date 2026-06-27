"""
Script correction: continuity, formatting, and dialogue polish suggestions.

Same situation as app/ai/story_analysis.py -- there is no existing API
endpoint for this (the frontend's Script Correction page is still a
"Coming Soon" stub), and the brief for this integration explicitly says
not to add or change API endpoints. This module exists so the logic is
real and ready to call the moment a route gets wired up for it, rather
than leaving "Script Corrections" unimplemented entirely.

OpenAI only -- there's no previous mock implementation of this to fall
back to. A failure simply returns None.
"""
from __future__ import annotations

import logging

from app.services import openai_service

logger = logging.getLogger(__name__)

_CORRECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["continuity", "formatting", "dialogue", "grammar"],
                    },
                    "description": {"type": "string", "description": "What the issue is, in one sentence"},
                    "suggestion": {"type": "string", "description": "A concrete suggested fix"},
                },
                "required": ["category", "description", "suggestion"],
                "additionalProperties": False,
            },
            "description": "Up to 5 specific issues found in this scene, if any",
        }
    },
    "required": ["issues"],
    "additionalProperties": False,
}

_CORRECTION_INSTRUCTIONS = (
    "You are a script editor doing a continuity and formatting pass on one screenplay scene. "
    "Review the scene's heading, action lines, and dialogue. Flag up to 5 concrete issues across "
    "these categories: 'continuity' (contradicts something established elsewhere, if inferable), "
    "'formatting' (non-standard scene heading, malformed dialogue cues), 'dialogue' (unnatural or "
    "redundant lines), 'grammar' (actual grammar/spelling errors in the text). For each issue give "
    "a one-sentence description and a concrete suggested fix. If the scene has no notable issues, "
    "return an empty list rather than inventing problems."
)


def correct_scene(
    heading: str | None,
    action_lines: str | None,
    dialogue_lines: list[str] | None,
) -> list[dict] | None:
    """
    Returns a list of {category, description, suggestion} dicts for one
    scene, or None if OpenAI is unconfigured or the call fails -- there is
    no local fallback for this (see module docstring), so callers must
    handle None explicitly.
    """
    if not openai_service.is_configured():
        return None

    input_text = (
        f"Scene heading: {heading or '(none)'}\n"
        f"Action lines: {(action_lines or '(none)').strip()[:2000]}\n"
        f"Dialogue: {' / '.join(dialogue_lines or []) [:2000] or '(none)'}"
    )

    try:
        result = openai_service.generate_structured(
            instructions=_CORRECTION_INSTRUCTIONS,
            input_text=input_text,
            schema_name="script_correction",
            schema=_CORRECTION_SCHEMA,
            max_output_tokens=500,
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("OpenAI script correction failed: %s", exc)
        return None

    return result.data.get("issues", [])
