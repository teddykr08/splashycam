/**
 * stamp-video: burns the camcorder stamp into the video file itself, on the phone.
 *
 * STATUS: written, NOT compiled or run. Nothing in this folder has been built with
 * Xcode or Gradle yet. It is inert in Expo Go (native code can't load there), and the
 * app falls back to the proof card whenever this module is missing or fails.
 * See modules/stamp-video/README.md before trusting it.
 */
import { requireOptionalNativeModule } from "expo";

export type StampSpec = {
  /** Display form, e.g. "HX7-42K". */
  code: string;
  /** When filming started, ms since epoch. The burned-in clock counts up from here. */
  startEpochMs: number;
  /** City-level place or null. Never a street address. */
  place: string | null;
  /** Keep only this part of the recording (ms from its start). Omit both to keep it all. */
  trimStartMs?: number;
  trimEndMs?: number;
};

type NativeStampVideo = {
  /**
   * Trims (if trimStartMs/trimEndMs are given) and burns in the stamp in ONE export.
   * Returns a file:// URI of a new .mp4 in the app cache. The input file is left alone.
   */
  burnStamp(inputUri: string, spec: StampSpec): Promise<string>;
};

const native = requireOptionalNativeModule<NativeStampVideo>("StampVideo");

/** True only in a build that contains this native module (never in Expo Go). */
export const isAvailable = native != null;

export async function burnStamp(inputUri: string, spec: StampSpec): Promise<string> {
  if (!native) throw new Error("stamp-video native module is not in this build");
  return native.burnStamp(inputUri, spec);
}
