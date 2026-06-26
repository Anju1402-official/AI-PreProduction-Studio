from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.character import Character
from app.models.dialogue import Dialogue
from app.models.scene import Scene
from app.models.script import Script, ScriptStatus
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary/{user_id}")
def get_dashboard_summary(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    scripts = db.query(Script).filter(Script.user_id == user_id).all()
    script_ids = [s.id for s in scripts]

    total_scenes = db.query(Scene).filter(Scene.script_id.in_(script_ids)).count() if script_ids else 0
    total_characters = (
        db.query(Character).filter(Character.script_id.in_(script_ids)).count() if script_ids else 0
    )
    total_dialogues = db.query(Dialogue).filter(Dialogue.script_id.in_(script_ids)).count() if script_ids else 0

    completed_scripts = [s for s in scripts if s.status == ScriptStatus.completed]
    recent_scripts = sorted(scripts, key=lambda x: x.created_at, reverse=True)[:5]

    return {
        "user_id": user_id,
        "user_name": user.name,
        "plan_type": user.plan_type.value,
        "stats": {
            "total_scripts": len(scripts),
            "completed_scripts": len(completed_scripts),
            "total_scenes": total_scenes,
            "total_characters": total_characters,
            "total_dialogues": total_dialogues,
        },
        "recent_scripts": [
            {
                "id": s.id,
                "title": s.title,
                "status": s.status.value,
                "pipeline_stage": s.pipeline_stage,
                "created_at": s.created_at.isoformat(),
            }
            for s in recent_scripts
        ],
    }


@router.get("/stats")
def get_overall_stats(db: Session = Depends(get_db)):
    return {
        "total_users": db.query(User).count(),
        "total_scripts": db.query(Script).count(),
        "total_scenes": db.query(Scene).count(),
        "total_characters": db.query(Character).count(),
    }
