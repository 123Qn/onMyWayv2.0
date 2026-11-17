import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { t } from "../i18n";
import { dismissCelebration, rarityColor, useCelebration, useRewards } from "../lib/rewards";
import { colors } from "../lib/theme";
import { BadgeIcon } from "./BadgeIcon";
import { FramePreview } from "./AvatarFrame";
import { PrimaryButton } from "./PrimaryButton";
import { AnimatedView } from "./ui/Screen";

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
      <View className="flex-1 items-center justify-center bg-ink/60 p-6">
        {/* Tapping the dimmed backdrop closes it too */}
        <Pressable className="absolute inset-0" onPress={close} accessibilityLabel={t("celebrate.awesome")} />
        <Confetti />
        <View className="items-center gap-3 self-stretch rounded-[28px] bg-white p-6">
          {levelUp ? (
            <View className="flex-row items-center gap-2 rounded-2xl bg-ink px-3.5 py-1.5">
              <Text className="text-sm font-bold text-lime-green">{t("rewards.level", { level: levelUp.level })}</Text>
              <View className="h-1 w-1 rounded-full bg-muted" />
              <Text className="text-sm font-bold text-white">{t(`rewards.levelTitles.${levelUp.title}`)}</Text>
            </View>
          ) : null}

          <Text className="text-center text-[22px] font-bold text-ink">{title}</Text>

          {badges.length > 0 ? (
            <>
              <View className="my-1 flex-row items-center justify-center gap-2.5">
                {badges.slice(0, MAX_BADGES).map((b, i) => (
                  <PopIn key={b.id} delay={150 + i * 120}>
                    <BadgeIcon badge={b} unlocked size={badges.length === 1 ? 110 : 64} />
                  </PopIn>
                ))}
                {badges.length > MAX_BADGES ? <Text className="text-base font-bold text-muted">+{badges.length - MAX_BADGES}</Text> : null}
              </View>
              {badges.length === 1 ? (
                <>
                  <Text className="text-lg font-bold text-ink">{t(`rewards.badges.${first.id}`)}</Text>
                  <Text className="-mt-2 text-[13px] font-bold" style={{ color: rarityColor[first.rarity].dark }}>
                    {t(`rewards.rarity.${first.rarity}`)}
                  </Text>
                </>
              ) : (
                <Text className="text-center text-sm text-muted" numberOfLines={2}>
                  {badges.map((b) => t(`rewards.badges.${b.id}`)).join(" · ")}
                </Text>
              )}
            </>
          ) : null}

          {newFrame ? (
            <View className="flex-row items-center gap-2.5 self-stretch rounded-2xl bg-lime-tint p-2.5">
              <FramePreview frame={newFrame.id} size={56} />
              <View className="flex-1">
                <Text className="text-xs text-muted">{t("celebrate.newFrame")}</Text>
                <Text className="text-[15px] font-bold text-ink">{t(`rewards.frames.${newFrame.id}`)}</Text>
              </View>
              <Pressable
                onPress={() => {
                  equipFrame(newFrame.id);
                  close();
                }}
                accessibilityRole="button"
                className="rounded-2xl bg-deep-green px-3.5 py-2 active:opacity-75"
              >
                <Text className="text-[13px] font-bold text-white">{t("rewards.equip")}</Text>
              </Pressable>
            </View>
          ) : null}

          <View className="mt-1 gap-2.5 self-stretch">
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
  return <AnimatedView style={{ transform: [{ scale }] }}>{children}</AnimatedView>;
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
    <View pointerEvents="none" className="absolute inset-0">
      {pieces.map((p, i) => (
        // Each confetto has its own random position, size, color and motion
        <AnimatedView
          key={i}
          className="absolute -top-5 rounded-sm"
          style={{
            left: p.x,
            width: p.size,
            height: p.size * 1.6,
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
