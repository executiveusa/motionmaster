import React from "react";
import { AbsoluteFill } from "remotion";
import { COLOR, TYPE } from "../tokens";

/**
 * Word-level captions.
 *
 * The line arrives as a whole; the words inside it light up one at a time, on
 * the clock the words were actually spoken. That clock can come from three
 * places and the component does not care which:
 *
 *   - an ASR transcript, the way the vox-director skill makes one: word
 *     timestamps in, beats out, cut on a sentence end or a pause;
 *   - a script written by hand with its timings, which is what a designed
 *     piece uses;
 *   - a lyric or a title card read at a known tempo.
 *
 * The point is that the caption is *synced*, so the eye lands on the word
 * being said rather than on a block of text.
 */

export interface Word {
  /** The word as it is written. */
  text: string;
  /** When the word starts, in seconds from the start of the film. */
  start: number;
  /** When the word ends, in seconds. */
  end: number;
}

export interface WordCaptionsProps {
  /** The caption lines. Each line is a run of words that belongs together. */
  lines: { words: Word[] }[];
  /** The current time in seconds. */
  time: number;
  /** How long a word takes to pop, in seconds. */
  popSeconds?: number;
  /** Where the caption sits. */
  align?: "center" | "left";
  /** The size of the caption, in the 1920 design space. */
  fontSize?: number;
  /** The colour of the words that are not being said. */
  idle?: string;
  /** The colour of the word being said. */
  active?: string;
  style?: React.CSSProperties;
}

/**
 * One caption line, word by word.
 *
 * The active word lifts a little and takes the accent colour; the words
 * before it stay legible but recede; the words after it have not arrived.
 */
export const WordCaptions: React.FC<WordCaptionsProps> = ({
  lines,
  time,
  popSeconds = 0.22,
  align = "center",
  fontSize = 96,
  idle = COLOR.ink,
  active = COLOR.accent,
  style,
}) => {
  const line = lines.find((l) => {
    const first = l.words[0];
    const last = l.words[l.words.length - 1];
    if (!first || !last) return false;
    return time >= first.start - 0.35 && time <= last.end + 0.5;
  });

  if (!line) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: align === "center" ? "center" : "flex-start",
        paddingBottom: 96,
        paddingLeft: align === "center" ? 0 : 150,
        fontFamily: TYPE.sans,
        ...style,
      }}
      aria-hidden
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: align === "center" ? "center" : "flex-start",
          gap: "0 26px",
          maxWidth: 1560,
        }}
      >
        {line.words.map((word, i) => {
          const isActive = time >= word.start && time <= word.end;
          const hasPassed = time > word.end;
          const isFuture = time < word.start;

          // The pop: a quick lift that lands and holds.
          const since = time - word.start;
          const p = Math.min(1, Math.max(0, since / popSeconds));
          const pop = isActive ? Math.sin(p * Math.PI) * 10 : 0;

          return (
            <span
              key={`${word.text}-${i}`}
              style={{
                display: "inline-block",
                fontSize,
                fontWeight: 700,
                letterSpacing: -3,
                lineHeight: 1.12,
                color: isActive ? active : idle,
                opacity: isFuture ? 0.22 : hasPassed ? 0.52 : 1,
                transform: `translateY(${-pop}px)`,
                transformOrigin: "bottom center",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Build the word list for a line from a phrase and a start time.
 *
 * A designed piece does not have an ASR transcript — it has a phrase and a
 * start. Spreading the words evenly across the phrase's own length gives the
 * caption a believable rhythm without pretending there was a recording.
 */
export const wordsFor = (phrase: string, start: number, seconds: number): Word[] => {
  const parts = phrase.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];
  const per = seconds / parts.length;
  return parts.map((text, i) => ({
    text,
    start: start + i * per,
    end: start + (i + 1) * per,
  }));
};

/**
 * Group a flat word list into lines, breaking on sentence punctuation.
 *
 * A caption line that runs for six seconds is a paragraph, not a caption.
 */
export const groupIntoLines = (words: Word[]): { words: Word[] }[] => {
  const lines: { words: Word[] }[] = [];
  let current: Word[] = [];
  for (const word of words) {
    current.push(word);
    if (/[.!?]$/.test(word.text)) {
      lines.push({ words: current });
      current = [];
    }
  }
  if (current.length) lines.push({ words: current });
  return lines;
};
