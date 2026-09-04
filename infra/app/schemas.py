from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

ISO_639_PATTERN = re.compile(r"^[A-Za-z]{2,3}$")


def _require_nonempty_text(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError("text must not be empty")
    return stripped


class GenerateClozeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Source note to turn into one cloze card")

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return _require_nonempty_text(value)


class GenerateTitleRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Source note to title")
    language: str = Field(
        ...,
        description="ISO 639 language code for the title, e.g. zh, en, fr",
        examples=["zh", "en", "fr"],
    )

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return _require_nonempty_text(value)

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: str) -> str:
        code = value.strip().lower()
        if not ISO_639_PATTERN.fullmatch(code):
            raise ValueError("language must be an ISO 639 code (2 or 3 letters), e.g. zh, en, fr")
        return code


class ClozeBlank(BaseModel):
    model_config = ConfigDict(extra="ignore")

    index: str
    target: str
    hint: str
    explanation: str


class ClozeCard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    original_context: str
    masked_text: str
    blanks: list[ClozeBlank]


class TitleCard(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    language: str
