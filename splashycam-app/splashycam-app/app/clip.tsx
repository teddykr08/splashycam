import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useEvent } from "expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";
import StateNote from "../components/StateNote";
import ProofCard from "../components/ProofCard";
import Wordmark from "../components/Wordmark";
import { getLastClip, type Clip } from "../lib/session";
import { grabFrame, frameTimes, renderProofCard } from "../lib/proof";
import { settingsAppName } from "../lib/env";
import * as StampVideo from "../modules/stamp-video";
import { color, radius, space, type, TOUCH } from "../lib/theme";

type Step<T> = { state: "working" } | { state: "done"; value: T } | { state: "failed"; why: string };

function videoShareType(uri: string) {
  return uri.toLowerCase().endsWith(".mov")
    ? { mimeType: "video/quicktime", UTI: "com.apple.quicktime-movie" }
    : { mimeType: "video/mp4", UTI: "public.mpeg-4" };
}

export default function ClipScreen() {
  const clip = getLastClip();
  const insets = useSafeAreaInsets();

  if (!clip) {
    return (
      <View style={[s.screen, s.center, { paddingBottom: insets.bottom + space.lg }]}>
        <StateNote icon="videocam-outline" title="No clip yet" body="Film an elimination and it shows up here, ready to send." />
        <Button label="Record" icon="videocam" onPress={() => router.replace("/record")} style={s.full} />
        <Button label="Home" variant="ghost" onPress={() => router.dismissTo("/")} style={s.full} />
      </View>
    );
  }
  return <ClipReady clip={clip} />;
}

function ClipReady({ clip }: { clip: Clip }) {
  const insets = useSafeAreaInsets();
  const card = useRef<View>(null);

  const player = useVideoPlayer(clip.uri, (p) => { p.loop = true; p.muted = true; p.play(); });

  const [roll, setRoll] = useState<Step<true>>({ state: "working" });
  // Burn-in only exists in a native build that includes modules/stamp-video. In Expo Go
  // it's absent and the proof card carries the stamp instead.
  const [burn, setBurn] = useState<Step<string> | { state: "unavailable" }>(
    StampVideo.isAvailable ? { state: "working" } : { state: "unavailable" });
  const [frames, setFrames] = useState<(string | null)[] | null>(null);
  const [pick, setPick] = useState(2);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [sharing, setSharing] = useState<"card" | "clip" | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState<boolean | null>(null);
  const { status: playerStatus } = useEvent(player, "statusChange", { status: player.status });

  useEffect(() => {
    Sharing.isAvailableAsync().then(setCanShare).catch(() => setCanShare(false));
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      let keep = clip.uri;
      if (StampVideo.isAvailable) {
        try {
          keep = await StampVideo.burnStamp(clip.uri, {
            code: clip.rec.code,
            startEpochMs: new Date(clip.rec.createdAt).getTime(),
            place: clip.rec.place,
          });
          if (live) { setBurn({ state: "done", value: keep }); player.replace(keep); }
        } catch (e) {
          keep = clip.uri;
          if (live) setBurn({ state: "failed", why: e instanceof Error ? e.message : "Stamping failed." });
        }
      }
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(true); // write-only: add, never read
        if (!perm.granted) throw new Error(`Photos access is off. In Settings, open ${settingsAppName} and allow adding photos.`);
        await MediaLibrary.Asset.create(keep);
        if (live) setRoll({ state: "done", value: true });
      } catch (e) {
        if (live) setRoll({ state: "failed", why: e instanceof Error ? e.message : "Couldn't save." });
      }
    })();
    Promise.all(frameTimes(clip.durationMs).map((t) => grabFrame(clip.uri, t))).then((f) => live && setFrames(f));
    return () => { live = false; };
  }, [clip, player]);

  const frameUri = frames?.[pick] ?? frames?.find((f) => f) ?? null;

  const sendUri = burn.state === "done" ? burn.value : clip.uri;
  const stamped = burn.state === "done";

  async function shareClip() {
    setSharing("clip");
    try {
      await Sharing.shareAsync(sendUri, { ...videoShareType(sendUri), dialogTitle: "Send clip" });
    } catch {
      Alert.alert("Couldn't open sharing", "The clip is in your camera roll if it saved. Send it from there.");
    } finally {
      setSharing(null);
    }
  }

  async function shareCard() {
    setSharing("card");
    try {
      const png = await renderProofCard(card);
      await Sharing.shareAsync(png, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Send proof card" });
    } catch {
      Alert.alert("Couldn't make the proof card", "Send the clip and text the code instead.");
    } finally {
      setSharing(null);
    }
  }

  async function copyCode() {
    try {
      await Clipboard.setStringAsync(clip.rec.code);
    } catch {
      Alert.alert("Couldn't copy", `Write it down instead: ${clip.rec.code}`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const noFrames = frames !== null && frames.every((f) => !f);
  const shareBlocked = canShare === false;

  return (
    <View style={s.screen}>
      <View style={[s.header, { paddingTop: insets.top + space.xs }]}>
        <Pressable
          onPress={() => router.dismissTo("/")}
          accessibilityRole="button"
          accessibilityLabel="Done, back to home"
          style={({ pressed }) => [s.close, pressed && s.pressed]}
          hitSlop={8}
        >
          <Ionicons name="close" size={28} color={color.text} />
        </Pressable>
        <Wordmark />
        <View style={s.close} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.videoBox}>
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />
          {playerStatus === "error" ? (
            <View style={s.videoError}>
              <Ionicons name="film-outline" size={28} color={color.dim} />
              <Text style={s.videoErrorText}>The preview can't play here. The clip file itself is unaffected: send it below.</Text>
            </View>
          ) : null}
        </View>

        {shareBlocked ? (
          <View style={s.note} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={22} color={color.blue} />
            <Text style={s.noteText}>Sharing isn't available on this device. The clip is in your camera roll if it saved.</Text>
          </View>
        ) : null}

        <View style={s.codeRow}>
          <View style={s.codeCol}>
            <Text style={type.label}>PROOF CODE</Text>
            <Text style={s.code} accessibilityLabel={`Code ${clip.rec.code.split("").join(" ")}`}>{clip.rec.code}</Text>
          </View>
          <Pressable
            onPress={copyCode}
            accessibilityRole="button"
            accessibilityLabel="Copy code"
            style={({ pressed }) => [s.copy, pressed && s.pressed]}
          >
            <Ionicons name={copied ? "checkmark" : "copy-outline"} size={22} color={color.blue} />
            <Text style={s.linkText}>{copied ? "Copied" : "Copy"}</Text>
          </Pressable>
        </View>

        <View style={s.statusCard}>
          {burn.state !== "unavailable" ? (
            <>
              <StatusRow
                icon={burn.state === "done" ? "checkmark-circle" : burn.state === "failed" ? "close-circle-outline" : null}
                title={burn.state === "working" ? "Stamping the video…" : burn.state === "done" ? "Stamp burned into the video" : "Couldn't stamp the video"}
                detail={burn.state === "failed" ? "Sending the original clip. Send the proof card with it." : undefined}
              />
              <View style={s.divider} />
            </>
          ) : null}
          <StatusRow
            icon={roll.state === "done" ? "checkmark-circle" : roll.state === "failed" ? "close-circle-outline" : null}
            title={roll.state === "working" ? "Saving to camera roll…" : roll.state === "done" ? "Saved to camera roll" : "Not saved to camera roll"}
            detail={roll.state === "failed" ? `${roll.why} Use Send clip to keep a copy.` : undefined}
          />
        </View>

        <Text style={[type.label, s.section]}>PROOF CARD</Text>
        <Text style={[type.body, s.lead]}>
          {stamped
            ? "The stamp is in the video. The card is optional: a still with the code in large type."
            : "The stamp isn't inside the video file in this build. Send this card with the clip so the host sees the code on the footage."}
        </Text>
        <View style={s.cardWrap}>
          <ProofCard ref={card} rec={clip.rec} frameUri={frameUri}
                     onFrameLoad={() => setFrameLoaded(true)} />
        </View>
        <View style={s.frames}>
          {(frames ?? [null, null, null, null]).map((f, i) => (
            <Pressable
              key={i}
              onPress={() => { if (f && i !== pick) { setFrameLoaded(false); setPick(i); } }}
              accessibilityRole="button"
              accessibilityLabel={`Use frame ${i + 1}`}
              accessibilityState={{ selected: i === pick }}
              style={[s.frame, i === pick && s.frameOn]}
            >
              {f ? <Image source={{ uri: f }} style={s.frameImg} />
                : frames ? <Ionicons name="image-outline" size={20} color={color.faint} />
                : <ActivityIndicator color={color.dim} />}
            </Pressable>
          ))}
        </View>
        <Text style={s.caption}>
          {noFrames ? "Couldn't grab pictures from this clip. The card still carries the code and times."
            : "Tap the frame that shows the hit."}
        </Text>
      </ScrollView>

      <View style={[s.actions, { paddingBottom: insets.bottom + space.sm }]}>
        <Button big label="Send clip" icon="paper-plane" onPress={shareClip}
                loading={sharing === "clip" || burn.state === "working"} disabled={!!sharing || shareBlocked || burn.state === "working"} />
        {/* One card button: the share sheet already offers Save Image and every way to send. */}
        <Button label="Share proof card" icon="image-outline" variant="secondary" onPress={shareCard}
                loading={sharing === "card"} disabled={!!sharing || shareBlocked || (!!frameUri && !frameLoaded)} />
      </View>
    </View>
  );
}

function StatusRow({ icon, title, detail, action }: {
  icon: ComponentProps<typeof Ionicons>["name"] | null; title: string; detail?: string; action?: ReactNode;
}) {
  return (
    <View style={s.statusRow}>
      <View style={s.statusIcon}>
        {icon ? <Ionicons name={icon} size={24} color={icon === "checkmark-circle" ? color.blue : color.dim} />
          : <ActivityIndicator color={color.dim} />}
      </View>
      <View style={s.flex}>
        <Text style={s.statusTitle}>{title}</Text>
        {detail ? <Text style={s.statusDetail}>{detail}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  center: { justifyContent: "center", paddingHorizontal: space.lg, gap: space.sm },
  full: { alignSelf: "stretch" },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.md, paddingBottom: space.lg, gap: space.md },
  videoError: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: space.sm,
                padding: space.lg, backgroundColor: color.surface },
  videoErrorText: { color: color.dim, fontSize: 14, textAlign: "center", lineHeight: 20 },
  videoBox: { height: 300, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#000" },
  codeRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.xs },
  codeCol: { flex: 1, gap: 2 },
  code: { ...type.code, fontSize: 40 },
  copy: { minHeight: TOUCH, minWidth: TOUCH + 24, borderRadius: radius.md, borderWidth: 1, borderColor: color.line,
          alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: space.md },
  pressed: { backgroundColor: color.blueSoft },
  linkText: { color: color.blue, fontWeight: "800", fontSize: 16 },
  note: { flexDirection: "row", gap: space.sm, alignItems: "center", backgroundColor: color.blueSoft,
               borderRadius: radius.md, padding: space.md },
  noteText: { ...type.body, color: color.text, flex: 1, fontSize: 15 },
  statusCard: { backgroundColor: color.surface, borderRadius: radius.md, borderWidth: 1, borderColor: color.line },
  statusRow: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, minHeight: TOUCH },
  statusIcon: { width: 28, alignItems: "center" },
  statusTitle: { color: color.text, fontSize: 16, fontWeight: "700" },
  statusDetail: { color: color.dim, fontSize: 14, lineHeight: 20, marginTop: 2 },
  divider: { height: 1, backgroundColor: color.line, marginLeft: space.md + 28 + space.sm },
  retry: { minHeight: 48, paddingHorizontal: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: color.line,
           alignItems: "center", justifyContent: "center" },
  section: { marginTop: space.sm },
  lead: { marginTop: -space.sm },
  cardWrap: { alignItems: "center" },
  frames: { flexDirection: "row", gap: space.sm },
  frame: { flex: 1, aspectRatio: 1, borderRadius: radius.sm, overflow: "hidden", backgroundColor: color.surface,
           borderWidth: 3, borderColor: "transparent", alignItems: "center", justifyContent: "center", minHeight: TOUCH },
  frameOn: { borderColor: color.blue },
  frameImg: { width: "100%", height: "100%" },
  caption: { color: color.faint, fontSize: 13, textAlign: "center" },
  actions: { paddingHorizontal: space.md, paddingTop: space.sm, gap: space.sm, borderTopWidth: 1, borderTopColor: color.line,
             backgroundColor: color.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingHorizontal: space.sm, paddingBottom: space.xs },
  close: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, alignItems: "center", justifyContent: "center" },
});
