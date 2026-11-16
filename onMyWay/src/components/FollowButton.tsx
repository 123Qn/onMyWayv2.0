import { Pressable, StyleSheet, Text } from "react-native";
import { t } from "../i18n";
import { useFollowing } from "../lib/postStore";
import { colors, font } from "../lib/theme";

/** Follow / Following toggle; onChange runs after the change was sent (e.g. to reload counts) */
export function FollowButton({
  user,
  initial,
  onChange,
  compact = false,
}: {
  user: { id: number; name: string };
  initial: boolean;
  onChange?: () => void;
  compact?: boolean;
}) {
  const { isFollowing, toggleFollow } = useFollowing(user, initial);
  return (
    <Pressable
      onPress={() => {
        toggleFollow();
        if (onChange) setTimeout(onChange, 400);
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isFollowing }}
      accessibilityLabel={`${isFollowing ? t("post.following") : t("post.follow")} ${user.name}`}
      style={({ pressed }) => [compact ? styles.compact : styles.large, isFollowing && styles.following, pressed && styles.pressed]}
    >
      <Text style={[styles.text, compact && styles.textCompact, isFollowing && styles.followingText]}>
        {isFollowing ? t("post.following") : t("post.follow")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  large: { minWidth: 160, alignItems: "center", marginTop: 8, paddingVertical: 10, borderRadius: 22, backgroundColor: colors.deepGreen },
  compact: { alignItems: "center", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.deepGreen },
  following: { backgroundColor: colors.limeTint },
  text: { color: colors.white, fontSize: 15, fontWeight: font.bold },
  textCompact: { fontSize: 13 },
  followingText: { color: colors.deepGreen },
});
