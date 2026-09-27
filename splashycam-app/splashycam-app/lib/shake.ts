/**
 * Shake detection, kept free of React Native so it can be tested with plain Node.
 *
 * Tuning values are starting points, NOT measured on a mounted phone. Tune them by
 * filming with a loose and a tight mount and watching when the warning fires.
 * Units are g (expo-sensors reports acceleration in g). Gravity is removed first, so
 * a phone held still reads ~0 whatever its angle.
 */
export const SHAKE = {
  intervalMs: 40,   // 25 Hz, well under Android 12's 200 Hz cap, so no extra permission
  window: 15,       // samples in the rolling RMS (~0.6 s)
  onG: 0.28,        // RMS above this -> warn
  offG: 0.16,       // must drop below this...
  holdMs: 1200,     // ...for this long before the warning clears (no flicker)
  gravityAlpha: 0.9,
} as const;

export type ShakeReading = { shaky: boolean; level: number };

export function createShakeDetector(cfg = SHAKE) {
  let gravity: [number, number, number] | null = null;
  const buf: number[] = [];
  let shaky = false;
  let calmSince: number | null = null;

  return function push(x: number, y: number, z: number, now: number): ShakeReading {
    // Low-pass tracks gravity; what's left is vibration and jolts.
    const g = gravity ?? [x, y, z];
    const a = cfg.gravityAlpha;
    gravity = [a * g[0] + (1 - a) * x, a * g[1] + (1 - a) * y, a * g[2] + (1 - a) * z];
    const dx = x - gravity[0], dy = y - gravity[1], dz = z - gravity[2];

    buf.push(dx * dx + dy * dy + dz * dz);
    if (buf.length > cfg.window) buf.shift();
    const rms = Math.sqrt(buf.reduce((sum, v) => sum + v, 0) / buf.length);

    if (rms >= cfg.onG) { shaky = true; calmSince = null; }
    else if (rms >= cfg.offG) calmSince = null;
    else if (shaky) {
      calmSince ??= now;
      if (now - calmSince >= cfg.holdMs) { shaky = false; calmSince = null; }
    }
    return { shaky, level: Math.min(1, rms / cfg.onG) };
  };
}
