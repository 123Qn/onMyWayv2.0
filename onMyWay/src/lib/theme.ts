// Brand colors from Docs/onMyWay-BrandBook.pdf
export const colors = {
  // Primary
  deepGreen: "#0B7F70",
  tealGreen: "#12A58F",
  limeGreen: "#8BC34A",
  // Secondary
  softGray: "#F7F7F7",
  white: "#FFFFFF",
  skyBlue: "#4CB4E6",
  inkBlack: "#1B2B28",

  // Derived UI tones (not in the brand book)
  textMuted: "#5F6F6C",
  border: "#E2E8E6",
  error: "#D64545",
  errorBg: "#FDECEC",
  heart: "#EF3E5C", // the heart in the app icon
  limeTint: "#EEF6E4",
  gold: "#E0A82E", // legendary rewards
};

// Avatar backgrounds from the brand palette, with a readable text color for each
export const avatarPalette = [
  { bg: colors.deepGreen, fg: colors.white },
  { bg: colors.tealGreen, fg: colors.white },
  { bg: colors.skyBlue, fg: colors.white },
  { bg: colors.limeGreen, fg: colors.inkBlack },
];

// Brand typography: system font, Regular 400 for body/captions, Bold 700 for titles/headings/usernames
export const font = {
  regular: "400",
  bold: "700",
} as const;

export const radius = {
  md: 14,
  lg: 24,
};
