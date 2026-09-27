import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking, Alert, Animated, Easing, useWindowDimensions } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import StampOverlay from "../components/StampOverlay";
import StateNote from "../components/StateNote";
import Button from "../components/Button";
import Wordmark from "../components/Wordmark";
import { generateCode, stampDuration, type ProofRecord } from "../lib/stamp";
import { setLastClip } from "../lib/session";
import { settingsAppName, isExpoGo } from "../lib/env";
import * as DualCamera from "../modules/dual-camera";
import { color, mono, radius, space, TOUCH } from "../lib/theme";

const SHUTTER = 92;
const HINT_H = 40;            // fixed-height hint area so text changes never move anything
/** Everything below the stamp is this tall, always, so the stamp never moves. */
const CONTROLS_H = SHUTTER + space.sm + HINT_H;

/** Ticks once a second while `on`. */
function useClock(on: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}

/** Small red recording light that pulses while recording. */
function RecLight() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.25, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[s.recDot, { opacity: pulse }]} />;
}

/**
 * Where the front camera goes (top-right inset), shown when real dual recording isn't
 * available: in Expo Go, or on a phone that can't run two cameras. It never pretends to be
 * a camera: it says what it is and why it's empty.
 */
function FrontInsetPreview({ top, recording }: { top: number; recording: boolean }) {
  const { width } = useWindowDimensions();
  const w = Math.round(width * DualCamera.INSET.widthFraction);
  const h = Math.round(w * DualCamera.INSET.aspect);
  const m = Math.round(width * DualCamera.INSET.marginFraction);
  const why = isExpoGo ? "Needs the full app" : "This phone can't run both cameras";
  return (
    <View pointerEvents="none" style={[s.inset, { top: top + m, right: m, width: w, height: h }]}
          accessibilityLabel={`Front camera inset. ${why}. ${recording ? "Only the back camera is recording." : ""}`}>
      <Ionicons name="person-outline" size={26} color="#DCE6FF" />
      <Text style={s.insetTitle}>FRONT CAM</Text>
      <Text style={s.insetSub}>{recording ? "Not recording" : why}</Text>
    </View>
  );
}

export default function Record() {
  const insets = useSafeAreaInsets();
  const cam = useRef<CameraView>(null);
  const dual = useRef<DualCamera.DualCameraHandle>(null);
  // Real dual recording only in a native build with the module, on a phone that supports it.
  const [useDual] = useState(() => DualCamera.DualCameraView != null && DualCamera.isSupported());
  const take = useRef<{ fresh: ProofRecord; t0: number } | null>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [loc, setLoc] = useState<"locating" | "ok" | "off" | "failed">("locating");
  const [camError, setCamError] = useState<string | null>(null);
  const [slowStart, setSlowStart] = useState(false);
  const [rec, setRec] = useState<ProofRecord>(() => ({
    code: generateCode(), createdAt: new Date().toISOString(), place: null,
  }));
  const now = useClock(true);

  // City-level location only. Never the street address. Asked only after camera + mic are
  // granted, so the iOS location prompt doesn't land on top of the camera-permission screen.
  const avGranted = !!camPerm?.granted && !!micPerm?.granted;
  useEffect(() => {
    if (!avGranted) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setLoc("off"); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const [p] = await Location.reverseGeocodeAsync(pos.coords);
      const city = p ? [p.city, p.region].filter(Boolean).join(", ") : "";
      if (city) { setPlace(city); setLoc("ok"); } else setLoc("failed");
    })().catch(() => setLoc("failed"));
  }, [avGranted]);

  // If the preview never reports ready, say so instead of spinning forever.
  useEffect(() => {
    if (ready) return;
    const id = setTimeout(() => setSlowStart(true), 8000);
    return () => clearTimeout(id);
  }, [ready]);

  // The stamp always has four lines so its size, and the code's position, never change.
  // "Locating…" / "No city" are display-only; the saved record gets a real city or null.
  const shown: ProofRecord = { ...rec, place: place ?? (loc === "locating" ? "Locating…" : "No city") };

  if (!camPerm || !micPerm) {
    return <View style={[s.screen, s.center]}><ActivityIndicator color={color.dim} size="large" /></View>;
  }

  if (!camPerm.granted || !micPerm.granted) {
    const blocked = (!camPerm.granted && !camPerm.canAskAgain) || (!micPerm.granted && !micPerm.canAskAgain);
    return (
      <View style={[s.screen, s.center, { paddingBottom: insets.bottom + space.lg }]}>
        <StateNote
          icon="videocam-outline"
          title={blocked ? "Camera is switched off" : "Camera and mic"}
          body={blocked
            ? `iOS won't ask again. In Settings, open ${settingsAppName} and turn on Camera and Microphone.`
            : "Splashy Cam films the hit with sound. Nothing is uploaded: the clip stays on your phone."}
        />
        <Button
          label={blocked ? "Open Settings" : "Allow camera and mic"}
          icon={blocked ? "settings-outline" : "checkmark"}
          style={s.full}
          onPress={async () => {
            if (blocked) { Linking.openSettings(); return; }
            if (!camPerm.granted) await requestCam();
            if (!micPerm.granted) await requestMic();
          }}
        />
        <Button label="Back" variant="ghost" onPress={() => router.back()} style={s.full} />
      </View>
    );
  }

  if (camError) {
    return (
      <View style={[s.screen, s.center, { paddingBottom: insets.bottom + space.lg }]}>
        <StateNote icon="videocam-off-outline" title="Camera didn't start" body={camError} />
        <Button label="Back" variant="secondary" onPress={() => router.back()} style={s.full} />
      </View>
    );
  }

  /** Hand a finished clip to the trim screen and line up a new code for the next one. */
  function finish(uri: string | undefined) {
    const t = take.current;
    take.current = null;
    setRecording(false);
    setStartedAt(null);
    if (!t) return;
    if (!uri) {
      Alert.alert("No clip", "The camera stopped without giving back a video file. Try again.");
      return;
    }
    setLastClip({ uri, rec: t.fresh, durationMs: Date.now() - t.t0 });
    router.push("/trim");
    // Next clip gets a new code. This happens while the trim screen covers the camera.
    setRec({ code: generateCode(), createdAt: new Date().toISOString(), place: null });
  }

  function failed() {
    take.current = null;
    setRecording(false);
    setStartedAt(null);
    Alert.alert("Recording stopped", "The camera stopped before the clip was saved. Try again.");
  }

  async function toggle() {
    if (!ready) return;
    if (recording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (useDual) {
        try { finish(await dual.current?.stopRecording()); } catch { failed(); }
      } else {
        cam.current?.stopRecording(); // the pending recordAsync below then resolves
      }
      return;
    }

    // Keep the code already on screen: it must not change when you press record.
    // Only the start time is fresh. A new code is made after the clip is handed off.
    const fresh: ProofRecord = { code: rec.code, createdAt: new Date().toISOString(), place };
    take.current = { fresh, t0: Date.now() };
    setRec(fresh);
    setStartedAt(take.current.t0);
    setRecording(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    // No length limit. The part to keep (max 60 s) is chosen on the trim screen.
    if (useDual) {
      try { await dual.current?.startRecording(); } catch { failed(); }
      return;
    }
    try {
      const video = await cam.current?.recordAsync();
      finish(video?.uri);
    } catch {
      failed();
    }
  }

  const elapsed = startedAt ? now.getTime() - startedAt : 0;

  // One line under the shutter, fixed height. Most important message wins.
  const hint = !ready ? (slowStart ? "Camera is slow to start. Close and reopen if it stays black." : "Starting camera…")
    : recording ? "Tap to stop"
    : loc === "off" ? "Tap to film · location is off, so no city"
    : "Tap to film";

  return (
    <View style={s.screen}>
      {useDual && DualCamera.DualCameraView ? (
        <DualCamera.DualCameraView
          ref={dual}
          style={StyleSheet.absoluteFill}
          onCameraReady={() => setReady(true)}
          onMountError={(e) => setCamError(e.nativeEvent.message || "The cameras couldn't be opened.")}
        />
      ) : (
        <>
          <CameraView
            ref={cam}
            style={StyleSheet.absoluteFill}
            mode="video"
            facing="back"
            videoStabilizationMode="standard"  /* smooths hand shake; won't fix a loose mount */
            onCameraReady={() => setReady(true)}
            onMountError={(e) => setCamError(e.message || "The camera couldn't be opened. Close other camera apps and try again.")}
          />
          <FrontInsetPreview top={insets.top + space.sm + TOUCH} recording={recording} />
        </>
      )}

      {/* Overlays are siblings, not children: CameraView doesn't support children. */}
      <View style={[s.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <Pressable
          onPress={() => router.back()}
          disabled={recording}
          accessibilityRole="button"
          accessibilityLabel="Close camera"
          style={({ pressed }) => [s.round, pressed && s.roundPressed, recording && s.hidden]}
          hitSlop={8}
        >
          <Ionicons name="close" size={30} color="#fff" />
        </Pressable>

        {recording ? (
          <View style={s.recPill} accessibilityLabel={`Recording, ${stampDuration(elapsed)}`}>
            <RecLight />
            <Text style={s.recText}>REC {stampDuration(elapsed)}</Text>
          </View>
        ) : (
          <Wordmark onFootage />
        )}

        {/* Top-right intentionally empty. */}
        <View style={s.spacer} pointerEvents="none" importantForAccessibility="no-hide-descendants" />
      </View>

      {/* Pinned: fixed distance above a fixed-height control area. Nothing below can push it. */}
      <StampOverlay rec={shown} at={now}
        style={[s.stamp, { bottom: insets.bottom + space.lg + CONTROLS_H + space.lg }]} />

      <View style={[s.bottom, { paddingBottom: insets.bottom + space.lg, height: insets.bottom + space.lg + CONTROLS_H }]}
            pointerEvents="box-none">
        <View style={s.controlRow}>
          <View style={s.side} />
          <Pressable
            onPress={toggle}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityLabel={recording ? "Stop recording" : "Start recording"}
            style={({ pressed }) => [s.shutter, recording && s.shutterRec, pressed && s.shutterPressed]}
          >
            {!ready ? <ActivityIndicator color="#fff" />
              : recording ? <View style={s.stopSquare} />
              : <View style={s.recCore} />}
          </Pressable>
          <View style={s.side} />
        </View>
        <Text style={s.hint} numberOfLines={2}>{hint}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  center: { backgroundColor: color.bg, justifyContent: "center", paddingHorizontal: space.lg, gap: space.sm },
  full: { alignSelf: "stretch" },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: space.md,
         flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  round: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, backgroundColor: color.scrim,
           alignItems: "center", justifyContent: "center" },
  spacer: { width: TOUCH, height: TOUCH },
  inset: { position: "absolute", borderRadius: 14, borderWidth: 2, borderStyle: "dashed",
           borderColor: "rgba(220,230,255,0.7)", backgroundColor: color.scrim,
           alignItems: "center", justifyContent: "center", gap: 4, padding: 6 },
  insetTitle: { color: "#fff", fontFamily: mono, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  insetSub: { color: "#DCE6FF", fontSize: 11, fontWeight: "600", textAlign: "center" },
  roundPressed: { backgroundColor: "rgba(0,0,0,0.8)" },
  hidden: { opacity: 0 },
  recPill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: color.scrim,
             paddingHorizontal: 14, height: 40, borderRadius: radius.pill },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.rec },
  recText: { color: "#fff", fontFamily: mono, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"], letterSpacing: 1 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.md, gap: space.sm },
  stamp: { position: "absolute", left: space.md },
  controlRow: { height: SHUTTER, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  side: { width: TOUCH + space.lg, alignItems: "center" },
  shutter: { width: SHUTTER, height: SHUTTER, borderRadius: SHUTTER / 2, borderWidth: 6, borderColor: "#fff",
             alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
  shutterRec: { borderColor: color.blue },
  shutterPressed: { transform: [{ scale: 0.95 }] },
  recCore: { width: SHUTTER - 26, height: SHUTTER - 26, borderRadius: (SHUTTER - 26) / 2, backgroundColor: color.blue },
  stopSquare: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#fff" },
  hint: { height: HINT_H, color: "#fff", fontSize: 15, fontWeight: "700", textAlign: "center",
          textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
});
