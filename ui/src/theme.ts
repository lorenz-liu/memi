export const colors = {
  bg: "#FAFAFA",
  ink: "#111111",
  muted: "#9A9A9A",
  hint: "#555555",
  fill: "#EFEFEF",
  highlight: "#E6E6E6",
  correct: "#C8E6C9",
  wrong: "#7A1212",
  danger: "#C62828",
} as const;

export const fonts = {
  regular: "Thasadith-Regular",
  bold: "Thasadith-Bold",
  cjk: "NotoSerifSC-Regular",
  cjkBold: "NotoSerifSC-Bold",
} as const;

export const fontAssets = {
  [fonts.regular]: require("../assets/fonts/Thasadith-Regular.ttf"),
  [fonts.bold]: require("../assets/fonts/Thasadith-Bold.ttf"),
  [fonts.cjk]: require("../assets/fonts/NotoSerifSC-Regular.ttf"),
  [fonts.cjkBold]: require("../assets/fonts/NotoSerifSC-Bold.ttf"),
};

export const space = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
