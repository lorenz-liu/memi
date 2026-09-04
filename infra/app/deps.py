from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.llm import GroqLLMClient, LLMClient


@lru_cache
def get_llm() -> LLMClient:
    return GroqLLMClient.from_env()


LLMDep = Annotated[LLMClient, Depends(get_llm)]
