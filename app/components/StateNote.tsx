import { type ComponentProps, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, radius, space, type } from "../lib/theme";

type Props = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  body?: string;
  /** "accent" fills the icon badge with the blue; "quiet" is an outline. */
  tone?: "accent" | "quiet";
  children?: ReactNode;
};

/** The designed shape for empty, loading-failed, and result states. */
export default function StateNote({ icon, title, body, tone = "quiet", children }: Props) {
  const accent = tone === "accent";
  return (
    <View style={s.wrap} accessibilityRole="summary">
      <View style={[s.badge, accent ? s.badgeAccent : s.badgeQuiet]}>
        <Ionicons name={icon} size={30} color={accent ? color.onBlue : color.text} />
      </View>
      <Text style={[type.title, s.title]}>{title}</Text>
      {body ? <Text style={[type.body, s.body]}>{body}</Text> : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", gap: space.sm, paddingVertical: space.lg },
  badge: { width: 64, height: 64, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: space.xs },
  badgeAccent: { backgroundColor: color.blueFill },
  badgeQuiet: { borderWidth: 2, borderColor: color.line },
  title: { textAlign: "center" },
  body: { textAlign: "center", maxWidth: 340 },
});
