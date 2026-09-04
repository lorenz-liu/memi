from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.deps import LLMDep
from app.llm import LLMError
from app.schemas import ClozeCard, GenerateClozeRequest, GenerateTitleRequest, TitleCard
from app.services.cloze import generate_card_cloze
from app.services.title import generate_card_title

router = APIRouter()


@router.post("/generate_card_cloze", response_model=ClozeCard)
def generate_card_cloze_endpoint(
    body: GenerateClozeRequest,
    llm: LLMDep,
) -> ClozeCard:
    try:
        return generate_card_cloze(body.text, llm)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/generate_card_title", response_model=TitleCard)
def generate_card_title_endpoint(
    body: GenerateTitleRequest,
    llm: LLMDep,
) -> TitleCard:
    try:
        return generate_card_title(body.text, body.language, llm)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
