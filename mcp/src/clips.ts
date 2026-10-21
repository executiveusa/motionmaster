/**
 * Reads the rendered-clip gallery from the site's clip manifest
 * (site/src/clips.json). The file is optional: if the site has not been built
 * yet the gallery tools report that honestly instead of inventing clips.
 */
import { readFileSync } from "node:fs";

export interface Clip {
  id: string;
  title: string;
  prompt: string;
  stack: string;
  duration: string;
  durationSeconds: number | null;
  src: string | null;
  poster: string | null;
  alt: string | null;
  renderedWith: string | null;
  bridgeDemo: boolean;
}

export interface ClipGallery {
  available: boolean;
  source: string;
  note: string;
  clips: Clip[];
}

interface RawClip {
  id?: string;
  title?: string;
  prompt?: string;
  stack?: string;
  duration?: string;
  durationSeconds?: number;
  src?: string;
  poster?: string;
  alt?: string;
  renderedWith?: string;
  bridgeDemo?: boolean;
}

function normalise(raw: RawClip): Clip {
  return {
    id: raw.id ?? "",
    title: raw.title ?? "",
    prompt: raw.prompt ?? "",
    stack: raw.stack ?? "",
    duration: raw.duration ?? "",
    durationSeconds:
      typeof raw.durationSeconds === "number" ? raw.durationSeconds : null,
    src: raw.src ?? null,
    poster: raw.poster ?? null,
    alt: raw.alt ?? null,
    renderedWith: raw.renderedWith ?? null,
    bridgeDemo: raw.bridgeDemo === true,
  };
}

export function readGallery(clipsPath: string): ClipGallery {
  let raw: string;
  try {
    raw = readFileSync(clipsPath, "utf8");
  } catch {
    return {
      available: false,
      source: clipsPath,
      note:
        "The clip manifest (site/src/clips.json) is not present in this checkout. " +
        "No example clips are available. This is expected when the site has not been built yet.",
      clips: [],
    };
  }

  let parsed: { clips?: RawClip[]; note?: string };
  try {
    parsed = JSON.parse(raw) as { clips?: RawClip[]; note?: string };
  } catch {
    return {
      available: false,
      source: clipsPath,
      note: `The clip manifest at ${clipsPath} is not valid JSON, so no clips were returned.`,
      clips: [],
    };
  }

  const clips = Array.isArray(parsed.clips)
    ? parsed.clips.map(normalise).filter((clip) => clip.id.length > 0)
    : [];

  return {
    available: clips.length > 0,
    source: clipsPath,
    note:
      parsed.note ??
      `${clips.length} rendered example clips, each with the exact prompt that produced it.`,
    clips,
  };
}
