"""
Character/entity extraction from screenplay action lines.

Used during the upload pipeline to find character mentions that the regex
slugline parser misses -- e.g. a character only ever referred to in action
lines ("Maya ducks behind the crates") rather than given a dialogue cue
line. Combined with the heading parser's ALL-CAPS cue detection, this gives
much more complete character tracking than either approach alone.

Primary path: OpenAI (gpt-5-nano), asked to list the proper-noun character
names mentioned in a block of action text. Generally more accurate than a
generic PERSON-entity tagger for screenplay-specific naming quirks (e.g.
nicknames, single-name characters, "THE STRANGER" style descriptive
non-named characters that a general NER model might mis-tag).

Fallback path: spaCy's transformer NER pipeline (en_core_web_trf), scanning
for PERSON entities. Used automatically if OpenAI is unconfigured,
rate-limited, or unreachable.
"""
from __future__ import annotations

import logging
import threading

from app.core.config import settings
from app.services import openai_service

logger = logging.getLogger(__name__)

_nlp = None
_nlp_lock = threading.Lock()

_CHARACTER_EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "characters": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Distinct character names mentioned in the text, as written",
        }
    },
    "required": ["characters"],
    "additionalProperties": False,
}

_CHARACTER_EXTRACTION_INSTRUCTIONS = (
    "You are reading a screenplay's action lines (scene description, not dialogue). "
    "List every distinct character name mentioned, exactly as written in the text "
    "(e.g. 'Maya', not 'MAYA' unless that's how it appears). Include named characters "
    "only -- skip generic descriptions like 'a guard' or 'the crowd' unless they're "
    "given a specific name or consistent label in capitals (e.g. 'THE STRANGER'). "
    "If no characters are mentioned, return an empty list."
)


def get_nlp():
    """Lazily load and cache the spaCy transformer pipeline (fallback path only)."""
    global _nlp
    if _nlp is not None:
        return _nlp

    with _nlp_lock:
        if _nlp is not None:
            return _nlp

        try:
            import spacy
        except ImportError as exc:  # pragma: no cover - import guard
            raise RuntimeError(
                "spaCy is not installed. Run `pip install -r requirements.txt` "
                "in backend/ before starting the server."
            ) from exc

        try:
            logger.info("Loading local fallback NER pipeline '%s' (first call only)...", settings.NER_MODEL_NAME)
            _nlp = spacy.load(settings.NER_MODEL_NAME)
            logger.info("Local fallback NER pipeline loaded.")
        except OSError as exc:
            raise RuntimeError(
                f"spaCy model '{settings.NER_MODEL_NAME}' is not installed. Run "
                f"`python ml_models/ner_model/download.py` first."
            ) from exc

        return _nlp


def _extract_person_entities_openai(text: str) -> list[str] | None:
    """Try OpenAI first. Returns None (rather than raising) on any
    OpenAI-side failure, so the caller falls back to spaCy."""
    try:
        result = openai_service.generate_structured(
            instructions=_CHARACTER_EXTRACTION_INSTRUCTIONS,
            input_text=text[:6000],
            schema_name="character_extraction",
            schema=_CHARACTER_EXTRACTION_SCHEMA,
            max_output_tokens=300,
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("OpenAI character extraction failed, falling back to spaCy NER: %s", exc)
        return None

    names = result.data.get("characters", [])
    # De-dupe while preserving order, same contract as the spaCy path below.
    seen: dict[str, None] = {}
    for name in names:
        cleaned = (name or "").strip()
        if cleaned and cleaned not in seen:
            seen[cleaned] = None
    return list(seen.keys())


def _extract_person_entities_spacy(text: str) -> list[str]:
    nlp = get_nlp()
    doc = nlp(text[:20000])  # guard against pathologically long action blocks

    seen: dict[str, None] = {}
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            name = ent.text.strip()
            if name and name not in seen:
                seen[name] = None
    return list(seen.keys())


def extract_person_entities(text: str) -> list[str]:
    """
    Return the distinct character name strings found in `text`, preserving
    first-seen order. Caller is responsible for normalizing casing/
    whitespace before comparing against heading-parsed names.

    Tries OpenAI first (if USE_OPENAI_FOR_CHARACTERS is enabled and an API
    key is configured), then falls back to the local spaCy NER model on
    any OpenAI-side failure. Raises RuntimeError only if spaCy itself is
    unavailable (not installed / model not downloaded) -- the upload
    pipeline already catches that and degrades to heading-parsed
    characters only, so this preserves the existing fallback chain.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return []

    if settings.USE_OPENAI_FOR_CHARACTERS and openai_service.is_configured():
        result = _extract_person_entities_openai(cleaned)
        if result is not None:
            return result

    return _extract_person_entities_spacy(cleaned)
