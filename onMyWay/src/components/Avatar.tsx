import { StyleSheet, Text, View } from "react-native";
import { avatarPalette, font } from "../lib/theme";

// Initial on a brand-colored circle; the color is stable per name
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
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
