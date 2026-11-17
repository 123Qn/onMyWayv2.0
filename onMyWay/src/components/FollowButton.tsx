import { Pressable, Text } from "react-native";
import { t } from "../i18n";
import { cn } from "../lib/cn";
import { useFollowing } from "../lib/postStore";

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
      className={cn(
        "items-center active:opacity-80",
        compact ? "rounded-2xl px-3.5 py-[7px]" : "mt-2 min-w-40 rounded-[22px] py-2.5",
        isFollowing ? "bg-lime-tint" : "bg-deep-green"
      )}
    >
      <Text className={cn("font-bold", compact ? "text-[13px]" : "text-[15px]", isFollowing ? "text-deep-green" : "text-white")}>
        {isFollowing ? t("post.following") : t("post.follow")}
      </Text>
    </Pressable>
  );
}
