from __future__ import annotations

from pydantic import ValidationError

from app.llm import LLMClient, LLMError
from app.prompts.title import build_messages
from app.schemas import TitleCard


def generate_card_title(text: str, language: str, llm: LLMClient) -> TitleCard:
    payload = llm.complete_json(
        build_messages(text, language),
        max_completion_tokens=1024,
        temperature=0.4,
        reasoning_effort="low",
    )
    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        raise LLMError("Model JSON is missing a title")
    try:
        return TitleCard.model_validate({"title": title.strip(), "language": language})
    except ValidationError as exc:
        raise LLMError("Model JSON is not a valid title card") from exc
