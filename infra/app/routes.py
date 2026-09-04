from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.config import DEFAULT_TTS_VOICE
from app.deps import LLMDep, TTSDep
from app.llm import LLMError
from app.schemas import ClozeCard, GenerateClozeRequest, GenerateTitleRequest, TitleCard
from app.services.cloze import generate_card_cloze
from app.services.title import generate_card_title
from app.tts import TTSError

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


@router.get("/tts")
async def tts_endpoint(
    tts: TTSDep,
    text: str = Query(..., description="朗读内容"),
    voice: str = Query(default=DEFAULT_TTS_VOICE),
) -> Response:
    stripped = text.strip()
    if not stripped:
        raise HTTPException(status_code=422, detail="text must not be empty")
    chosen_voice = voice.strip() or DEFAULT_TTS_VOICE
    try:
        audio = await tts.synthesize(stripped, chosen_voice)
    except TTSError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return Response(content=audio, media_type="audio/mpeg")
