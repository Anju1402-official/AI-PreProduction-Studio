"""
Reusable OpenAI service.

This is the single place the rest of the backend goes through to call
OpenAI -- every AI module in app/ai/ that wants an OpenAI-backed result
calls `generate_structured()` here rather than constructing its own client
or request. Centralizing it means:

  - the client is created once per process (OpenAI's own client is
    thread-safe and pools HTTP connections internally, so re-creating it
    per-request would just throw that pooling away for no benefit)
  - every caller gets the same error handling, retry behavior, and
    response-caching for free
  - swapping models, providers, or retry behavior later is a one-file change

Design notes on the specific choices below:

  * Uses the Responses API (`client.responses.create`), not the older Chat
    Completions API -- this is what the project was explicitly asked to use
    for a GPT-5-class model, and it's the API OpenAI's own SDK is steering
    new integrations toward for structured output.
  * Structured output goes through `text.format` with a strict JSON Schema
    (`{"type": "json_schema", "schema": ..., "strict": True}`) rather than
    asking the model to "please respond in JSON" in the prompt and hoping --
    strict JSON Schema mode means the SDK/API itself guarantees the shape,
    so callers don't need to defensively re-validate every field.
  * Reasoning effort is set to "minimal" by default. GPT-5-class models can
    spend variable amounts of internal reasoning before answering; for
    short, well-defined extraction/classification tasks like "score this
    scene's emotions" there's no benefit to deep reasoning, only latency
    and token cost -- this directly serves the brief's "minimize token
    usage" / "keep prompts concise" requirements.
  * verbosity="low" on the text config asks the model to keep any
    non-schema-constrained text terse, for the same reason.
"""
from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from dataclasses import dataclass
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Errors
# --------------------------------------------------------------------------


class OpenAIServiceError(Exception):
    """Base class for every error this service raises."""


class OpenAINotConfiguredError(OpenAIServiceError):
    """Raised when OPENAI_API_KEY is missing/blank. Callers should treat
    this the same as any other failure and fall back to a local
    implementation if one exists -- it is not a bug, just an unconfigured
    deployment (e.g. local dev without a key set)."""


class OpenAIAuthenticationError(OpenAIServiceError):
    """The API key was rejected (invalid, revoked, wrong project, etc.)."""


class OpenAIRateLimitedError(OpenAIServiceError):
    """Rate limit or quota exceeded, even after retrying with backoff."""


class OpenAITimeoutError(OpenAIServiceError):
    """The request timed out, even after retrying."""


class OpenAIConnectionError(OpenAIServiceError):
    """A network-level failure reaching the API, even after retrying."""


class OpenAIResponseError(OpenAIServiceError):
    """The API responded, but the content couldn't be parsed/used (e.g.
    malformed JSON despite strict mode, empty output, refusal)."""


# --------------------------------------------------------------------------
# Client singleton
# --------------------------------------------------------------------------

_client = None
_client_lock = threading.Lock()


def _get_client():
    """
    Lazily construct and cache the OpenAI client for this process.

    Lazy construction (rather than at import time) matters for two
    reasons: importing this module must never fail just because
    OPENAI_API_KEY isn't set yet (e.g. during tests, or before a deploy's
    env vars are configured), and constructing the client is cheap but
    pointless to redo if nothing ever calls into this service.
    """
    global _client
    if _client is not None:
        return _client

    with _client_lock:
        if _client is not None:
            return _client

        if not settings.OPENAI_API_KEY:
            raise OpenAINotConfiguredError(
                "OPENAI_API_KEY is not set. Add it to your .env file -- see .env.example."
            )

        try:
            from openai import OpenAI
        except ImportError as exc:  # pragma: no cover - import guard
            raise OpenAIServiceError(
                "The openai package is not installed. Run `pip install -r requirements.txt` "
                "in backend/ before starting the server."
            ) from exc

        _client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.OPENAI_TIMEOUT_SECONDS)
        logger.info("OpenAI client initialized (model=%s).", settings.OPENAI_MODEL)
        return _client


def reset_client_for_testing() -> None:
    """Test-only hook to force the client singleton to be rebuilt on the
    next call -- without this, tests that monkeypatch settings.OPENAI_API_KEY
    between cases would silently reuse whichever client got built first."""
    global _client
    with _client_lock:
        _client = None


# --------------------------------------------------------------------------
# In-memory response cache
# --------------------------------------------------------------------------
#
# Keyed on a hash of (model, instructions, input, schema name) so identical
# requests -- e.g. re-opening a script's dashboard before its data has
# changed, or two scenes that happen to have identical text -- don't burn a
# fresh OpenAI call. This is intentionally a simple process-local dict, not
# a distributed cache: the data here is cheap to regenerate and short-lived
# by nature (it's tied to a script's content, which doesn't change after
# upload), so the added complexity of a shared cache (Redis, etc.) isn't
# justified for this use case.

_response_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_cache_lock = threading.Lock()
_CACHE_TTL_SECONDS = 60 * 60 * 6  # 6 hours -- long enough to cover retries/re-renders of one upload


def _cache_key(model: str, instructions: str, input_text: str, schema_name: str) -> str:
    raw = f"{model}|{schema_name}|{instructions}|{input_text}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _cache_get(key: str) -> dict[str, Any] | None:
    with _cache_lock:
        entry = _response_cache.get(key)
        if entry is None:
            return None
        cached_at, value = entry
        if time.monotonic() - cached_at > _CACHE_TTL_SECONDS:
            del _response_cache[key]
            return None
        return value


def _cache_set(key: str, value: dict[str, Any]) -> None:
    with _cache_lock:
        _response_cache[key] = (time.monotonic(), value)
        # Cheap unbounded-growth guard: if the cache somehow grew very
        # large (e.g. a long-running process analyzing thousands of
        # scripts), drop the oldest quarter of entries rather than letting
        # it grow forever.
        if len(_response_cache) > 5000:
            oldest = sorted(_response_cache.items(), key=lambda kv: kv[1][0])[:1250]
            for k, _ in oldest:
                del _response_cache[k]


def clear_cache() -> None:
    """Test-only / ops hook to drop every cached response."""
    with _cache_lock:
        _response_cache.clear()


# --------------------------------------------------------------------------
# Core call
# --------------------------------------------------------------------------


@dataclass
class StructuredResult:
    data: dict[str, Any]
    from_cache: bool
    model: str


def generate_structured(
    *,
    instructions: str,
    input_text: str,
    schema_name: str,
    schema: dict[str, Any],
    max_output_tokens: int = 800,
    reasoning_effort: str = "minimal",
    verbosity: str = "low",
    use_cache: bool = True,
) -> StructuredResult:
    """
    Calls the OpenAI Responses API with strict JSON-Schema structured
    output and returns the parsed result.

    Parameters
    ----------
    instructions:
        System-level instructions (the model's "role" / task description).
        Kept separate from `input_text` so the same instructions can be
        cached/reused across many calls with different input.
    input_text:
        The actual content to analyze (scene text, dialogue, etc).
    schema_name:
        A short identifier for the schema (used in the cache key and in
        the request itself, e.g. "emotion_analysis").
    schema:
        A JSON Schema dict describing the exact shape of the expected
        response. Must set "additionalProperties": false and list every
        property in "required" for strict mode to accept it.
    max_output_tokens:
        Hard cap on output length. Kept low and schema-specific by each
        caller (see app/ai/*.py) since every field is already structurally
        bounded by the schema -- there's no reason to allow more tokens
        than the largest plausible valid response needs.
    reasoning_effort:
        "minimal" | "low" | "medium" | "high". Defaults to "minimal" --
        see module docstring.
    verbosity:
        "low" | "medium" | "high" -- terseness hint for any non-schema text.
    use_cache:
        Set to False for calls that must always hit the API fresh (none of
        the current callers need this, but it's here for completeness /
        future use, e.g. an explicit "regenerate" action a user triggers).

    Raises
    ------
    OpenAINotConfiguredError, OpenAIAuthenticationError, OpenAIRateLimitedError,
    OpenAITimeoutError, OpenAIConnectionError, OpenAIResponseError
        See the class docstrings above. Callers in app/ai/*.py are expected
        to catch OpenAIServiceError (the common base) and fall back to a
        local implementation or a safe default rather than letting these
        propagate into a 500 for the end user.
    """
    cache_key = _cache_key(settings.OPENAI_MODEL, instructions, input_text, schema_name)
    if use_cache:
        cached = _cache_get(cache_key)
        if cached is not None:
            return StructuredResult(data=cached, from_cache=True, model=settings.OPENAI_MODEL)

    client = _get_client()  # raises OpenAINotConfiguredError if no key set

    from openai import (
        APIConnectionError,
        APITimeoutError,
        AuthenticationError,
        RateLimitError,
    )
    from openai import APIError as OpenAIAPIError

    text_config = {
        "format": {
            "type": "json_schema",
            "name": schema_name,
            "schema": schema,
            "strict": True,
        },
        "verbosity": verbosity,
    }

    last_exc: Exception | None = None
    for attempt in range(settings.OPENAI_MAX_RETRIES + 1):
        try:
            response = client.responses.create(
                model=settings.OPENAI_MODEL,
                instructions=instructions,
                input=input_text,
                text=text_config,
                reasoning={"effort": reasoning_effort},
                max_output_tokens=max_output_tokens,
            )
            break
        except AuthenticationError as exc:
            # Never worth retrying -- the key is wrong/revoked regardless
            # of how many times we ask.
            raise OpenAIAuthenticationError(
                "OpenAI rejected the API key. Check OPENAI_API_KEY in your .env file."
            ) from exc
        except RateLimitError as exc:
            last_exc = exc
            if attempt < settings.OPENAI_MAX_RETRIES:
                _sleep_backoff(attempt)
                continue
            raise OpenAIRateLimitedError(
                "OpenAI rate limit or quota exceeded after retrying."
            ) from exc
        except APITimeoutError as exc:
            last_exc = exc
            if attempt < settings.OPENAI_MAX_RETRIES:
                _sleep_backoff(attempt)
                continue
            raise OpenAITimeoutError(
                f"OpenAI request timed out after {settings.OPENAI_TIMEOUT_SECONDS}s, even after retrying."
            ) from exc
        except APIConnectionError as exc:
            last_exc = exc
            if attempt < settings.OPENAI_MAX_RETRIES:
                _sleep_backoff(attempt)
                continue
            raise OpenAIConnectionError(
                "Could not reach the OpenAI API (network error), even after retrying."
            ) from exc
        except OpenAIAPIError as exc:
            # Catch-all for other API-side errors (5xx, bad request, etc).
            # Retry server-side (5xx) errors; anything else is treated as
            # non-retryable since retrying an identical malformed request
            # won't fix it.
            status = getattr(exc, "status_code", None)
            last_exc = exc
            if status and status >= 500 and attempt < settings.OPENAI_MAX_RETRIES:
                _sleep_backoff(attempt)
                continue
            raise OpenAIResponseError(f"OpenAI API error: {exc}") from exc
    else:
        # The for/else only runs if we exhausted the loop without `break`,
        # which means every attempt raised and got retried until attempts
        # ran out without an explicit raise above -- defensive fallback,
        # shouldn't normally be reachable given the raises inside the loop.
        raise OpenAIResponseError(f"OpenAI request failed after retries: {last_exc}")

    output_text = getattr(response, "output_text", None)
    if not output_text:
        raise OpenAIResponseError("OpenAI returned an empty response.")

    try:
        parsed = json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise OpenAIResponseError(f"OpenAI response was not valid JSON despite strict mode: {exc}") from exc

    if use_cache:
        _cache_set(cache_key, parsed)

    return StructuredResult(data=parsed, from_cache=False, model=settings.OPENAI_MODEL)


def _sleep_backoff(attempt: int) -> None:
    """Exponential backoff with a small base delay: 0.5s, 1s, 2s, ..."""
    time.sleep(0.5 * (2**attempt))


def is_configured() -> bool:
    """Cheap check callers can use to skip straight to a local fallback
    without paying for a failed client construction / exception first."""
    return bool(settings.OPENAI_API_KEY)
