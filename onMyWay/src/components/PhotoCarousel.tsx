import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, FlatList, Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../lib/cn";
import { colors } from "../lib/theme";
import { AnimatedView, Img } from "./ui/Screen";

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
      <View className="aspect-[4/5] overflow-hidden rounded-[18px] bg-lime-tint" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
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
                <Img source={item.uri} className="h-full w-full" contentFit="cover" transition={250} />
              </Pressable>
            )}
          />
        ) : null}

        <View pointerEvents="box-none" className="absolute inset-0">
          {renderOverlay?.(index)}
        </View>

        <AnimatedView
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
          style={{
            opacity: burst.interpolate({ inputRange: [0, 0.2, 1, 2], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: burst.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.3] }) }],
          }}
        >
          <Ionicons name="heart" size={96} color={colors.white} style={{ textShadowColor: "rgba(0,0,0,0.25)", textShadowRadius: 12 }} />
        </AnimatedView>
      </View>

      {slides.length > 1 ? (
        <View className="mt-2.5 flex-row justify-center gap-[5px]">
          {slides.map((s, i) => (
            <View key={s.key} className={cn("h-1.5 rounded-full", i === index ? "w-[18px] bg-lime-green" : "w-1.5 bg-line")} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
