"""
The unified analysis pipeline.

This is what makes Script Upload the single entry point: `run_pipeline()` is
called once, right after a script's scenes/characters/dialogues have been
parsed and persisted, and it runs every analysis stage in sequence, writing
structured rows (SceneEmotion, Character, StoryboardPanel) plus a cached
AnalysisResult row per stage. The unified dashboard then just reads what's
already there — no analysis page has to trigger its own backend call.

Stage order matters: emotion analysis must run before shot/BGM suggestions
and script review, since those stages consume each scene's dominant_emotion.
Character tracking (NER) must run before cost estimation, since cost
estimation needs the *complete* character list (heading-parsed + NER-found)
to count unique cast members accurately.

    1. character_tracking   -- NER pass over action lines, merged with the
                                heading-parsed character list already saved
    2. emotion_analysis      -- per-scene emotion scores
    3. shot_suggestions      -- per-scene camera coverage ideas
    4. bgm_recommendations   -- per-scene music mood + tracks
    5. storyboard            -- per-scene descriptive storyboard panel
    6. script_review         -- scene importance ranking + cost estimate
                                (consumes outputs of every stage above)

If any stage raises, the script's status flips to `failed` and
`error_message` records what happened — partial results already written for
earlier stages are left in place rather than rolled back, so a failure in
(say) storyboard generation doesn't hide the emotion analysis that already
succeeded.
"""
from __future__ import annotations

import logging
import re

from sqlalchemy.orm import Session

from app.ai import bgm as bgm_ai
from app.ai import emotion as emotion_ai
from app.ai import ner as ner_ai
from app.ai import script_review as script_review_ai
from app.ai import shot_recommend as shot_ai
from app.ai import storyboard as storyboard_ai
from app.models.analysis_result import AnalysisResult, AnalysisType
from app.models.character import Character
from app.models.dialogue import Dialogue
from app.models.scene import Scene
from app.models.scene_emotion import SceneEmotion
from app.models.script import Script, ScriptStatus
from app.models.storyboard_panel import StoryboardPanel

logger = logging.getLogger(__name__)


def _normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().upper())


def _save_stage_result(db: Session, script_id: int, analysis_type: AnalysisType, data: dict) -> None:
    existing = (
        db.query(AnalysisResult)
        .filter(
            AnalysisResult.script_id == script_id,
            AnalysisResult.analysis_type == analysis_type.value,
        )
        .first()
    )
    if existing:
        existing.result_data = data
    else:
        db.add(AnalysisResult(script_id=script_id, analysis_type=analysis_type.value, result_data=data))
    db.commit()


def _set_stage(db: Session, script: Script, stage: str) -> None:
    script.pipeline_stage = stage
    db.commit()
    logger.info("Script %s pipeline stage: %s", script.id, stage)


def _run_character_tracking(db: Session, script: Script, scenes: list[Scene]) -> dict[int, list[str]]:
    """
    Returns scene_id -> list of normalized character names present in that
    scene (heading-parsed + NER-found, deduped), and persists Character rows
    for any NER-found names that weren't already captured by the heading
    parser.
    """
    scene_id_to_characters: dict[int, list[str]] = {}

    for scene in scenes:
        heading_names = {_normalize_name(c.name): c.name for c in scene.characters}

        try:
            ner_names = ner_ai.extract_person_entities(scene.action_lines or "")
        except RuntimeError:
            # NER model unavailable in this environment (e.g. not installed
            # yet) -- degrade gracefully to heading-only character tracking
            # rather than failing the whole pipeline.
            logger.warning("NER model unavailable; falling back to heading-parsed characters only.")
            ner_names = []

        speaking_names = {_normalize_name(d.character_name) for d in scene.dialogues}

        all_normalized = dict(heading_names)
        for raw_name in ner_names:
            norm = _normalize_name(raw_name)
            if norm not in all_normalized:
                all_normalized[norm] = raw_name
                db.add(
                    Character(
                        scene_id=scene.id,
                        script_id=script.id,
                        name=raw_name,
                        normalized_name=norm,
                        source="ner",
                        is_speaking=norm in speaking_names,
                        mention_count=1,
                    )
                )

        # Backfill is_speaking on the heading-parsed rows too.
        for char_row in scene.characters:
            norm = _normalize_name(char_row.name)
            if norm in speaking_names and not char_row.is_speaking:
                char_row.is_speaking = True

        scene_id_to_characters[scene.id] = list(all_normalized.values())

    db.commit()
    return scene_id_to_characters


def _build_character_tracking_summary(script_id: int, db: Session) -> dict:
    """Aggregate per-scene Character rows into a script-wide tracking view."""
    characters = db.query(Character).filter(Character.script_id == script_id).all()

    by_name: dict[str, dict] = {}
    for c in characters:
        bucket = by_name.setdefault(
            c.normalized_name,
            {
                "name": c.name,
                "scene_count": 0,
                "speaking_scene_count": 0,
                "first_seen_scene": None,
                "sources": set(),
            },
        )
        bucket["scene_count"] += 1
        if c.is_speaking:
            bucket["speaking_scene_count"] += 1
        bucket["sources"].add(c.source)

    characters_out = []
    for norm_name, bucket in by_name.items():
        characters_out.append(
            {
                "name": bucket["name"],
                "scene_count": bucket["scene_count"],
                "speaking_scene_count": bucket["speaking_scene_count"],
                "detected_via": sorted(bucket["sources"]),
            }
        )
    characters_out.sort(key=lambda c: c["scene_count"], reverse=True)

    return {"script_id": script_id, "total_characters": len(characters_out), "characters": characters_out}


def run_pipeline(db: Session, script: Script) -> None:
    """
    Run every analysis stage for `script`, in order, persisting structured
    rows + cached AnalysisResult JSON as each stage completes. Raises on
    unrecoverable failure (caller is responsible for catching this and
    marking the script as failed -- see app/api/scripts.py).
    """
    scenes = db.query(Scene).filter(Scene.script_id == script.id).order_by(Scene.scene_number).all()
    if not scenes:
        raise ValueError("Script has no parsed scenes; cannot run analysis pipeline.")

    # ---- Stage 1: character tracking (NER + heading merge) ----
    _set_stage(db, script, "character_tracking")
    scene_characters = _run_character_tracking(db, script, scenes)
    character_summary = _build_character_tracking_summary(script.id, db)
    _save_stage_result(db, script.id, AnalysisType.character_tracking, character_summary)

    # ---- Stage 2: emotion analysis ----
    _set_stage(db, script, "emotion_analysis")
    scene_texts = [
        (s.scene_number, f"{s.action_lines or ''} {' '.join(d.dialogue_text for d in s.dialogues)}".strip())
        for s in scenes
    ]
    emotion_rows = emotion_ai.analyze_script_emotions(scene_texts)
    emotion_by_scene_number = {row["scene_number"]: row for row in emotion_rows}

    for scene in scenes:
        row = emotion_by_scene_number.get(scene.scene_number)
        if not row:
            continue
        existing = db.query(SceneEmotion).filter(SceneEmotion.scene_id == scene.id).first()
        if existing:
            target = existing
        else:
            target = SceneEmotion(scene_id=scene.id, script_id=script.id)
            db.add(target)
        target.joy = row["joy"]
        target.fear = row["fear"]
        target.sadness = row["sadness"]
        target.anger = row["anger"]
        target.tension = row["tension"]
        target.dominant_emotion = row["dominant_emotion"]
        target.model_name = row["model_name"]
    db.commit()

    _save_stage_result(
        db,
        script.id,
        AnalysisType.emotion_analysis,
        {"script_id": script.id, "emotions": [
            {k: v for k, v in row.items() if k != "model_name"} for row in emotion_rows
        ]},
    )

    # ---- Stage 3: dialogue density (no model needed, pure aggregation) ----
    dialogues = db.query(Dialogue).filter(Dialogue.script_id == script.id).all()
    total_words = sum(d.word_count or 0 for d in dialogues)
    by_character: dict[str, dict] = {}
    for d in dialogues:
        bucket = by_character.setdefault(
            d.normalized_character_name, {"character_name": d.character_name, "word_count": 0, "scene_count": 0}
        )
        bucket["word_count"] += d.word_count or 0
        bucket["scene_count"] += 1
    dialogue_rows = [
        {
            "character_name": b["character_name"],
            "word_count": b["word_count"],
            "dialogue_percentage": round((b["word_count"] / total_words * 100) if total_words else 0, 2),
            "scene_count": b["scene_count"],
        }
        for b in by_character.values()
    ]
    _save_stage_result(
        db,
        script.id,
        AnalysisType.dialogue_density,
        {"script_id": script.id, "total_words": total_words, "dialogues": dialogue_rows},
    )

    # ---- Stage 4: shot suggestions ----
    _set_stage(db, script, "shot_suggestions")
    shot_input = [
        {
            "scene_number": s.scene_number,
            "heading": s.heading,
            "time_of_day": s.time_of_day,
            "action_lines": s.action_lines,
            "dominant_emotion": emotion_by_scene_number.get(s.scene_number, {}).get("dominant_emotion"),
            "character_count": len(scene_characters.get(s.id, [])),
        }
        for s in scenes
    ]
    shot_rows = shot_ai.build_shot_suggestions(shot_input)
    primary_shot_by_scene_number = {
        row["scene_number"]: (row["suggested_shots"][0] if row["suggested_shots"] else "Medium Shot")
        for row in shot_rows
    }
    _save_stage_result(
        db, script.id, AnalysisType.shot_suggestions, {"script_id": script.id, "suggestions": shot_rows}
    )

    # ---- Stage 5: BGM recommendations ----
    bgm_input = [
        {
            "scene_number": s.scene_number,
            "heading": s.heading,
            "time_of_day": s.time_of_day,
            "action_lines": s.action_lines,
            "dominant_emotion": emotion_by_scene_number.get(s.scene_number, {}).get("dominant_emotion"),
        }
        for s in scenes
    ]
    bgm_rows = bgm_ai.build_bgm_recommendations(bgm_input)
    _save_stage_result(
        db, script.id, AnalysisType.bgm_recommendations, {"script_id": script.id, "recommendations": bgm_rows}
    )

    # ---- Stage 6: storyboard ----
    _set_stage(db, script, "storyboard")
    storyboard_input = [
        {
            "scene_number": s.scene_number,
            "heading": s.heading,
            "action_lines": s.action_lines,
            "dominant_emotion": emotion_by_scene_number.get(s.scene_number, {}).get("dominant_emotion"),
            "primary_shot": primary_shot_by_scene_number.get(s.scene_number),
            "character_names": scene_characters.get(s.id, []),
        }
        for s in scenes
    ]
    storyboard_rows = storyboard_ai.build_storyboard(storyboard_input)

    for s in scenes:
        panel_data = next((p for p in storyboard_rows if p["scene_number"] == s.scene_number), None)
        if not panel_data:
            continue
        existing_panel = db.query(StoryboardPanel).filter(StoryboardPanel.scene_id == s.id).first()
        target = existing_panel or StoryboardPanel(scene_id=s.id, script_id=script.id)
        if not existing_panel:
            db.add(target)
        target.panel_number = panel_data["panel_number"]
        target.shot_type = panel_data["shot_type"]
        target.camera_angle = panel_data["camera_angle"]
        target.composition_notes = panel_data["composition_notes"]
        target.key_visual_elements = panel_data["key_visual_elements"]
        target.mood_lighting = panel_data["mood_lighting"]
    db.commit()

    _save_stage_result(
        db,
        script.id,
        AnalysisType.storyboard,
        {"script_id": script.id, "panels": storyboard_rows},
    )

    # ---- Stage 7: script review (scene importance + cost estimation) ----
    _set_stage(db, script, "script_review")
    scene_features = [
        script_review_ai.SceneFeatures(
            scene_number=s.scene_number,
            heading=s.heading or "",
            location=s.location,
            dialogue_word_count=sum(d.word_count or 0 for d in s.dialogues),
            character_count=len(scene_characters.get(s.id, [])),
            action_word_count=len((s.action_lines or "").split()),
            dominant_emotion=emotion_by_scene_number.get(s.scene_number, {}).get("dominant_emotion"),
            emotion_intensity=max(
                emotion_by_scene_number.get(s.scene_number, {}).get(k, 0.0)
                for k in ("joy", "fear", "sadness", "anger", "tension")
            )
            if s.scene_number in emotion_by_scene_number
            else 0.0,
        )
        for s in scenes
    ]
    importance_rows = script_review_ai.score_scene_importance(scene_features)
    importance_by_scene_number = {row["scene_number"]: row for row in importance_rows}
    for s in scenes:
        row = importance_by_scene_number.get(s.scene_number)
        if row:
            s.importance_score = row["importance_score"]
            s.importance_category = row["category"]
    db.commit()

    all_locations = [s.location for s in scenes]
    all_character_names = [name for names in scene_characters.values() for name in names]
    full_action_corpus = " ".join(s.action_lines or "" for s in scenes)
    cost_estimate = script_review_ai.estimate_production_cost(
        total_scenes=len(scenes),
        locations=all_locations,
        characters=all_character_names,
        action_text_corpus=full_action_corpus,
    )
    cost_estimate["script_id"] = script.id

    _save_stage_result(
        db,
        script.id,
        AnalysisType.script_review,
        {
            "script_id": script.id,
            "scene_importance": importance_rows,
            "cost_estimation": cost_estimate,
        },
    )

    # ---- Done ----
    script.status = ScriptStatus.completed
    script.pipeline_stage = "completed"
    script.error_message = None
    db.commit()
