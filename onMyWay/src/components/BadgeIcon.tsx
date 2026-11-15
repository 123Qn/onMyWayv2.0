import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { rarityColor, type BadgeDef } from "../lib/rewards";
import { colors } from "../lib/theme";

const HEX = "50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5";
const INNER = "50,15 80.5,32.5 80.5,67.5 50,85 19.5,67.5 19.5,32.5";

// Hexagonal medal tinted by rarity; locked badges are grey with a padlock
export function BadgeIcon({ badge, unlocked, size }: { badge: BadgeDef; unlocked: boolean; size: number }) {
  const tone = rarityColor[badge.rarity];
  const gradientId = `badge-${badge.rarity}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tone.light} />
            <Stop offset="1" stopColor={tone.main} />
          </LinearGradient>
        </Defs>
        <Polygon
          points={HEX}
          fill={unlocked ? `url(#${gradientId})` : colors.border}
          stroke={unlocked ? tone.dark : "#CBD5D2"}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <Polygon points={INNER} fill={colors.white} opacity={unlocked ? 0.92 : 0.7} strokeLinejoin="round" />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Ionicons name={badge.icon} size={size * 0.36} color={unlocked ? tone.dark : "#AEBAB7"} />
      </View>
      {!unlocked ? (
        <View
          style={[
            styles.lock,
            { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17, right: 0, bottom: size * 0.02 },
          ]}
        >
          <Ionicons name="lock-closed" size={size * 0.18} color={colors.white} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  lock: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.textMuted,
    borderWidth: 2,
    borderColor: colors.white,
  },
});
