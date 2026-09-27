import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, Linking } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import StampOverlay from "../components/StampOverlay";
import { generateCode, type ProofRecord } from "../lib/stamp";
import { saveProof, type SaveResult } from "../lib/supabase";

function registrationMessage(r: SaveResult): string {
  if (r.ok) return "Code registered. Your host can verify it.";
  switch (r.reason) {
    case "unconfigured": return "This build isn't connected to the server, so the code was NOT registered.";
    case "offline": return "No connection, so the code was NOT registered yet. The host won't be able to verify it.";
    case "duplicate": return "That code was already taken, so this clip was NOT registered. Film it again.";
    default: return "The server rejected the code, so it was NOT registered.";
  }
}

export default function Record() {
  const cam = useRef<CameraView>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<ProofRecord>({
    code: generateCode(),
    createdAt: new Date().toISOString(),
    place: null,
  });

  // City-level location only. Never the street address.
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const [p] = await Location.reverseGeocodeAsync(pos.coords);
      if (p) setRec((r) => ({ ...r, place: [p.city, p.region].filter(Boolean).join(", ") || null }));
    })().catch(() => {});
  }, []);

  if (!camPerm || !micPerm) {
    return <View style={s.center}><ActivityIndicator color="#fff" /></View>;
  }

  if (!camPerm.granted || !micPerm.granted) {
    const blocked = (!camPerm.granted && !camPerm.canAskAgain) || (!micPerm.granted && !micPerm.canAskAgain);
    return (
      <View style={s.center}>
        <Text style={s.msg}>
          {blocked
            ? "Camera or microphone access is turned off for Splashy Cam. Turn both on in Settings."
            : "Splashy Cam needs the camera and mic to film a hit."}
        </Text>
        <Pressable
          style={s.primary}
          onPress={async () => {
            if (blocked) { Linking.openSettings(); return; }
            if (!camPerm.granted) await requestCam();
            if (!micPerm.granted) await requestMic();
          }}
        >
          <Text style={s.primaryText}>{blocked ? "Open Settings" : "Allow"}</Text>
        </Pressable>
      </View>
    );
  }

  async function toggle() {
    if (!cam.current || !ready) return;
    if (recording) { cam.current.stopRecording(); return; }

    // fresh code + timestamp for every clip
    const fresh: ProofRecord = {
      code: generateCode(),
      createdAt: new Date().toISOString(),
      place: rec.place,
    };
    setRec(fresh);
    setRecording(true);

    let uri: string | undefined;
    try {
      const video = await cam.current.recordAsync({ maxDuration: 60 });
      uri = video?.uri;
    } catch {
      Alert.alert("Recording failed", "The camera stopped before the clip was saved. Try again.");
      return;
    } finally {
      setRecording(false);
    }
    if (!uri) return;
    const clip = uri;

    setBusy(true);
    let savedToRoll = false;
    try {
      const lib = await MediaLibrary.requestPermissionsAsync(true); // write-only: add to camera roll
      if (lib.granted) {
        await MediaLibrary.Asset.create(clip);
        savedToRoll = true;
      }
    } catch {
      savedToRoll = false;
    }
    const registered = await saveProof(fresh); // a few bytes: code, city. Server sets the time.
    setBusy(false);

    Alert.alert(
      `Code ${fresh.code}`,
      [
        savedToRoll ? "Saved to your camera roll." : "Couldn't save to your camera roll. Use Share to keep it.",
        registrationMessage(registered),
      ].join("\n\n"),
      [
        { text: "Share", onPress: () => Sharing.shareAsync(clip).catch(() => {}) },
        { text: "Done", style: "cancel" },
      ],
    );
  }

  return (
    <View style={s.fill}>
      <CameraView
        ref={cam}
        style={StyleSheet.absoluteFill}
        mode="video"
        facing="back"
        videoStabilizationMode="standard"  /* smooths hand shake; won't fix a loose mount */
        onCameraReady={() => setReady(true)}
        onMountError={(e) => Alert.alert("Camera unavailable", e.message)}
      />

      {/* Overlays are siblings, not children: CameraView doesn't support children. */}
      <StampOverlay rec={rec} />

      <View style={s.bar}>
        <Pressable onPress={() => router.back()} style={s.small} disabled={recording}>
          <Text style={s.smallText}>Back</Text>
        </Pressable>

        <Pressable
          onPress={toggle}
          disabled={busy || !ready}
          style={[s.shutter, recording && s.shutterOn, (!ready || busy) && s.shutterDisabled]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : null}
        </Pressable>

        <View style={s.small} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 16, backgroundColor: "#0b1020" },
  msg: { color: "#eaf0ff", fontSize: 16, textAlign: "center", lineHeight: 23 },
  primary: { backgroundColor: "#3d7bff", paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  bar: { position: "absolute", bottom: 40, left: 0, right: 0, flexDirection: "row",
         alignItems: "center", justifyContent: "space-between", paddingHorizontal: 28 },
  small: { width: 64 },
  smallText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  shutter: { width: 78, height: 78, borderRadius: 39, backgroundColor: "rgba(255,255,255,0.22)",
             borderWidth: 5, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterOn: { backgroundColor: "#e0353b" },
  shutterDisabled: { opacity: 0.4 },
});
