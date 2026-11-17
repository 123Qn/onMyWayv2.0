import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { cn } from "../lib/cn";
import { tabBarProgress } from "../lib/tabBarVisibility";
import { colors } from "../lib/theme";
import { t, type TranslationKey } from "../i18n";
import { AnimatedView } from "./ui/Screen";

const INACTIVE = "#65676B";
const ITEM_H = 52;

type Icon = keyof typeof Ionicons.glyphMap;
type Item = { name: string; label: TranslationKey; icon: Icon; iconActive: Icon };

const LEFT: Item[] = [
  { name: "index", label: "tabs.home", icon: "home-outline", iconActive: "home" },
  { name: "index2", label: "tabs.trips", icon: "map-outline", iconActive: "map" },
];
const RIGHT: Item[] = [
  { name: "index3", label: "tabs.community", icon: "people-outline", iconActive: "people" },
  { name: "index4", label: "tabs.profile", icon: "person-outline", iconActive: "person" },
];

export function CustomTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);
  const fullHeight = ITEM_H + bottomPad + StyleSheet.hairlineWidth;
  const current = state.routes[state.index]?.name;

  // Slides away while scrolling down (tabBarProgress 1 -> 0)
  const height = tabBarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, fullHeight],
  });

  const renderItem = (item: Item) => {
    const active = current === item.name;
    return (
      <Pressable
        key={item.name}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={t(item.label)}
        onPress={() => {
          const route = state.routes.find((r) => r.name === item.name);
          if (route) navigateToTab(route.key);
        }}
        android_ripple={{ color: "#0000001A", borderless: true }}
        className="h-[52px] flex-1 items-center justify-center"
      >
        <View className={cn("absolute top-0 h-[3px] w-9 rounded-b-[3px]", active ? "bg-deep-green" : "bg-transparent")} />
        <Ionicons name={active ? item.iconActive : item.icon} size={26} color={active ? colors.deepGreen : INACTIVE} />
      </Pressable>
    );
  };

  return (
    <AnimatedView className="overflow-hidden" style={{ height, opacity: tabBarProgress }}>
      <View
        className="flex-row border-t border-[#CED0D4] bg-white"
        style={{ height: fullHeight, paddingBottom: bottomPad, borderTopWidth: StyleSheet.hairlineWidth }}
      >
        {LEFT.map(renderItem)}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("tabs.createTrip")}
          onPress={() => router.push("/create")}
          className="h-[52px] flex-1 items-center justify-center"
        >
          <View className="h-7 w-10 items-center justify-center rounded-[10px] bg-lime-green">
            <Ionicons name="add" size={24} color={colors.white} />
          </View>
        </Pressable>

        {RIGHT.map(renderItem)}
      </View>
    </AnimatedView>
  );
}
