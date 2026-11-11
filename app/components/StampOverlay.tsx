import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { stampTime, type ProofRecord } from "../lib/stamp";
import { color, mono } from "../lib/theme";

type Props = {
  rec: ProofRecord;
  /** Time to print. Pass a ticking clock while filming; defaults to the record's time. */
  at?: Date;
  /** 1 = on-camera size. The proof card draws it larger. */
  scale?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * The camcorder stamp: monospace, fixed-width digits, on a dark plate so it stays
 * readable over bright sky, a white wall, or night footage.
 */
export default function StampOverlay({ rec, at, scale = 1, style }: Props) {
  const t = stampTime(at ?? new Date(rec.createdAt));
  const f = (n: number) => Math.round(n * scale);
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={`Stamp ${rec.code}, ${t}${rec.place ? `, ${rec.place}` : ""}`}
      style={[s.plate, { paddingHorizontal: f(10), paddingVertical: f(8), borderRadius: f(6), gap: f(2) }, style]}
    >
      <View style={[s.row, { gap: f(6) }]}>
        <View style={[s.mark, { width: f(7), height: f(7), borderRadius: f(4) }]} />
        <Text style={[s.text, s.brand, { fontSize: f(10), letterSpacing: f(2) }]}>SPLASHY CAM</Text>
      </View>
      <Text style={[s.text, s.code, { fontSize: f(22), letterSpacing: f(3) }]}>{rec.code}</Text>
      <Text style={[s.text, { fontSize: f(13), letterSpacing: f(1) }]}>{t}</Text>
      {rec.place ? (
        <Text style={[s.text, s.place, { fontSize: f(12), letterSpacing: f(1.5) }]} numberOfLines={1}>
          {rec.place.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  plate: { alignSelf: "flex-start", backgroundColor: color.scrim },
  row: { flexDirection: "row", alignItems: "center" },
  mark: { backgroundColor: color.blue },
  text: {
    color: "#FFFFFF",
    fontFamily: mono,
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  brand: { fontWeight: "700", color: "#DCE6FF" },
  code: { fontWeight: "700" },
  place: { color: "#DCE6FF" },
});
