from pydantic import BaseModel
from typing import List, Optional


# ---- Preserved from the original API (unchanged shapes) ----

class EmotionScore(BaseModel):
    scene_number: int
    joy: float
    fear: float
    sadness: float
    anger: float
    tension: float


class EmotionAnalysisResponse(BaseModel):
    script_id: int
    emotions: List[EmotionScore]


class DialogueData(BaseModel):
    character_name: str
    word_count: int
    dialogue_percentage: float
    scene_count: int


class DialogueAnalysisResponse(BaseModel):
    script_id: int
    total_words: int
    dialogues: List[DialogueData]


class ShotSuggestion(BaseModel):
    scene_number: int
    scene_heading: str
    emotion: str
    suggested_shots: List[str]


class ShotSuggestionsResponse(BaseModel):
    script_id: int
    suggestions: List[ShotSuggestion]


class BGMRecommendation(BaseModel):
    scene_number: int
    scene_heading: str
    mood: str
    recommended_music: List[str]


class BGMResponse(BaseModel):
    script_id: int
    recommendations: List[BGMRecommendation]


class SceneImportance(BaseModel):
    scene_number: int
    scene_heading: str
    importance_score: float
    category: str


class SceneImportanceResponse(BaseModel):
    script_id: int
    scenes: List[SceneImportance]


class CostEstimationResponse(BaseModel):
    script_id: int
    total_scenes: int
    total_locations: int
    total_characters: int
    vfx_complexity: str
    shooting_difficulty: str
    budget_risk_score: int
    estimated_budget_range: str


# ---- New: character tracking ----

class TrackedCharacter(BaseModel):
    name: str
    scene_count: int
    speaking_scene_count: int
    detected_via: List[str]


class CharacterTrackingResponse(BaseModel):
    script_id: int
    total_characters: int
    characters: List[TrackedCharacter]


# ---- New: storyboard ----

class StoryboardPanelResponse(BaseModel):
    panel_number: int
    scene_number: int
    scene_heading: str
    shot_type: str
    camera_angle: str
    composition_notes: str
    key_visual_elements: Optional[str] = None
    mood_lighting: Optional[str] = None


class StoryboardResponse(BaseModel):
    script_id: int
    panels: List[StoryboardPanelResponse]


# ---- New: unified per-script dashboard (Overview / Analysis / Recommendations / Storyboard) ----

class DashboardOverview(BaseModel):
    script_id: int
    title: str
    status: str
    pipeline_stage: Optional[str] = None
    total_scenes: int
    total_characters: int
    total_words_of_dialogue: int
    cost_estimation: Optional[CostEstimationResponse] = None
    top_scenes: List[SceneImportance] = []


class DashboardAnalysisTab(BaseModel):
    emotion: Optional[EmotionAnalysisResponse] = None
    dialogue: Optional[DialogueAnalysisResponse] = None
    character_tracking: Optional[CharacterTrackingResponse] = None
    scene_importance: Optional[SceneImportanceResponse] = None


class DashboardRecommendationsTab(BaseModel):
    shot_suggestions: Optional[ShotSuggestionsResponse] = None
    bgm_recommendations: Optional[BGMResponse] = None
    cost_estimation: Optional[CostEstimationResponse] = None


class UnifiedScriptDashboardResponse(BaseModel):
    script_id: int
    status: str
    pipeline_stage: Optional[str] = None
    error_message: Optional[str] = None
    overview: Optional[DashboardOverview] = None
    analysis: Optional[DashboardAnalysisTab] = None
    recommendations: Optional[DashboardRecommendationsTab] = None
    storyboard: Optional[StoryboardResponse] = None
