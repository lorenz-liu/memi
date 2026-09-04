export const colors = {
  bg: "#FAFAFA",
  ink: "#111111",
  muted: "#9A9A9A",
  hint: "#555555",
  fill: "#EFEFEF",
  highlight: "#E6E6E6",
  correct: "#C8E6C9",
  wrong: "#FF2A2A",
  danger: "#C62828",
} as const;

export const fonts = {
  regular: "NotoSerifSC",
} as const;

export const fontAssets = {
  [fonts.regular]: require("../assets/fonts/NotoSerifSC-VariableFont_wght.ttf"),
};

export const space = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
