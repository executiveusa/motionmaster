// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Timeline validation: JSON Schema first, then the real Montage rules.
 *
 * The schema (bridge/timeline.schema.json) covers the shape. The rules below
 * cover what a shape check cannot know: that in/out points make sense, that
 * cuts do not overlap, that every scene carries the fields its component
 * reads, and that overlays stay inside the piece.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import type { MontageCut, MontageOverlay } from "./types.ts";

/** One validation finding. */
export interface ValidationIssue {
  /** JSON path of the offending value, e.g. `cuts[1].out_seconds`. */
  path: string;
  /** Machine readable rule id, e.g. `CUT_OUT_BEFORE_IN`. */
  rule: string;
  /** Human readable message. */
  message: string;
  severity: "error" | "warning";
}

/** Result of a validation run. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** Fields a scene type must carry for the Montage component to render it. */
export const SCENE_REQUIRED_FIELDS: Record<string, string[]> = {
  text_card: ["text"],
  hero_title: ["text"],
  stat_card: ["stat"],
  callout: ["text"],
  comparison: ["leftLabel", "leftValue", "rightLabel", "rightValue"],
  bar_chart: ["chartData"],
  line_chart: ["chartSeries"],
  pie_chart: ["chartData"],
  kpi_grid: ["chartData"],
  progress_bar: ["progress"],
  anime_scene: ["images"],
  terminal_scene: ["steps"],
  screenshot_scene: ["backgroundImage", "screenshotSteps"],
};

/** Fields an overlay type must carry. */
export const OVERLAY_REQUIRED_FIELDS: Record<string, string[]> = {
  section_title: ["text"],
  stat_reveal: ["text"],
  hero_title: ["text"],
  provider_chip: ["providers"],
};

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".avi", ".mkv"];

let cachedSchema: unknown;
let cachedValidator: ValidateFunction | undefined;

/** Path of the schema shipped with this directory. */
export const DEFAULT_SCHEMA_PATH = fileURLToPath(new URL("../timeline.schema.json", import.meta.url));

/** Read the JSON Schema of this directory. */
export function loadSchema(path: string = DEFAULT_SCHEMA_PATH): unknown {
  if (path === DEFAULT_SCHEMA_PATH && cachedSchema) return cachedSchema;
  const schema = JSON.parse(readFileSync(path, "utf8"));
  if (path === DEFAULT_SCHEMA_PATH) cachedSchema = schema;
  return schema;
}

function validatorFor(schema: unknown): ValidateFunction {
  if (cachedValidator) return cachedValidator;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const compiled = ajv.compile(schema as object);
  cachedValidator = compiled;
  return compiled;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function extensionOf(source: string): string {
  const clean = source.split(/[?#]/)[0];
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot).toLowerCase();
}

/**
 * Validate a timeline document.
 *
 * @param timeline parsed timeline JSON
 * @param options.schema  schema override (defaults to the bundled schema)
 */
export function validateTimeline(
  timeline: unknown,
  options: { schema?: unknown } = {},
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const schema = options.schema ?? loadSchema();
  const validate = validatorFor(schema);
  if (!validate(timeline)) {
    for (const error of validate.errors ?? []) {
      errors.push({
        path: error.instancePath || "/",
        rule: `SCHEMA_${error.keyword.toUpperCase()}`,
        message: `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
        severity: "error",
      });
    }
  }

  if (typeof timeline !== "object" || timeline === null || Array.isArray(timeline)) {
    return { valid: false, errors, warnings };
  }

  const document = timeline as { cuts?: unknown; overlays?: unknown };
  const cuts = Array.isArray(document.cuts) ? (document.cuts as MontageCut[]) : [];
  const overlays = Array.isArray(document.overlays) ? (document.overlays as MontageOverlay[]) : [];

  if (cuts.length === 0) {
    errors.push({
      path: "cuts",
      rule: "CUT_EMPTY",
      message: "cuts is empty: the Explainer composition would render nothing.",
      severity: "error",
    });
  }

  // --- cuts ---------------------------------------------------------------
  const seenIds = new Set<string>();
  const byLayer = new Map<string, { cut: MontageCut; index: number }[]>();
  let timelineEnd = 0;

  cuts.forEach((cut, index) => {
    const base = `cuts[${index}]`;
    if (typeof cut?.id !== "string" || !cut.id) {
      errors.push({
        path: `${base}.id`,
        rule: "CUT_ID_MISSING",
        message: `${base}.id is required: every cut needs a stable id.`,
        severity: "error",
      });
    } else if (seenIds.has(cut.id)) {
      errors.push({
        path: `${base}.id`,
        rule: "CUT_ID_DUPLICATE",
        message: `${base}.id "${cut.id}" is used more than once.`,
        severity: "error",
      });
    } else {
      seenIds.add(cut.id);
    }

    const inSeconds = cut?.in_seconds;
    const outSeconds = cut?.out_seconds;
    if (!isFiniteNumber(inSeconds) || inSeconds < 0) {
      errors.push({
        path: `${base}.in_seconds`,
        rule: "CUT_IN_INVALID",
        message: `${base}.in_seconds must be a number >= 0.`,
        severity: "error",
      });
    }
    if (!isFiniteNumber(outSeconds) || outSeconds < 0) {
      errors.push({
        path: `${base}.out_seconds`,
        rule: "CUT_OUT_INVALID",
        message: `${base}.out_seconds must be a number >= 0.`,
        severity: "error",
      });
    }
    if (isFiniteNumber(inSeconds) && isFiniteNumber(outSeconds)) {
      if (outSeconds <= inSeconds) {
        errors.push({
          path: `${base}.out_seconds`,
          rule: "CUT_OUT_BEFORE_IN",
          message: `${base}.out_seconds (${outSeconds}) must be greater than in_seconds (${inSeconds}).`,
          severity: "error",
        });
      } else {
        timelineEnd = Math.max(timelineEnd, outSeconds);
      }
      if (inSeconds < 0) {
        errors.push({
          path: `${base}.in_seconds`,
          rule: "CUT_IN_NEGATIVE",
          message: `${base}.in_seconds must be >= 0.`,
          severity: "error",
        });
      }
    }

    if (cut?.source_in_seconds !== undefined) {
      if (!isFiniteNumber(cut.source_in_seconds) || cut.source_in_seconds < 0) {
        errors.push({
          path: `${base}.source_in_seconds`,
          rule: "CUT_SOURCE_IN_INVALID",
          message: `${base}.source_in_seconds must be a number >= 0.`,
          severity: "error",
        });
      }
    }

    if (!cut?.type) {
      if (typeof cut?.source !== "string" || !cut.source) {
        errors.push({
          path: `${base}.source`,
          rule: "CUT_SOURCE_MISSING",
          message: `${base}.source is required for a footage or image cut.`,
          severity: "error",
        });
      } else {
        const extension = extensionOf(cut.source);
        if (
          extension &&
          !IMAGE_EXTENSIONS.includes(extension) &&
          !VIDEO_EXTENSIONS.includes(extension)
        ) {
          warnings.push({
            path: `${base}.source`,
            rule: "CUT_SOURCE_EXTENSION_UNKNOWN",
            message:
              `${base}.source "${cut.source}" has an extension Montage does not know; ` +
              "the composer falls back to rendering it as a still image.",
            severity: "warning",
          });
        }
      }
    } else {
      const required = SCENE_REQUIRED_FIELDS[cut.type];
      if (!required) {
        errors.push({
          path: `${base}.type`,
          rule: "CUT_TYPE_UNKNOWN",
          message: `${base}.type "${cut.type}" is not a Montage scene type.`,
          severity: "error",
        });
      } else {
        for (const field of required) {
          const value = (cut as Record<string, unknown>)[field];
          if (value === undefined || value === null || value === "") {
            errors.push({
              path: `${base}.${field}`,
              rule: "SCENE_FIELD_MISSING",
              message: `${base}.${field} is required for scene type "${cut.type}".`,
              severity: "error",
            });
          }
        }
      }
    }

    const layer = cut?.layer ?? "primary";
    const list = byLayer.get(layer) ?? [];
    list.push({ cut, index });
    byLayer.set(layer, list);
  });

  // --- overlapping cuts ---------------------------------------------------
  for (const [layer, layerCuts] of byLayer) {
    const sorted = [...layerCuts].sort((a, b) => (a.cut.in_seconds ?? 0) - (b.cut.in_seconds ?? 0));
    for (let position = 1; position < sorted.length; position += 1) {
      const previous = sorted[position - 1].cut;
      const current = sorted[position].cut;
      if (
        isFiniteNumber(previous?.out_seconds) &&
        isFiniteNumber(current?.in_seconds) &&
        current.in_seconds < previous.out_seconds
      ) {
        errors.push({
          path: `cuts[${sorted[position].index}]`,
          rule: "CUT_OVERLAP",
          message:
            `Cuts "${previous.id}" (${previous.in_seconds}s → ${previous.out_seconds}s) and ` +
            `"${current.id}" (${current.in_seconds}s → ${current.out_seconds}s) overlap in layer "${layer}".`,
          severity: "error",
        });
      }
    }
  }

  // --- overlays -----------------------------------------------------------
  overlays.forEach((overlay, index) => {
    const base = `overlays[${index}]`;
    const inSeconds = overlay?.in_seconds;
    const outSeconds = overlay?.out_seconds;

    if (!isFiniteNumber(inSeconds) || inSeconds < 0) {
      errors.push({
        path: `${base}.in_seconds`,
        rule: "OVERLAY_IN_INVALID",
        message: `${base}.in_seconds must be a number >= 0.`,
        severity: "error",
      });
    }
    if (!isFiniteNumber(outSeconds) || outSeconds < 0) {
      errors.push({
        path: `${base}.out_seconds`,
        rule: "OVERLAY_OUT_INVALID",
        message: `${base}.out_seconds must be a number >= 0.`,
        severity: "error",
      });
    }
    if (isFiniteNumber(inSeconds) && isFiniteNumber(outSeconds) && outSeconds <= inSeconds) {
      errors.push({
        path: `${base}.out_seconds`,
        rule: "OVERLAY_OUT_BEFORE_IN",
        message: `${base}.out_seconds (${outSeconds}) must be greater than in_seconds (${inSeconds}).`,
        severity: "error",
      });
    }

    const required = OVERLAY_REQUIRED_FIELDS[overlay?.type];
    if (!required) {
      errors.push({
        path: `${base}.type`,
        rule: "OVERLAY_TYPE_UNKNOWN",
        message: `${base}.type "${overlay?.type}" is not a Montage overlay type.`,
        severity: "error",
      });
    } else {
      for (const field of required) {
        const value = (overlay as Record<string, unknown>)[field];
        if (value === undefined || value === null || value === "") {
          errors.push({
            path: `${base}.${field}`,
            rule: "OVERLAY_FIELD_MISSING",
            message: `${base}.${field} is required for overlay type "${overlay.type}".`,
            severity: "error",
          });
        }
      }
    }

    if (isFiniteNumber(outSeconds) && timelineEnd > 0 && outSeconds > timelineEnd) {
      warnings.push({
        path: `${base}.out_seconds`,
        rule: "OVERLAY_PAST_END",
        message:
          `${base}.out_seconds (${outSeconds}) is past the last cut (${timelineEnd}s); ` +
          "the overlay would hang over the empty tail.",
        severity: "warning",
      });
    }

    if (isFiniteNumber(inSeconds) && timelineEnd > 0) {
      const overCut = cuts.some(
        (cut) =>
          isFiniteNumber(cut?.in_seconds) &&
          isFiniteNumber(cut?.out_seconds) &&
          inSeconds >= cut.in_seconds &&
          inSeconds < cut.out_seconds,
      );
      if (!overCut) {
        warnings.push({
          path: `${base}.in_seconds`,
          rule: "OVERLAY_NOT_OVER_FOOTAGE",
          message:
            `${base} starts at ${inSeconds}s where no cut is on screen; ` +
            "Montage's local review renderer expects text to sit on visible media.",
          severity: "warning",
        });
      }
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

/** Format a validation result as human readable lines. */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  for (const issue of result.errors) {
    lines.push(`ERROR  [${issue.rule}] ${issue.path}: ${issue.message}`);
  }
  for (const issue of result.warnings) {
    lines.push(`WARN   [${issue.rule}] ${issue.path}: ${issue.message}`);
  }
  if (result.valid && result.warnings.length === 0) {
    lines.push("OK     timeline is valid against the schema and the Montage rules.");
  } else if (result.valid) {
    lines.push("OK     timeline is valid against the schema and the Montage rules (warnings only).");
  } else {
    lines.push(`FAILED ${result.errors.length} error(s), ${result.warnings.length} warning(s).`);
  }
  return lines.join("\n");
}
