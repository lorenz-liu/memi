from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from app.llm import LLMClient, LLMError
from app.prompts.cloze import build_messages
from app.schemas import ClozeCard


def generate_card_cloze(text: str, llm: LLMClient) -> ClozeCard:
    payload = llm.complete_json(build_messages(text))
    card_data = _unwrap_card(payload)
    try:
        return ClozeCard.model_validate(card_data)
    except ValidationError as exc:
        raise LLMError("Model JSON is not a valid cloze card") from exc


def _unwrap_card(payload: dict[str, Any]) -> dict[str, Any]:
    cards = payload.get("cards")
    if isinstance(cards, list) and cards and isinstance(cards[0], dict):
        return cards[0]
    return payload
