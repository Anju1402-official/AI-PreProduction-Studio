"""
Pydantic schemas for the AI generation features (Story / Script / Character
/ World / Storyboard generators) and the artifact storage that backs the
asset libraries and templates browser.

Two layers here:

  * `*Content` models describe the shape of the JSON stored in
    GeneratedArtifact.content for each kind. These mirror the strict JSON
    Schemas the AI modules in app/ai/generators.py hand to OpenAI, so what
    the model returns, what we persist, and what the API returns are all
    the same shape.
  * `*Request` models are the request bodies the generator endpoints accept.
  * `ArtifactResponse` / `ArtifactSummary` are what the library + dashboard
    endpoints return.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ArtifactKind(str, Enum):
    story = "story"
    script = "script"
    character = "character"
    world = "world"
    storyboard = "storyboard"
    template = "template"


# --------------------------------------------------------------------------
# Content shapes (what lives in GeneratedArtifact.content)
# --------------------------------------------------------------------------


class StoryContent(BaseModel):
    logline: str
    genre: str
    tone: str
    synopsis: str
    themes: List[str] = Field(default_factory=list)
    main_characters: List[str] = Field(default_factory=list)
    three_act_beats: List[str] = Field(default_factory=list)


class ScriptSceneContent(BaseModel):
    scene_number: int
    heading: str
    action: str
    dialogue: List[str] = Field(default_factory=list)


class ScriptContent(BaseModel):
    logline: str
    scenes: List[ScriptSceneContent] = Field(default_factory=list)


class CharacterContent(BaseModel):
    name: str
    role: str
    age_range: str
    one_line: str
    backstory: str
    personality_traits: List[str] = Field(default_factory=list)
    motivations: List[str] = Field(default_factory=list)
    flaws: List[str] = Field(default_factory=list)
    arc: str
    visual_description: str


class WorldLocationContent(BaseModel):
    name: str
    description: str


class WorldFactionContent(BaseModel):
    name: str
    description: str


class WorldContent(BaseModel):
    name: str
    overview: str
    geography: str
    history: str
    rules: List[str] = Field(default_factory=list)
    locations: List[WorldLocationContent] = Field(default_factory=list)
    factions: List[WorldFactionContent] = Field(default_factory=list)


class StoryboardPanelContent(BaseModel):
    panel_number: int
    shot_type: str
    camera_angle: str
    description: str
    mood_lighting: str
    key_visual_elements: str


class StoryboardContent(BaseModel):
    summary: str
    panels: List[StoryboardPanelContent] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Requests
# --------------------------------------------------------------------------


class StoryGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=2000)
    genre: Optional[str] = None
    tone: Optional[str] = None


class ScriptGenerateRequest(BaseModel):
    premise: str = Field(..., min_length=3, max_length=2000)
    genre: Optional[str] = None
    num_scenes: int = Field(default=4, ge=1, le=12)


class CharacterGenerateRequest(BaseModel):
    brief: str = Field(..., min_length=3, max_length=2000)
    role: Optional[str] = None


class WorldGenerateRequest(BaseModel):
    concept: str = Field(..., min_length=3, max_length=2000)
    genre: Optional[str] = None


class StoryboardGenerateRequest(BaseModel):
    scene_description: str = Field(..., min_length=3, max_length=3000)
    num_panels: int = Field(default=6, ge=1, le=12)


# --------------------------------------------------------------------------
# Responses
# --------------------------------------------------------------------------


class ArtifactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    kind: ArtifactKind
    title: str
    summary: Optional[str] = None
    content: Optional[Any] = None
    prompt: Optional[Any] = None
    model: Optional[str] = None
    created_at: datetime


class ArtifactSummary(BaseModel):
    """Lighter shape for library list views — omits the full content blob."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: ArtifactKind
    title: str
    summary: Optional[str] = None
    model: Optional[str] = None
    created_at: datetime
