import type { RefObject } from "react";
import type { View } from "react-native";
import * as VideoThumbnails from "expo-video-thumbnails";
import { captureRef } from "react-native-view-shot";
import { CARD_W, CARD_H } from "../components/ProofCard";

/** A still from the clip. Everything stays on the phone. */
export async function grabFrame(videoUri: string, atMs: number): Promise<string | null> {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: Math.max(0, Math.round(atMs)), quality: 0.85 });
    return uri;
  } catch {
    return null;
  }
}

/**
 * Where to take candidate frames from. People usually stop filming right after the
 * hit, so bias toward the end.
 */
export function frameTimes(durationMs: number): number[] {
  const d = Math.max(0, durationMs);
  return [0.35, 0.6, 0.8, 0.95].map((f) => Math.round(d * f));
}

/** Renders the on-screen proof card to a PNG in the cache folder, 1080 px wide. */
export async function renderProofCard(card: RefObject<View | null>): Promise<string> {
  const scale = 1080 / CARD_W;
  return captureRef(card, { format: "png", result: "tmpfile", width: 1080, height: Math.round(CARD_H * scale) });
}
