from fastapi.testclient import TestClient
import pytest

from app.deps import get_llm, get_tts
from app.main import create_app
from tests.fakes import FakeLLM, FakeTTS


@pytest.fixture
def fake_llm() -> FakeLLM:
    return FakeLLM({})


@pytest.fixture
def fake_tts() -> FakeTTS:
    return FakeTTS(b"ID3fake-audio")


@pytest.fixture
def client(fake_llm: FakeLLM, fake_tts: FakeTTS) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_llm] = lambda: fake_llm
    app.dependency_overrides[get_tts] = lambda: fake_tts
    return TestClient(app)
