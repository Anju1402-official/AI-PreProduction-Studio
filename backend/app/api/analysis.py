from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.analysis_result import AnalysisResult, AnalysisType
from app.models.script import Script
from app.models.user import User
from app.schemas.analysis import (
    BGMResponse,
    CharacterTrackingResponse,
    CostEstimationResponse,
    DialogueAnalysisResponse,
    EmotionAnalysisResponse,
    SceneImportanceResponse,
    ShotSuggestionsResponse,
    StoryboardResponse,
)

router = APIRouter(prefix="/analysis", tags=["Analysis"])


def _check_script(script_id: int, db: Session) -> Script:
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


def _get_stage_result(db: Session, script_id: int, analysis_type: AnalysisType) -> dict:
    row = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.script_id == script_id, AnalysisResult.analysis_type == analysis_type.value)
        .first()
    )
    if not row or not row.result_data:
        raise HTTPException(
            status_code=409,
            detail=(
                "This analysis hasn't finished running yet. Scripts are analyzed automatically on "
                "upload -- check back in a few seconds, or see the script's pipeline_stage."
            ),
        )
    return row.result_data


# These five endpoints existed in the original API and are preserved here so
# any existing client code keeps working. They now read pipeline-computed
# results instead of generating random placeholder numbers on every call.
# The unified dashboard endpoint (GET /scripts/{id}/dashboard) is the
# recommended way to fetch all of this in one request.


@router.get("/{script_id}/emotion", response_model=EmotionAnalysisResponse)
def emotion_analysis(script_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_script(script_id, db)
    return _get_stage_result(db, script_id, AnalysisType.emotion_analysis)


@router.get("/{script_id}/dialogue", response_model=DialogueAnalysisResponse)
def dialogue_analysis(script_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_script(script_id, db)
    return _get_stage_result(db, script_id, AnalysisType.dialogue_density)


@router.get("/{script_id}/shots", response_model=ShotSuggestionsResponse)
def shot_suggestions(script_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_script(script_id, db)
    return _get_stage_result(db, script_id, AnalysisType.shot_suggestions)


@router.get("/{script_id}/bgm", response_model=BGMResponse)
def bgm_recommendations(script_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_script(script_id, db)
    return _get_stage_result(db, script_id, AnalysisType.bgm_recommendations)


@router.get("/{script_id}/scene-importance", response_model=SceneImportanceResponse)
def scene_importance(script_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_script(script_id, db)
    review = _get_stage_result(db, script_id, AnalysisType.script_review)
    return {"script_id": script_id, "scenes": review.get("scene_importance", [])}


@router.get("/{script_id}/cost-estimation", response_model=CostEstimationResponse)
def cost_estimation(script_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_script(script_id, db)
    review = _get_stage_result(db, script_id, AnalysisType.script_review)
    cost = review.get("cost_estimation")
    if not cost:
        raise HTTPException(status_code=409, detail="Cost estimation hasn't finished running yet.")
    return cost


# ---- New endpoints added alongside the unified dashboard ----


@router.get("/{script_id}/characters", response_model=CharacterTrackingResponse)
def character_tracking(script_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_script(script_id, db)
    return _get_stage_result(db, script_id, AnalysisType.character_tracking)


@router.get("/{script_id}/storyboard", response_model=StoryboardResponse)
def storyboard(script_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_script(script_id, db)
    return _get_stage_result(db, script_id, AnalysisType.storyboard)
