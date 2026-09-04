from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException

from app.llm import GroqLLMClient, LLMClient, LLMError


@lru_cache
def get_llm() -> LLMClient:
    try:
        return GroqLLMClient.from_env()
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


LLMDep = Annotated[LLMClient, Depends(get_llm)]
