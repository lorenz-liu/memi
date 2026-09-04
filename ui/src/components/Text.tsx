import { forwardRef } from "react";
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { fonts } from "../theme";

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[style, typeface(style)]} />;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  function TextInput({ style, ...props }, ref) {
    return (
      <RNTextInput ref={ref} {...props} style={[style, typeface(style)]} />
    );
  },
);

function typeface(style: TextProps["style"]): TextStyle {
  const weight = isBoldWeight(
    (StyleSheet.flatten(style) as TextStyle | undefined)?.fontWeight,
  )
    ? "700"
    : "400";
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
