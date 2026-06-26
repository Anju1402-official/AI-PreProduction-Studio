from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ScriptStatus(enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Script(Base):
    __tablename__ = "scripts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String, nullable=True)
    status = Column(Enum(ScriptStatus), default=ScriptStatus.uploaded)

    # Human-readable note on pipeline progress / failure reason, surfaced to
    # the unified dashboard so the UI can show "Running emotion analysis…"
    # instead of a bare "processing" status while the AI pipeline runs.
    pipeline_stage = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    scenes = relationship("Scene", back_populates="script", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="script", cascade="all, delete-orphan")
