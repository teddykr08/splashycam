import { type ComponentProps } from "react";
import { Pressable, Text, View, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { color, radius, space, type, TOUCH } from "../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  disabled?: boolean;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** One button for the whole app: tall, full-width by default, with a haptic tick. */
export default function Button({ label, onPress, variant = "primary", icon, loading, disabled, big, style }: Props) {
  const inactive = disabled || loading;
  const fg = variant === "primary" ? color.onBlue : variant === "secondary" ? color.text : color.blue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }}
      style={({ pressed }) => [
        s.base,
        big && s.big,
        variant === "primary" && { backgroundColor: pressed ? color.bluePressed : color.blueFill },
        variant === "secondary" && { backgroundColor: pressed ? color.surfaceHi : color.surface, borderColor: color.line, borderWidth: 1 },
        variant === "ghost" && { backgroundColor: pressed ? color.blueSoft : "transparent" },
        inactive && !loading && s.disabled,
        style,
      ]}
    >
      <View style={s.row}>
        {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={big ? 26 : 22} color={fg} /> : null}
        <Text style={[type.button, big && s.bigText, { color: fg }]} numberOfLines={1}>{label}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { minHeight: TOUCH, borderRadius: radius.md, paddingHorizontal: space.lg, justifyContent: "center" },
  big: { minHeight: 84, borderRadius: radius.lg },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  bigText: { fontSize: 21 },
  disabled: { opacity: 0.38 },
});
