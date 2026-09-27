import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking, Alert, Animated, Easing } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import StampOverlay from "../components/StampOverlay";
import StateNote from "../components/StateNote";
import Button from "../components/Button";
import { generateCode, stampDuration, type ProofRecord } from "../lib/stamp";
import { setLastClip } from "../lib/session";
import { settingsAppName } from "../lib/env";
import { useShake } from "../lib/useShake";
import { color, mono, radius, space, TOUCH } from "../lib/theme";

const MAX_SECONDS = 60;

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

export default function Record() {
  const insets = useSafeAreaInsets();
  const cam = useRef<CameraView>(null);
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

  // Shake warning: only while filming, when a loose mount actually ruins the shot.
  const shake = useShake(recording);
  const everShaky = useRef(false);
  useEffect(() => {
    if (!shake.shaky) return;
    everShaky.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [shake.shaky]);

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

  // "Locating…" is display-only; the saved record only ever gets a real city or null.
  const shown: ProofRecord = { ...rec, place: place ?? (loc === "locating" ? "Locating…" : null) };

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

  async function toggle() {
    if (!cam.current || !ready) return;
    if (recording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      cam.current.stopRecording();
      return;
    }

    // Fresh code + time for every clip.
    const fresh: ProofRecord = { code: generateCode(), createdAt: new Date().toISOString(), place };
    const t0 = Date.now();
    everShaky.current = false;
    setRec(fresh);
    setStartedAt(t0);
    setRecording(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    try {
      const video = await cam.current.recordAsync({ maxDuration: MAX_SECONDS });
      if (!video?.uri) {
        Alert.alert("No clip", "The camera stopped without giving back a video file. Try again.");
        return;
      }
      setLastClip({ uri: video.uri, rec: fresh, durationMs: Date.now() - t0, shaky: everShaky.current });
      router.push("/clip");
    } catch {
      Alert.alert("Recording stopped", "The camera stopped before the clip was saved. Try again.");
    } finally {
      setRecording(false);
      setStartedAt(null);
      setRec((r) => (r.code === fresh.code ? { ...r, code: generateCode() } : r));
    }
  }

  const elapsed = startedAt ? now.getTime() - startedAt : 0;

  return (
    <View style={s.screen}>
      <CameraView
        ref={cam}
        style={StyleSheet.absoluteFill}
        mode="video"
        facing="back"
        videoStabilizationMode="standard"  /* smooths hand shake; won't fix a loose mount */
        onCameraReady={() => setReady(true)}
        onMountError={(e) => setCamError(e.message || "The camera couldn't be opened. Close other camera apps and try again.")}
      />

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
        ) : null}

        <View style={s.round} pointerEvents="none" importantForAccessibility="no-hide-descendants">
          <Text style={s.limit}>{MAX_SECONDS}s</Text>
        </View>
      </View>

      {recording && shake.shaky ? (
        <View style={[s.shakeWrap, { top: insets.top + space.sm + TOUCH + space.md }]} pointerEvents="none">
          <View style={s.shakeBanner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
            <Ionicons name="warning" size={28} color={color.onBlue} />
            <View>
              <Text style={s.shakeTitle}>TIGHTEN THE DIAL</Text>
              <Text style={s.shakeSub}>The mount is rattling. This shot will be shaky.</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={[s.bottom, { paddingBottom: insets.bottom + space.lg }]} pointerEvents="box-none">
        <StampOverlay rec={shown} at={now} style={s.stamp} />

        <View style={s.controls}>
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
          <Text style={s.hint}>
            {!ready ? (slowStart ? "Camera is slow to start. Close and reopen if it stays black." : "Starting camera…")
              : recording ? "Tap to stop" : "Tap to film"}
          </Text>
          {!recording && (loc === "off" || loc === "failed") ? (
            <Text style={s.note}>
              {loc === "off" ? "No city on the stamp: location is off." : "No city on the stamp: couldn't find one."}
            </Text>
          ) : null}
          {recording && !shake.available ? (
            <Text style={s.note}>Shake check unavailable on this phone.</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const SHUTTER = 92;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  center: { backgroundColor: color.bg, justifyContent: "center", paddingHorizontal: space.lg, gap: space.sm },
  full: { alignSelf: "stretch" },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: space.md,
         flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  round: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, backgroundColor: color.scrim,
           alignItems: "center", justifyContent: "center" },
  roundPressed: { backgroundColor: "rgba(0,0,0,0.8)" },
  hidden: { opacity: 0 },
  limit: { color: "#DCE6FF", fontFamily: mono, fontSize: 13, fontWeight: "700" },
  recPill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: color.scrim,
             paddingHorizontal: 14, height: 40, borderRadius: radius.pill },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.rec },
  recText: { color: "#fff", fontFamily: mono, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"], letterSpacing: 1 },
  shakeWrap: { position: "absolute", left: space.md, right: space.md, alignItems: "center" },
  shakeBanner: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: color.blueFill,
                 paddingHorizontal: space.md, paddingVertical: 12, borderRadius: radius.md,
                 shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  shakeTitle: { color: color.onBlue, fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  shakeSub: { color: color.onBlue, fontSize: 13, fontWeight: "600" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.md, gap: space.lg },
  stamp: { marginLeft: 0 },
  controls: { alignItems: "center", gap: space.sm },
  shutter: { width: SHUTTER, height: SHUTTER, borderRadius: SHUTTER / 2, borderWidth: 6, borderColor: "#fff",
             alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
  shutterRec: { borderColor: color.blue },
  shutterPressed: { transform: [{ scale: 0.95 }] },
  recCore: { width: SHUTTER - 26, height: SHUTTER - 26, borderRadius: (SHUTTER - 26) / 2, backgroundColor: color.blue },
  stopSquare: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#fff" },
  note: { color: "#DCE6FF", fontSize: 13, fontWeight: "600", textAlign: "center", textShadowColor: "rgba(0,0,0,0.8)",
          textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  hint: { color: "#fff", fontSize: 15, fontWeight: "700", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 3,
          textShadowOffset: { width: 0, height: 1 } },
});
