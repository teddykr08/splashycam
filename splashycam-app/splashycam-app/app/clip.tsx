import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { View, Text, ScrollView, Pressable, Image, StyleSheet, ActivityIndicator, Alert, Linking, Platform } from "react-native";
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
import { getLastClip, type Clip } from "../lib/session";
import { registerProof } from "../lib/pending";
import { grabFrame, frameTimes, renderProofCard } from "../lib/proof";
import { stampTime } from "../lib/stamp";
import { settingsAppName } from "../lib/env";
import type { SaveResult } from "../lib/supabase";
import { color, radius, space, type, TOUCH } from "../lib/theme";

type Step<T> = { state: "working" } | { state: "done"; value: T } | { state: "failed"; why: string };

const RETRY_MS = 20_000;

function videoShareType(uri: string) {
  return uri.toLowerCase().endsWith(".mov")
    ? { mimeType: "video/quicktime", UTI: "com.apple.quicktime-movie" }
    : { mimeType: "video/mp4", UTI: "public.mpeg-4" };
}

/** Opens Messages with the code typed in. Messages can't take a video attachment by URL. */
function textHost(code: string) {
  const body = encodeURIComponent(`Splashy Cam proof: ${code}. Check it in Splashy Cam → Verify a clip.`);
  // iOS wants "sms:&body=", Android "sms:?body=".
  Linking.openURL(`sms:${Platform.OS === "ios" ? "&" : "?"}body=${body}`).catch(() =>
    Alert.alert("Couldn't open Messages", `Send the code yourself: ${code}`));
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
  const [reg, setReg] = useState<Step<SaveResult>>({ state: "working" });
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

  const register = useCallback(async () => {
    setReg({ state: "working" });
    const r = await registerProof(clip.rec);
    setReg({ state: "done", value: r });
    if (r.ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [clip]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const perm = await MediaLibrary.requestPermissionsAsync(true); // write-only: add, never read
        if (!perm.granted) throw new Error(`Photos access is off. In Settings, open ${settingsAppName} and allow adding photos.`);
        await MediaLibrary.Asset.create(clip.uri);
        if (live) setRoll({ state: "done", value: true });
      } catch (e) {
        if (live) setRoll({ state: "failed", why: e instanceof Error ? e.message : "Couldn't save." });
      }
    })();
    register();
    Promise.all(frameTimes(clip.durationMs).map((t) => grabFrame(clip.uri, t))).then((f) => live && setFrames(f));
    return () => { live = false; };
  }, [clip, register]);

  // No signal at the game? Keep trying quietly while this screen is open.
  const offline = reg.state === "done" && !reg.value.ok && reg.value.reason === "offline";
  useEffect(() => {
    if (!offline) return;
    const id = setTimeout(register, RETRY_MS);
    return () => clearTimeout(id);
  }, [offline, register]);

  const registeredAt = reg.state === "done" && reg.value.ok ? reg.value.createdAt : null;
  const frameUri = frames?.[pick] ?? frames?.find((f) => f) ?? null;

  async function shareClip() {
    setSharing("clip");
    try {
      await Sharing.shareAsync(clip.uri, { ...videoShareType(clip.uri), dialogTitle: "Send clip" });
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
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + space.sm }]}>
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
          <View style={s.shakyNote} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={22} color={color.blue} />
            <Text style={s.shakyText}>Sharing isn't available on this device. The clip is in your camera roll if it saved.</Text>
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

        {clip.shaky ? (
          <View style={s.shakyNote} accessibilityRole="alert">
            <Ionicons name="warning-outline" size={22} color={color.blue} />
            <Text style={s.shakyText}>The mount was rattling during this clip. Tighten the dial before the next one.</Text>
          </View>
        ) : null}

        <View style={s.statusCard}>
          <StatusRow
            icon={roll.state === "done" ? "checkmark-circle" : roll.state === "failed" ? "close-circle-outline" : null}
            title={roll.state === "working" ? "Saving to camera roll…" : roll.state === "done" ? "Saved to camera roll" : "Not saved to camera roll"}
            detail={roll.state === "failed" ? `${roll.why} Use Send clip to keep a copy.` : undefined}
          />
          <View style={s.divider} />
          <RegistrationRow reg={reg} onRetry={register} />
        </View>

        <Text style={[type.label, s.section]}>PROOF CARD</Text>
        <Text style={[type.body, s.lead]}>
          The stamp isn't inside the video file yet. Send this card with the clip so the host sees the code on the footage.
        </Text>
        <View style={s.cardWrap}>
          <ProofCard ref={card} rec={clip.rec} frameUri={frameUri} registeredAt={registeredAt}
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
                loading={sharing === "clip"} disabled={!!sharing || shareBlocked} />
        <View style={s.actionRow}>
          <Button label="Proof card" icon="image-outline" variant="secondary" style={s.flex} onPress={shareCard}
                  loading={sharing === "card"} disabled={!!sharing || shareBlocked || (!!frameUri && !frameLoaded)} />
          <Button label="Text host" icon="chatbubble-outline" variant="secondary" style={s.flex}
                  onPress={() => textHost(clip.rec.code)} disabled={!!sharing} />
        </View>
        <Button label="Done" variant="ghost" onPress={() => router.dismissTo("/")} />
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

function RegistrationRow({ reg, onRetry }: { reg: Step<SaveResult>; onRetry: () => void }) {
  if (reg.state !== "done") return <StatusRow icon={null} title="Registering code…" />;
  const r = reg.value;
  if (r.ok) {
    return <StatusRow icon="checkmark-circle" title="Code registered"
      detail={`Server time ${stampTime(new Date(r.createdAt))}. Your host can verify it now.`} />;
  }
  const retry = (
    <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry registration"
               style={({ pressed }) => [s.retry, pressed && s.pressed]}>
      <Text style={s.linkText}>Retry</Text>
    </Pressable>
  );
  switch (r.reason) {
    case "offline":
      return <StatusRow icon="cloud-offline-outline" title="Waiting for signal"
        detail="The code is saved on your phone and registers when you're back online. The host can't verify it until then."
        action={retry} />;
    case "unconfigured":
      return <StatusRow icon="close-circle-outline" title="Not connected to a server"
        detail="This build has no Supabase settings, so codes can't be registered or verified." />;
    case "duplicate":
      return <StatusRow icon="close-circle-outline" title="Code clash"
        detail="Another clip already has this code. Film it again to get a new one." />;
    default:
      return <StatusRow icon="close-circle-outline" title="Server said no" detail="The code wasn't registered." action={retry} />;
  }
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
  shakyNote: { flexDirection: "row", gap: space.sm, alignItems: "center", backgroundColor: color.blueSoft,
               borderRadius: radius.md, padding: space.md },
  shakyText: { ...type.body, color: color.text, flex: 1, fontSize: 15 },
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
  actionRow: { flexDirection: "row", gap: space.sm },
});
