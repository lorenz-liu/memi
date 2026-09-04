import { Children, forwardRef, type ReactNode } from "react";
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";

import {
  inputFontFamily,
  resolveTypefaces,
  splitFontRuns,
  stackedFontFamily,
} from "../lib/typeface";

export function Text({ style, children, ...props }: TextProps) {
  const { latin, cjk } = resolveTypefaces(style);

  if (Platform.OS === "web") {
    return (
      <RNText
        {...props}
        style={[style, { fontFamily: stackedFontFamily(latin, cjk) }]}
      >
        {children}
      </RNText>
    );
  }

  return (
    <RNText {...props} style={[style, { fontFamily: latin }]}>
      {renderMixedChildren(children, latin, cjk)}
    </RNText>
  );
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  function TextInput({ style, value, defaultValue, ...props }, ref) {
    const text = String(value ?? defaultValue ?? "");
    return (
      <RNTextInput
        ref={ref}
        {...props}
        value={value}
        defaultValue={defaultValue}
        style={[style, { fontFamily: inputFontFamily(style, text) }]}
      />
    );
  },
);

function renderMixedChildren(
  children: ReactNode,
  latin: string,
  cjk: string,
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return renderRuns(String(child), latin, cjk);
    }
    return child;
  });
}

function renderRuns(text: string, latin: string, cjk: string): ReactNode {
  const runs = splitFontRuns(text);
  if (runs.length === 1 && runs[0].script === "latin") {
    return text;
  }
  return runs.map((run) => (
    <RNText
      key={`${run.start}:${run.script}`}
      style={{ fontFamily: run.script === "cjk" ? cjk : latin }}
    >
      {run.text}
    </RNText>
  ));
}
