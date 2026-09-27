import type { ProofRecord } from "./stamp";

/** The clip just filmed, handed from the recorder to the share screen. Memory only. */
export type Clip = {
  uri: string;          // local file in the app's cache; never uploaded
  rec: ProofRecord;
  durationMs: number;
};

let last: Clip | null = null;

export const setLastClip = (c: Clip) => { last = c; };
export const getLastClip = () => last;
