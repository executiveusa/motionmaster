/**
 * Model selection.
 *
 * OpenRouter serves 468 models and the catalogue changes daily, so a model is
 * never picked from memory and never silently substituted. The requested id is
 * checked against the live catalogue; the default is pinned in configuration
 * and documented, not guessed.
 *
 * If the catalogue cannot be reached the request is still allowed through and
 * the fact is recorded, because refusing a chat because a listing endpoint is
 * down would be worse than letting OpenRouter itself answer.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export interface CatalogueModel {
  id: string;
  name: string;
  contextLength: number;
  supportsTools: boolean;
}

export interface Catalogue {
  fetchedAt: string;
  models: CatalogueModel[];
}

const CATALOGUE_URL = "https://openrouter.ai/api/v1/models";
const CACHE_TTL_MS = 60 * 60 * 1000;

/** The model used when the caller does not name one. Pinned, not guessed. */
export const DEFAULT_MODEL = "openrouter/auto";

/**
 * A model that cannot be found in the catalogue is usually a near miss: a
 * vendor prefix, a dated version, or a typo. Find the candidates so the error
 * says what to use rather than only what failed.
 */
export function nearMisses(id: string, models: CatalogueModel[]): string[] {
  const lower = id.toLowerCase();
  const tail = lower.split("/").pop() ?? lower;
  return models
    .map((m) => m.id.toLowerCase())
    .filter((candidate) => {
      const candidateTail = candidate.split("/").pop() ?? candidate;
      return (
        candidate.includes(lower) ||
        lower.includes(candidate) ||
        candidateTail.startsWith(tail) ||
        tail.startsWith(candidateTail)
      );
    })
    .slice(0, 6);
}

let cached: Catalogue | null = null;
let inflight: Promise<Catalogue | null> | null = null;

/**
 * Read the live catalogue, with a disk cache so a cold start does not wait on
 * the network and a restart does not re-fetch.
 */
export async function loadCatalogue(cachePath?: string): Promise<Catalogue | null> {
  const now = Date.now();

  if (cached && now - Date.parse(cached.fetchedAt) < CACHE_TTL_MS) return cached;

  if (cachePath && existsSync(cachePath)) {
    try {
      const onDisk = JSON.parse(readFileSync(cachePath, "utf8")) as Catalogue;
      if (now - Date.parse(onDisk.fetchedAt) < CACHE_TTL_MS) {
        cached = onDisk;
        return cached;
      }
    } catch {
      /* a corrupt cache is not worth failing over */
    }
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(CATALOGUE_URL, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { data?: unknown[] };
      const models: CatalogueModel[] = [];
      for (const raw of body.data ?? []) {
        const entry = raw as {
          id?: string;
          name?: string;
          context_length?: number;
          architecture?: { input_modalities?: string[] };
        };
        if (!entry.id) continue;
        models.push({
          id: entry.id,
          name: entry.name ?? entry.id,
          contextLength: entry.context_length ?? 0,
          supportsTools: true,
        });
      }
      const catalogue: Catalogue = { fetchedAt: new Date().toISOString(), models };
      cached = catalogue;
      if (cachePath) {
        try {
          mkdirSync(dirname(cachePath), { recursive: true });
          writeFileSync(cachePath, JSON.stringify(catalogue));
        } catch {
          /* the cache is an optimisation, never a requirement */
        }
      }
      return catalogue;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export interface ModelResolution {
  model: string;
  /** True when the id was found in the live catalogue. */
  verified: boolean;
  /** Why this model was chosen, for the response and the log. */
  reason: string;
  /** Set when the requested model could not be used. */
  error?: string;
  suggestions?: string[];
}

/**
 * Resolve the model for a request.
 *
 * The requested id wins if the catalogue knows it. An unknown id is an error
 * with suggestions, not a silent fallback — a chat that quietly answers with a
 * different model is lying about itself.
 */
export async function resolveModel(
  requested: string | undefined,
  defaultModel: string,
  cachePath?: string,
): Promise<ModelResolution> {
  const wanted = (requested ?? "").trim();
  const catalogue = await loadCatalogue(cachePath);

  if (!catalogue) {
    // The listing endpoint is unreachable. Let OpenRouter decide, and say so.
    const model = wanted || defaultModel;
    return {
      model,
      verified: false,
      reason: "The model catalogue could not be reached, so the model was not verified.",
    };
  }

  const model = wanted || defaultModel;
  const known = catalogue.models.some((m) => m.id === model);

  if (known) {
    return {
      model,
      verified: true,
      reason: wanted
        ? `"${model}" was requested and is in the live catalogue.`
        : `No model was requested, so the pinned default "${model}" was used.`,
    };
  }

  const suggestions = nearMisses(model, catalogue.models);
  const near = suggestions.slice(0, 3);
  return {
    model,
    verified: false,
    reason: `"${model}" is not in the live OpenRouter catalogue.`,
    error:
      `"${model}" is not in the live OpenRouter catalogue.` +
      (near.length > 0
        ? ` Closest: ${near.join(", ")}.`
        : " Check the id at https://openrouter.ai/models."),
    suggestions,
  };
}
