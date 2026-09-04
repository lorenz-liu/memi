from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Protocol

from dotenv import load_dotenv
from groq import APIError, Groq

from app.config import DEFAULT_MODEL


class LLMError(Exception):
    """Raised when the model call or JSON parse fails."""


class LLMClient(Protocol):
    def complete_json(
        self,
        messages: list[dict[str, str]],
        *,
        max_completion_tokens: int = 2048,
        temperature: float = 1,
        reasoning_effort: str = "medium",
    ) -> dict[str, Any]: ...


def _load_env_files() -> None:
    infra_dir = Path(__file__).resolve().parents[1]
    load_dotenv(infra_dir / ".env")
    load_dotenv(infra_dir.parent / ".env")


class GroqLLMClient:
    def __init__(self, client: Groq, model: str = DEFAULT_MODEL) -> None:
        self._client = client
        self._model = model

    @classmethod
    def from_env(cls) -> GroqLLMClient:
        _load_env_files()
        api_key = os.environ.get("GROQ_API_KEY", "").strip().strip("\"'“”")
        if not api_key:
            raise LLMError(
                'GROQ_API_KEY is missing. Put it in infra/.env or export GROQ_API_KEY="gsk_..."'
            )
        return cls(Groq(api_key=api_key))

    def complete_json(
        self,
        messages: list[dict[str, str]],
        *,
        max_completion_tokens: int = 2048,
        temperature: float = 1,
        reasoning_effort: str = "medium",
    ) -> dict[str, Any]:
        try:
            completion = self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=temperature,
                max_completion_tokens=max_completion_tokens,
                top_p=1,
                reasoning_effort=reasoning_effort,
                response_format={"type": "json_object"},
                stream=False,
                stop=None,
            )
        except APIError as exc:
            raise LLMError("Model request failed") from exc
        raw_output = completion.choices[0].message.content
        if not raw_output:
            raise LLMError("Model returned an empty response")
        try:
            parsed = json.loads(raw_output)
        except json.JSONDecodeError as exc:
            raise LLMError("Model returned invalid JSON") from exc
        if not isinstance(parsed, dict):
            raise LLMError("Model JSON must be an object")
        return parsed
