"""
Assembles the single response that powers the unified per-script dashboard
(Overview / Analysis / Recommendations / Storyboard tabs) on the frontend.

Everything here is a read of data the pipeline already computed and stored
(see app/services/pipeline_service.py) -- this module does no analysis
itself, it just shapes the stored rows into the four tab payloads the
frontend's GET /scripts/{script_id}/dashboard endpoint returns in one call.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.analysis_result import AnalysisResult, AnalysisType
from app.models.scene import Scene
from app.models.script import Script


def _get_result(db: Session, script_id: int, analysis_type: AnalysisType) -> dict | None:
    row = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.script_id == script_id, AnalysisResult.analysis_type == analysis_type.value)
        .first()
    )
    return row.result_data if row else None


def build_unified_dashboard(db: Session, script: Script) -> dict:
    scenes = db.query(Scene).filter(Scene.script_id == script.id).order_by(Scene.scene_number).all()

    character_tracking = _get_result(db, script.id, AnalysisType.character_tracking)
    emotion = _get_result(db, script.id, AnalysisType.emotion_analysis)
    dialogue = _get_result(db, script.id, AnalysisType.dialogue_density)
    shots = _get_result(db, script.id, AnalysisType.shot_suggestions)
    bgm = _get_result(db, script.id, AnalysisType.bgm_recommendations)
    storyboard = _get_result(db, script.id, AnalysisType.storyboard)
    review = _get_result(db, script.id, AnalysisType.script_review)

    cost_estimation = (review or {}).get("cost_estimation")
    scene_importance = (review or {}).get("scene_importance", [])

    overview = {
        "script_id": script.id,
        "title": script.title,
        "status": script.status.value,
        "pipeline_stage": script.pipeline_stage,
        "total_scenes": len(scenes),
        "total_characters": (character_tracking or {}).get("total_characters", 0),
        "total_words_of_dialogue": (dialogue or {}).get("total_words", 0),
        "cost_estimation": cost_estimation,
        "top_scenes": sorted(scene_importance, key=lambda s: s["importance_score"], reverse=True)[:5],
    }

    analysis = {
        "emotion": emotion,
        "dialogue": dialogue,
        "character_tracking": character_tracking,
        "scene_importance": {"script_id": script.id, "scenes": scene_importance},
    }

    recommendations = {
        "shot_suggestions": shots,
        "bgm_recommendations": bgm,
        "cost_estimation": cost_estimation,
    }

    return {
        "script_id": script.id,
        "status": script.status.value,
        "pipeline_stage": script.pipeline_stage,
        "error_message": script.error_message,
        "overview": overview,
        "analysis": analysis,
        "recommendations": recommendations,
        "storyboard": storyboard,
    }
