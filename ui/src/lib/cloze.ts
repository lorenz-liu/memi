import type { ClozeBlank, ClozeCard } from "./api";

export type ClozeSegment =
  | { type: "text"; key: string; value: string }
  | { type: "blank"; key: string; blank: ClozeBlank };

const CLOZE_RE = /\{\{c(\d+)::(.*?)}}/g;

export function parseCloze(card: ClozeCard): ClozeSegment[] {
  const byIndex = new Map(card.blanks.map((blank) => [blank.index, blank]));
  const segments: ClozeSegment[] = [];
  let last = 0;
  const text = card.masked_text;
  for (const match of text.matchAll(CLOZE_RE)) {
    const start = match.index ?? 0;
    if (start > last) {
      segments.push({
        type: "text",
        key: `text-${last}`,
        value: text.slice(last, start),
      });
    }
    const index = `c${match[1]}`;
    const target = match[2] ?? "";
    segments.push({
      type: "blank",
      key: index,
      blank: byIndex.get(index) ?? {
        index,
        target,
        hint: "",
        explanation: "",
      },
    });
    last = start + match[0].length;
  }
  if (last < text.length) {
    segments.push({
      type: "text",
      key: `text-${last}`,
      value: text.slice(last),
    });
  }
  return segments;
}

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function answersMatch(input: string, target: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(target);
}

export function fallbackTitle(text: string): string {
  const line = text.trim().split(/\n/)[0] ?? "";
  return line.slice(0, 24) || "未命名";
}
