import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../../lib/cn";
import { flagEmoji } from "../../lib/format";
import type { FrameId } from "../../lib/rewards";
import { AvatarFrame } from "../AvatarFrame";

export type RowUser = { id: number; name: string; frame?: string; avatarUrl?: string | null; countryCode?: string | null };

/**
 * A traveler in a list: framed avatar, name with flag, optional lines under it,
 * and something on the right (a Follow button, a score...).
 */
export function UserRow({
  user,
  onPress,
  lines = [],
  leading,
  trailing,
  avatarSize = 44,
  highlight = false,
  label,
}: {
  user: RowUser;
  onPress?: () => void;
  /** Muted lines under the name (bio, follower count); empty ones are skipped */
  lines?: (string | null | undefined)[];
  /** Before the avatar, e.g. a rank badge */
  leading?: ReactNode;
  trailing?: ReactNode;
  avatarSize?: number;
  /** Lime background, e.g. my own row */
  highlight?: boolean;
  /** Name shown instead of user.name, e.g. "Alex (You)" */
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={user.name}
      className={cn("flex-row items-center gap-3 rounded-md p-2 active:opacity-80", highlight && "bg-lime-tint")}
    >
      {leading}
      <AvatarFrame name={user.name} frame={(user.frame ?? "classic") as FrameId} avatarSize={avatarSize} uri={user.avatarUrl} />
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
          {label ?? user.name}
          {user.countryCode ? `  ${flagEmoji(user.countryCode)}` : ""}
        </Text>
        {lines.filter(Boolean).map((line, i) => (
          <Text key={i} className={cn("text-muted", i === 0 ? "text-[13px]" : "text-xs")} numberOfLines={1}>
            {line}
          </Text>
        ))}
      </View>
      {trailing}
    </Pressable>
  );
}
