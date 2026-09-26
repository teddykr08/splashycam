import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: "#0b1020" },
                              headerTintColor: "#eaf0ff",
                              contentStyle: { backgroundColor: "#0b1020" } }}>
        <Stack.Screen name="index" options={{ title: "Splashy Cam" }} />
        <Stack.Screen name="record" options={{ title: "Record", headerShown: false }} />
        <Stack.Screen name="verify" options={{ title: "Verify a clip" }} />
      </Stack>
    </>
  );
}
