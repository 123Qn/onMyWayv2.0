import { Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "../i18n";
import { tabBarProgress } from "../lib/tabBarVisibility";
import { AssistantMascot, useFloat } from "./AssistantMascot";
import { AnimatedView } from "./ui/Screen";

/** Floating robot at the bottom-right of the feed that opens the travel assistant */
export function AssistantButton() {
  const float = useFloat();
  const insets = useSafeAreaInsets();
  // While the tab bar is slid away the feed reaches the screen bottom: stay above the system navigation bar
  const lift = tabBarProgress.interpolate({ inputRange: [0, 1], outputRange: [-insets.bottom, 0] });
  return (
    // Positioned by the wrapper: absolute + active: on one Pressable loses its offsets (Uniwind).
    // Two layers because the lift is JS-driven (follows the tab bar) and the float runs on the native driver.
    <AnimatedView pointerEvents="box-none" className="absolute bottom-4 right-4" style={{ transform: [{ translateY: lift }] }}>
      <AnimatedView pointerEvents="box-none" style={{ transform: [{ translateY: float }] }}>
        <Pressable
          onPress={() => router.push("/assistant")}
          accessibilityRole="button"
          accessibilityLabel={t("assistant.open")}
          className="h-16 w-16 items-center justify-center rounded-full border-[3px] border-lime-green bg-deep-green shadow-lg active:scale-95"
        >
          <AssistantMascot size={44} />
        </Pressable>
      </AnimatedView>
    </AnimatedView>
  );
}
