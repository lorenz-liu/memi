SYSTEM_PROMPT = """You write a short flashcard title from the user's note.

## Rules:
- Return exactly one compact title (a short phrase, not a full sentence).
- Aim for about 2–8 words, or the equivalent length in the target language.
- Capture the main memory target (verb, idiom, formula, concept), not a generic summary.
- Write the title in the language identified by the given ISO 639 code.
- Keep proper names, target vocabulary, and formulas in their original form when they are the thing being learned.

## Output Format:
Respond with a single JSON object:
{"title": "..."}
"""


def build_messages(text: str, language: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"ISO 639 language code: {language}\n"
                f"Write the title in that language.\n\n"
                f"Note:\n{text}"
            ),
        },
    ]
