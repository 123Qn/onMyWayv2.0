import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors, font } from "../lib/theme";

// Brand book rule: "onMyWay" in bold, o/M/W in lime green, never italic, never capitalise the "o"
export function Wordmark({ size = 36 }: { size?: number }) {
  const lime = { color: colors.limeGreen };
  return (
    <Text style={[styles.wordmark, { fontSize: size }]} accessibilityRole="header">
      <Text style={lime}>o</Text>n<Text style={lime}>M</Text>y<Text style={lime}>W</Text>ay
    </Text>
  );
}

export function BrandLogo({ iconSize = 96, wordmarkSize = 36 }: { iconSize?: number; wordmarkSize?: number }) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconShadow, { borderRadius: iconSize * 0.24 }]}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={{ width: iconSize, height: iconSize, borderRadius: iconSize * 0.24 }}
          accessibilityLabel="onMyWay"
        />
      </View>
      <Wordmark size={wordmarkSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 16 },
  iconShadow: {
    backgroundColor: colors.white,
    shadowColor: colors.deepGreen,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  wordmark: {
    color: colors.inkBlack,
    fontWeight: font.bold,
    fontStyle: "normal",
    letterSpacing: -0.5,
  },
});
