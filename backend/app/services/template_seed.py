"""
Template seeding.

The Templates page browses system-owned GeneratedArtifact rows (user_id IS
NULL, kind="template"). These are static, hand-written starting points — not
AI-generated — so the page is useful and instantly populated even on a fresh
database and even when no OpenAI key is configured.

`ensure_seeded` is idempotent: it checks for an existing sentinel template by
title and only inserts the full set if none are present, so it's safe to call
on every request to GET /studio/templates.
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models.generated_artifact import GeneratedArtifact

logger = logging.getLogger(__name__)


# Each template's `content` mirrors the shape a real generator would produce
# for that `template_kind`, so "Use this template" in the UI can prefill the
# matching generator form or open it like any other artifact.
_TEMPLATES: list[dict] = [
    {
        "title": "Three-Act Feature Outline",
        "summary": "A classic three-act structure scaffold for a feature film.",
        "template_kind": "story",
        "content": {
            "logline": "A reluctant hero must overcome an external threat and an inner flaw to restore balance.",
            "genre": "Drama",
            "tone": "Grounded and emotionally driven",
            "structure": [
                "Act 1 — Setup: ordinary world, inciting incident, lock-in",
                "Act 2 — Confrontation: rising stakes, midpoint reversal, all-is-lost",
                "Act 3 — Resolution: climax, transformation, new equilibrium",
            ],
            "prompt_starter": "Write a feature story about ...",
        },
    },
    {
        "title": "Short Film (5-Scene) Template",
        "summary": "A tight five-scene structure ideal for short films and proofs of concept.",
        "template_kind": "script",
        "content": {
            "scenes_outline": [
                "Hook — establish character and want",
                "Complication — the want meets an obstacle",
                "Escalation — stakes rise, choice forced",
                "Turn — a reveal or reversal",
                "Resolution — consequence and button",
            ],
            "prompt_starter": "Write a 5-scene short film where ...",
        },
    },
    {
        "title": "Protagonist Character Bible",
        "summary": "A prompt scaffold for a fully-realized protagonist.",
        "template_kind": "character",
        "content": {
            "fields": ["Name", "Want vs. Need", "Backstory wound", "Arc", "Voice", "Visual"],
            "prompt_starter": "Create a protagonist who ...",
        },
    },
    {
        "title": "Heist Pitch Deck",
        "summary": "A genre template for an ensemble heist concept.",
        "template_kind": "story",
        "content": {
            "logline": "A crew of specialists attempts an impossible theft, undone by their own fractures.",
            "genre": "Crime / Thriller",
            "tone": "Slick, propulsive, witty",
            "beats": ["The job", "Assembling the crew", "The plan", "The wrench", "The double-cross", "The getaway"],
            "prompt_starter": "Pitch a heist story about ...",
        },
    },
    {
        "title": "Sci-Fi World Bible",
        "summary": "A worldbuilding scaffold for a coherent speculative setting.",
        "template_kind": "world",
        "content": {
            "fields": ["Premise", "Rules of the tech/magic", "Geography", "History", "Factions", "Daily life"],
            "prompt_starter": "Build a sci-fi world where ...",
        },
    },
    {
        "title": "Action Sequence Storyboard",
        "summary": "A coverage template for an action set-piece.",
        "template_kind": "storyboard",
        "content": {
            "coverage": ["Establishing wide", "Hero insert", "Reaction", "Impact close-up", "Aftermath wide"],
            "prompt_starter": "Storyboard an action scene where ...",
        },
    },
]

_SENTINEL_TITLE = _TEMPLATES[0]["title"]


def ensure_seeded(db: Session) -> None:
    existing = (
        db.query(GeneratedArtifact)
        .filter(
            GeneratedArtifact.kind == "template",
            GeneratedArtifact.title == _SENTINEL_TITLE,
        )
        .first()
    )
    if existing:
        return

    try:
        for t in _TEMPLATES:
            db.add(
                GeneratedArtifact(
                    user_id=None,
                    kind="template",
                    title=t["title"],
                    summary=t["summary"],
                    content={"template_kind": t["template_kind"], **t["content"]},
                    prompt=None,
                    model="seed",
                )
            )
        db.commit()
        logger.info("Seeded %d studio templates.", len(_TEMPLATES))
    except Exception:
        db.rollback()
        logger.exception("Failed to seed templates.")
