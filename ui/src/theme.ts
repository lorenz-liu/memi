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
  regular: "Thasadith-Regular",
  italic: "Thasadith-Italic",
  bold: "Thasadith-Bold",
  boldItalic: "Thasadith-BoldItalic",
} as const;

export const fontAssets = {
  [fonts.regular]: require("../assets/fonts/Thasadith-Regular.ttf"),
  [fonts.italic]: require("../assets/fonts/Thasadith-Italic.ttf"),
  [fonts.bold]: require("../assets/fonts/Thasadith-Bold.ttf"),
  [fonts.boldItalic]: require("../assets/fonts/Thasadith-BoldItalic.ttf"),
};

export const space = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
