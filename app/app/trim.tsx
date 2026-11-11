import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { useEventListener } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";
import StateNote from "../components/StateNote";
import TrimTimeline from "../components/TrimTimeline";
import Wordmark from "../components/Wordmark";
import { getLastClip, setLastClip, type Clip } from "../lib/session";
import { grabFrame } from "../lib/proof";
import { useLoopRange } from "../lib/useLoopRange";
import {
  MAX_KEEP_MS, canKeep, clock, defaultRange, lengthMs, overByMs, pushHistory, undo, type Range,
} from "../lib/trim";
import * as StampVideo from "../modules/stamp-video";
import { color, mono, space, type, TOUCH } from "../lib/theme";

const THUMBS = 8;

export default function TrimScreen() {
  const clip = getLastClip();
  const insets = useSafeAreaInsets();
  if (!clip) {
    return (
      <View style={[s.screen, s.center, { paddingBottom: insets.bottom + space.lg }]}>
        <StateNote icon="videocam-outline" title="No clip yet" body="Film an elimination and pick the part to keep here." />
        <Button label="Record" icon="videocam" onPress={() => router.replace("/record")} style={s.full} />
      </View>
    );
  }
  return <TrimReady clip={clip} />;
}

function TrimReady({ clip }: { clip: Clip }) {
  const insets = useSafeAreaInsets();
  const [durationMs, setDurationMs] = useState(clip.durationMs);
  const [history, setHistory] = useState<Range[]>(() => [defaultRange(clip.durationMs)]);
  const committed = history[history.length - 1] ?? defaultRange(durationMs);
  const [live, setLive] = useState<Range>(committed);
  const [thumbs, setThumbs] = useState<(string | null)[]>(() => Array(THUMBS).fill(null));

  const player = useVideoPlayer(clip.uri, (p) => { p.muted = true; });
  useLoopRange(player, committed);

  // The timer's length is approximate; switch to the file's real length once it's known,
  // unless the user has already moved the handles.
  useEventListener(player, "sourceLoad", ({ duration }) => {
    const real = Math.round(duration * 1000);
    if (real > 0 && Math.abs(real - durationMs) > 50) {
      setDurationMs(real);
      setHistory((h) => (h.length === 1 ? [defaultRange(real)] : h));
    }
  });

  useEffect(() => { setLive(committed); }, [committed]);

  useEffect(() => {
    let alive = true;
    const times = Array.from({ length: THUMBS }, (_, i) => ((i + 0.5) / THUMBS) * durationMs);
    Promise.all(times.map((t) => grabFrame(clip.uri, t))).then((t) => alive && setThumbs(t));
    return () => { alive = false; };
  }, [clip.uri, durationMs]);

  const ok = canKeep(live, durationMs);
  const over = overByMs(live);

  function discard() {
    Alert.alert("Discard this clip?", "It hasn't been saved yet.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }

  function useSelection() {
    if (!canKeep(committed, durationMs)) return;
    setLastClip({ ...clip, durationMs, range: committed });
    router.replace("/clip");
  }

  return (
    <View style={[s.screen, { paddingBottom: insets.bottom + space.md }]}>
      <View style={[s.header, { paddingTop: insets.top + space.xs }]}>
        <Pressable onPress={discard} accessibilityRole="button" accessibilityLabel="Discard clip"
                   style={({ pressed }) => [s.round, pressed && s.pressed]} hitSlop={8}>
          <Ionicons name="close" size={28} color={color.text} />
        </Pressable>
        <Wordmark />
        <View style={s.round} />
      </View>

      <View style={s.videoBox}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      </View>

      <View style={s.body}>
        <Text style={type.label}>PICK THE PART TO KEEP</Text>
        <View style={s.readout}>
          <Text style={[s.keep, !ok && s.keepBad]}>{clock(lengthMs(live))}</Text>
          <Text style={s.of}>
            {clock(live.startMs)} – {clock(live.endMs)} of {clock(durationMs)}
          </Text>
        </View>

        <TrimTimeline
          durationMs={durationMs}
          range={live}
          thumbs={thumbs}
          onChange={setLive}
          onCommit={(r) => setHistory((h) => pushHistory(h, r))}
        />

        <Text style={s.help} accessibilityLiveRegion="polite">
          {over > 0
            ? `${clock(over)} too long. Keep ${MAX_KEEP_MS / 1000} seconds or less.`
            : "Drag the ends to trim. Drag the middle to slide."}
        </Text>
        {!StampVideo.isAvailable ? (
          <Text style={s.note}>
            Test build: the cut is made in the full app. Expo Go keeps the whole recording, and uses
            this selection for the preview and proof card.
          </Text>
        ) : null}
      </View>

      <View style={s.actions}>
        <Button label="Undo" icon="arrow-undo" variant="secondary" style={s.undo}
                onPress={() => setHistory(undo)} disabled={history.length <= 1} />
        <Button label={ok ? "Use this part" : "Too long"} icon={ok ? "checkmark" : undefined}
                style={s.flex} onPress={useSelection} disabled={!ok || !canKeep(committed, durationMs)} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: { justifyContent: "center", paddingHorizontal: space.lg, gap: space.sm },
  full: { alignSelf: "stretch" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.sm },
  round: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: color.blueSoft },
  videoBox: { flex: 1, marginHorizontal: space.md, borderRadius: 18, overflow: "hidden", backgroundColor: "#000" },
  body: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.sm },
  readout: { flexDirection: "row", alignItems: "baseline", gap: space.sm, marginBottom: space.xs },
  keep: { fontFamily: mono, fontSize: 30, fontWeight: "800", color: color.text, fontVariant: ["tabular-nums"] },
  keepBad: { color: color.dim },
  of: { fontFamily: mono, fontSize: 13, color: color.dim, fontVariant: ["tabular-nums"] },
  help: { color: color.dim, fontSize: 14, textAlign: "center", marginTop: space.xs },
  note: { color: color.faint, fontSize: 12.5, lineHeight: 18, textAlign: "center" },
  actions: { flexDirection: "row", gap: space.sm, paddingHorizontal: space.md, paddingTop: space.md },
  undo: { minWidth: 120 },
});
