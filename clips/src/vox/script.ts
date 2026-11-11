import { wordsFor, type Word } from "./WordCaptions";

/**
 * THE SCRIPT — "Motion Master, in twenty seconds".
 *
 * A script is a list of beats, and a beat is a line of copy with a start, an
 * end and the words inside it. The word timings are the film's clock: the
 * caption reads them, and the sound cues land on them.
 *
 * This is a designed piece, so the timings are written, not transcribed. The
 * same shape takes an ASR transcript — the vox-director skill makes one by
 * segmenting word timestamps into beats on a sentence end or a pause — so the
 * caption component does not care which it was handed.
 */

export interface Beat {
  /**
   * The spoken line. This is the caption, and it is timed word by word.
   */
  text: string;
  /** When the line starts, in seconds. */
  from: number;
  /** How long the line holds, in seconds. */
  seconds: number;
  /** What the frame shows while the line is up. */
  shot: "hook" | "code" | "cards" | "map" | "close";
  /** The cut-out type, when the beat has one. */
  headline?: string;
}

/**
 * The beats.
 *
 * The cut-out type and the spoken line are different sentences. A caption that
 * repeats the headline says the same thing twice on one screen, and the
 * bigger of the two wins — so the smaller one stops being read.
 */
export const BEATS: Beat[] = [
  { text: "DESCRIBE THE FILM.", from: 0.9, seconds: 2.9, shot: "hook", headline: "A FILM, ONE SENTENCE." },
  { text: "THE AGENT WRITES THE CODE.", from: 4.6, seconds: 3.4, shot: "code" },
  { text: "IT ALREADY KNOWS THEM.", from: 8.8, seconds: 2.2, shot: "cards", headline: "124 SHOTS." },
  { text: "IT DRAWS THE MAP TOO.", from: 11.6, seconds: 3.9, shot: "map" },
  { text: "RENDERED ON YOUR MACHINE.", from: 17.0, seconds: 2.4, shot: "close", headline: "THE FILE IS YOURS." },
];

/** The word list the caption component reads. */
export const CAPTION_LINES: { words: Word[] }[] = BEATS.map((beat) => ({
  words: wordsFor(beat.text, beat.from, beat.seconds),
}));

/**
 * The sound cues.
 *
 * Four sounds from the shelf, placed on the beats they belong to. Nothing
 * here is a music bed: the film is quiet, and the sounds are the punctuation.
 */
export interface Cue {
  /** The file, under clips/public/sfx. */
  file: string;
  /** When it lands, in seconds. */
  at: number;
  /** How loud it is. */
  volume: number;
}

export const CUES: Cue[] = [
  // The hook lands on paper.
  { file: "sfx/swipe_paper.mp3", at: 0.85, volume: 0.55 },
  // The code panel slides in.
  { file: "sfx/swipe_paper.mp3", at: 4.55, volume: 0.4 },
  // The shot cards.
  { file: "sfx/swipe_paper.mp3", at: 8.75, volume: 0.32 },
  // The camera starts moving over the map.
  { file: "sfx/pro_riser_air_gate.mp3", at: 11.5, volume: 0.34 },
  // The pin drops.
  { file: "sfx/drip_drop.mp3", at: 13.55, volume: 0.6 },
  // The close.
  { file: "sfx/swipe_paper.mp3", at: 16.9, volume: 0.5 },
  { file: "sfx/cut_hit_punch.mp3", at: 17.0, volume: 0.65 },
];

/**
 * The route the map draws.
 *
 * A real crossing, from one real place to another. The map is a
 * demonstration that the agent can draw one — not a claim about where
 * anything is made.
 */
export const ROUTE = [
  { at: { lat: 40.71, lng: -74.01 }, label: "NEW YORK" },
  { at: { lat: 51.51, lng: -0.13 }, label: "LONDON" },
  { at: { lat: 38.72, lng: -9.14 }, label: "LISBON" },
];

/** Where the callout points, and where its label sits on screen. */
export const CALLOUT = {
  at: { lat: 38.72, lng: -9.14 },
  label: "LISBON",
  labelAt: { x: 1180, y: 690 },
};
