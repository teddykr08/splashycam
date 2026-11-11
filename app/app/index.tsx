import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../components/Button";
import StampOverlay from "../components/StampOverlay";
import Wordmark from "../components/Wordmark";
import { color, radius, space, type } from "../lib/theme";

const SAMPLE = { code: "HX7-42K", createdAt: new Date().toISOString(), place: "Your town" };

export default function Home() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.screen, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.md }]}>
      <View style={s.brand}>
        <View style={s.kickerRow}>
          <Text style={s.kicker}>SENIOR ASSASSIN · TIMESTAMPED PROOF</Text>
        </View>
        <Wordmark size="lg" />
        <Text style={[type.body, s.tagline]}>Film the hit. Get a timestamped proof.</Text>
      </View>

      <View style={s.sample} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={s.sampleFrame}>
          <View style={s.sampleGlow} />
          <StampOverlay rec={SAMPLE} scale={1.25} style={s.sampleStamp} />
        </View>
        <Text style={s.caption}>Every clip gets a stamp like this, with its own code.</Text>
      </View>

      <View style={s.bottom}>
        <Button big label="Record an elimination" icon="videocam" onPress={() => router.push("/record")} />
        <Text style={s.privacy}>
          Clips and codes stay on your phone. Nothing is uploaded.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space.lg },
  brand: { gap: space.xs },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: space.xs },
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
  privacy: { color: color.faint, fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: space.xs },
});
