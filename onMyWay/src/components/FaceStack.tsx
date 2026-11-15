import { StyleSheet, Text, View } from "react-native";
import { colors, font } from "../lib/theme";
import { Avatar } from "./Avatar";

// Overlapping avatars followed by a line of social proof ("Liked by ...", "312 travelers ...")
export function FaceStack({ names, text, bold }: { names: string[]; text: string; bold?: string }) {
  // Bold the friend's name inside the translated sentence
  const parts = bold && text.includes(bold) ? text.split(bold) : [text];

  return (
    <View style={styles.row}>
      <View style={styles.faces}>
        {[...new Set(names)].slice(0, 3).map((name, i) => (
          <View key={name} style={[styles.face, i > 0 && styles.overlap, { zIndex: 3 - i }]}>
            <Avatar name={name} size={22} />
          </View>
        ))}
      </View>
      <Text style={styles.text} numberOfLines={1}>
        {parts.length === 2 ? (
          <>
            {parts[0]}
            <Text style={styles.bold}>{bold}</Text>
            {parts[1]}
          </>
        ) : (
          text
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  faces: { flexDirection: "row" },
  face: { borderRadius: 13, borderWidth: 2, borderColor: colors.white },
  overlap: { marginLeft: -8 },
  text: { flexShrink: 1, color: colors.inkBlack, fontSize: 13, fontWeight: font.regular },
  bold: { fontWeight: font.bold },
});
