import { useEffect, useRef } from "react";
import { useEventListener } from "expo";
import type { VideoPlayer } from "expo-video";
import type { Range } from "./trim";

/**
 * Keep a player looping inside `range` (preview only; the file itself isn't cut here).
 * Seeks to the start whenever the range changes or playback reaches its end.
 */
export function useLoopRange(player: VideoPlayer, range: Range | null) {
  const r = useRef(range);
  r.current = range;

  useEffect(() => {
    player.timeUpdateEventInterval = 0.2;
  }, [player]);

  useEffect(() => {
    if (!range) return;
    player.currentTime = range.startMs / 1000;
    player.play();
  }, [player, range?.startMs, range?.endMs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    const cur = r.current;
    if (!cur) return;
    const ms = currentTime * 1000;
    if (ms >= cur.endMs - 60 || ms < cur.startMs - 250) player.currentTime = cur.startMs / 1000;
  });
}
