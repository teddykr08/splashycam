import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAKE, createShakeDetector } from "../lib/shake";

const dt = SHAKE.intervalMs;

/** Feed `seconds` of samples from `f(t)` and return every reading. */
function run(push: ReturnType<typeof createShakeDetector>, seconds: number, f: (t: number) => [number, number, number], t0 = 0) {
  const out = [];
  for (let t = t0; t < t0 + seconds * 1000; t += dt) out.push({ t, ...push(...f(t), t) });
  return out;
}

test("a still phone at any angle is not shaky", () => {
  for (const g of [[0, 0, -1], [0, -1, 0], [0.7, -0.7, 0]] as [number, number, number][]) {
    const r = run(createShakeDetector(), 3, () => g);
    assert.ok(r.every((x) => !x.shaky), `angle ${g}`);
  }
});

test("slow tilting (turning to track someone) is not shaky", () => {
  const r = run(createShakeDetector(), 4, (t) => {
    const a = (t / 4000) * (Math.PI / 2); // 90 degrees over 4 s
    return [Math.sin(a), -Math.cos(a), 0];
  });
  assert.ok(r.every((x) => !x.shaky));
});

test("light hand jitter (±0.05 g) is not shaky", () => {
  const r = run(createShakeDetector(), 3, (t) => [0.05 * Math.sin(t / 7), -1 + 0.05 * Math.cos(t / 5), 0]);
  assert.ok(r.every((x) => !x.shaky));
});

test("hard rattle (±0.6 g square wave) is shaky within half a second", () => {
  const r = run(createShakeDetector(), 2, (t) => [0, -1 + (Math.floor(t / dt) % 2 ? 0.6 : -0.6), 0]);
  const first = r.find((x) => x.shaky);
  assert.ok(first, "never flagged");
  assert.ok(first.t <= 500, `flagged late at ${first.t}ms`);
});

test("warning holds through brief calm, then clears after holdMs", () => {
  const push = createShakeDetector();
  run(push, 1, (t) => [0, -1 + (Math.floor(t / dt) % 2 ? 0.6 : -0.6), 0]);
  const calm = run(push, 3, () => [0, -1, 0], 1000);
  const cleared = calm.find((x) => !x.shaky);
  assert.ok(cleared, "never cleared");
  // RMS window has to drain first, then hold for holdMs.
  assert.ok(cleared.t - 1000 >= SHAKE.holdMs, `cleared too early at +${cleared.t - 1000}ms`);
  assert.ok(cleared.t - 1000 <= SHAKE.holdMs + 1000, `cleared too late at +${cleared.t - 1000}ms`);
});
