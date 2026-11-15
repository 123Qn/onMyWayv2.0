import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { t } from "../i18n";
import { dismissCelebration, rarityColor, useCelebration, useRewards } from "../lib/rewards";
import { colors, font } from "../lib/theme";
import { BadgeIcon } from "./BadgeIcon";
import { FramePreview } from "./AvatarFrame";
import { PrimaryButton } from "./PrimaryButton";

const CONFETTI_COLORS = [colors.limeGreen, colors.tealGreen, colors.skyBlue, colors.gold, colors.heart, colors.white];
const PIECES = 28;
const MAX_BADGES = 4;

// Shown over the whole app when a refresh unlocks badges, a level or a frame
export function CelebrationHost() {
  const celebration = useCelebration();
  const { equipFrame, togglePin, pinned } = useRewards();
  if (!celebration) return null;

  const { badges, levelUp, frames } = celebration;
  const first = badges[0];
  const newFrame = frames[frames.length - 1];
  const title = levelUp
    ? t("celebrate.levelUp", { level: levelUp.level })
    : badges.length > 1
      ? t("celebrate.badges", { count: badges.length })
      : badges.length === 1
        ? t("celebrate.badge")
        : t("celebrate.frame");

  const close = () => dismissCelebration();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Confetti />
        <View style={styles.card}>
          {levelUp ? (
            <View style={styles.levelPill}>
              <Text style={styles.levelText}>{t("rewards.level", { level: levelUp.level })}</Text>
              <View style={styles.levelDot} />
              <Text style={styles.levelTitle}>{t(`rewards.levelTitles.${levelUp.title}`)}</Text>
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>

          {badges.length > 0 ? (
            <>
              <View style={styles.badges}>
                {badges.slice(0, MAX_BADGES).map((b, i) => (
                  <PopIn key={b.id} delay={150 + i * 120}>
                    <BadgeIcon badge={b} unlocked size={badges.length === 1 ? 110 : 64} />
                  </PopIn>
                ))}
                {badges.length > MAX_BADGES ? <Text style={styles.more}>+{badges.length - MAX_BADGES}</Text> : null}
              </View>
              {badges.length === 1 ? (
                <>
                  <Text style={styles.badgeName}>{t(`rewards.badges.${first.id}`)}</Text>
                  <Text style={[styles.rarity, { color: rarityColor[first.rarity].dark }]}>
                    {t(`rewards.rarity.${first.rarity}`)}
                  </Text>
                </>
              ) : (
                <Text style={styles.badgeList} numberOfLines={2}>
                  {badges.map((b) => t(`rewards.badges.${b.id}`)).join(" · ")}
                </Text>
              )}
            </>
          ) : null}

          {newFrame ? (
            <View style={styles.frameRow}>
              <FramePreview frame={newFrame.id} size={56} />
              <View style={styles.flex}>
                <Text style={styles.frameLabel}>{t("celebrate.newFrame")}</Text>
                <Text style={styles.frameName}>{t(`rewards.frames.${newFrame.id}`)}</Text>
              </View>
              <Pressable
                onPress={() => {
                  equipFrame(newFrame.id);
                  close();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.equip, pressed && styles.pressed]}
              >
                <Text style={styles.equipText}>{t("rewards.equip")}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.actions}>
            {badges.length === 1 && !pinned.includes(first.id) && pinned.length < 3 ? (
              <PrimaryButton
                title={t("rewards.pin")}
                icon="pin"
                onPress={() => {
                  togglePin(first.id);
                  close();
                }}
              />
            ) : (
              <PrimaryButton title={t("celebrate.awesome")} onPress={close} />
            )}
            <PrimaryButton
              title={t("celebrate.viewBadges")}
              variant="outline"
              onPress={() => {
                close();
                router.push("/badges");
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PopIn({ delay, children }: { delay: number; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, delay, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [scale, delay]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 120,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 600,
        duration: 1800 + Math.random() * 1200,
        spin: Math.random() > 0.5 ? 1 : -1,
      })),
    [width]
  );
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel(
      pieces.map((p, i) =>
        Animated.timing(progress[i], {
          toValue: 1,
          delay: p.delay,
          duration: p.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [pieces, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 1.6,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: progress[i].interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: progress[i].interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
              { translateX: progress[i].interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: progress[i].interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${p.spin * 540}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(27,43,40,0.6)" },
  flex: { flex: 1 },
  card: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: 12,
    padding: 24,
    borderRadius: 28,
    backgroundColor: colors.white,
  },
  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.inkBlack,
  },
  levelText: { color: colors.limeGreen, fontSize: 14, fontWeight: font.bold },
  levelDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textMuted },
  levelTitle: { color: colors.white, fontSize: 14, fontWeight: font.bold },
  title: { color: colors.inkBlack, fontSize: 22, fontWeight: font.bold, textAlign: "center" },
  badges: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginVertical: 4 },
  more: { color: colors.textMuted, fontSize: 16, fontWeight: font.bold },
  badgeName: { color: colors.inkBlack, fontSize: 18, fontWeight: font.bold },
  rarity: { fontSize: 13, fontWeight: font.bold, marginTop: -8 },
  badgeList: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  frameRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.limeTint,
  },
  frameLabel: { color: colors.textMuted, fontSize: 12, fontWeight: font.regular },
  frameName: { color: colors.inkBlack, fontSize: 15, fontWeight: font.bold },
  equip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.deepGreen },
  equipText: { color: colors.white, fontSize: 13, fontWeight: font.bold },
  pressed: { opacity: 0.75 },
  actions: { alignSelf: "stretch", gap: 10, marginTop: 4 },
});
