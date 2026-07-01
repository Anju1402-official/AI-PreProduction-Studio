from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from app.database import Base
import enum


class ArtifactKind(enum.Enum):
    """
    Every AI-generated creative artifact in the studio is stored in one
    table keyed by `kind`, rather than a separate near-identical table per
    feature. The generators (Story / Script / Character / World / Storyboard)
    all produce a title + a JSON `content` blob whose shape is defined by the
    matching Pydantic schema in app/schemas/generation.py, so a single
    flexible table keeps the schema small and lets the asset libraries query
    by kind with one model.

    `template` rows are the seedable starting points the Templates page
    browses; they share the same storage but are created by a seeder /
    admin rather than by a user-triggered generation.
    """

    story = "story"
    script = "script"
    character = "character"
    world = "world"
    storyboard = "storyboard"
    template = "template"


class GeneratedArtifact(Base):
    __tablename__ = "generated_artifacts"

    id = Column(Integer, primary_key=True, index=True)

    # Nullable so system-seeded templates (which belong to no user) can live
    # in the same table. User-generated artifacts always set this.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    kind = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)

    # The structured payload for this artifact. Shape depends on `kind` and
    # matches the corresponding *Content schema in app/schemas/generation.py.
    content = Column(JSON, nullable=True)

    # The original user prompt / inputs that produced this artifact, kept so
    # the UI can show "what you asked for" and so a regenerate action has the
    # original brief to work from.
    prompt = Column(JSON, nullable=True)

    # The OpenAI model that produced it (or "seed" for templates), for
    # display + debugging.
    model = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
