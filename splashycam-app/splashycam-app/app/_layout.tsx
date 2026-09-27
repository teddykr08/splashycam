import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { color } from "../lib/theme";

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: color.bg },
          headerTintColor: color.text,
          headerTitleStyle: { fontWeight: "800" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: color.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: "Splashy Cam" }} />
        <Stack.Screen name="record" options={{ headerShown: false, title: "Record", animation: "fade" }} />
        <Stack.Screen name="clip" options={{ headerShown: false, title: "Send your clip", gestureEnabled: false }} />
        <Stack.Screen name="verify" options={{ title: "Check a code" }} />
      </Stack>
    </>
  );
}
