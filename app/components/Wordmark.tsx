import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius } from "../lib/theme";

type Props = {
  /** "lg" for the home title; "sm" for headers and over the camera. */
  size?: "sm" | "lg";
  /** Put the small wordmark on a dark pill so it reads over live footage. */
  onFootage?: boolean;
};

/** The Splashy Cam mark: a blue water drop and the name. The one piece of branding, used sparingly. */
export default function Wordmark({ size = "sm", onFootage }: Props) {
  if (size === "lg") {
    return (
      <View style={s.row} accessibilityRole="header" accessibilityLabel="Splashy Cam">
        <Ionicons name="water" size={34} color={color.blue} style={s.lgDrop} />
        <Text style={s.lgText}>Splashy Cam</Text>
      </View>
    );
  }
  return (
    <View style={[s.row, s.sm, onFootage && s.pill]} accessibilityLabel="Splashy Cam">
      <Ionicons name="water" size={15} color={color.blue} />
      <Text style={s.smText}>SPLASHY CAM</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  lgDrop: { marginRight: 6, marginTop: 4 },
  lgText: { fontSize: 40, fontWeight: "800", letterSpacing: -1, color: color.text },
  sm: { gap: 6 },
  pill: { backgroundColor: color.scrim, paddingHorizontal: 14, height: 40, borderRadius: radius.pill },
  smText: { color: color.text, fontSize: 13, fontWeight: "800", letterSpacing: 2.5 },
});
