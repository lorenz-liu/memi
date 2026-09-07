const PAIRS: [string, string][] = [
  ["'", "＇"],
  ['"', "＂"],
  [",", "，"],
  [".", "。"],
  ["!", "！"],
  ["?", "？"],
  [":", "："],
  [";", "；"],
  ["(", "（"],
  [")", "）"],
  ["[", "［"],
  ["]", "］"],
];

const HALF_TO_FULL = Object.fromEntries(PAIRS);
const FULL_TO_HALF: Record<string, string> = {
  ...Object.fromEntries(PAIRS.map(([half, full]) => [full, half])),
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
};

const ALL_MARKS = new Set([
  ...Object.keys(HALF_TO_FULL),
  ...Object.keys(FULL_TO_HALF),
]);

function isCjk(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff)
  );
}

function isLatin(char: string): boolean {
  return /^[A-Za-z0-9\u00C0-\u024F\u1E00-\u1EFF]$/.test(char);
}

function neighborScript(
  text: string,
  index: number,
  step: number,
): "cjk" | "latin" | null {
  let cursor = index + step;
  while (cursor >= 0 && cursor < text.length) {
    const char = text[cursor] ?? "";
    if (/\s/.test(char)) {
      cursor += step;
      continue;
    }
    if (isCjk(char)) {
      return "cjk";
    }
    if (isLatin(char)) {
      return "latin";
    }
    return null;
  }
  return null;
}

function scriptFor(text: string, index: number): "cjk" | "latin" | null {
  const left = neighborScript(text, index, -1);
  const right = neighborScript(text, index, 1);
  if (left === right) {
    return left;
  }
  return left ?? right;
}

function convertMarks(text: string): string {
  return [...text]
    .map((char, index) => {
      if (!ALL_MARKS.has(char)) {
        return char;
      }
      const script = scriptFor(text, index);
      if (script === "latin" && char in FULL_TO_HALF) {
        return FULL_TO_HALF[char] ?? char;
      }
      if (script === "cjk" && char in HALF_TO_FULL) {
        return HALF_TO_FULL[char] ?? char;
      }
      return char;
    })
    .join("");
}

function collapseLatinElisionSpaces(text: string): string {
  return text.replace(
    /([A-Za-z\u00C0-\u024F\u1E00-\u1EFF])['\u2019]\s+([A-Za-z\u00C0-\u024F\u1E00-\u1EFF])/g,
    "$1'$2",
  );
}

export function normalizeNotePunctuation(text: string): string {
  return collapseLatinElisionSpaces(convertMarks(text));
}

export type ScriptRun = {
  key: string;
  text: string;
  script: "latin" | "cjk";
};

export function splitScriptRuns(text: string): ScriptRun[] {
  if (!text) {
    return [];
  }
  const scripts: Array<"latin" | "cjk" | "neutral"> = [];
  for (const char of text) {
    if (isCjk(char)) {
      scripts.push("cjk");
    } else if (isLatin(char)) {
      scripts.push("latin");
    } else {
      scripts.push("neutral");
    }
  }
  for (let index = 0; index < scripts.length; index += 1) {
    if (scripts[index] !== "neutral") {
      continue;
    }
    let left: "latin" | "cjk" | undefined;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const script = scripts[cursor];
      if (script && script !== "neutral") {
        left = script;
        break;
      }
    }
    const right = scripts.slice(index + 1).find((item) => item !== "neutral");
    scripts[index] = left ?? (right === "cjk" ? "cjk" : "latin");
  }
  const runs: ScriptRun[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const script = scripts[index] === "cjk" ? "cjk" : "latin";
    const last = runs[runs.length - 1];
    if (last && last.script === script) {
      last.text += text[index] ?? "";
    } else {
      runs.push({
        key: `${script}-${index}`,
        text: text[index] ?? "",
        script,
      });
    }
  }
  return runs;
}
