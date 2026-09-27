import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { lookupProof, type LookupResult } from "../lib/supabase";
import { formatCode, isCompleteCode } from "../lib/stamp";

type State = { status: "idle" } | { status: "loading" } | LookupResult;

export default function Verify() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function check() {
    if (!isCompleteCode(code)) return;
    setState({ status: "loading" });
    setState(await lookupProof(code));
  }

  return (
    <View style={s.wrap}>
      <Text style={s.label}>Type the code shown on the clip</Text>
      <TextInput
        value={code}
        onChangeText={(t) => { setCode(formatCode(t)); setState({ status: "idle" }); }}
        placeholder="HX7-42K"
        placeholderTextColor="#4a5a80"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        style={s.input}
      />
      <Pressable style={[s.primary, !isCompleteCode(code) && s.disabled]} onPress={check} disabled={!isCompleteCode(code)}>
        <Text style={s.primaryText}>Check it</Text>
      </Pressable>

      {state.status === "loading" && <Text style={s.note}>Checking…</Text>}
      {state.status === "not_found" && <Text style={[s.result, s.bad]}>No clip with that code. Either it was mistyped, or the clip wasn't filmed with Splashy Cam.</Text>}
      {state.status === "error" && <Text style={[s.result, s.bad]}>Couldn't reach the server. This says nothing about the clip. Check your connection and try again.</Text>}
      {state.status === "unconfigured" && <Text style={[s.result, s.bad]}>This build isn't connected to the Splashy Cam server, so it can't check codes.</Text>}
      {state.status === "found" && (
        <View style={s.card}>
          <Text style={[s.result, s.good]}>Real clip</Text>
          <Text style={s.note}>Registered {new Date(state.proof.createdAt).toLocaleString()}</Text>
          {state.proof.place ? <Text style={s.note}>Near {state.proof.place}</Text> : null}
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
  disabled: { opacity: 0.4 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  card: { backgroundColor: "#131a2e", padding: 18, borderRadius: 12, gap: 6, marginTop: 8 },
  result: { fontSize: 19, fontWeight: "700" },
  good: { color: "#49d17f" },
  bad: { color: "#ff8078", fontSize: 15, fontWeight: "500", lineHeight: 22 },
  note: { color: "#9fb0d4", fontSize: 14 },
});
