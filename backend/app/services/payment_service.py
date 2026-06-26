import razorpay
from app.core.config import settings

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

PLAN_PRICES = {
    "creator": 99900,        # \u20b9999 in paise
    "professional": 999900,  # \u20b99,999 in paise
}

PLAN_LIMITS = {
    "creator": 3,           # max 3 scripts
    "professional": -1,     # unlimited (-1)
    "studio": -1,           # unlimited (-1)
}


def create_payment_order(plan_type: str, user_id: int):
    amount = PLAN_PRICES.get(plan_type, 99900)
    order_data = {
        "amount": amount,
        "currency": "INR",
        "receipt": f"order_user_{user_id}",
        "notes": {"user_id": str(user_id), "plan_type": plan_type},
    }
    try:
        return client.order.create(data=order_data)
    except Exception as e:
        return {"error": str(e)}


def verify_payment(payment_id: str, order_id: str, signature: str) -> bool:
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_payment_id": payment_id,
                "razorpay_order_id": order_id,
                "razorpay_signature": signature,
            }
        )
        return True
    except Exception:
        return False


def check_script_limit(plan_type: str, current_count: int) -> bool:
    limit = PLAN_LIMITS.get(plan_type, 3)
    if limit == -1:
        return True
    return current_count < limit
