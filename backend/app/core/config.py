from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # --- Core ---
    DATABASE_URL: str
    SECRET_KEY: str

    # --- Payments (Razorpay) ---
    RAZORPAY_KEY_ID: str = "your_key_id"
    RAZORPAY_KEY_SECRET: str = "your_key_secret"

    # --- AI / ML models ---
    # Local cache directories for the pretrained models (see ml_models/README.md).
    # Defaults assume the standard repo layout: backend/ sits next to ml_models/.
    EMOTION_MODEL_NAME: str = "j-hartmann/emotion-english-distilroberta-base"
    EMOTION_MODEL_CACHE_DIR: str = str(
        Path(__file__).resolve().parents[3] / "ml_models" / "emotion_model" / "cache"
    )
    NER_MODEL_NAME: str = "en_core_web_trf"

    # If true, the upload pipeline runs synchronously inside the upload request.
    # If false, it's dispatched as a FastAPI BackgroundTask and the script's
    # status starts as "processing" until the pipeline finishes.
    RUN_PIPELINE_SYNC: bool = False

    # Upload constraints
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    UPLOAD_DIR: str = "uploads"


settings = Settings()
