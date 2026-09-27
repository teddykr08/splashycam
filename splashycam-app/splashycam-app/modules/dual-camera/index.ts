/**
 * dual-camera: record the front and back cameras at the same time (picture-in-picture).
 *
 * STATUS: PREP ONLY. The native side implements just `isSupported()`, a capability
 * check, and even that has never been compiled. Recording from two cameras needs a
 * native camera view; it's designed in README.md but NOT written. The app doesn't use
 * this module yet. It is always absent in Expo Go.
 */
import { requireOptionalNativeModule } from "expo";

type NativeDualCamera = {
  /** Whether this phone can run two cameras at once (hardware + OS). */
  isSupported(): boolean;
};

const native = requireOptionalNativeModule<NativeDualCamera>("DualCamera");

/** True only in a build that contains this native module (never in Expo Go). */
export const isAvailable = native != null;

/** False when the module is missing, so callers never need to guard twice. */
export function isSupported(): boolean {
  try {
    return native?.isSupported() ?? false;
  } catch {
    return false;
  }
}
