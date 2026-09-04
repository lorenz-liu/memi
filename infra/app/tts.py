from __future__ import annotations

from typing import Protocol

import edge_tts


class TTSError(Exception):
    """Raised when speech synthesis fails."""


class TTSClient(Protocol):
    async def synthesize(self, text: str, voice: str) -> bytes: ...


class EdgeTTSClient:
    async def synthesize(self, text: str, voice: str) -> bytes:
        try:
            communicate = edge_tts.Communicate(text, voice)
            audio_data = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.extend(chunk["data"])
        except Exception as exc:
            raise TTSError("Could not synthesize speech") from exc
        if not audio_data:
            raise TTSError("TTS returned no audio")
        return bytes(audio_data)
