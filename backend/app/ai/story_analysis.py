"""
Story analysis: a whole-script narrative summary.

There is no dedicated API endpoint for this -- the existing frontend's
"Script Analysis" page is a client-side composite view built from data the
other analysis stages already produce (scenes, cost estimation, scene
importance), and the brief for this integration explicitly says not to add
or change API endpoints. This module exists so the logic is real and ready
to call (e.g. from a future endpoint, or from another service module) the
moment that constraint is lifted, rather than leaving "Story Analysis"
unimplemented entirely.

OpenAI only -- there's no previous mock/heuristic implementation of this to
fall back to (it didn't exist before this integration), so a failure here
simply returns None and callers should treat that as "not available right
now" rather than expecting a guaranteed result the way the other app/ai/
modules' rule-based fallbacks provide.
"""
from __future__ import annotations

import logging

from app.services import openai_service

logger = logging.getLogger(__name__)

_STORY_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "logline": {"type": "string", "description": "A one-sentence logline summarizing the story"},
        "genre": {"type": "string", "description": "The most likely genre(s), e.g. 'Crime Drama', 'Romantic Comedy'"},
        "tone": {"type": "string", "description": "Overall tone in a few words, e.g. 'Dark and suspenseful'"},
        "structural_notes": {
            "type": "array",
            "items": {"type": "string"},
            "description": "2-4 short observations about the script's structure/pacing (e.g. strong open, slow middle act)",
        },
        "strengths": {
            "type": "array",
            "items": {"type": "string"},
            "description": "1-3 things the script does well",
        },
        "areas_to_improve": {
            "type": "array",
            "items": {"type": "string"},
            "description": "1-3 constructive areas for improvement",
        },
    },
    "required": ["logline", "genre", "tone", "structural_notes", "strengths", "areas_to_improve"],
    "additionalProperties": False,
}

_STORY_ANALYSIS_INSTRUCTIONS = (
    "You are a script consultant giving brief coverage notes on a screenplay. You'll be given a "
    "numbered list of scene headings and short summaries for the whole script. Identify a one-"
    "sentence logline, likely genre, overall tone, 2-4 structural/pacing observations, 1-3 "
    "strengths, and 1-3 constructive areas for improvement. Be specific to what's actually in the "
    "scene list -- don't invent plot details that aren't implied by it. Keep every list item short "
    "(one sentence each)."
)

# Caps how much scene-summary text gets sent in one call -- a feature-length
# script's full scene list can get long, and this analysis only needs a
# structural overview, not the full text of every scene.
_MAX_SCENES_IN_PROMPT = 80


def analyze_story(scene_summaries: list[dict]) -> dict | None:
    """
    `scene_summaries` is a list of dicts with: scene_number, heading,
    dominant_emotion (optional). Returns a dict matching the schema above,
    or None if OpenAI is unconfigured or the call fails for any reason --
    there is no local fallback for this analysis type (see module
    docstring), so callers must handle None explicitly.
    """
    if not openai_service.is_configured():
        return None
    if not scene_summaries:
        return None

    trimmed = scene_summaries[:_MAX_SCENES_IN_PROMPT]
    lines = [
        f"Scene {s['scene_number']}: {s.get('heading') or '(no heading)'}"
        + (f" [{s['dominant_emotion']}]" if s.get("dominant_emotion") else "")
        for s in trimmed
    ]
    input_text = "\n".join(lines)

    try:
        result = openai_service.generate_structured(
            instructions=_STORY_ANALYSIS_INSTRUCTIONS,
            input_text=input_text,
            schema_name="story_analysis",
            schema=_STORY_ANALYSIS_SCHEMA,
            max_output_tokens=600,
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("OpenAI story analysis failed: %s", exc)
        return None

    return result.data
