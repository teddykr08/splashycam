import { useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";
import StampOverlay from "../components/StampOverlay";
import { flushPending } from "../lib/pending";
import { color, radius, space, type } from "../lib/theme";

const SAMPLE = { code: "HX7-42K", createdAt: new Date().toISOString(), place: "Your town" };

export default function Home() {
  const insets = useSafeAreaInsets();
  const [waiting, setWaiting] = useState(0);

  // Codes filmed with no signal get another try every time you come back here.
  useFocusEffect(useCallback(() => {
    let live = true;
    flushPending().then((n) => live && setWaiting(n)).catch(() => {});
    return () => { live = false; };
  }, []));

  return (
    <View style={[s.screen, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.md }]}>
      <View style={s.brand}>
        <View style={s.kickerRow}>
          <View style={s.dot} />
          <Text style={s.kicker}>SENIOR ASSASSIN PROOF</Text>
        </View>
        <Text style={type.display}>Splashy Cam</Text>
        <Text style={[type.body, s.tagline]}>Film the hit. Stamp it. Nobody argues.</Text>
      </View>

      <View style={s.sample} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={s.sampleFrame}>
          <View style={s.sampleGlow} />
          <StampOverlay rec={SAMPLE} scale={1.25} style={s.sampleStamp} />
        </View>
        <Text style={s.caption}>Every clip gets a stamp like this. The code is what the host checks.</Text>
      </View>

      <View style={s.bottom}>
        {waiting > 0 ? (
          <View style={s.waiting} accessibilityRole="alert">
            <Ionicons name="cloud-offline-outline" size={20} color={color.blue} />
            <Text style={s.waitingText}>
              {waiting === 1 ? "1 code is" : `${waiting} codes are`} waiting for signal. They register automatically.
            </Text>
          </View>
        ) : null}
        <Button big label="Record an elimination" icon="videocam" onPress={() => router.push("/record")} />
        <Button label="Verify a clip" icon="shield-checkmark-outline" variant="secondary" onPress={() => router.push("/verify")} />
        <Text style={s.privacy}>
          Clips stay on your phone. Only the code, the time and the city go to the server.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space.lg },
  brand: { gap: space.xs },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.blue },
  kicker: { ...type.label, color: color.blue, fontSize: 12 },
  tagline: { fontSize: 18 },
  sample: { flex: 1, justifyContent: "center", gap: space.sm, paddingVertical: space.lg },
  sampleFrame: { aspectRatio: 16 / 10, maxHeight: 240, borderRadius: radius.lg, overflow: "hidden",
                 backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, justifyContent: "flex-end" },
  sampleGlow: { position: "absolute", width: 260, height: 260, borderRadius: 130, right: -70, top: -110,
                backgroundColor: color.blueSoft },
  sampleStamp: { margin: space.md },
  caption: { color: color.faint, fontSize: 13, textAlign: "center" },
  bottom: { gap: space.sm },
  waiting: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: color.blueSoft,
             borderRadius: radius.md, padding: space.md },
  waitingText: { color: color.text, fontSize: 14, flex: 1, lineHeight: 20 },
  privacy: { color: color.faint, fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: space.xs },
});
