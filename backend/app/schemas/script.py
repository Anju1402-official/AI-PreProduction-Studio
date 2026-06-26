from pydantic import BaseModel, ConfigDict
from datetime import datetime
from enum import Enum
from typing import Optional


class ScriptStatus(str, Enum):
    uploaded = "uploaded"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ScriptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    status: ScriptStatus
    pipeline_stage: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime


class SceneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    script_id: int
    scene_number: int
    heading: Optional[str] = None
    location: Optional[str] = None
    time_of_day: Optional[str] = None
    action_lines: Optional[str] = None
    importance_score: Optional[float] = None
    importance_category: Optional[str] = None
