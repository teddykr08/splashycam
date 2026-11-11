// LATER: not a route and not imported anywhere. This was app/verify.tsx ("Check a code").
// To bring it back, move it to app/verify.tsx and fix the import paths. See later/README.md.
import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Button from "../../components/Button";
import StateNote from "../../components/StateNote";
import { lookupProof, serverEnabled, type LookupResult } from "./supabase";
import { extractCode, formatCode, isCompleteCode, normalizeCode, stampTime } from "../../lib/stamp";
import { color, mono, radius, space, type, TOUCH } from "../../lib/theme";

type State = { status: "idle" } | { status: "loading" } | LookupResult;

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} hr ago`;
  return `${Math.round(h / 24)} days ago`;
}

/** Six boxes with a dash, drawn over one hidden input so paste, autofill and backspace just work. */
function CodeSlots({ value, focused }: { value: string; focused: boolean }) {
  const chars = normalizeCode(value).slice(0, 6).split("");
  const cells = Array.from({ length: 6 }, (_, i) => chars[i] ?? "");
  const active = Math.min(chars.length, 5);
  return (
    <View style={s.slots} pointerEvents="none">
      {cells.map((c, i) => (
        <View key={i} style={s.slotGroup}>
          {i === 3 ? <Text style={s.dash}>–</Text> : null}
          <View style={[s.slot, c ? s.slotFilled : null, focused && i === active && chars.length < 6 && s.slotActive]}>
            <Text style={s.slotText}>{c}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Verify() {
  return serverEnabled ? <VerifyOnline /> : <VerifyOffline />;
}

/** Offline mode (no Supabase in .env): nothing to look codes up in yet. */
function VerifyOffline() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.screen, s.content, { justifyContent: "center", paddingBottom: insets.bottom + space.xl }]}>
      <StateNote icon="cloud-offline-outline" title="Checking codes comes later"
        body="This version runs without a server, so codes aren't registered anywhere and can't be looked up yet." />
    </View>
  );
}

function VerifyOnline() {
  const insets = useSafeAreaInsets();
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const [pasteMiss, setPasteMiss] = useState(false);
  const lastChecked = useRef<string | null>(null);

  async function check(c = code) {
    if (!isCompleteCode(c)) return;
    Keyboard.dismiss();
    lastChecked.current = normalizeCode(c);
    setState({ status: "loading" });
    const r = await lookupProof(c);
    if (lastChecked.current !== normalizeCode(c)) return; // user typed something else meanwhile
    setState(r);
    Haptics.notificationAsync(
      r.status === "found" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
  }

  // Check as soon as six characters are in. No extra tap needed.
  useEffect(() => {
    if (isCompleteCode(code) && lastChecked.current !== normalizeCode(code)) check(code);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  function edit(t: string) {
    setPasteMiss(false);
    const next = formatCode(t).slice(0, 7);
    setCode(next);
    if (!isCompleteCode(next)) { lastChecked.current = null; setState({ status: "idle" }); }
  }

  async function paste() {
    const text = await Clipboard.getStringAsync().catch(() => "");
    const found = extractCode(text);
    if (found) edit(found);
    else setPasteMiss(true);
  }

  function clear() {
    edit("");
    input.current?.focus();
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={type.body}>Type or paste the code from the clip or proof card.</Text>

      <Pressable onPress={() => input.current?.focus()} accessibilityRole="none" style={s.entry}>
        <CodeSlots value={code} focused={focused} />
        <TextInput
          ref={input}
          value={code}
          onChangeText={edit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => check()}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          keyboardType="default"
          returnKeyType="search"
          maxLength={7}
          caretHidden
          accessibilityLabel="Proof code"
          accessibilityHint="Six characters, like HX7-42K"
          style={s.hiddenInput}
        />
      </Pressable>

      <View style={s.row}>
        <Button label="Paste" icon="clipboard-outline" variant="secondary" style={s.flex} onPress={paste} />
        <Button label="Clear" icon="close" variant="secondary" style={s.flex} onPress={clear} disabled={!code} />
      </View>
      {pasteMiss ? <Text style={s.hint}>No code on the clipboard, or pasting wasn't allowed. Codes look like HX7-42K.</Text> : null}

      <Result state={state} code={code} onRetry={() => { lastChecked.current = null; check(); }} />
    </ScrollView>
  );
}

function Result({ state, code, onRetry }: { state: State; code: string; onRetry: () => void }) {
  switch (state.status) {
    case "idle":
      return (
        <View style={s.idle}>
          <Ionicons name="shield-checkmark-outline" size={22} color={color.faint} />
          <Text style={s.idleText}>
            {normalizeCode(code).length > 0
              ? `${6 - Math.min(6, normalizeCode(code).length)} more to go. It checks automatically.`
              : "Every Splashy Cam clip gets a six-character code. It checks automatically once all six are in."}
          </Text>
        </View>
      );
    case "loading":
      return (
        <View style={[s.panel, s.panelQuiet]} accessibilityLiveRegion="polite">
          <ActivityIndicator color={color.blue} size="large" />
          <Text style={[type.title, s.center]}>Checking…</Text>
        </View>
      );
    case "found": {
      const p = state.proof;
      return (
        <View style={[s.panel, s.panelYes]} accessibilityLiveRegion="polite" accessibilityRole="summary">
          <View style={s.yesBadge}><Ionicons name="checkmark" size={44} color={color.blueFill} /></View>
          <Text style={s.yesTitle}>REGISTERED</Text>
          <Text style={s.yesCode}>{formatCode(p.code)}</Text>
          <View style={s.facts}>
            <Fact k="REGISTERED" v={`${stampTime(new Date(p.createdAt))}`} sub={ago(p.createdAt)} />
            <Fact k="NEAR" v={p.place ? p.place.toUpperCase() : "NO LOCATION"} />
          </View>
          <Text style={s.yesNote}>
            This code was registered at that time. That shows when the clip was registered, not that the footage
            is original: make sure the same code is on the clip or proof card you were sent.
          </Text>
        </View>
      );
    }
    case "not_found":
      return (
        <View style={[s.panel, s.panelNo]} accessibilityLiveRegion="polite" accessibilityRole="summary">
          <View style={s.noBadge}><Ionicons name="close" size={44} color={color.text} /></View>
          <Text style={s.noTitle}>NOT FOUND</Text>
          <Text style={s.noCode}>{formatCode(code)}</Text>
          <Text style={[type.body, s.center]}>
            No clip was registered with this code. Check it for typos. If the player filmed with no signal,
            it registers once their phone is back online, so try again later.
          </Text>
        </View>
      );
    case "error":
      return (
        <View style={[s.panel, s.panelQuiet]}>
          <StateNote icon="cloud-offline-outline" title="Couldn't check"
            body="No connection to the server. This says nothing about the clip." />
          <Button label="Try again" icon="refresh" onPress={onRetry} style={s.full} />
        </View>
      );
    case "unconfigured":
      return (
        <View style={[s.panel, s.panelQuiet]}>
          <StateNote icon="construct-outline" title="Not connected"
            body="This build of Splashy Cam has no server settings, so it can't check codes." />
        </View>
      );
  }
}

function Fact({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <View style={s.fact}>
      <Text style={s.factK}>{k}</Text>
      <Text style={s.factV}>{v}</Text>
      {sub ? <Text style={s.factSub}>{sub}</Text> : null}
    </View>
  );
}

const SLOT_W = 46;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, gap: space.md },
  flex: { flex: 1 },
  full: { alignSelf: "stretch" },
  center: { textAlign: "center" },
  row: { flexDirection: "row", gap: space.sm },
  entry: { paddingVertical: space.sm },
  slots: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  slotGroup: { flexDirection: "row", alignItems: "center" },
  slot: { width: SLOT_W, height: 64, marginHorizontal: 3, borderRadius: radius.sm, backgroundColor: color.surface,
          borderWidth: 2, borderColor: color.line, alignItems: "center", justifyContent: "center" },
  slotFilled: { borderColor: color.surfaceHi, backgroundColor: color.surfaceHi },
  slotActive: { borderColor: color.blue },
  slotText: { fontFamily: mono, fontSize: 30, fontWeight: "700", color: color.text },
  dash: { color: color.faint, fontSize: 28, fontFamily: mono, marginHorizontal: 4 },
  hiddenInput: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: "transparent", fontSize: 1 },
  hint: { color: color.dim, fontSize: 14, textAlign: "center" },
  idle: { flexDirection: "row", gap: space.sm, alignItems: "center", paddingHorizontal: space.xs, marginTop: space.sm },
  idleText: { color: color.faint, fontSize: 14, lineHeight: 20, flex: 1 },
  panel: { borderRadius: radius.lg, padding: space.lg, alignItems: "center", gap: space.sm, marginTop: space.sm },
  panelQuiet: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, minHeight: 160, justifyContent: "center" },
  panelYes: { backgroundColor: color.blueFill },
  panelNo: { backgroundColor: color.surface, borderWidth: 2, borderColor: color.text },
  yesBadge: { width: 76, height: 76, borderRadius: 38, backgroundColor: color.onBlue, alignItems: "center", justifyContent: "center" },
  yesTitle: { color: color.onBlue, fontSize: 34, fontWeight: "900", letterSpacing: 2 },
  yesCode: { color: color.onBlue, fontFamily: mono, fontSize: 26, fontWeight: "700", letterSpacing: 4 },
  facts: { alignSelf: "stretch", flexDirection: "row", gap: space.sm, marginTop: space.xs },
  fact: { flex: 1, backgroundColor: "rgba(0,0,0,0.18)", borderRadius: radius.sm, padding: space.sm, minHeight: TOUCH },
  factK: { color: color.onBlue, fontFamily: mono, fontSize: 11, letterSpacing: 1.2 },
  factV: { color: color.onBlue, fontFamily: mono, fontSize: 13, fontWeight: "700", marginTop: 2, fontVariant: ["tabular-nums"] },
  factSub: { color: color.onBlue, fontSize: 12, marginTop: 2 },
  yesNote: { color: color.onBlue, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: space.xs },
  noBadge: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: color.text, alignItems: "center", justifyContent: "center" },
  noTitle: { color: color.text, fontSize: 34, fontWeight: "900", letterSpacing: 2 },
  noCode: { color: color.dim, fontFamily: mono, fontSize: 26, fontWeight: "700", letterSpacing: 4 },
});
