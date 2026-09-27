import { Platform } from "react-native";

/**
 * Splashy Cam design tokens. Near-black and one blue. Anything that needs to stand
 * out uses the blue, weight, or size, never a second hue.
 */
export const color = {
  bg: "#05070A",          // near-black app background
  surface: "#0C1016",     // cards, inputs
  surfaceHi: "#141A23",   // pressed / raised
  line: "#1E2632",        // hairlines, outlines
  text: "#F3F6FA",
  dim: "#8C97A8",         // secondary text
  faint: "#566173",       // placeholders, captions
  blue: "#2E7BFF",        // THE accent
  bluePressed: "#1F63DB",
  blueSoft: "rgba(46,123,255,0.14)",
  onBlue: "#FFFFFF",
  scrim: "rgba(0,0,0,0.58)", // behind text laid over footage
} as const;

/** Camcorder-style monospace, from the OS so nothing has to download. */
export const mono = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 } as const;

/** Outdoors, in a hurry, one hand: nothing tappable is shorter than this. */
export const TOUCH = 64;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const type = {
  display: { fontSize: 40, fontWeight: "800" as const, letterSpacing: -1, color: color.text },
  title: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.4, color: color.text },
  body: { fontSize: 16, lineHeight: 23, color: color.dim },
  label: { fontSize: 13, fontWeight: "700" as const, letterSpacing: 1.4, color: color.dim },
  button: { fontSize: 18, fontWeight: "800" as const, letterSpacing: 0.2 },
  code: { fontFamily: mono, fontSize: 34, fontWeight: "700" as const, letterSpacing: 4,
          color: color.text, fontVariant: ["tabular-nums" as const] },
};
