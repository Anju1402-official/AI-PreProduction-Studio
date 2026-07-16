"""
Studio router — the API behind the previously-"Coming Soon" frontend pages.

Three groups of endpoints, all under /studio:

  * Generators (POST): Story / Script / Character / World / Storyboard.
    Each runs an OpenAI-backed generator from app/ai/generators.py and, on
    success, persists the result as a GeneratedArtifact owned by the current
    user, then returns it. Persisting on generate is what makes the asset
    libraries populate automatically.

  * Library (GET/DELETE): list the current user's artifacts (optionally
    filtered by kind), fetch one, or delete one. The frontend's Media /
    Character / Location / Sound / Props library pages are views over this.

  * Templates (GET): browse system-seeded template artifacts (user_id IS
    NULL). Seeded idempotently on first request via app/services/
    template_seed.py so the page is never empty even on a fresh database.

  * Script correction (POST): runs the existing app/ai/script_correction.py
    over a script's persisted scenes. This one reads a user's uploaded
    script rather than generating new content.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.ai import generators
from app.ai import script_correction as correction_ai
from app.core.security import get_current_user
from app.database import get_db
from app.models.generated_artifact import GeneratedArtifact
from app.models.scene import Scene
from app.models.dialogue import Dialogue
from app.models.script import Script
from app.models.user import User
from app.schemas.generation import (
    ArtifactKind,
    ArtifactResponse,
    ArtifactSummary,
    CharacterGenerateRequest,
    ScriptGenerateRequest,
    StoryGenerateRequest,
    StoryboardGenerateRequest,
    WorldGenerateRequest,
)
from app.services import template_seed

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/studio", tags=["Studio"])


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------


def _persist(
    db: Session,
    *,
    user_id: int,
    kind: ArtifactKind,
    title: str,
    summary: Optional[str],
    content: dict,
    prompt: dict,
) -> GeneratedArtifact:
    artifact = GeneratedArtifact(
        user_id=user_id,
        kind=kind.value,
        title=title,
        summary=summary,
        content=content,
        prompt=prompt,
        model=content.get("_model") if isinstance(content, dict) else None,
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return artifact


def _unavailable(exc: generators.GeneratorUnavailable) -> HTTPException:
    # 503: the request was fine, the AI backend just isn't available right
    # now (no key, or upstream failure). The frontend shows this message.
    return HTTPException(status_code=503, detail=str(exc))


# --------------------------------------------------------------------------
# Generators
# --------------------------------------------------------------------------


@router.post("/generate/story", response_model=ArtifactResponse)
def generate_story(
    body: StoryGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        data = generators.generate_story(body.prompt, body.genre, body.tone)
    except generators.GeneratorUnavailable as exc:
        raise _unavailable(exc)

    title = data.get("title") or "Untitled Story"
    return _persist(
        db,
        user_id=current_user.id,
        kind=ArtifactKind.story,
        title=title,
        summary=data.get("logline"),
        content=data,
        prompt=body.model_dump(),
    )


@router.post("/generate/script", response_model=ArtifactResponse)
def generate_script(
    body: ScriptGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        data = generators.generate_script(body.premise, body.genre, body.num_scenes)
    except generators.GeneratorUnavailable as exc:
        raise _unavailable(exc)

    title = data.get("title") or "Untitled Script"
    return _persist(
        db,
        user_id=current_user.id,
        kind=ArtifactKind.script,
        title=title,
        summary=data.get("logline"),
        content=data,
        prompt=body.model_dump(),
    )


@router.post("/generate/character", response_model=ArtifactResponse)
def generate_character(
    body: CharacterGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        data = generators.generate_character(body.brief, body.role)
    except generators.GeneratorUnavailable as exc:
        raise _unavailable(exc)

    title = data.get("name") or "Unnamed Character"
    return _persist(
        db,
        user_id=current_user.id,
        kind=ArtifactKind.character,
        title=title,
        summary=data.get("one_line"),
        content=data,
        prompt=body.model_dump(),
    )


@router.post("/generate/world", response_model=ArtifactResponse)
def generate_world(
    body: WorldGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        data = generators.generate_world(body.concept, body.genre)
    except generators.GeneratorUnavailable as exc:
        raise _unavailable(exc)

    title = data.get("name") or "Untitled World"
    return _persist(
        db,
        user_id=current_user.id,
        kind=ArtifactKind.world,
        title=title,
        summary=data.get("overview"),
        content=data,
        prompt=body.model_dump(),
    )


@router.post("/generate/storyboard", response_model=ArtifactResponse)
def generate_storyboard(
    body: StoryboardGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        data = generators.generate_storyboard(body.scene_description, body.num_panels)
    except generators.GeneratorUnavailable as exc:
        raise _unavailable(exc)

    # Storyboards have no title field of their own — derive one.
    title = (body.scene_description.strip()[:48] + "…") if len(body.scene_description) > 48 else body.scene_description.strip()
    return _persist(
        db,
        user_id=current_user.id,
        kind=ArtifactKind.storyboard,
        title=f"Storyboard — {title}",
        summary=data.get("summary"),
        content=data,
        prompt=body.model_dump(),
    )


# --------------------------------------------------------------------------
# Library
# --------------------------------------------------------------------------


@router.get("/library", response_model=List[ArtifactSummary])
def list_library(
    kind: Optional[ArtifactKind] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(GeneratedArtifact).filter(GeneratedArtifact.user_id == current_user.id)
    if kind is not None:
        q = q.filter(GeneratedArtifact.kind == kind.value)
    return q.order_by(GeneratedArtifact.created_at.desc()).all()


@router.get("/library/{artifact_id}", response_model=ArtifactResponse)
def get_artifact(
    artifact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    artifact = db.query(GeneratedArtifact).filter(GeneratedArtifact.id == artifact_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    # Templates (user_id is None) are readable by anyone; user artifacts are
    # readable only by their owner.
    if artifact.user_id is not None and artifact.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this item")
    return artifact


@router.delete("/library/{artifact_id}", status_code=204)
def delete_artifact(
    artifact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    artifact = db.query(GeneratedArtifact).filter(GeneratedArtifact.id == artifact_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if artifact.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own items")
    db.delete(artifact)
    db.commit()
    return None


# --------------------------------------------------------------------------
# Templates
# --------------------------------------------------------------------------


@router.get("/templates", response_model=List[ArtifactResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """System-seeded starting points. Seeded once (idempotently) so the page
    is populated even on a fresh database."""
    template_seed.ensure_seeded(db)
    return (
        db.query(GeneratedArtifact)
        .filter(GeneratedArtifact.kind == ArtifactKind.template.value)
        .order_by(GeneratedArtifact.id.asc())
        .all()
    )


# --------------------------------------------------------------------------
# Script correction (reads an uploaded script, doesn't generate new content)
# --------------------------------------------------------------------------


@router.post("/scripts/{script_id}/correct")
def correct_script(
    script_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if script.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this script")

    scenes = (
        db.query(Scene)
        .filter(Scene.script_id == script_id)
        .order_by(Scene.scene_number)
        .all()
    )
    if not scenes:
        raise HTTPException(status_code=409, detail="This script has no parsed scenes yet.")

    # Cap how many scenes we run corrections on per request to keep latency
    # and token usage bounded; the first 12 scenes is plenty for a review
    # pass and matches the generators' similar caps.
    scenes = scenes[:12]

    results = []
    any_ai = False
    for scene in scenes:
        dialogue_rows = (
            db.query(Dialogue).filter(Dialogue.scene_id == scene.id).all()
        )
        dialogue_lines = [
            f"{d.character_name}: {d.dialogue_text}" for d in dialogue_rows
        ]
        issues = correction_ai.correct_scene(scene.heading, scene.action_lines, dialogue_lines)
        if issues is None:
            # OpenAI unconfigured / failed — stop early and report it once.
            raise HTTPException(
                status_code=503,
                detail=(
                    "Script correction needs OpenAI. Set OPENAI_API_KEY in the backend .env "
                    "file, or try again if this was a transient error."
                ),
            )
        any_ai = True
        if issues:
            results.append(
                {
                    "scene_number": scene.scene_number,
                    "heading": scene.heading or f"Scene {scene.scene_number}",
                    "issues": issues,
                }
            )

    return {
        "script_id": script_id,
        "scenes_reviewed": len(scenes),
        "scenes_with_issues": len(results),
        "results": results,
        "ai_used": any_ai,
    }


# --------------------------------------------------------------------------
# AI Copilot
# --------------------------------------------------------------------------

class CopilotRequest(BaseModel):
    message: str
    context: Optional[dict] = None

@router.post("/copilot")
def copilot_chat(
    body: CopilotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI Copilot — a conversational assistant for filmmakers.
    Accepts a free-form message and optional context (script_id, scene data, etc.)
    and returns an intelligent response covering scene improvement, budget optimization,
    dialogue rewriting, camera suggestions, and more."""
    from app.services.openai_service import generate_structured, OpenAINotConfiguredError

    context_str = ""
    if body.context:
        # If a script_id is provided, fetch some context
        script_id = body.context.get("script_id")
        if script_id:
            script = db.query(Script).filter(Script.id == script_id).first()
            if script and script.user_id == current_user.id:
                scenes = db.query(Scene).filter(Scene.script_id == script_id).order_by(Scene.scene_number).limit(5).all()
                context_str = f"\n\nProject context — Script: '{script.title}', {len(scenes)} scenes loaded."
                for s in scenes[:3]:
                    context_str += f"\n  Scene {s.scene_number}: {s.heading or 'Untitled'}"

    system_prompt = f"""You are CineOS AI Copilot — an expert filmmaking assistant. You help with:
- Scene improvement and rewriting
- Dialogue polish and character voice
- Budget optimization and production planning
- Camera angles and shot composition
- Story structure and pacing
- Creative direction and artistic vision

Be concise, specific, and actionable. Format your response with clear sections when appropriate.
Use markdown formatting for readability.{context_str}"""

    try:
        result = generate_structured(
            instructions=system_prompt,
            input_text=body.message,
            schema={
                "type": "object",
                "properties": {
                    "response": {"type": "string", "description": "The copilot's response in markdown"},
                    "suggestions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "2-3 follow-up suggestions the user might want to ask"
                    }
                },
                "required": ["response", "suggestions"],
                "additionalProperties": False
            },
            schema_name="copilot_response",
            reasoning_effort="low",
        )
        return {
            "message": result.get("response", "I couldn't generate a response. Please try again."),
            "suggestions": result.get("suggestions", []),
        }
    except OpenAINotConfiguredError:
        raise HTTPException(
            status_code=503,
            detail="AI Copilot requires OpenAI. Set OPENAI_API_KEY in the backend .env file.",
        )
    except Exception as exc:
        logger.exception("Copilot error: %s", exc)
        raise HTTPException(status_code=500, detail="The AI Copilot encountered an error. Please try again.")
