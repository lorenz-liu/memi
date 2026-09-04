from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException

from app.llm import GroqLLMClient, LLMClient, LLMError
from app.tts import EdgeTTSClient, TTSClient


@lru_cache
def get_llm() -> LLMClient:
    try:
        return GroqLLMClient.from_env()
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@lru_cache
def get_tts() -> TTSClient:
    return EdgeTTSClient()


LLMDep = Annotated[LLMClient, Depends(get_llm)]
TTSDep = Annotated[TTSClient, Depends(get_tts)]
