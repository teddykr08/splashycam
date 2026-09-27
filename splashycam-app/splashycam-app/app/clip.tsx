import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";
import StateNote from "../components/StateNote";
import ProofCard from "../components/ProofCard";
import { getLastClip } from "../lib/session";
import { registerProof } from "../lib/pending";
import { grabFrame, frameTimes, renderProofCard } from "../lib/proof";
import type { SaveResult } from "../lib/supabase";
import { color, radius, space, type } from "../lib/theme";

type Step<T> = { state: "working" } | { state: "done"; value: T } | { state: "failed"; why: string };

function videoShareType(uri: string) {
  return uri.toLowerCase().endsWith(".mov")
    ? { mimeType: "video/quicktime", UTI: "com.apple.quicktime-movie" }
    : { mimeType: "video/mp4", UTI: "public.mpeg-4" };
}

export default function ClipScreen() {
  const clip = getLastClip();
  const insets = useSafeAreaInsets();
  const card = useRef<View>(null);

  const [roll, setRoll] = useState<Step<true>>({ state: "working" });
  const [reg, setReg] = useState<Step<SaveResult>>({ state: "working" });
  const [frames, setFrames] = useState<(string | null)[] | null>(null);
  const [pick, setPick] = useState(2);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [sharing, setSharing] = useState<"card" | "clip" | null>(null);

  useEffect(() => {
    if (!clip) return;
    let live = true;

    (async () => {
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(true); // write-only
        if (!perm.granted) throw new Error("Photos access is off for Splashy Cam.");
        await MediaLibrary.Asset.create(clip.uri);
        if (live) setRoll({ state: "done", value: true });
      } catch (e) {
        if (live) setRoll({ state: "failed", why: e instanceof Error ? e.message : "Couldn't save." });
      }
    })();

    registerProof(clip.rec).then((r) => live && setReg({ state: "done", value: r }));

    Promise.all(frameTimes(clip.durationMs).map((t) => grabFrame(clip.uri, t)))
      .then((f) => live && setFrames(f));

    return () => { live = false; };
  }, [clip]);

  if (!clip) {
    return (
      <View style={[s.screen, s.center, { paddingBottom: insets.bottom + space.lg }]}>
        <StateNote icon="videocam-outline" title="No clip yet" body="Film an elimination and it shows up here, ready to send." />
        <Button label="Record" icon="videocam" onPress={() => router.replace("/record")} style={s.full} />
      </View>
    );
  }

  const registeredAt = reg.state === "done" && reg.value.ok ? reg.value.createdAt : null;
  const frameUri = frames?.[pick] ?? frames?.find((f) => f) ?? null;

  async function shareCard() {
    setSharing("card");
    try {
      const png = await renderProofCard(card);
      await Sharing.shareAsync(png, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Send proof card" });
    } catch {
      Alert.alert("Couldn't make the proof card", "Try again, or send the clip and the code on their own.");
    } finally {
      setSharing(null);
    }
  }

  async function shareClip() {
    setSharing("clip");
    try {
      await Sharing.shareAsync(clip!.uri, { ...videoShareType(clip!.uri), dialogTitle: "Send clip" });
    } catch {
      Alert.alert("Couldn't open sharing", "The clip is still in your camera roll if it saved.");
    } finally {
      setSharing(null);
    }
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + space.md }]}>
        <Text style={type.label}>PROOF CARD</Text>
        <Text style={[type.body, s.lead]}>
          The stamp isn't inside the video file yet, so send this card with the clip.
        </Text>

        <View style={s.cardWrap}>
          <ProofCard ref={card} rec={clip.rec} frameUri={frameUri} registeredAt={registeredAt}
                     onFrameLoad={() => setFrameLoaded(true)} />
        </View>

        <Text style={[type.label, s.pickLabel]}>PICK THE FRAME</Text>
        <View style={s.frames}>
          {(frames ?? [null, null, null, null]).map((f, i) => (
            <Pressable
              key={i}
              onPress={() => { if (f) { setFrameLoaded(false); setPick(i); } }}
              accessibilityRole="button"
              accessibilityLabel={`Frame ${i + 1}`}
              accessibilityState={{ selected: i === pick }}
              style={[s.frame, i === pick && s.frameOn]}
            >
              {f ? <Image source={{ uri: f }} style={s.frameImg} /> :
                frames ? <Ionicons name="image-outline" size={20} color={color.faint} /> :
                <ActivityIndicator color={color.dim} />}
            </Pressable>
          ))}
        </View>
        <Text style={s.status}>
          {roll.state === "working" ? "Saving to camera roll…" : roll.state === "done" ? "Saved to camera roll." : `Not saved to camera roll: ${roll.why}`}
          {"  "}
          {reg.state === "working" ? "Registering code…" : reg.state === "done" && reg.value.ok ? "Code registered." : "Code not registered yet."}
        </Text>
      </ScrollView>

      <View style={[s.actions, { paddingBottom: insets.bottom + space.md }]}>
        <Button big label="Send proof card" icon="image" onPress={shareCard}
                loading={sharing === "card"} disabled={!!sharing || (!!frameUri && !frameLoaded)} />
        <Button label="Send clip" icon="film-outline" variant="secondary" onPress={shareClip}
                loading={sharing === "clip"} disabled={!!sharing} />
        <Button label="Done" variant="ghost" onPress={() => router.replace("/")} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: { justifyContent: "center", paddingHorizontal: space.lg },
  full: { alignSelf: "stretch" },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.sm },
  lead: { marginBottom: space.sm },
  cardWrap: { alignItems: "center" },
  pickLabel: { marginTop: space.md },
  frames: { flexDirection: "row", gap: space.sm },
  frame: { flex: 1, aspectRatio: 1, borderRadius: radius.sm, overflow: "hidden", backgroundColor: color.surface,
           borderWidth: 2, borderColor: "transparent", alignItems: "center", justifyContent: "center", minHeight: 64 },
  frameOn: { borderColor: color.blue },
  frameImg: { width: "100%", height: "100%" },
  status: { ...type.body, fontSize: 14, marginTop: space.sm },
  actions: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm, borderTopWidth: 1, borderTopColor: color.line,
             backgroundColor: color.bg },
});
