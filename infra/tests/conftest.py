from fastapi.testclient import TestClient
import pytest

from app.deps import get_llm
from app.main import create_app
from tests.fakes import FakeLLM


@pytest.fixture
def fake_llm() -> FakeLLM:
    return FakeLLM({})


@pytest.fixture
def client(fake_llm: FakeLLM) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_llm] = lambda: fake_llm
    return TestClient(app)
