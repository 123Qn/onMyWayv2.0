import { useEffect, useRef } from "react";
import { Animated as RNAnimated, Easing as RNEasing } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import { colors } from "../lib/theme";

type Mood = "happy" | "thinking";

const ACircle = Animated.createAnimatedComponent(Circle);
const AEllipse = Animated.createAnimatedComponent(Ellipse);
const ALine = Animated.createAnimatedComponent(Line);

const sine = Easing.inOut(Easing.sin);

/**
 * "Way", the onMyWay travel assistant: a small robot in the brand colors.
 * Animated: the head tilts, the antenna sways with a glowing tip, the eyes look around and blink.
 * "thinking" looks up and the three dots bounce one after another.
 * `animated={false}` draws it still (small avatars in a long list).
 */
export function AssistantMascot({ size = 40, mood = "happy", animated = true }: { size?: number; mood?: Mood; animated?: boolean }) {
  const tilt = useSharedValue(0); // -1..1
  const sway = useSharedValue(0); // -1..1
  const glow = useSharedValue(0); // 0..1
  const blink = useSharedValue(0); // 0 open, 1 closed
  const look = useSharedValue(0); // -1 left .. 1 right
  const bounce = useSharedValue(0); // 0..3, one dot per unit

  useEffect(() => {
    const all = [tilt, sway, glow, blink, look, bounce];
    if (!animated) {
      all.forEach((v) => {
        cancelAnimation(v);
        v.set(0);
      });
      return;
    }
    tilt.set(withRepeat(withSequence(withTiming(1, { duration: 1400, easing: sine }), withTiming(-1, { duration: 1400, easing: sine })), -1, true));
    sway.set(withRepeat(withSequence(withTiming(1, { duration: 700, easing: sine }), withTiming(-1, { duration: 700, easing: sine })), -1, true));
    glow.set(withRepeat(withTiming(1, { duration: 900, easing: sine }), -1, true));
    blink.set(
      withRepeat(withSequence(withDelay(2600, withTiming(1, { duration: 70 })), withTiming(0, { duration: 90 }), withDelay(1400, withTiming(1, { duration: 70 })), withTiming(0, { duration: 90 })), -1)
    );
    look.set(
      mood === "thinking"
        ? withRepeat(withSequence(withTiming(1, { duration: 500 }), withDelay(500, withTiming(-1, { duration: 500 })), withDelay(500, withTiming(0, { duration: 400 }))), -1)
        : withRepeat(withSequence(withDelay(1800, withTiming(-1, { duration: 300 })), withDelay(900, withTiming(1, { duration: 400 })), withDelay(900, withTiming(0, { duration: 300 }))), -1)
    );
    bounce.set(mood === "thinking" ? withRepeat(withTiming(3, { duration: 900, easing: Easing.linear }), -1) : 0);
    return () => all.forEach((v) => cancelAnimation(v));
  }, [animated, mood, tilt, sway, glow, blink, look, bounce]);

  const headStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.get() * 6}deg` }] }));
  const antennaProps = useAnimatedProps(() => ({ x2: 50 + sway.get() * 4 }));
  const tipProps = useAnimatedProps(() => ({ cx: 50 + sway.get() * 4, r: 5.5 + glow.get() * 1.5 }));
  const haloProps = useAnimatedProps(() => ({ cx: 50 + sway.get() * 4, r: 7 + glow.get() * 4, opacity: 0.45 * (1 - glow.get()) }));

  const eyeY = mood === "thinking" ? 44 : 48;
  const eyeRy = mood === "thinking" ? 5 : 6.5;
  const leftEye = useAnimatedProps(() => ({ cx: 39 + look.get() * 4, ry: eyeRy - blink.get() * (eyeRy - 1.2) }));
  const rightEye = useAnimatedProps(() => ({ cx: 61 + look.get() * 4, ry: eyeRy - blink.get() * (eyeRy - 1.2) }));

  return (
    <Animated.View style={[{ width: size, height: size }, headStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Antenna with a glowing tip */}
        <ACircle cy={9} fill={colors.limeGreen} animatedProps={haloProps} />
        <ALine x1={50} y1={22} y2={10} stroke={colors.white} strokeWidth={4} strokeLinecap="round" animatedProps={antennaProps} />
        <ACircle cy={9} fill={colors.limeGreen} stroke={colors.white} strokeWidth={2.5} animatedProps={tipProps} />
        {/* Ears */}
        <Rect x={6} y={42} width={10} height={20} rx={5} fill={colors.limeGreen} />
        <Rect x={84} y={42} width={10} height={20} rx={5} fill={colors.limeGreen} />
        {/* Head and screen face */}
        <Rect x={13} y={22} width={74} height={62} rx={22} fill={colors.white} />
        <Rect x={22} y={32} width={56} height={40} rx={14} fill={colors.inkBlack} />
        <AEllipse cy={eyeY} rx={6} fill={colors.limeGreen} animatedProps={leftEye} />
        <AEllipse cy={eyeY} rx={6} fill={colors.limeGreen} animatedProps={rightEye} />
        {mood === "thinking" ? (
          [43, 50, 57].map((x, i) => <Dot key={x} x={x} index={i} bounce={bounce} />)
        ) : (
          <Path d="M40 59 Q50 67 60 59" stroke={colors.limeGreen} strokeWidth={3.5} strokeLinecap="round" fill="none" />
        )}
        {/* Cheeks */}
        <Circle cx={27} cy={76} r={3} fill={colors.heart} opacity={0.35} />
        <Circle cx={73} cy={76} r={3} fill={colors.heart} opacity={0.35} />
      </Svg>
    </Animated.View>
  );
}

// A thinking dot: hops while `bounce` passes through its slot
function Dot({ x, index, bounce }: { x: number; index: number; bounce: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const t = bounce.get() - index;
    const hop = t > 0 && t < 1 ? Math.sin(t * Math.PI) : 0;
    return { cy: 62 - hop * 4 };
  });
  return <ACircle cx={x} r={2.2} fill={colors.limeGreen} animatedProps={props} />;
}

/** Gentle up-and-down float, for the floating button */
export function useFloat(distance = 3, duration = 1600) {
  const value = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(value, { toValue: 1, duration, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
        RNAnimated.timing(value, { toValue: 0, duration, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return value.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
}
