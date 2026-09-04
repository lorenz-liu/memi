import type { ClozeBlank, ClozeCard } from "./api";

export type ClozeSegment =
  | { type: "text"; key: string; value: string }
  | { type: "blank"; key: string; blank: ClozeBlank };

export type ClozeLine = {
  key: string;
  items: ClozeSegment[];
};

const CLOZE_RE = /\{\{c(\d+)::(.*?)}}/g;

export function applyClozeToOriginal(
  original: string,
  card: ClozeCard,
): ClozeSegment[] {
  const source = original.replace(/\r\n/g, "\n");
  const segments: ClozeSegment[] = [];
  let cursor = 0;
  for (const blank of card.blanks) {
    const target = blank.target;
    if (!target) {
      continue;
    }
    const found = source.indexOf(target, cursor);
    if (found === -1) {
      continue;
    }
    if (found > cursor) {
      segments.push({
        type: "text",
        key: `text-${cursor}`,
        value: source.slice(cursor, found),
      });
    }
    segments.push({
      type: "blank",
      key: `blank-${found}-${blank.index}`,
      blank,
    });
    cursor = found + target.length;
  }
  if (cursor < source.length) {
    segments.push({
      type: "text",
      key: `text-${cursor}`,
      value: source.slice(cursor),
    });
  }
  return segments;
}

export function parseCloze(card: ClozeCard): ClozeSegment[] {
  const byIndex = new Map(card.blanks.map((blank) => [blank.index, blank]));
  const segments: ClozeSegment[] = [];
  let last = 0;
  const text = card.masked_text.replace(/\r\n/g, "\n");
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
      key: `blank-${start}-${index}`,
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

export function buildClozeSegments(
  original: string,
  card: ClozeCard,
): ClozeSegment[] {
  const fromOriginal = applyClozeToOriginal(original, card);
  if (fromOriginal.some((segment) => segment.type === "blank")) {
    return fromOriginal;
  }
  return parseCloze(card);
}

export function segmentsToLines(segments: ClozeSegment[]): ClozeLine[] {
  let lineId = 0;
  const lines: ClozeLine[] = [{ key: `line-${lineId}`, items: [] }];
  for (const segment of segments) {
    if (segment.type === "blank") {
      lines[lines.length - 1]?.items.push(segment);
      continue;
    }
    const parts = segment.value.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) {
        lineId += 1;
        lines.push({ key: `line-${lineId}`, items: [] });
      }
      if (part.length > 0) {
        lines[lines.length - 1]?.items.push({
          type: "text",
          key: `${segment.key}-${index}`,
          value: part,
        });
      }
    });
  }
  return lines;
}

export function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function answersMatch(input: string, target: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(target);
}

export function fallbackTitle(text: string): string {
  const line = text.trim().split(/\n/)[0] ?? "";
  return line.slice(0, 24) || "Untitled";
}
