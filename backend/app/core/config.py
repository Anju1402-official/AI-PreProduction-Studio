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

    # --- OpenAI ---
    # Primary AI backend for emotion/dialogue/scene-importance/shot/BGM/
    # storyboard/script-review analysis. The local HF/spaCy models above
    # remain as an automatic fallback if OpenAI is unreachable, mis-
    # configured, or rate-limited -- see app/services/openai_service.py.
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-5.5"
    # Per-request timeout in seconds. GPT-5-class "nano" models are meant to
    # be fast; a generous-but-bounded timeout keeps a stuck request from
    # hanging the upload pipeline indefinitely.
    OPENAI_TIMEOUT_SECONDS: float = 30.0
    # Number of retries for transient failures (rate limits, connection
    # errors, timeouts) before falling back to the local model / a safe
    # default. Uses exponential backoff between attempts.
    OPENAI_MAX_RETRIES: int = 2
    # If true, scripts longer than ~20 scenes get a single combined OpenAI
    # call per analysis type instead of one call per scene, to keep token
    # usage and request count down on longer screenplays.
    OPENAI_BATCH_ANALYSIS: bool = True

    # If true, use OpenAI for emotion analysis and character tracking
    # instead of the local HF/spaCy models (job 5 of the integration); the
    # local models are always still available as a same-run fallback if an
    # OpenAI call fails, regardless of this flag.
    USE_OPENAI_FOR_EMOTION: bool = True
    USE_OPENAI_FOR_CHARACTERS: bool = True

    # If true, the upload pipeline runs synchronously inside the upload request.
    # If false, it's dispatched as a FastAPI BackgroundTask and the script's
    # status starts as "processing" until the pipeline finishes.
    RUN_PIPELINE_SYNC: bool = False

    # Upload constraints
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    UPLOAD_DIR: str = "uploads"


settings = Settings()
