import json

SYSTEM_PROMPT = """You are an expert pedagogical assistant specializing in spaced repetition and active recall flashcard generation (Cloze Deletion / 填空题生成专家).
Your mission is to analyze user-provided text and transform it into exactly ONE cloze-deletion flashcard.

## Cardinality:
- One input → one flashcard. Never split into multiple cards.
- Conjugation tables, word lists, formulas, and multi-sentence notes all stay on that single flashcard.
- Mask every high-yield unit that belongs on this card. There is NO limit on how many blanks a sentence or the card may contain.

## Core Rules for Masking:
1. Target Meaningful Memory Units:
   - Mask core concepts, math equations/components, vocabulary inflections (e.g., verb conjugations), technical terms, and idiomatic collocations.
   - Strictly NEVER mask trivial function words, conjunctions, or arbitrary prepositions unless they form an essential idiomatic phrase (e.g., mask "depend on" or "avoir besoin de", never random "and", "de", "的").
2. Pedagogical Solvability:
   - Remaining context MUST provide sufficient clues for a knowledgeable learner to deduce the masked content. Never turn the blank into a blind guess.
   - For language learning, preserve clues like verb infinitive, tense, or pronoun.
   - For mathematical formulas, preserve standard LaTeX structure and mask key components.
3. Blank Formatting:
   - Use standard Anki cloze syntax: {{c1::answer}}, {{c2::answer}}, {{c3::answer}}, ...
   - Number blanks sequentially (c1, c2, c3, ...) for as many targets as needed. Do not cap blanks per sentence.
   - Never mask the entire input. Keep enough visible context on the same card.
   - Preserve the user's exact formatting: line breaks, indentation, and spacing must be identical in original_context and masked_text. Only wrap targets; never flatten onto one line.

## Output Format Specification:
Respond with a single JSON object (the flashcard itself). Do NOT wrap it in a "cards" array.
{
  "original_context": "The exact original sentence or paragraph.",
  "masked_text": "The input with {{c1::...}} markers.",
  "blanks": [
    {
      "index": "c1",
      "target": "the masked text",
      "hint": "a concise hint (e.g., tense, base form, variable role)",
      "explanation": "Brief pedagogical explanation."
    }
  ]
}"""

FEW_SHOT_MESSAGES: list[dict[str, str]] = [
    {
        "role": "user",
        "content": "Hier soir, nous sommes allés au cinéma après avoir mangé.",
    },
    {
        "role": "assistant",
        "content": json.dumps(
            {
                "original_context": "Hier soir, nous sommes allés au cinéma après avoir mangé.",
                "masked_text": "Hier soir, nous {{c1::sommes allés}} au cinéma après avoir mangé.",
                "blanks": [
                    {
                        "index": "c1",
                        "target": "sommes allés",
                        "hint": "aller, Passé Composé, 1ère personne du pluriel",
                        "explanation": "Le verbe 'aller' se conjugue avec l'auxiliaire 'être' et s'accorde avec le sujet 'nous'.",
                    }
                ],
            },
            ensure_ascii=False,
        ),
    },
    {
        "role": "user",
        "content": "In English, the idiom 'burn the midnight oil' means to work late into the night. She had to burn the midnight oil to finish the report.",
    },
    {
        "role": "assistant",
        "content": json.dumps(
            {
                "original_context": "She had to burn the midnight oil to finish the report.",
                "masked_text": "She had to {{c1::burn the midnight oil}} to finish the report.",
                "blanks": [
                    {
                        "index": "c1",
                        "target": "burn the midnight oil",
                        "hint": "idiom meaning: work late into the night",
                        "explanation": "Common idiom referring to working late by lamplight.",
                    }
                ],
            },
            ensure_ascii=False,
        ),
    },
    {
        "role": "user",
        "content": "根据贝叶斯定理，在已知事件B发生的条件下事件A发生的后验概率公式为：P(A|B) = (P(B|A) * P(A)) / P(B)。",
    },
    {
        "role": "assistant",
        "content": json.dumps(
            {
                "original_context": "根据贝叶斯定理，后验概率计算公式为：P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}。",
                "masked_text": "根据贝叶斯定理，后验概率计算公式为：P(A|B) = {{c1::\\frac{P(B|A) \\cdot P(A)}{P(B)}}}。",
                "blanks": [
                    {
                        "index": "c1",
                        "target": "\\frac{P(B|A) \\cdot P(A)}{P(B)}",
                        "hint": "(似然度 × 先验概率) / 全概率",
                        "explanation": "分子为联合概率 P(A ∩ B)，分母为全概率 P(B)。",
                    }
                ],
            },
            ensure_ascii=False,
        ),
    },
]


def build_messages(user_input_text: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        *FEW_SHOT_MESSAGES,
        {"role": "user", "content": user_input_text},
    ]
