import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useNavigation } from "expo-router";

/**
 * Pull-to-refresh state for a screen: refreshing is true while load() runs from a pull.
 * Spread into <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />.
 */
export function useRefresh(load: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);
  return { refreshing, onRefresh };
}

/** Run load() every time the screen comes into focus (fresh data after going back to it) */
export function useFocusLoad(load: () => unknown) {
  // Always call the latest load without re-subscribing on every render
  const latest = useRef(load);
  latest.current = load;
  useFocusEffect(
    useCallback(() => {
      latest.current();
    }, [])
  );
}

/**
 * false until the screen's open animation has finished. Heavy parts (a map WebView) mount after
 * it, so the screen slides in smoothly and its text and photo show first.
 */
export function useAfterTransition(fallbackMs = 450) {
  const navigation = useNavigation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    // Opened without an animation (deep link, first screen): the fallback timer covers it
    const timer = setTimeout(() => setReady(true), fallbackMs);
    const unsubscribe = navigation.addListener("transitionEnd" as never, () => setReady(true));
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [navigation, ready, fallbackMs]);
  return ready;
}
