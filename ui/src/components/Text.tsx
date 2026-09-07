import { forwardRef } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
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
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const bold = isBoldWeight(flat?.fontWeight);
  const italic = flat?.fontStyle === "italic";
  return {
    fontFamily: bold
      ? italic
        ? fonts.boldItalic
        : fonts.bold
      : italic
        ? fonts.italic
        : fonts.regular,
    fontWeight: "400",
    fontStyle: "normal",
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
