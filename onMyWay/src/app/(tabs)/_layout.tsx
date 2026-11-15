import { Tabs } from "expo-router";
import { CustomTabBar } from "../../components/customTabBar";
import { showTabBar } from "../../lib/tabBarVisibility";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      screenListeners={{ focus: () => showTabBar() }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="index2" />
      <Tabs.Screen name="index3" />
      <Tabs.Screen name="index4" />
    </Tabs>
  );
}