from fastapi.testclient import TestClient

from app.llm import LLMError
from tests.fakes import VALID_CLOZE_CARD, FakeLLM


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


def test_generate_card_title_rejects_bad_language(client: TestClient) -> None:
    response = client.post(
        "/generate_card_title",
        json={"text": "bonjour", "language": "zh-CN"},
    )
    assert response.status_code == 422
