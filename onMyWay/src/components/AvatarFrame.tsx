import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import type { FrameId } from "../lib/rewards";
import { colors } from "../lib/theme";
import { Avatar } from "./Avatar";

// The avatar fills the middle 64% of the frame; decorations are drawn around it in a 100x100 box
const AVATAR_RATIO = 0.64;

type Props = { name: string; frame: FrameId; avatarSize: number; uri?: string | null };

export function AvatarFrame({ name, frame, avatarSize, uri }: Props) {
  const size = avatarSize / AVATAR_RATIO;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        {FRAME_ART[frame]()}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Avatar name={name} size={avatarSize} uri={uri} />
      </View>
      {frame === "jet" ? (
        // The plane flies on top of the orbit line
        <View
          pointerEvents="none"
          style={[styles.plane, { left: size * 0.83, top: size * 0.17, transform: [{ rotate: "-60deg" }] }]}
        >
          <Ionicons name="airplane" size={size * 0.15} color={colors.skyBlue} />
        </View>
      ) : null}
    </View>
  );
}

/** Frame without an avatar, for pickers and previews */
export function FramePreview({ frame, size }: { frame: FrameId; size: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={32} fill={colors.limeTint} />
        {FRAME_ART[frame]()}
      </Svg>
      {frame === "jet" ? (
        <View style={[styles.plane, { left: size * 0.83, top: size * 0.17, transform: [{ rotate: "-60deg" }] }]}>
          <Ionicons name="airplane" size={size * 0.15} color={colors.skyBlue} />
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Geometry helpers: angle 0 = top, clockwise, in degrees
// ---------------------------------------------------------------------------
const rad = (deg: number) => (deg * Math.PI) / 180;
const px = (r: number, deg: number) => 50 + r * Math.sin(rad(deg));
const py = (r: number, deg: number) => 50 - r * Math.cos(rad(deg));
const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let v = from; step > 0 ? v <= to : v >= to; v += step) out.push(v);
  return out;
};

function star(cx: number, cy: number, outer: number, inner: number, points = 5) {
  return range(0, points * 2 - 1, 1)
    .map((i) => {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i * 180) / points;
      return `${cx + r * Math.sin(rad(a))},${cy - r * Math.cos(rad(a))}`;
    })
    .join(" ");
}

function wavyCircle(r: number, amp: number, waves: number) {
  const pts = range(0, 360, 4).map((a) => {
    const rr = r + amp * Math.sin(rad(a * waves));
    return `${px(rr, a).toFixed(2)},${py(rr, a).toFixed(2)}`;
  });
  return `M${pts.join(" L")} Z`;
}

const LEAF = "M0,0 Q6,-10 0,-22 Q-6,-10 0,0 Z";

const FRAME_ART: Record<FrameId, () => ReactNode> = {
  none: () => null,

  classic: () => (
    <>
      <Circle cx={50} cy={50} r={34.5} stroke={colors.white} strokeWidth={3} fill="none" />
      <Circle cx={50} cy={50} r={37.5} stroke={colors.tealGreen} strokeWidth={2.5} fill="none" />
    </>
  ),

  // The road from the logo: dark asphalt with lime dashes
  road: () => (
    <>
      <Circle cx={50} cy={50} r={36.5} stroke={colors.inkBlack} strokeWidth={6} fill="none" />
      <Circle cx={50} cy={50} r={36.5} stroke={colors.limeGreen} strokeWidth={1.8} strokeDasharray="4 4" fill="none" />
    </>
  ),

  wave: () => (
    <>
      <Path d={wavyCircle(39, 2.4, 12)} stroke={colors.skyBlue} strokeWidth={3} fill="none" />
      <Circle cx={50} cy={50} r={34.5} stroke={colors.white} strokeWidth={2.5} fill="none" />
      <Circle cx={px(46, 40)} cy={py(46, 40)} r={2.6} fill="#B5E2F7" />
      <Circle cx={px(47, 54)} cy={py(47, 54)} r={1.6} fill="#B5E2F7" />
      <Circle cx={px(46, 300)} cy={py(46, 300)} r={2.2} fill="#B5E2F7" />
    </>
  ),

  summit: () => (
    <>
      <Circle cx={50} cy={50} r={36} stroke={colors.deepGreen} strokeWidth={3.5} fill="none" />
      <Polygon points="22,22 36,8 50,22" fill={colors.tealGreen} />
      <Polygon points="50,22 64,8 78,22" fill={colors.tealGreen} />
      <Polygon points="30,24 50,1 70,24" fill={colors.deepGreen} />
      <Polygon points="44,8 50,1 56,8 52.5,6.5 50,9 47.5,6.5" fill={colors.white} />
      <Polygon points="33,11 36,8 39,11 36,10" fill={colors.white} />
      <Polygon points="61,11 64,8 67,11 64,10" fill={colors.white} />
    </>
  ),

  compass: () => (
    <>
      <Circle cx={50} cy={50} r={37} stroke={colors.deepGreen} strokeWidth={2.5} fill="none" />
      {range(0, 350, 10).map((a) => {
        const major = a % 90 === 0;
        return (
          <Line
            key={a}
            x1={px(39.5, a)}
            y1={py(39.5, a)}
            x2={px(major ? 45 : 42, a)}
            y2={py(major ? 45 : 42, a)}
            stroke={major ? colors.deepGreen : colors.tealGreen}
            strokeWidth={major ? 2.4 : 1.2}
          />
        );
      })}
      <Polygon points="50,0 45,10 55,10" fill={colors.error} />
      {[90, 180, 270].map((a) => (
        <Polygon
          key={a}
          points={star(px(47, a), py(47, a), 3.5, 1.4, 4)}
          fill={colors.deepGreen}
        />
      ))}
    </>
  ),

  // Scalloped edge like a postmark
  stamp: () => (
    <>
      {range(0, 345, 15).map((a) => (
        <Circle key={a} cx={px(42.5, a)} cy={py(42.5, a)} r={4.4} fill={colors.deepGreen} />
      ))}
      <Circle cx={50} cy={50} r={42.5} fill={colors.deepGreen} />
      <Circle cx={50} cy={50} r={36} fill={colors.white} />
      <Circle cx={50} cy={50} r={39.5} stroke={colors.white} strokeWidth={1} strokeDasharray="2 2" fill="none" />
      <Polygon points={star(50, 89.5, 3.2, 1.3)} fill={colors.limeGreen} />
      <Polygon points={star(50, 10.5, 3.2, 1.3)} fill={colors.limeGreen} />
    </>
  ),

  sunrise: () => (
    <>
      <Defs>
        <LinearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F7C948" />
          <Stop offset="1" stopColor="#F08A24" />
        </LinearGradient>
      </Defs>
      {range(0, 337.5, 22.5).map((a, i) => {
        const len = i % 2 === 0 ? 49 : 44;
        return (
          <Polygon
            key={a}
            points={`${px(36, a - 6)},${py(36, a - 6)} ${px(len, a)},${py(len, a)} ${px(36, a + 6)},${py(36, a + 6)}`}
            fill="url(#sun)"
          />
        );
      })}
      <Circle cx={50} cy={50} r={36} stroke="url(#sun)" strokeWidth={3.5} fill="none" />
    </>
  ),

  jet: () => (
    <>
      <Circle cx={50} cy={50} r={36} stroke={colors.skyBlue} strokeWidth={3} fill="none" />
      <G transform="rotate(-30 50 50)">
        <Ellipse cx={50} cy={50} rx={47} ry={19} stroke={colors.skyBlue} strokeWidth={1.6} strokeDasharray="3 3" fill="none" />
      </G>
      <Circle cx={px(45, 220)} cy={py(45, 220)} r={1.6} fill={colors.skyBlue} />
      <Circle cx={px(47, 232)} cy={py(47, 232)} r={1.1} fill={colors.skyBlue} />
    </>
  ),

  tropical: () => (
    <>
      <Circle cx={50} cy={50} r={36} stroke={colors.limeGreen} strokeWidth={3} fill="none" />
      {[
        [200, colors.deepGreen],
        [218, colors.limeGreen],
        [236, colors.tealGreen],
        [160, colors.deepGreen],
        [142, colors.limeGreen],
        [124, colors.tealGreen],
        [24, colors.limeGreen],
        [40, colors.deepGreen],
      ].map(([a, color]) => (
        <G key={a as number} transform={`translate(${px(34, a as number)} ${py(34, a as number)}) rotate(${a})`}>
          <Path d={LEAF} fill={color as string} />
          <Line x1={0} y1={-1} x2={0} y2={-19} stroke={colors.white} strokeWidth={0.6} opacity={0.6} />
        </G>
      ))}
      {range(0, 288, 72).map((a) => (
        <Circle key={a} cx={50 + 3.6 * Math.sin(rad(a))} cy={90 - 3.6 * Math.cos(rad(a))} r={3} fill={colors.heart} />
      ))}
      <Circle cx={50} cy={90} r={2} fill={colors.gold} />
    </>
  ),

  aurora: () => (
    <>
      <Defs>
        <LinearGradient id="aurora" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.limeGreen} />
          <Stop offset="0.5" stopColor={colors.tealGreen} />
          <Stop offset="1" stopColor={colors.skyBlue} />
        </LinearGradient>
      </Defs>
      <Circle cx={50} cy={50} r={42} stroke="url(#aurora)" strokeWidth={1.5} opacity={0.45} fill="none" />
      <Circle cx={50} cy={50} r={37} stroke="url(#aurora)" strokeWidth={5} fill="none" />
      <Circle cx={50} cy={50} r={34} stroke={colors.white} strokeWidth={1.2} opacity={0.8} fill="none" />
      <Polygon points={star(px(45, 40), py(45, 40), 6, 1.6, 4)} fill={colors.skyBlue} />
      <Polygon points={star(px(46, 300), py(46, 300), 4.5, 1.3, 4)} fill={colors.limeGreen} />
      <Polygon points={star(px(46, 170), py(46, 170), 3.5, 1, 4)} fill={colors.tealGreen} />
    </>
  ),

  laurel: () => (
    <>
      <Circle cx={50} cy={50} r={36} stroke={colors.gold} strokeWidth={3} fill="none" />
      {range(205, 340, 19).map((a) => (
        <Ellipse
          key={`l${a}`}
          cx={px(41.5, a)}
          cy={py(41.5, a)}
          rx={2.6}
          ry={6.2}
          fill={colors.gold}
          transform={`rotate(${a + 35} ${px(41.5, a)} ${py(41.5, a)})`}
        />
      ))}
      {range(155, 20, -19).map((a) => (
        <Ellipse
          key={`r${a}`}
          cx={px(41.5, a)}
          cy={py(41.5, a)}
          rx={2.6}
          ry={6.2}
          fill={colors.gold}
          transform={`rotate(${a - 35} ${px(41.5, a)} ${py(41.5, a)})`}
        />
      ))}
      <Polygon points={star(50, 8, 7, 3)} fill={colors.gold} stroke="#B07A12" strokeWidth={0.8} />
      <Polygon points="44,88 50,92 47,99" fill={colors.heart} />
      <Polygon points="56,88 50,92 53,99" fill={colors.heart} />
      <Circle cx={50} cy={89} r={3.4} fill={colors.heart} />
    </>
  ),
};

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  plane: { position: "absolute" },
});
