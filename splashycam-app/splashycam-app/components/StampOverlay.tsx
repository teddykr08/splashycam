import { View, Text, StyleSheet } from "react-native";
import { stampLines, type ProofRecord } from "../lib/stamp";

/** The burned-in-looking stamp. Sits bottom-left, like a camcorder timestamp. */
export default function StampOverlay({ rec }: { rec: ProofRecord }) {
  const lines = stampLines(rec);
  return (
    <View style={styles.wrap} pointerEvents="none">
      {lines.map((l, i) => (
        <Text key={i} style={[styles.line, i === 0 && styles.first]}>{l}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, bottom: 28 },
  line: {
    color: "#fff",
    fontSize: 13,
    letterSpacing: 1.1,
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  first: { fontSize: 15, fontWeight: "700" },
});
