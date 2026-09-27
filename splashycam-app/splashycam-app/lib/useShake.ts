import { useEffect, useState } from "react";
import { Accelerometer } from "expo-sensors";
import { SHAKE, createShakeDetector } from "./shake";

export type ShakeState = { shaky: boolean; level: number; everShaky: boolean; available: boolean };

const IDLE: ShakeState = { shaky: false, level: 0, everShaky: false, available: true };

/**
 * Watches the accelerometer while `active` and reports whether the phone is vibrating
 * hard enough to ruin the shot. `everShaky` latches for the whole active period.
 */
export function useShake(active: boolean): ShakeState {
  const [state, setState] = useState<ShakeState>(IDLE);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let sub: { remove: () => void } | null = null;
    const push = createShakeDetector();
    setState(IDLE);

    Accelerometer.isAvailableAsync().then((ok) => {
      if (cancelled) return;
      if (!ok) { setState({ ...IDLE, available: false }); return; }
      Accelerometer.setUpdateInterval(SHAKE.intervalMs);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        const r = push(x, y, z, Date.now());
        setState((prev) =>
          r.shaky === prev.shaky && Math.abs(r.level - prev.level) < 0.05
            ? prev // skip re-renders for tiny changes
            : { ...prev, shaky: r.shaky, level: r.level, everShaky: prev.everShaky || r.shaky });
      });
    }).catch(() => { if (!cancelled) setState({ ...IDLE, available: false }); });

    return () => { cancelled = true; sub?.remove(); };
  }, [active]);

  return state;
}
