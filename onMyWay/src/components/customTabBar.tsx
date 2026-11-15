import { View, Pressable, StyleSheet, Animated } from "react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { tabBarProgress } from "../lib/tabBarVisibility";
import { t, type TranslationKey } from "../i18n";

const ACTIVE = "#0B7F70";
const INACTIVE = "#65676B";
const BORDER = "#CED0D4";
const LIME = "#8BC34A";
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
        style={styles.item}
      >
        <View style={[styles.indicator, active && styles.indicatorOn]} />
        <Ionicons
          name={active ? item.iconActive : item.icon}
          size={26}
          color={active ? ACTIVE : INACTIVE}
        />
      </Pressable>
    );
  };

  return (
    <Animated.View style={{ height, opacity: tabBarProgress, overflow: "hidden" }}>
      <View style={[styles.bar, { height: fullHeight, paddingBottom: bottomPad }]}>
        {LEFT.map(renderItem)}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("tabs.createTrip")}
          onPress={() => router.push("/create")}
          style={styles.item}
        >
          <View style={styles.plus}>
            <Ionicons name="add" size={24} color="#fff" />
          </View>
        </Pressable>

        {RIGHT.map(renderItem)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  item: {
    flex: 1,
    height: ITEM_H,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: 36,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: "transparent",
  },
  indicatorOn: { backgroundColor: ACTIVE },
  plus: {
    width: 40,
    height: 28,
    borderRadius: 10,
    backgroundColor: LIME,
    alignItems: "center",
    justifyContent: "center",
  },
});