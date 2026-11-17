// Brand colors from Docs/onMyWay-BrandBook.pdf, for places that need a raw value (icons, SVG, maps).
// Styling uses the same tokens as Tailwind classes, defined in src/global.css (bg-deep-green, text-ink...).
// Typography (font-normal / font-bold) and radii (rounded-md 14, rounded-lg 24) live there too.
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
