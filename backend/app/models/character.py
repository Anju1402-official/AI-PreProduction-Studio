from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Character(Base):
    """
    A character *mention* within one scene. A character who appears in five
    scenes has five rows here (one per scene) — aggregate views (like the
    Character Tracking tab) group these by `name` across the whole script.

    `source` distinguishes how this mention was found:
      - "heading"  -> caught by the regex slugline parser (ALL CAPS cue line)
      - "ner"      -> caught by the spaCy NER pass over action lines, picking
                      up characters who are only ever referred to in prose
                      (e.g. "Maya walks in") rather than given a dialogue cue
    """

    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, index=True)
    scene_id = Column(Integer, ForeignKey("scenes.id"), nullable=False)
    script_id = Column(Integer, ForeignKey("scripts.id"), nullable=False)
    name = Column(String, nullable=False)
    normalized_name = Column(String, nullable=False, index=True)

    source = Column(String, nullable=False, default="heading")
    is_speaking = Column(Boolean, nullable=False, default=False)
    mention_count = Column(Integer, nullable=False, default=1)

    screen_time = Column(Float, nullable=True)
    dialogue_percentage = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    scene = relationship("Scene", back_populates="characters")
