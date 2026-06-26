"""
Structural script review: scene importance scoring + production cost
estimation.

This replaces the previous implementation, which scored every scene with
`random.uniform()` — i.e. it produced a different "importance score" every
time you asked, regardless of the actual screenplay. The scoring here is
deterministic and grounded in features extracted from the parsed script:

Scene importance combines:
  - dialogue density (scenes carrying more dialogue tend to carry more plot)
  - character count (scenes with more named characters tend to be ensemble/
    plot-critical beats rather than transitional shots)
  - action-line length (longer action blocks often signal a bigger set-piece)
  - position bonus (open/close scenes of a script skew structurally important)
  - emotional intensity (a scene with a strong dominant emotion reads as a
    "moment" rather than connective tissue) -- consumes the emotion scores
    already computed by app/ai/emotion.py for the same script, so this stage
    must run after emotion analysis in the pipeline.

Cost estimation combines:
  - total scene count (more setups = more shoot days)
  - unique location count (location changes drive logistics/crew costs)
  - unique character count (more principal cast = higher costs)
  - a simple VFX-complexity heuristic based on keyword spotting in action
    lines (explosion, fire, crash, flood, creature, etc.) instead of just
    bucketing on scene count.

None of this is a substitute for a real line producer's budget — it's a
fast, explainable triage signal for early pre-production planning, and the
API response says so via `estimated_budget_range` being a wide band rather
than a fake precise number.
"""
from __future__ import annotations

from dataclasses import dataclass

VFX_KEYWORDS = {
    "explosion", "explode", "fire", "burning", "crash", "collide", "flood",
    "earthquake", "creature", "monster", "spaceship", "alien", "magic",
    "supernatural", "transform", "levitate", "gunfight", "shootout",
    "helicopter", "stunt", "chase",
}

INTERIOR_PREFIXES = ("INT.",)
EXTERIOR_PREFIXES = ("EXT.",)


@dataclass
class SceneFeatures:
    scene_number: int
    heading: str
    location: str | None
    dialogue_word_count: int
    character_count: int
    action_word_count: int
    dominant_emotion: str | None
    emotion_intensity: float  # 0-100, the strongest single emotion score for the scene


def _vfx_keyword_hits(action_text: str) -> int:
    lowered = (action_text or "").lower()
    return sum(1 for kw in VFX_KEYWORDS if kw in lowered)


def score_scene_importance(
    scene_features: list[SceneFeatures],
) -> list[dict]:
    """
    Score every scene 0-100 using a weighted blend of the features above,
    normalized against the script's own min/max for each feature so the
    score is meaningful relative to *this* screenplay rather than against
    some arbitrary global constant.
    """
    if not scene_features:
        return []

    total_scenes = len(scene_features)

    def _normalize(values: list[float]) -> list[float]:
        lo, hi = min(values), max(values)
        if hi - lo < 1e-9:
            return [50.0 for _ in values]  # everything tied -> neutral midpoint
        return [round((v - lo) / (hi - lo) * 100, 2) for v in values]

    dialogue_norm = _normalize([float(f.dialogue_word_count) for f in scene_features])
    character_norm = _normalize([float(f.character_count) for f in scene_features])
    action_norm = _normalize([float(f.action_word_count) for f in scene_features])
    emotion_norm = _normalize([float(f.emotion_intensity) for f in scene_features])

    results = []
    for i, feat in enumerate(scene_features):
        position_bonus = 0.0
        if i == 0 or i == total_scenes - 1:
            position_bonus = 8.0  # opening/closing scenes skew structurally important
        elif i < max(1, total_scenes // 10) or i >= total_scenes - max(1, total_scenes // 10):
            position_bonus = 4.0  # near the start/end, smaller bump

        raw_score = (
            0.30 * dialogue_norm[i]
            + 0.25 * character_norm[i]
            + 0.20 * action_norm[i]
            + 0.25 * emotion_norm[i]
        )
        score = min(100.0, raw_score + position_bonus)

        if score >= 75:
            category = "Critical Scene"
        elif score >= 55:
            category = "Important Scene"
        elif score >= 35:
            category = "Supporting Scene"
        else:
            category = "Redundant Scene"

        results.append(
            {
                "scene_number": feat.scene_number,
                "scene_heading": feat.heading or "",
                "importance_score": round(score, 2),
                "category": category,
            }
        )

    return results


def estimate_production_cost(
    total_scenes: int,
    locations: list[str],
    characters: list[str],
    action_text_corpus: str,
) -> dict:
    """
    Heuristic budget-risk estimate. Replaces the old version's pure
    `random.randint()` risk score with a weighted score built from real
    structural signals, while keeping the same response shape so the
    frontend's CostEstimationResponse schema doesn't need to change.
    """
    unique_locations = len(set(loc for loc in locations if loc))
    unique_characters = len(set(characters))
    vfx_hits = _vfx_keyword_hits(action_text_corpus)

    # Each factor contributes 0-100, then we blend.
    scene_factor = min(100, total_scenes * 4)            # ~25 scenes maxes this out
    location_factor = min(100, unique_locations * 8)      # ~12+ distinct locations maxes this out
    cast_factor = min(100, unique_characters * 6)         # ~16+ named characters maxes this out
    vfx_factor = min(100, vfx_hits * 12)                  # ~8+ vfx keyword hits maxes this out

    risk = round(
        0.30 * scene_factor + 0.25 * location_factor + 0.20 * cast_factor + 0.25 * vfx_factor
    )
    risk = max(5, min(95, risk))  # keep clear of the absolute extremes

    if vfx_factor >= 60:
        vfx_complexity = "High"
    elif vfx_factor >= 25:
        vfx_complexity = "Medium"
    else:
        vfx_complexity = "Low"

    if risk >= 70:
        difficulty = "Complex"
        budget = "\u20b950L - \u20b92Cr"
    elif risk >= 45:
        difficulty = "Moderate"
        budget = "\u20b915L - \u20b950L"
    else:
        difficulty = "Easy"
        budget = "\u20b95L - \u20b915L"

    return {
        "total_scenes": total_scenes,
        "total_locations": unique_locations,
        "total_characters": unique_characters,
        "vfx_complexity": vfx_complexity,
        "shooting_difficulty": difficulty,
        "budget_risk_score": risk,
        "estimated_budget_range": budget,
    }
