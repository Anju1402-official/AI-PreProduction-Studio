from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Dialogue(Base):
    __tablename__ = "dialogues"

    id = Column(Integer, primary_key=True, index=True)
    scene_id = Column(Integer, ForeignKey("scenes.id"), nullable=False)
    script_id = Column(Integer, ForeignKey("scripts.id"), nullable=False)
    character_name = Column(String, nullable=False)
    normalized_character_name = Column(String, nullable=False, index=True)
    dialogue_text = Column(Text, nullable=False)
    word_count = Column(Integer, nullable=True)
    emotion = Column(String, nullable=True)
    emotion_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    scene = relationship("Scene", back_populates="dialogues")
