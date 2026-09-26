import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>Splashy Cam</Text>
      <Text style={s.sub}>Film the hit. Stamp it. Nobody argues.</Text>

      <Link href="/record" asChild>
        <Pressable style={s.primary}><Text style={s.primaryText}>Record an elimination</Text></Pressable>
      </Link>

      <Link href="/verify" asChild>
        <Pressable style={s.secondary}><Text style={s.secondaryText}>Verify someone's clip</Text></Pressable>
      </Link>

      <Text style={s.note}>
        Clips stay on your phone. We only keep the code, the time, and the city,
        so a host can check a clip is real.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: "center", gap: 14 },
  title: { color: "#eaf0ff", fontSize: 38, fontWeight: "800", letterSpacing: -0.5 },
  sub: { color: "#9fb0d4", fontSize: 16, marginBottom: 18 },
  primary: { backgroundColor: "#3d7bff", padding: 18, borderRadius: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondary: { borderColor: "#2a3552", borderWidth: 1, padding: 16, borderRadius: 14, alignItems: "center" },
  secondaryText: { color: "#9fb0d4", fontSize: 15, fontWeight: "600" },
  note: { color: "#5f7099", fontSize: 12.5, lineHeight: 18, marginTop: 22 },
});
