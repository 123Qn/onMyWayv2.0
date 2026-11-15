import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

export const tabBarProgress = new Animated.Value(1); // 1 = shown, 0 = hidden

let visible = true;
let lastY = 0;

function setVisible(next: boolean) {
  if (next === visible) return;
  visible = next;
  Animated.timing(tabBarProgress, {
    toValue: next ? 1 : 0,
    duration: 200,
    useNativeDriver: false, // animates height, which the native driver does not support
  }).start();
}

export function showTabBar() {
  lastY = 0;
  setVisible(true);
}

export function onScrollHideTabBar(
  e: NativeSyntheticEvent<NativeScrollEvent>
) {
  const y = Math.max(0, e.nativeEvent.contentOffset.y);
  const dy = y - lastY;

  if (y <= 0) setVisible(true);
  else if (dy > 4) setVisible(false);
  else if (dy < -4) setVisible(true);

  lastY = y;
}