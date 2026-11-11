import { useRef, useState } from "react";
import { View, Image, PanResponder, StyleSheet, type LayoutChangeEvent } from "react-native";
import { MAX_KEEP_MS, lengthMs, shifted, withEnd, withStart, type Range } from "../lib/trim";
import { color, radius } from "../lib/theme";

type Props = {
  durationMs: number;
  /** The selection to draw (updates live while dragging). */
  range: Range;
  /** Frames spread evenly across the recording, left to right. */
  thumbs: (string | null)[];
  onChange: (r: Range) => void;
  /** Called once when a drag ends: that's one undo step. */
  onCommit: (r: Range) => void;
};

const TRACK_H = 64;
const HANDLE_W = 22;
const HIT = 22; // extra touch area each side, so each handle is ~66 pt wide to a finger

type Part = "start" | "end" | "middle";

/**
 * TikTok-style trim bar: two handles and a draggable middle over a strip of frames.
 * Outside the selection is dimmed. Over 60 s, the frame turns white instead of blue.
 */
export default function TrimTimeline({ durationMs, range, thumbs, onChange, onCommit }: Props) {
  const [width, setWidth] = useState(0);

  // Refs so the gesture handlers (created once) always see current values.
  const latest = useRef({ range, durationMs, width, onChange, onCommit });
  latest.current = { range, durationMs, width, onChange, onCommit };
  const origin = useRef<Range>(range);
  const moved = useRef<Range>(range);

  const responder = (part: Part) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        origin.current = latest.current.range;
        moved.current = latest.current.range;
      },
      onPanResponderMove: (_e, g) => {
        const { durationMs: d, width: w } = latest.current;
        if (w <= 0 || d <= 0) return;
        const deltaMs = (g.dx / w) * d;
        const o = origin.current;
        const next = part === "start" ? withStart(o, o.startMs + deltaMs, d)
          : part === "end" ? withEnd(o, o.endMs + deltaMs, d)
          : shifted(o, deltaMs, d);
        moved.current = next;
        latest.current.onChange(next);
      },
      onPanResponderRelease: () => latest.current.onCommit(moved.current),
      onPanResponderTerminate: () => latest.current.onCommit(moved.current),
    });

  const startPan = useRef(responder("start")).current;
  const endPan = useRef(responder("end")).current;
  const middlePan = useRef(responder("middle")).current;

  const x = (ms: number) => (durationMs > 0 ? (ms / durationMs) * width : 0);
  const left = x(range.startMs);
  const right = x(range.endMs);
  const tooLong = lengthMs(range) > MAX_KEEP_MS;
  const frameColor = tooLong ? color.text : color.blue;

  return (
    <View style={s.wrap} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
          accessibilityLabel="Trim timeline" accessibilityHint="Drag the handles to choose the part to keep">
      <View style={s.track}>
        {thumbs.map((t, i) =>
          t ? <Image key={i} source={{ uri: t }} style={s.thumb} /> : <View key={i} style={[s.thumb, s.thumbEmpty]} />)}
      </View>

      {/* Dim what's not kept. */}
      <View pointerEvents="none" style={[s.dim, { left: 0, width: Math.max(0, left) }]} />
      <View pointerEvents="none" style={[s.dim, { left: right, right: 0 }]} />

      {/* Selection frame; drag inside it to slide the whole selection. */}
      <View {...middlePan.panHandlers}
            style={[s.frame, { left, width: Math.max(0, right - left), borderColor: frameColor }]} />

      <View {...startPan.panHandlers} hitSlop={{ left: HIT, right: HIT, top: 12, bottom: 12 }}
            accessibilityRole="adjustable" accessibilityLabel="Start of the part to keep"
            style={[s.handle, { left: left - HANDLE_W, backgroundColor: frameColor },
                    s.handleLeft]}>
        <View style={s.grip} />
      </View>
      <View {...endPan.panHandlers} hitSlop={{ left: HIT, right: HIT, top: 12, bottom: 12 }}
            accessibilityRole="adjustable" accessibilityLabel="End of the part to keep"
            style={[s.handle, { left: right, backgroundColor: frameColor }, s.handleRight]}>
        <View style={s.grip} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { height: TRACK_H, marginHorizontal: HANDLE_W },
  track: { ...StyleSheet.absoluteFill, flexDirection: "row", borderRadius: radius.sm, overflow: "hidden",
           backgroundColor: color.surface },
  thumb: { flex: 1, height: TRACK_H },
  thumbEmpty: { backgroundColor: color.surfaceHi, borderRightWidth: 1, borderRightColor: color.bg },
  dim: { position: "absolute", top: 0, bottom: 0, backgroundColor: "rgba(5,7,10,0.72)" },
  frame: { position: "absolute", top: 0, bottom: 0, borderTopWidth: 3, borderBottomWidth: 3 },
  handle: { position: "absolute", top: 0, bottom: 0, width: HANDLE_W, alignItems: "center", justifyContent: "center" },
  handleLeft: { borderTopLeftRadius: radius.sm, borderBottomLeftRadius: radius.sm },
  handleRight: { borderTopRightRadius: radius.sm, borderBottomRightRadius: radius.sm },
  grip: { width: 3, height: 22, borderRadius: 2, backgroundColor: color.bg },
});
