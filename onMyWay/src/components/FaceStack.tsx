import { Text, View } from "react-native";
import { cn } from "../lib/cn";
import { Avatar } from "./Avatar";

// Overlapping avatars followed by a line of social proof ("Liked by ...", "312 travelers ...")
export function FaceStack({ names, text, bold }: { names: string[]; text: string; bold?: string }) {
  // Bold the friend's name inside the translated sentence
  const parts = bold && text.includes(bold) ? text.split(bold) : [text];

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row">
        {[...new Set(names)].slice(0, 3).map((name, i) => (
          <View key={name} className={cn("rounded-[13px] border-2 border-white", i > 0 && "-ml-2")} style={{ zIndex: 3 - i }}>
            <Avatar name={name} size={22} />
          </View>
        ))}
      </View>
      <Text className="shrink text-[13px] text-ink" numberOfLines={1}>
        {parts.length === 2 ? (
          <>
            {parts[0]}
            <Text className="font-bold">{bold}</Text>
            {parts[1]}
          </>
        ) : (
          text
        )}
      </Text>
    </View>
  );
}
