import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

export type Slide = { key: string; uri: string; label: string };

type Props = {
  slides: Slide[];
  onTap: () => void;
  onDoubleTap: () => void;
  /** Badges drawn over the image for the visible slide */
  renderOverlay?: (index: number) => ReactNode;
};

const DOUBLE_TAP_MS = 260;

// Swipeable photos with page dots. Single tap opens, double tap likes with a heart burst.
export function PhotoCarousel({ slides, onTap, onDoubleTap, renderOverlay }: Props) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    []
  );

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      lastTap.current = 0;
      onDoubleTap();
      burst.setValue(0);
      Animated.sequence([
        Animated.spring(burst, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 2, duration: 280, delay: 250, useNativeDriver: true }),
      ]).start();
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(onTap, DOUBLE_TAP_MS);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View>
      <View style={styles.frame} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width ? (
          <FlatList
            data={slides}
            keyExtractor={(s) => s.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => (
              <Pressable onPress={handlePress} accessibilityLabel={item.label} style={{ width }}>
                <Image source={item.uri} style={styles.image} contentFit="cover" transition={250} />
              </Pressable>
            )}
          />
        ) : null}

        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {renderOverlay?.(index)}
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.burst,
            {
              opacity: burst.interpolate({ inputRange: [0, 0.2, 1, 2], outputRange: [0, 1, 1, 0] }),
              transform: [{ scale: burst.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.3] }) }],
            },
          ]}
        >
          <Ionicons name="heart" size={96} color={colors.white} style={styles.burstIcon} />
        </Animated.View>
      </View>

      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { aspectRatio: 4 / 5, borderRadius: 18, overflow: "hidden", backgroundColor: colors.limeTint },
  image: { width: "100%", height: "100%" },
  burst: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  burstIcon: { textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 12 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.limeGreen },
});
