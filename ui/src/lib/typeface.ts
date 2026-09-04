import {
  Platform,
  type StyleProp,
  StyleSheet,
  type TextStyle,
} from "react-native";

import { fonts } from "../theme";

const CJK_CHAR =
  /(?:\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}|\p{Script=Bopomofo}|[\u3000-\u303F\u31C0-\u31EF\u3200-\u33FF\uFE10-\uFE1F\uFE30-\uFE4F\uFF00-\uFFEF])/u;

const CJK_RUN = new RegExp(`${CJK_CHAR.source}+`, "gu");

export type FontRun = {
  text: string;
  script: "latin" | "cjk";
  start: number;
};

export function splitFontRuns(text: string): FontRun[] {
  const runs: FontRun[] = [];
  let lastIndex = 0;
  CJK_RUN.lastIndex = 0;
  for (const match of text.matchAll(CJK_RUN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      runs.push({
        text: text.slice(lastIndex, index),
        script: "latin",
        start: lastIndex,
      });
    }
    runs.push({ text: match[0], script: "cjk", start: index });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    runs.push({
      text: text.slice(lastIndex),
      script: "latin",
      start: lastIndex,
    });
  }
  return runs.length > 0 ? runs : [{ text, script: "latin", start: 0 }];
}

export function containsCjk(text: string): boolean {
  return CJK_CHAR.test(text);
}

export function resolveTypefaces(style?: StyleProp<TextStyle>): {
  latin: string;
  cjk: string;
} {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const family = flat?.fontFamily;
  const bold =
    family === fonts.bold ||
    family === fonts.cjkBold ||
    isBoldWeight(flat?.fontWeight);
  return {
    latin: bold ? fonts.bold : fonts.regular,
    cjk: bold ? fonts.cjkBold : fonts.cjk,
  };
}

export function stackedFontFamily(latin: string, cjk: string): string {
  return `${latin}, ${cjk}`;
}

export function inputFontFamily(
  style: StyleProp<TextStyle> | undefined,
  value: string,
): string {
  const { latin, cjk } = resolveTypefaces(style);
  if (Platform.OS === "web") {
    return stackedFontFamily(latin, cjk);
  }
  return containsCjk(value) ? cjk : latin;
}

function isBoldWeight(weight: TextStyle["fontWeight"]): boolean {
  if (weight == null) {
    return false;
  }
  if (weight === "bold") {
    return true;
  }
  const numeric = typeof weight === "string" ? Number(weight) : weight;
  return Number.isFinite(numeric) && numeric >= 600;
}
