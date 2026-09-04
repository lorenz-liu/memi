from app.llm import LLMError
from app.services.title import generate_card_title
from tests.fakes import FakeLLM


def test_generate_card_title_uses_language_code() -> None:
    llm = FakeLLM({"title": "  être 变位  "})
    card = generate_card_title("je suis, tu es, il est", "zh", llm)
    assert card.title == "être 变位"
    assert card.language == "zh"
    user_message = llm.calls[0]["messages"][-1]["content"]
    assert "ISO 639 language code: zh" in user_message


def test_generate_card_title_rejects_missing_title() -> None:
    llm = FakeLLM({"title": "   "})
    try:
        generate_card_title("note", "en", llm)
    except LLMError as exc:
        assert "title" in str(exc)
    else:
        raise AssertionError("expected LLMError")
