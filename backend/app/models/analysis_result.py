from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AnalysisType(enum.Enum):
    """
    One row per (script, analysis_type) is written by the pipeline in
    app/services/pipeline_service.py as each stage completes. Storing the
    raw JSON output here (in addition to the structured tables like
    SceneEmotion/Character) means the unified dashboard's tabs can be served
    by simple lookups without re-running any model, and a stage's output can
    be inspected/debugged even if the structured tables changed shape later.
    """

    script_review = "script_review"          # scene importance + cost estimation + structural notes
    emotion_analysis = "emotion_analysis"
    character_tracking = "character_tracking"
    dialogue_density = "dialogue_density"
    shot_suggestions = "shot_suggestions"
    bgm_recommendations = "bgm_recommendations"
    storyboard = "storyboard"


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    script_id = Column(Integer, ForeignKey("scripts.id"), nullable=False)
    analysis_type = Column(String, nullable=False)
    result_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    script = relationship("Script", back_populates="analysis_results")
