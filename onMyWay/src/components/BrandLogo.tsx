import { Text, View } from "react-native";
import { colors } from "../lib/theme";
import { Img } from "./ui/Screen";

// Brand book rule: "onMyWay" in bold, o/M/W in lime green, never italic, never capitalise the "o"
export function Wordmark({ size = 36 }: { size?: number }) {
  return (
    <Text className="font-bold not-italic tracking-[-0.5px] text-ink" style={{ fontSize: size }} accessibilityRole="header">
      <Text className="text-lime-green">o</Text>n<Text className="text-lime-green">M</Text>y<Text className="text-lime-green">W</Text>ay
    </Text>
  );
}

export function BrandLogo({ iconSize = 96, wordmarkSize = 36 }: { iconSize?: number; wordmarkSize?: number }) {
  const corner = iconSize * 0.24;
  return (
    <View className="items-center gap-4">
      {/* Soft deep-green glow under the app icon */}
      <View
        className="bg-white"
        style={{
          borderRadius: corner,
          shadowColor: colors.deepGreen,
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <Img
          source={require("../../assets/images/icon.png")}
          style={{ width: iconSize, height: iconSize, borderRadius: corner }}
          accessibilityLabel="onMyWay"
        />
      </View>
      <Wordmark size={wordmarkSize} />
    </View>
  );
}
