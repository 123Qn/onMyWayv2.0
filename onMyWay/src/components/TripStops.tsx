import { Text, View } from "react-native";
import type { TripStop } from "../lib/feed";
import { cn } from "../lib/cn";
import { Img } from "./ui/Screen";

// Vertical timeline: numbered pin, connecting road, then photo + caption for each stop
export function TripStops({ stops }: { stops: TripStop[] }) {
  return (
    <View>
      {stops.map((stop, i) => {
        const last = i === stops.length - 1;
        return (
          <View key={stop.id} className="flex-row gap-3.5">
            <View className="w-[30px] items-center">
              <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-deep-green">
                <Text className="text-[13px] font-bold text-white">{i + 1}</Text>
              </View>
              {!last ? <View className="my-1 w-[3px] flex-1 rounded-sm bg-lime-green" /> : null}
            </View>

            <View className={cn("flex-1 gap-1.5 pt-1", !last && "pb-[22px]")}>
              <Text className="text-base font-bold text-ink">{stop.name}</Text>
              {stop.caption ? <Text className="text-sm leading-5 text-muted">{stop.caption}</Text> : null}
              <Img
                source={stop.imageUrl}
                className="mt-1 aspect-video w-full rounded-2xl bg-lime-tint"
                contentFit="cover"
                transition={200}
                accessibilityLabel={stop.name}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
