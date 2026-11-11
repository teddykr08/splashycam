/**
 * Trim selection logic. Pure, no React Native, so it runs in Node tests.
 * All times are milliseconds from the start of the recording.
 */

/** The most a kept clip can be. */
export const MAX_KEEP_MS = 60_000;
/** The handles can't be dragged closer than this. */
export const MIN_KEEP_MS = 1_000;

export type Range = { startMs: number; endMs: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const lengthMs = (r: Range) => r.endMs - r.startMs;

/** The hit is usually at the end, so default to the last 60 s (or all of a short clip). */
export function defaultRange(durationMs: number): Range {
  const d = Math.max(0, durationMs);
  return { startMs: Math.max(0, d - MAX_KEEP_MS), endMs: d };
}

/** Can the user continue with this selection? */
export function canKeep(r: Range, durationMs: number): boolean {
  const len = lengthMs(r);
  return r.startMs >= 0 && r.endMs <= durationMs && len > 0 && len <= MAX_KEEP_MS;
}

/** How far over the limit the selection is (0 if it's fine). */
export function overByMs(r: Range): number {
  return Math.max(0, lengthMs(r) - MAX_KEEP_MS);
}

/**
 * Drag the start handle. It may make the selection longer than 60 s (the user is
 * allowed to overshoot; Continue just stays disabled), but never past the end handle.
 */
export function withStart(r: Range, startMs: number, durationMs: number): Range {
  const minGap = Math.min(MIN_KEEP_MS, durationMs);
  return { startMs: clamp(Math.round(startMs), 0, Math.max(0, r.endMs - minGap)), endMs: r.endMs };
}

export function withEnd(r: Range, endMs: number, durationMs: number): Range {
  const minGap = Math.min(MIN_KEEP_MS, durationMs);
  return { startMs: r.startMs, endMs: clamp(Math.round(endMs), Math.min(durationMs, r.startMs + minGap), durationMs) };
}

/** Slide the whole selection, keeping its length, without leaving the recording. */
export function shifted(r: Range, deltaMs: number, durationMs: number): Range {
  const len = lengthMs(r);
  const startMs = clamp(Math.round(r.startMs + deltaMs), 0, Math.max(0, durationMs - len));
  return { startMs, endMs: startMs + len };
}

export const sameRange = (a: Range, b: Range) => a.startMs === b.startMs && a.endMs === b.endMs;

/** Undo history: a stack of committed selections. The last entry is the current one. */
export function pushHistory(history: Range[], r: Range): Range[] {
  const last = history[history.length - 1];
  return last && sameRange(last, r) ? history : [...history, r];
}

export function undo(history: Range[]): Range[] {
  return history.length > 1 ? history.slice(0, -1) : history;
}

/** "0:07", "1:05", "12:30". */
export function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
