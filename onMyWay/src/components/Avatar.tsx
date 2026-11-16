import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { avatarPalette, font } from "../lib/theme";

// The traveler's photo, or their initial on a brand-colored circle (the color is stable per name)
export function Avatar({ name, size = 40, uri }: { name: string; size?: number; uri?: string | null }) {
  if (uri) {
    return (
      <Image
        source={uri}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
        accessibilityIgnoresInvertColors
      />
    );
  }
  const trimmed = name.trim();
  let hash = 0;
  for (const ch of trimmed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const { bg, fg } = avatarPalette[Math.abs(hash) % avatarPalette.length];

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.initial, { color: fg, fontSize: size * 0.42 }]}>
        {trimmed.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  initial: { fontWeight: font.bold },
});
