import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { TripStop } from "../lib/mockFeed";
import { colors, font } from "../lib/theme";

// Vertical timeline: numbered pin, connecting road, then photo + caption for each stop
export function TripStops({ stops }: { stops: TripStop[] }) {
  return (
    <View>
      {stops.map((stop, i) => {
        const last = i === stops.length - 1;
        return (
          <View key={stop.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={styles.pin}>
                <Text style={styles.pinText}>{i + 1}</Text>
              </View>
              {!last ? <View style={styles.road} /> : null}
            </View>

            <View style={[styles.body, !last && styles.bodySpacing]}>
              <Text style={styles.name}>{stop.name}</Text>
              {stop.caption ? <Text style={styles.caption}>{stop.caption}</Text> : null}
              <Image
                source={stop.imageUrl}
                style={styles.image}
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

const PIN = 30;

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 14 },
  rail: { width: PIN, alignItems: "center" },
  pin: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    backgroundColor: colors.deepGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  pinText: { color: colors.white, fontSize: 13, fontWeight: font.bold },
  road: {
    flex: 1,
    width: 3,
    marginVertical: 4,
    borderRadius: 1.5,
    backgroundColor: colors.limeGreen,
  },
  body: { flex: 1, gap: 6, paddingTop: 4 },
  bodySpacing: { paddingBottom: 22 },
  name: { color: colors.inkBlack, fontSize: 16, fontWeight: font.bold },
  caption: { color: colors.textMuted, fontSize: 14, lineHeight: 20, fontWeight: font.regular },
  image: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 16,
    marginTop: 4,
    backgroundColor: colors.limeTint,
  },
});
