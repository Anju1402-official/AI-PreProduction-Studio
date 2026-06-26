from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SceneEmotion(Base):
    """
    Structured emotion scores for one scene, produced by the HuggingFace
    emotion-classification pipeline in app/ai/emotion.py.

    joy / fear / sadness / anger map directly to model output labels.
    `tension` is a derived score (see app/ai/emotion.py:compute_tension)
    rather than a raw model label, since the underlying model doesn't have
    a "tension" class but pre-production teams care about it a lot.
    """

    __tablename__ = "scene_emotions"

    id = Column(Integer, primary_key=True, index=True)
    scene_id = Column(Integer, ForeignKey("scenes.id"), nullable=False, unique=True)
    script_id = Column(Integer, ForeignKey("scripts.id"), nullable=False)

    joy = Column(Float, nullable=False, default=0.0)
    fear = Column(Float, nullable=False, default=0.0)
    sadness = Column(Float, nullable=False, default=0.0)
    anger = Column(Float, nullable=False, default=0.0)
    tension = Column(Float, nullable=False, default=0.0)

    dominant_emotion = Column(String, nullable=True)
    model_name = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    scene = relationship("Scene", back_populates="emotion_score")
