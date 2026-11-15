import { ScrollView, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { onScrollHideTabBar } from "../../lib/tabBarVisibility";

const ITEMS = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  title: `Trip ${i + 1}`,
  note: "Sydney trip 2 days 1 night, budget friendly, suitable for family",
}));

export default function Index() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        onScroll={onScrollHideTabBar}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Trips</Text>

        {ITEMS.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardNote}>{item.note}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, gap: 12, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#0B7F70", marginBottom: 4 },
  card: {
    height: 140,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#E3F6D3",
    justifyContent: "flex-end",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#1B2B28" },
  cardNote: { fontSize: 14, color: "#2B3B38", marginTop: 4 },
});