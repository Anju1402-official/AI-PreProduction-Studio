"""
Structural script review: scene importance scoring + production cost
estimation.

Primary path: OpenAI (gpt-5-nano), given a compact per-scene summary for
the *entire* script in one request, asked to score relative importance and
estimate production cost in context. This is done as a single batched call
per script (not one call per scene) for two reasons: scene importance is
inherently relative to the rest of the script (a love scene's "importance"
depends on how it compares to every other scene), and batching keeps token
usage far lower than scoring scene-by-scene -- directly serving the brief's
"minimize token usage" / "keep prompts concise" requirements.

Fallback path: a deterministic, normalized weighted-feature scorer (scene
importance) and a keyword/count-based heuristic (cost estimation). Used
automatically if OpenAI is unconfigured, rate-limited, or unreachable, or
if the script is too large for one batched call to stay within a
reasonable token budget (see OPENAI_BATCH_ANALYSIS / scene count guard
below) -- this also replaces what was originally `random.uniform()` /
`random.randint()` scoring, so even the fallback never just makes numbers
up.

Cost estimation combines (fallback path):
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

import logging
from dataclasses import dataclass

from app.core.config import settings
from app.services import openai_service

logger = logging.getLogger(__name__)

VFX_KEYWORDS = {
    "explosion", "explode", "fire", "burning", "crash", "collide", "flood",
    "earthquake", "creature", "monster", "spaceship", "alien", "magic",
    "supernatural", "transform", "levitate", "gunfight", "shootout",
    "helicopter", "stunt", "chase",
}

INTERIOR_PREFIXES = ("INT.",)
EXTERIOR_PREFIXES = ("EXT.",)

# Batched OpenAI calls send a per-scene summary line for the whole script in
# one request. Beyond this many scenes, the prompt would get large enough
# that token cost/latency stop being worth it relative to the deterministic
# fallback's quality -- so scripts longer than this always use the local
# scorer, regardless of OPENAI_BATCH_ANALYSIS.
_MAX_SCENES_FOR_BATCHED_OPENAI_CALL = 60

_IMPORTANCE_SCHEMA = {
    "type": "object",
    "properties": {
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "scene_number": {"type": "integer"},
                    "importance_score": {"type": "number", "description": "0-100, relative to the other scenes in this script"},
                    "category": {
                        "type": "string",
                        "enum": ["Critical Scene", "Important Scene", "Supporting Scene", "Redundant Scene"],
                    },
                },
                "required": ["scene_number", "importance_score", "category"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["scenes"],
    "additionalProperties": False,
}

_IMPORTANCE_INSTRUCTIONS = (
    "You are a script editor ranking every scene in a screenplay by narrative importance, "
    "relative to the other scenes in the same script. You'll be given a numbered list of scene "
    "summaries (heading, dominant emotion, dialogue/action word counts, character count). Score "
    "each scene 0-100 for how structurally/narratively important it is relative to the rest of "
    "this script (plot-critical and emotionally pivotal scenes score higher; transitional or "
    "purely connective scenes score lower). Assign each scene one category: 'Critical Scene' "
    "(75-100), 'Important Scene' (55-74), 'Supporting Scene' (35-54), or 'Redundant Scene' (0-34). "
    "Return a score and category for every scene number given, in any order."
)

_COST_SCHEMA = {
    "type": "object",
    "properties": {
        "vfx_complexity": {"type": "string", "enum": ["Low", "Medium", "High"]},
        "shooting_difficulty": {"type": "string", "enum": ["Easy", "Moderate", "Complex"]},
        "budget_risk_score": {"type": "integer", "description": "5-95, overall production budget risk"},
        "estimated_budget_range": {"type": "string", "description": "A budget band in Indian Rupees, e.g. '\u20b915L - \u20b950L'"},
    },
    "required": ["vfx_complexity", "shooting_difficulty", "budget_risk_score", "estimated_budget_range"],
    "additionalProperties": False,
}

_COST_INSTRUCTIONS = (
    "You are a line producer estimating production complexity for a screenplay, based on its "
    "scene count, unique locations, unique characters, and action-line content. Estimate: "
    "vfx_complexity (Low/Medium/High, based on whether the action describes effects-heavy content "
    "like explosions, creatures, stunts, vehicles, etc.), shooting_difficulty (Easy/Moderate/Complex, "
    "based on overall logistics implied by scene/location/cast count), budget_risk_score (5-95, "
    "higher means more budget risk), and estimated_budget_range as a wide Indian Rupee band (e.g. "
    "'\u20b95L - \u20b915L', '\u20b915L - \u20b950L', '\u20b950L - \u20b92Cr') appropriate to the risk level. "
    "This is a fast triage estimate for early pre-production, not a real budget -- keep the range wide."
)


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


def _category_for_score(score: float) -> str:
    if score >= 75:
        return "Critical Scene"
    elif score >= 55:
        return "Important Scene"
    elif score >= 35:
        return "Supporting Scene"
    return "Redundant Scene"


def score_scene_importance_rule_based(scene_features: list[SceneFeatures]) -> list[dict]:
    """
    Deterministic fallback. Scores every scene 0-100 using a weighted blend
    of features, normalized against the script's own min/max for each
    feature so the score is meaningful relative to *this* screenplay
    rather than against some arbitrary global constant.
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

        results.append(
            {
                "scene_number": feat.scene_number,
                "scene_heading": feat.heading or "",
                "importance_score": round(score, 2),
                "category": _category_for_score(score),
            }
        )

    return results


def _score_scene_importance_openai(scene_features: list[SceneFeatures]) -> list[dict] | None:
    """
    Try a single batched OpenAI call covering every scene. Returns None
    (rather than raising) on any failure -- including a malformed/partial
    response that doesn't cover every scene number -- so the caller falls
    back to the rule-based scorer for the *whole* script rather than
    silently mixing AI and heuristic scores within one script.
    """
    summary_lines = []
    for f in scene_features:
        summary_lines.append(
            f"Scene {f.scene_number}: heading=\"{f.heading or ''}\" "
            f"dominant_emotion={f.dominant_emotion or 'neutral'} "
            f"dialogue_words={f.dialogue_word_count} action_words={f.action_word_count} "
            f"characters={f.character_count}"
        )
    input_text = "\n".join(summary_lines)

    try:
        result = openai_service.generate_structured(
            instructions=_IMPORTANCE_INSTRUCTIONS,
            input_text=input_text,
            schema_name="scene_importance",
            schema=_IMPORTANCE_SCHEMA,
            max_output_tokens=min(4000, 60 + len(scene_features) * 40),
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("OpenAI scene importance scoring failed, falling back to rule-based scorer: %s", exc)
        return None

    by_number = {row["scene_number"]: row for row in result.data.get("scenes", [])}
    expected_numbers = {f.scene_number for f in scene_features}
    if not expected_numbers.issubset(by_number.keys()):
        logger.warning("OpenAI scene importance response missing scenes; falling back to rule-based scorer.")
        return None

    heading_by_number = {f.scene_number: f.heading or "" for f in scene_features}
    return [
        {
            "scene_number": num,
            "scene_heading": heading_by_number.get(num, ""),
            "importance_score": round(float(by_number[num]["importance_score"]), 2),
            "category": by_number[num]["category"],
        }
        for num in sorted(expected_numbers)
    ]


def score_scene_importance(scene_features: list[SceneFeatures]) -> list[dict]:
    """
    Score every scene 0-100. Tries a single batched OpenAI call for the
    whole script first (if configured and the script isn't too long for
    that to be worthwhile -- see _MAX_SCENES_FOR_BATCHED_OPENAI_CALL),
    falling back to the deterministic rule-based scorer otherwise.
    """
    if not scene_features:
        return []

    if (
        settings.OPENAI_BATCH_ANALYSIS
        and openai_service.is_configured()
        and len(scene_features) <= _MAX_SCENES_FOR_BATCHED_OPENAI_CALL
    ):
        result = _score_scene_importance_openai(scene_features)
        if result is not None:
            return result

    return score_scene_importance_rule_based(scene_features)


def estimate_production_cost_rule_based(
    total_scenes: int,
    locations: list[str],
    characters: list[str],
    action_text_corpus: str,
) -> dict:
    """
    Deterministic fallback. Builds a weighted score from real structural
    signals (never just makes a number up).
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


def _estimate_production_cost_openai(
    total_scenes: int,
    unique_locations: int,
    unique_characters: int,
    action_text_corpus: str,
) -> dict | None:
    """Try OpenAI first. Returns None (rather than raising) on any
    OpenAI-side failure or malformed response, so the caller falls back to
    the rule-based estimator."""
    input_text = (
        f"Total scenes: {total_scenes}\n"
        f"Unique locations: {unique_locations}\n"
        f"Unique named characters: {unique_characters}\n"
        f"Action line excerpts: {action_text_corpus.strip()[:3000]}"
    )
    try:
        result = openai_service.generate_structured(
            instructions=_COST_INSTRUCTIONS,
            input_text=input_text,
            schema_name="cost_estimation",
            schema=_COST_SCHEMA,
            max_output_tokens=200,
        )
    except openai_service.OpenAIServiceError as exc:
        logger.warning("OpenAI cost estimation failed, falling back to rule-based estimator: %s", exc)
        return None

    data = result.data
    try:
        risk = int(data["budget_risk_score"])
    except (KeyError, TypeError, ValueError):
        return None

    return {
        "total_scenes": total_scenes,
        "total_locations": unique_locations,
        "total_characters": unique_characters,
        "vfx_complexity": data["vfx_complexity"],
        "shooting_difficulty": data["shooting_difficulty"],
        "budget_risk_score": max(5, min(95, risk)),
        "estimated_budget_range": data["estimated_budget_range"],
    }


def estimate_production_cost(
    total_scenes: int,
    locations: list[str],
    characters: list[str],
    action_text_corpus: str,
) -> dict:
    """
    Estimate production cost/complexity for the whole script. Tries a
    single OpenAI call first, falling back to the deterministic heuristic
    estimator on any failure. Response shape is unchanged either way, so
    the frontend's CostEstimationResponse schema doesn't need to change.
    """
    unique_locations = len(set(loc for loc in locations if loc))
    unique_characters = len(set(characters))

    if settings.OPENAI_BATCH_ANALYSIS and openai_service.is_configured():
        result = _estimate_production_cost_openai(
            total_scenes, unique_locations, unique_characters, action_text_corpus
        )
        if result is not None:
            return result

    return estimate_production_cost_rule_based(total_scenes, locations, characters, action_text_corpus)
