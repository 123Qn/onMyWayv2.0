import { Text, View } from "react-native";
import { avatarPalette } from "../lib/theme";
import { sizedImage } from "../lib/image";
import { Img } from "./ui/Screen";

// The traveler's photo, or their initial on a brand-colored circle (the color is stable per name)
export function Avatar({ name, size = 40, uri }: { name: string; size?: number; uri?: string | null }) {
  // Size and palette are computed per traveler, so they stay inline styles
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Img source={sizedImage(uri, size)} style={round} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
  }
  const trimmed = name.trim();
  let hash = 0;
  for (const ch of trimmed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const { bg, fg } = avatarPalette[Math.abs(hash) % avatarPalette.length];

  return (
    <View className="items-center justify-center" style={[round, { backgroundColor: bg }]}>
      <Text className="font-bold" style={{ color: fg, fontSize: size * 0.42 }}>
        {trimmed.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
