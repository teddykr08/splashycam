import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import StampOverlay from "../components/StampOverlay";
import { generateCode, type ProofRecord } from "../lib/stamp";
import { saveProof } from "../lib/supabase";

export default function Record() {
  const cam = useRef<CameraView>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
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
      if (p) setRec((r) => ({ ...r, place: [p.city, p.region].filter(Boolean).join(", ") }));
    })().catch(() => {});
  }, []);

  if (!camPerm?.granted || !micPerm?.granted) {
    return (
      <View style={s.center}>
        <Text style={s.msg}>Splashy Cam needs the camera and mic to film a hit.</Text>
        <Pressable style={s.primary} onPress={async () => { await requestCam(); await requestMic(); }}>
          <Text style={s.primaryText}>Allow</Text>
        </Pressable>
      </View>
    );
  }

  async function toggle() {
    if (!cam.current) return;
    if (recording) { cam.current.stopRecording(); return; }

    // fresh code + timestamp for every clip
    const fresh: ProofRecord = {
      code: generateCode(),
      createdAt: new Date().toISOString(),
      place: rec.place,
    };
    setRec(fresh);
    setRecording(true);

    try {
      const video = await cam.current.recordAsync({ maxDuration: 60 });
      setRecording(false);
      if (!video?.uri) return;
      setBusy(true);

      await MediaLibrary.saveToLibraryAsync(video.uri);
      await saveProof(fresh);          // a few bytes: code, time, city
      setBusy(false);

      Alert.alert(
        `Saved  ${fresh.code}`,
        "The clip is in your camera roll. Send it to your host with the code.",
        [
          { text: "Share", onPress: () => Sharing.shareAsync(video.uri).catch(() => {}) },
          { text: "Done", style: "cancel" },
        ],
      );
    } catch (e) {
      setRecording(false);
      setBusy(false);
      Alert.alert("Recording failed", String(e));
    }
  }

  return (
    <View style={s.fill}>
      <CameraView
        ref={cam}
        style={s.fill}
        mode="video"
        facing="back"
        videoStabilizationMode="standard"  /* kills most of the mount wobble */
      >
        <StampOverlay rec={rec} />

        <View style={s.bar}>
          <Pressable onPress={() => router.back()} style={s.small}>
            <Text style={s.smallText}>Back</Text>
          </Pressable>

          <Pressable onPress={toggle} disabled={busy} style={[s.shutter, recording && s.shutterOn]}>
            {busy ? <ActivityIndicator color="#fff" /> : null}
          </Pressable>

          <View style={s.small} />
        </View>
      </CameraView>
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
});
