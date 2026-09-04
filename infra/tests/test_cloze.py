from app.llm import LLMError
from app.services.cloze import generate_card_cloze
from tests.fakes import VALID_CLOZE_CARD, FakeLLM


def test_generate_card_cloze_parses_single_object() -> None:
    llm = FakeLLM(VALID_CLOZE_CARD)
    card = generate_card_cloze("Hier soir, nous sommes allés au cinéma.", llm)
    assert card.masked_text == VALID_CLOZE_CARD["masked_text"]
    assert card.blanks[0].target == "sommes allés"
    assert llm.calls[0]["messages"][0]["role"] == "system"


def test_generate_card_cloze_unwraps_cards_array_and_drops_category() -> None:
    llm = FakeLLM({"cards": [{**VALID_CLOZE_CARD, "category": "language_conjugation"}]})
    card = generate_card_cloze("unused", llm)
    assert card.original_context == VALID_CLOZE_CARD["original_context"]
    assert "category" not in card.model_dump()


def test_generate_card_cloze_rejects_invalid_payload() -> None:
    llm = FakeLLM({"masked_text": "missing other fields"})
    try:
        generate_card_cloze("unused", llm)
    except LLMError as exc:
        assert "valid cloze card" in str(exc)
    else:
        raise AssertionError("expected LLMError")
