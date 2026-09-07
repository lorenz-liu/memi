import { forwardRef } from "react";
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { normalizeNotePunctuation, splitScriptRuns } from "../lib/punctuation";
import { fonts } from "../theme";

const LATIN_FONT = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

export function Text({ style, children, ...props }: TextProps) {
  const cjkFace = typeface(style, "cjk");
  if (typeof children !== "string") {
    return (
      <RNText {...props} style={[style, cjkFace]}>
        {children}
      </RNText>
    );
  }
  const text = normalizeNotePunctuation(children);
  const runs = splitScriptRuns(text);
  return (
    <RNText {...props} style={[style, cjkFace]}>
      {runs.map((run) =>
        run.script === "latin" ? (
          <RNText key={run.key} style={typeface(style, "latin")}>
            {run.text}
          </RNText>
        ) : (
          run.text
        ),
      )}
    </RNText>
  );
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  function TextInput({ style, onChangeText, ...props }, ref) {
    return (
      <RNTextInput
        ref={ref}
        {...props}
        onChangeText={
          onChangeText
            ? (value) => onChangeText(normalizeNotePunctuation(value))
            : undefined
        }
        style={[style, typeface(style, "cjk")]}
      />
    );
  },
);

function typeface(
  style: TextProps["style"],
  script: "cjk" | "latin",
): TextStyle {
  const weight = isBoldWeight(
    (StyleSheet.flatten(style) as TextStyle | undefined)?.fontWeight,
  )
    ? "700"
    : "400";
  if (script === "latin") {
    return {
      fontFamily: LATIN_FONT,
      fontWeight: weight,
    };
  }
  return {
    fontFamily: fonts.regular,
    fontWeight: weight,
    fontVariationSettings: `'wght' ${weight}`,
  };
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
