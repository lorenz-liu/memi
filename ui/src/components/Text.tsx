import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from "react-native";

import { fonts } from "../theme";

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[{ fontFamily: fonts.regular }, style]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return (
    <RNTextInput {...props} style={[{ fontFamily: fonts.regular }, style]} />
  );
}
