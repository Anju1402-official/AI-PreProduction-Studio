import logging
import re
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.database import SessionLocal, get_db
from app.models.character import Character
from app.models.dialogue import Dialogue
from app.models.scene import Scene
from app.models.script import Script, ScriptStatus
from app.models.user import User
from app.schemas.analysis import UnifiedScriptDashboardResponse
from app.schemas.script import SceneResponse, ScriptResponse
from app.services.pipeline_service import run_pipeline
from app.services.script_parser import extract_text_from_pdf, extract_text_from_txt, parse_screenplay
from app.services.unified_dashboard_service import build_unified_dashboard

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scripts", tags=["Scripts"])


def _normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().upper())


def _persist_parsed_scenes(db: Session, script: Script, parsed_scenes: list[dict]) -> None:
    for scene_data in parsed_scenes:
        new_scene = Scene(
            script_id=script.id,
            scene_number=scene_data["scene_number"],
            heading=scene_data["heading"],
            location=scene_data["location"],
            time_of_day=scene_data["time_of_day"],
            action_lines=scene_data["action_lines"],
        )
        db.add(new_scene)
        db.commit()
        db.refresh(new_scene)

        speaking_names = {_normalize_name(d["character_name"]) for d in scene_data["dialogues"]}

        for character_name in scene_data["characters"]:
            norm = _normalize_name(character_name)
            db.add(
                Character(
                    scene_id=new_scene.id,
                    script_id=script.id,
                    name=character_name,
                    normalized_name=norm,
                    source="heading",
                    is_speaking=norm in speaking_names,
                    mention_count=1,
                )
            )

        for dialogue_data in scene_data["dialogues"]:
            db.add(
                Dialogue(
                    scene_id=new_scene.id,
                    script_id=script.id,
                    character_name=dialogue_data["character_name"],
                    normalized_character_name=_normalize_name(dialogue_data["character_name"]),
                    dialogue_text=dialogue_data["dialogue_text"],
                    word_count=dialogue_data["word_count"],
                )
            )

        db.commit()


def _run_pipeline_background(script_id: int) -> None:
    """
    Entry point for BackgroundTasks: opens its own DB session, since the
    request-scoped session from `get_db` is closed by the time a background
    task actually runs.
    """
    db = SessionLocal()
    try:
        script = db.query(Script).filter(Script.id == script_id).first()
        if not script:
            logger.error("Background pipeline: script %s not found", script_id)
            return
        try:
            run_pipeline(db, script)
        except Exception as exc:  # noqa: BLE001 - we want to capture *any* pipeline failure
            logger.exception("Pipeline failed for script %s", script_id)
            script.status = ScriptStatus.failed
            script.error_message = str(exc)
            db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=ScriptResponse)
async def upload_script(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: str | None = Form(None),
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not title or not title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not file.filename.endswith((".txt", ".pdf")):
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported")

    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File is too large.")

    text = extract_text_from_pdf(file_content) if file.filename.endswith(".pdf") else extract_text_from_txt(
        file_content
    )
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    new_script = Script(
        user_id=user_id,
        title=title.strip(),
        description=description,
        status=ScriptStatus.processing,
        pipeline_stage="parsing",
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)

    parsed_scenes = parse_screenplay(text)
    if not parsed_scenes:
        new_script.status = ScriptStatus.failed
        new_script.error_message = "No scenes could be detected in this screenplay."
        db.commit()
        db.refresh(new_script)
        return new_script

    _persist_parsed_scenes(db, new_script, parsed_scenes)

    # This single call is what makes Script Upload the one-stop entry point:
    # every analysis stage (character tracking, emotion, shots, BGM,
    # storyboard, scene importance, cost estimation) runs automatically from
    # here with no further action needed from the frontend.
    if settings.RUN_PIPELINE_SYNC:
        try:
            run_pipeline(db, new_script)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Pipeline failed for script %s", new_script.id)
            new_script.status = ScriptStatus.failed
            new_script.error_message = str(exc)
            db.commit()
    else:
        background_tasks.add_task(_run_pipeline_background, new_script.id)

    db.refresh(new_script)
    return new_script


@router.get("/{script_id}", response_model=ScriptResponse)
def get_script(script_id: int, db: Session = Depends(get_db)):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


@router.get("/{script_id}/scenes", response_model=List[SceneResponse])
def get_scenes(script_id: int, db: Session = Depends(get_db)):
    scenes = db.query(Scene).filter(Scene.script_id == script_id).order_by(Scene.scene_number).all()
    if not scenes:
        raise HTTPException(status_code=404, detail="No scenes found")
    return scenes


@router.get("/user/{user_id}", response_model=List[ScriptResponse])
def get_user_scripts(user_id: int, db: Session = Depends(get_db)):
    return db.query(Script).filter(Script.user_id == user_id).order_by(Script.created_at.desc()).all()


@router.get("/{script_id}/dashboard", response_model=UnifiedScriptDashboardResponse)
def get_unified_dashboard(
    script_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    The single endpoint the unified frontend dashboard calls after upload.
    Returns Overview / Analysis / Recommendations / Storyboard tab data in
    one response, regardless of how far the pipeline has gotten -- stages
    that haven't completed yet are simply `null` in the response, and the
    frontend uses `pipeline_stage` to show progress until `status` flips to
    "completed".
    """
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if script.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this script")

    return build_unified_dashboard(db, script)
