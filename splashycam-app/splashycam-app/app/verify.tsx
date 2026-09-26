import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { lookupProof } from "../lib/supabase";

export default function Verify() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "found" | "missing">("idle");
  const [row, setRow] = useState<any>(null);

  async function check() {
    setState("loading");
    const r = await lookupProof(code);
    if (r) { setRow(r); setState("found"); } else { setState("missing"); }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.label}>Type the code shown on the clip</Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="HX7-42K"
        placeholderTextColor="#4a5a80"
        autoCapitalize="characters"
        style={s.input}
      />
      <Pressable style={s.primary} onPress={check}><Text style={s.primaryText}>Check it</Text></Pressable>

      {state === "loading" && <Text style={s.note}>Checking…</Text>}
      {state === "missing" && <Text style={[s.result, s.bad]}>No clip with that code. Either it was mistyped, or the clip wasn't filmed with Splashy Cam.</Text>}
      {state === "found" && (
        <View style={s.card}>
          <Text style={[s.result, s.good]}>Real clip</Text>
          <Text style={s.note}>Filmed {new Date(row.created_at).toLocaleString()}</Text>
          {row.place ? <Text style={s.note}>Near {row.place}</Text> : null}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 24, gap: 14 },
  label: { color: "#9fb0d4", fontSize: 15 },
  input: { backgroundColor: "#131a2e", color: "#eaf0ff", fontSize: 24, letterSpacing: 3,
           padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#2a3552" },
  primary: { backgroundColor: "#3d7bff", padding: 16, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  card: { backgroundColor: "#131a2e", padding: 18, borderRadius: 12, gap: 6, marginTop: 8 },
  result: { fontSize: 19, fontWeight: "700" },
  good: { color: "#49d17f" },
  bad: { color: "#ff8078", fontSize: 15, fontWeight: "500", lineHeight: 22 },
  note: { color: "#9fb0d4", fontSize: 14 },
});
