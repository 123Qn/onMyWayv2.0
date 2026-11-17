// Tailwind styles (Uniwind)
import "../global.css";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NavigationBar } from "expo-navigation-bar";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import { colors } from "../lib/theme";
import { CelebrationHost } from "../components/Celebration";
// Defines the background location task; must load before Android can wake it up
import "../lib/tripRecorder";

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white }}>
        <ActivityIndicator size="large" color={colors.deepGreen} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user} redirectTo="/login">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="badges" />
        <Stack.Screen name="frames" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="trip/[id]" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="follows/[id]" />
        <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="moments" options={{ animation: "fade", presentation: "fullScreenModal" }} />
        <Stack.Screen name="create" options={{ presentation: "modal", gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <NavigationBar style="dark" hidden={false} />
      <RootNavigator />
      <CelebrationHost />
    </AuthProvider>
  );
}