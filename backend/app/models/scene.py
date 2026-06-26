from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(Integer, primary_key=True, index=True)
    script_id = Column(Integer, ForeignKey("scripts.id"), nullable=False)
    scene_number = Column(Integer, nullable=False)
    heading = Column(String, nullable=True)
    location = Column(String, nullable=True)
    time_of_day = Column(String, nullable=True)
    action_lines = Column(Text, nullable=True)
    importance_score = Column(Float, nullable=True)
    importance_category = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    script = relationship("Script", back_populates="scenes")
    characters = relationship("Character", back_populates="scene", cascade="all, delete-orphan")
    dialogues = relationship("Dialogue", back_populates="scene", cascade="all, delete-orphan")
    emotion_score = relationship(
        "SceneEmotion", back_populates="scene", uselist=False, cascade="all, delete-orphan"
    )
