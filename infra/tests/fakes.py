from __future__ import annotations

from typing import Any

class FakeLLM:
    def __init__(self, payload: dict[str, Any] | Exception) -> None:
        self.payload = payload
        self.calls: list[dict[str, Any]] = []

    def complete_json(
        self,
        messages: list[dict[str, str]],
        *,
        max_completion_tokens: int = 2048,
        temperature: float = 1,
    ) -> dict[str, Any]:
        self.calls.append(
            {
                "messages": messages,
                "max_completion_tokens": max_completion_tokens,
                "temperature": temperature,
            }
        )
        if isinstance(self.payload, Exception):
            raise self.payload
        return dict(self.payload)


class FakeTTS:
    def __init__(self, payload: bytes | Exception) -> None:
        self.payload = payload
        self.calls: list[dict[str, str]] = []

    async def synthesize(self, text: str, voice: str) -> bytes:
        self.calls.append({"text": text, "voice": voice})
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


VALID_CLOZE_CARD = {
    "original_context": "Hier soir, nous sommes allés au cinéma.",
    "masked_text": "Hier soir, nous {{c1::sommes allés}} au cinéma.",
    "blanks": [
        {
            "index": "c1",
            "target": "sommes allés",
            "hint": "aller, Passé Composé",
            "explanation": "auxiliaire être",
        }
    ],
}
