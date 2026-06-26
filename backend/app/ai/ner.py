"""
Shared spaCy transformer NER loader.

Used by app/ai/script_review.py to find character mentions that the regex
slugline parser misses — e.g. a character only ever referred to in action
lines ("Maya ducks behind the crates") rather than given a dialogue cue
line. spaCy's PERSON entities catch these; combined with the heading
parser's ALL-CAPS cue detection, this gives much more complete character
tracking than either approach alone.
"""
from __future__ import annotations

import logging
import threading

from app.core.config import settings

logger = logging.getLogger(__name__)

_nlp = None
_nlp_lock = threading.Lock()


def get_nlp():
    """Lazily load and cache the spaCy transformer pipeline."""
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
            logger.info("Loading NER pipeline '%s' (first call only)...", settings.NER_MODEL_NAME)
            _nlp = spacy.load(settings.NER_MODEL_NAME)
            logger.info("NER pipeline loaded.")
        except OSError as exc:
            raise RuntimeError(
                f"spaCy model '{settings.NER_MODEL_NAME}' is not installed. Run "
                f"`python ml_models/ner_model/download.py` first."
            ) from exc

        return _nlp


def extract_person_entities(text: str) -> list[str]:
    """
    Return the distinct PERSON entity strings spaCy finds in `text`,
    preserving first-seen order. Caller is responsible for normalizing
    casing/whitespace before comparing against heading-parsed names.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return []

    nlp = get_nlp()
    doc = nlp(cleaned[:20000])  # guard against pathologically long action blocks

    seen: dict[str, None] = {}
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            name = ent.text.strip()
            if name and name not in seen:
                seen[name] = None
    return list(seen.keys())
