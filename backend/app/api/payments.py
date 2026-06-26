from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.script import Script
from app.models.user import PlanType, User
from app.services.payment_service import check_script_limit, create_payment_order, verify_payment

router = APIRouter(prefix="/payments", tags=["Payments"])


class OrderRequest(BaseModel):
    user_id: int
    plan_type: PlanType


class VerifyRequest(BaseModel):
    user_id: int
    plan_type: PlanType
    payment_id: str
    order_id: str
    signature: str


@router.post("/create-order")
def create_order(request: OrderRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    order = create_payment_order(request.plan_type.value, request.user_id)
    if "error" in order:
        raise HTTPException(status_code=400, detail=order["error"])

    return {
        "order_id": order.get("id"),
        "amount": order.get("amount"),
        "currency": order.get("currency"),
        "plan_type": request.plan_type.value,
    }


@router.post("/verify")
def verify_payment_endpoint(request: VerifyRequest, db: Session = Depends(get_db)):
    is_valid = verify_payment(request.payment_id, request.order_id, request.signature)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # request.plan_type is already a validated PlanType (FastAPI rejects
    # anything else with a 422 before this handler runs), so this can never
    # raise KeyError the way the previous PlanType[request.plan_type]
    # lookup against a raw string could.
    user.plan_type = request.plan_type
    db.commit()
    db.refresh(user)

    return {"message": "Payment verified and plan updated successfully", "user_id": user.id, "new_plan": user.plan_type.value}


@router.get("/check-limit/{user_id}")
def check_limit(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    script_count = db.query(Script).filter(Script.user_id == user_id).count()
    can_upload = check_script_limit(user.plan_type.value, script_count)

    return {
        "user_id": user_id,
        "plan_type": user.plan_type.value,
        "scripts_uploaded": script_count,
        "can_upload": can_upload,
        "message": "Upload allowed" if can_upload else "Plan limit reached. Please upgrade your plan",
    }


@router.get("/plans")
def get_plans():
    return {
        "plans": [
            {
                "name": "Creator Plan",
                "plan_type": "creator",
                "price": "\u20b9999 - \u20b92,999/month",
                "features": ["Up to 3 script uploads", "Basic storyboards", "BGM suggestions", "Emotion analysis"],
            },
            {
                "name": "Professional Director Plan",
                "plan_type": "professional",
                "price": "\u20b99,999/month",
                "features": ["Unlimited scripts", "Advanced analytics", "Team collaboration", "All analysis features"],
            },
            {
                "name": "Studio Plan",
                "plan_type": "studio",
                "price": "Custom pricing",
                "features": ["Multi-project management", "Enterprise dashboard", "Dedicated AI models", "Production reporting"],
            },
        ]
    }
