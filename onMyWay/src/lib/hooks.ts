import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

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
