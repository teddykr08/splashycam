import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_KEEP_MS, MIN_KEEP_MS, defaultRange, canKeep, overByMs, withStart, withEnd, shifted,
  pushHistory, undo, clock, lengthMs,
} from "../lib/trim";

const MIN = 60_000;

test("default is the last 60 s of a long recording", () => {
  assert.deepEqual(defaultRange(3 * MIN + 15_000), { startMs: 2 * MIN + 15_000, endMs: 3 * MIN + 15_000 });
});

test("default is the whole clip when it's 60 s or shorter", () => {
  assert.deepEqual(defaultRange(42_000), { startMs: 0, endMs: 42_000 });
  assert.deepEqual(defaultRange(MAX_KEEP_MS), { startMs: 0, endMs: MAX_KEEP_MS });
});

test("can keep only when 60 s or under and inside the recording", () => {
  const d = 5 * MIN;
  assert.ok(canKeep(defaultRange(d), d));
  assert.ok(canKeep({ startMs: 0, endMs: MAX_KEEP_MS }, d));
  assert.ok(!canKeep({ startMs: 0, endMs: MAX_KEEP_MS + 1 }, d));
  assert.ok(!canKeep({ startMs: 10, endMs: 10 }, d));
  assert.ok(!canKeep({ startMs: 0, endMs: d + 1 }, d));
  assert.equal(overByMs({ startMs: 0, endMs: 72_000 }), 12_000);
  assert.equal(overByMs({ startMs: 0, endMs: 30_000 }), 0);
});

test("start handle: clamps to 0 and stops short of the end handle", () => {
  const d = 5 * MIN, r = { startMs: 60_000, endMs: 100_000 };
  assert.equal(withStart(r, -500, d).startMs, 0);
  assert.equal(withStart(r, 99_900, d).startMs, 100_000 - MIN_KEEP_MS);
  // Overshooting 60 s is allowed while dragging; Continue just stays disabled.
  const long = withStart(r, 0, d);
  assert.equal(lengthMs(long), 100_000);
  assert.ok(!canKeep(long, d));
});

test("end handle: clamps to the recording and stays after the start handle", () => {
  const d = 5 * MIN, r = { startMs: 60_000, endMs: 100_000 };
  assert.equal(withEnd(r, d + 9999, d).endMs, d);
  assert.equal(withEnd(r, 0, d).endMs, 60_000 + MIN_KEEP_MS);
});

test("very short recordings don't break the handles", () => {
  const d = 400, r = defaultRange(d);
  assert.deepEqual(withStart(r, 300, d), { startMs: 0, endMs: 400 });
  assert.deepEqual(withEnd(r, 10, d), { startMs: 0, endMs: 400 });
});

test("sliding keeps the length and stays inside the recording", () => {
  const d = 3 * MIN, r = { startMs: 60_000, endMs: 90_000 };
  assert.deepEqual(shifted(r, -100_000, d), { startMs: 0, endMs: 30_000 });
  assert.deepEqual(shifted(r, 1_000_000, d), { startMs: d - 30_000, endMs: d });
  assert.deepEqual(shifted(r, 5_000, d), { startMs: 65_000, endMs: 95_000 });
});

test("undo steps back through committed selections, never below the first", () => {
  const a = { startMs: 0, endMs: 60_000 }, b = { startMs: 5_000, endMs: 60_000 }, c = { startMs: 5_000, endMs: 50_000 };
  let h = [a];
  h = pushHistory(h, b);
  h = pushHistory(h, b); // same selection twice isn't a new step
  h = pushHistory(h, c);
  assert.equal(h.length, 3);
  h = undo(h); assert.deepEqual(h[h.length - 1], b);
  h = undo(h); assert.deepEqual(h[h.length - 1], a);
  h = undo(h); assert.deepEqual(h, [a]);
});

test("clock formatting", () => {
  assert.equal(clock(0), "0:00");
  assert.equal(clock(7_400), "0:07");
  assert.equal(clock(65_000), "1:05");
  assert.equal(clock(750_000), "12:30");
});
