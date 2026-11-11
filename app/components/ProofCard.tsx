import { forwardRef } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StampOverlay from "./StampOverlay";
import { stampTime, type ProofRecord } from "../lib/stamp";
import { color, mono, radius, space } from "../lib/theme";

type Props = {
  rec: ProofRecord;
  /** A frame from the clip. */
  frameUri: string | null;
  /** When the frame was taken, in ms from the start of the recording. */
  frameAtMs?: number;
  onFrameLoad?: () => void;
};

export const CARD_W = 320;
export const CARD_H = 400; // 4:5, fits Messages and TikTok previews without cropping the code

/**
 * The shareable proof: a frame from the clip with the stamp drawn on it, plus the code
 * and times in large type. This image is what carries the stamp until it can be burned
 * into the video itself (see AUDIT.md §7).
 */
const ProofCard = forwardRef<View, Props>(function ProofCard({ rec, frameUri, frameAtMs = 0, onFrameLoad }, ref) {
  const at = new Date(new Date(rec.createdAt).getTime() + frameAtMs);
  return (
    <View ref={ref} collapsable={false} style={s.card}>
      <View style={s.frame}>
        {frameUri ? (
          <Image source={{ uri: frameUri }} style={StyleSheet.absoluteFill} resizeMode="cover" onLoad={onFrameLoad} onError={onFrameLoad} />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.noFrame]} />
        )}
        <StampOverlay rec={rec} at={at} style={s.stamp} />
      </View>

      <View style={s.body}>
        <View style={s.headRow}>
          <Ionicons name="water" size={12} color={color.blue} />
          <Text style={s.kicker}>SPLASHY CAM · TIMESTAMPED PROOF</Text>
        </View>
        <Text style={s.code}>{rec.code}</Text>
        <Row k="FILMED" v={stampTime(at)} />
        {rec.place ? <Row k="NEAR" v={rec.place.toUpperCase()} /> : null}
        <Text style={s.foot}>Filmed with Splashy Cam</Text>
      </View>
    </View>
  );
});

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <Text style={s.k}>{k}</Text>
      <Text style={s.v} numberOfLines={1}>{v}</Text>
    </View>
  );
}

export default ProofCard;

const s = StyleSheet.create({
  card: { width: CARD_W, height: CARD_H, backgroundColor: color.bg, borderRadius: radius.md, overflow: "hidden",
          borderWidth: 1, borderColor: color.line },
  frame: { height: 214, backgroundColor: "#000" },
  noFrame: { backgroundColor: color.surface },
  stamp: { position: "absolute", left: 10, bottom: 10 },
  body: { flex: 1, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm, gap: 3 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  kicker: { fontFamily: mono, fontSize: 10, letterSpacing: 2, color: color.blue, fontWeight: "700" },
  code: { fontFamily: mono, fontSize: 38, letterSpacing: 5, color: color.text, fontWeight: "700",
          fontVariant: ["tabular-nums"], marginVertical: 2 },
  row: { flexDirection: "row", gap: space.sm },
  k: { fontFamily: mono, fontSize: 11, color: color.faint, width: 84, letterSpacing: 1 },
  v: { fontFamily: mono, fontSize: 11, color: color.text, flex: 1, letterSpacing: 0.5, fontVariant: ["tabular-nums"] },
  foot: { marginTop: "auto", fontSize: 11, color: color.dim },
});
