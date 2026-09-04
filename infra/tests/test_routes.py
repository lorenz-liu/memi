from fastapi.testclient import TestClient

from app.config import DEFAULT_TTS_VOICE
from app.llm import LLMError
from app.tts import TTSError
from tests.fakes import VALID_CLOZE_CARD, FakeLLM, FakeTTS


def test_generate_card_cloze_ok(client: TestClient, fake_llm: FakeLLM) -> None:
    fake_llm.payload = VALID_CLOZE_CARD
    response = client.post("/generate_card_cloze", json={"text": "nous sommes allés"})
    assert response.status_code == 200
    body = response.json()
    assert body["masked_text"] == VALID_CLOZE_CARD["masked_text"]
    assert "category" not in body


def test_generate_card_cloze_rejects_empty_text(client: TestClient) -> None:
    response = client.post("/generate_card_cloze", json={"text": "   "})
    assert response.status_code == 422


def test_generate_card_cloze_maps_llm_error(client: TestClient, fake_llm: FakeLLM) -> None:
    fake_llm.payload = LLMError("upstream failed")
    response = client.post("/generate_card_cloze", json={"text": "bonjour"})
    assert response.status_code == 502
    assert response.json()["detail"] == "upstream failed"


def test_generate_card_title_ok(client: TestClient, fake_llm: FakeLLM) -> None:
    fake_llm.payload = {"title": "être present"}
    response = client.post(
        "/generate_card_title",
        json={"text": "je suis, tu es", "language": "EN"},
    )
    assert response.status_code == 200
    assert response.json() == {"title": "être present", "language": "en"}


def test_generate_card_title_maps_llm_error(
    client: TestClient, fake_llm: FakeLLM
) -> None:
    fake_llm.payload = LLMError("Model request failed")
    response = client.post(
        "/generate_card_title",
        json={"text": "bonjour", "language": "en"},
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "Model request failed"


def test_generate_card_title_rejects_bad_language(client: TestClient) -> None:
    response = client.post(
        "/generate_card_title",
        json={"text": "bonjour", "language": "zh-CN"},
    )
    assert response.status_code == 422


def test_health(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_tts_ok(client: TestClient, fake_tts: FakeTTS) -> None:
    response = client.get("/tts", params={"text": "bonjour"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/mpeg")
    assert response.content == b"ID3fake-audio"
    assert fake_tts.calls == [{"text": "bonjour", "voice": DEFAULT_TTS_VOICE}]


def test_tts_uses_voice_query(client: TestClient, fake_tts: FakeTTS) -> None:
    response = client.get(
        "/tts",
        params={"text": "hello", "voice": "en-US-JennyNeural"},
    )
    assert response.status_code == 200
    assert fake_tts.calls == [{"text": "hello", "voice": "en-US-JennyNeural"}]


def test_tts_rejects_empty_text(client: TestClient) -> None:
    response = client.get("/tts", params={"text": "   "})
    assert response.status_code == 422


def test_tts_maps_error(client: TestClient, fake_tts: FakeTTS) -> None:
    fake_tts.payload = TTSError("upstream failed")
    response = client.get("/tts", params={"text": "bonjour"})
    assert response.status_code == 502
    assert response.json()["detail"] == "upstream failed"
