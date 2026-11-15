/**
 * Remediation — turning a gate finding into a repair.
 *
 * The gate is good at saying what is wrong. It is bad at fixing it: it
 * reports, it does not repair. That is deliberate on its part — a gate that
 * fixes its own findings is a gate you cannot trust.
 *
 * This module is the other half. It takes the findings the gate produced and
 * applies **deterministic** repairs for the codes where the fix is
 * mechanical and cannot be argued with: a colour that does not pass is
 * replaced with a colour that does; a deprecated attribute is renamed; a
 * self-closing media tag is closed properly.
 *
 * Two rules govern everything here:
 *
 *   1. **A repair never guesses.** If the finding does not carry enough
 *      information to make the change unambiguously, the finding is not
 *      repaired. It is reported as needing a human. A loop that guesses is
 *      worse than a loop that stops.
 *   2. **A repair is proven by the gate, not by itself.** Every repair is
 *      applied, the gate is re-run, and only a clean gate counts. A repair
 *      that does not clear its finding is not a repair.
 *
 * The gate's `suggestedColor` is a hint, not an answer. Measured on the
 * finding that started this: a colour at rgb(154,154,158) on rgb(244,244,242)
 * fails at 2.55:1 against a required 3:1, and the gate suggests
 * rgb(141,141,145) — which computes to 2.98:1. Still failing. So the repair
 * computes the colour itself and walks the lightness until the ratio is
 * genuinely met, rather than trusting a suggestion that rounds.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/* -------------------------------------------------------------- colour ---- */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse `#rgb`, `#rrggbb`, `rgb(r,g,b)` or `rgba(r,g,b,a)`. */
export function parseColor(value: string): Rgb | null {
  const text = value.trim().toLowerCase();
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const digits = hex[1].length === 3
      ? hex[1].split("").map((c) => c + c).join("")
      : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
    };
  }
  const rgb = text.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }
  return null;
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** WCAG 2.x relative luminance. */
export function luminance({ r, g, b }: Rgb): number {
  const channel = (raw: number): number => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two colours. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Find a colour that genuinely passes.
 *
 * The gate's suggestion is a first guess that can still miss. This walks the
 * foreground away from the background — toward black when the background is
 * light, toward white when it is dark — in small steps until the required
 * ratio is met. If it cannot be met, it returns null rather than a colour
 * that lies.
 */
export function passingColor(
  foreground: Rgb,
  background: Rgb,
  requiredRatio: number,
): Rgb | null {
  if (contrastRatio(foreground, background) >= requiredRatio) return foreground;

  const backgroundIsLight = luminance(background) > 0.4;
  const toward = backgroundIsLight ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };

  let best: Rgb | null = null;
  for (let step = 1; step <= 100; step += 1) {
    const t = step / 100;
    const candidate: Rgb = {
      r: foreground.r + (toward.r - foreground.r) * t,
      g: foreground.g + (toward.g - foreground.g) * t,
      b: foreground.b + (toward.b - foreground.b) * t,
    };
    if (contrastRatio(candidate, background) >= requiredRatio) {
      best = candidate;
      break;
    }
  }
  return best;
}

/* ------------------------------------------------------------- findings --- */

export interface GateFinding {
  code: string;
  severity: "error" | "warning";
  message: string;
  sourceFile?: string;
  /** The full finding, as the gate wrote it. */
  raw?: Record<string, unknown>;
}

export interface Repair {
  applied: boolean;
  /** The file that was changed, relative to the composition. */
  file?: string;
  /** What changed, in words a person can read. */
  change?: string;
  /** Why it was not applied, when it was not. */
  reason?: string;
}

/** The reading type floor: 2.6% of the short side. */
export const TYPE_FLOOR = 0.026;

/* -------------------------------------------------------------- helpers --- */

function readCompositionFile(dir: string, name: string): string | null {
  const path = resolve(dir, name);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function writeCompositionFile(dir: string, name: string, content: string): void {
  writeFileSync(resolve(dir, name), content, "utf8");
}

/** The id in a selector like `#weak` or `#root > span:nth-of-type(2)`. */
export function idFromSelector(selector: string): string | null {
  const match = selector.match(/#([A-Za-z][\w-]*)/);
  return match ? match[1] : null;
}

/**
 * Find the declaration to change for a colour finding.
 *
 * The finding gives a selector and a foreground colour. The colour may be
 * written three ways in the source: inline on the element, in a rule that
 * matches the element's id, or as a CSS variable. All three are found here
 * and the exact text to replace is returned, so the caller makes one precise
 * edit rather than a hopeful one.
 */
function findColourDeclaration(
  html: string,
  selector: string,
  foreground: string,
): { start: number; end: number; replacement: string; where: string } | null {
  const fg = parseColor(foreground);
  if (!fg) return null;
  const id = idFromSelector(selector);

  /* One: an inline style on the element itself. */
  if (id) {
    const element = new RegExp(`<[^>]*id=["']${id}["'][^>]*>`, "i").exec(html);
    if (element) {
      const style = /style=["']([^"']*)["']/i.exec(element[0]);
      if (style) {
        const colour = /color\s*:\s*([^;"']+)/i.exec(style[1]);
        if (colour) {
          const start = element.index + element[0].indexOf(style[1]) + colour.index + colour[0].indexOf(colour[1]);
          return { start, end: start + colour[1].length, replacement: "", where: "inline style" };
        }
      }
    }
  }

  /* Two: a rule in the style block that targets the id. */
  if (id) {
    const rule = new RegExp(`#${id}\\s*\\{([^}]*)\\}`, "i").exec(html);
    if (rule) {
      const colour = /color\s*:\s*([^;}]+)/i.exec(rule[1]);
      if (colour) {
        const start = rule.index + rule[0].indexOf(colour[1]);
        return { start, end: start + colour[1].length, replacement: "", where: "css rule" };
      }
    }
  }

  /* Three: a CSS variable. The variable's value is what has to move. */
  const rule = id ? new RegExp(`#${id}\\s*\\{([^}]*)\\}`, "i").exec(html)?.[1] ?? "" : "";
  const variable = /var\(\s*(--[\w-]+)\s*\)/.exec(rule);
  if (variable) {
    const name = variable[1];
    const declaration = new RegExp(`${name}\\s*:\\s*([^;}]+)`, "i").exec(html);
    if (declaration) {
      const start = declaration.index + declaration[0].indexOf(declaration[1]);
      return { start, end: start + declaration[1].length, replacement: "", where: `css variable ${name}` };
    }
  }

  return null;
}

/* --------------------------------------------------------------- rules ---- */

export interface RemediationRule {
  code: string;
  describe: string;
  apply: (finding: GateFinding, dir: string) => Repair;
}

function editHtml(dir: string, file: string, edit: (html: string) => { html: string; change: string } | null): Repair {
  const html = readCompositionFile(dir, file);
  if (html === null) return { applied: false, reason: `There is no ${file} in the composition.` };
  const result = edit(html);
  if (!result) return { applied: false, reason: "The change could not be located in the source." };
  if (result.html === html) return { applied: false, reason: "The source already reads that way." };
  writeCompositionFile(dir, file, result.html);
  return { applied: true, file, change: result.change };
}

export const REMEDIATIONS: RemediationRule[] = [
  {
    code: "contrast_aa_failure",
    describe: "Replace the failing foreground colour with one that genuinely meets the required ratio.",
    apply(finding, dir) {
      const raw = finding.raw ?? {};
      const fgText = String(raw.fg ?? "");
      const bgText = String(raw.bg ?? "");
      const required = Number(raw.requiredRatio ?? 4.5);
      const selector = String(raw.selector ?? "");
      const foreground = parseColor(fgText);
      const background = parseColor(bgText);
      if (!foreground || !background) {
        return { applied: false, reason: "The finding does not carry a readable foreground and background." };
      }
      const passing = passingColor(foreground, background, required);
      if (!passing) {
        return { applied: false, reason: `No colour reaches ${required}:1 against that background.` };
      }
      const replacement = toHex(passing);
      const achieved = contrastRatio(passing, background);
      if (achieved < required) {
        return { applied: false, reason: `The computed colour reaches ${achieved.toFixed(2)}:1, short of ${required}:1.` };
      }
      const file = finding.sourceFile ?? "index.html";
      return editHtml(dir, file, (html) => {
        const declaration = findColourDeclaration(html, selector, fgText);
        if (!declaration) return null;
        const next = html.slice(0, declaration.start) + replacement + html.slice(declaration.end);
        return {
          html: next,
          change: `${selector || "the text"}: ${fgText} → ${replacement} (${achieved.toFixed(2)}:1, needs ${required}:1) in the ${declaration.where}.`,
        };
      });
    },
  },
  {
    code: "deprecated_data_end",
    describe: "Rename data-end to data-duration, keeping the timing the gate expects.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        const match = /data-end\s*=\s*"([^"]*)"/i.exec(html);
        if (!match) return null;
        const next = html.replace(/data-end\s*=\s*"([^"]*)"/i, 'data-duration="$1"');
        return { html: next, change: `data-end="${match[1]}" → data-duration="${match[1]}"` };
      });
    },
  },
  {
    code: "deprecated_data_layer",
    describe: "Rename data-layer to data-layer-index.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        const match = /data-layer\s*=\s*"([^"]*)"/i.exec(html);
        if (!match) return null;
        const next = html.replace(/data-layer\s*=\s*"([^"]*)"/i, 'data-layer-index="$1"');
        return { html: next, change: `data-layer="${match[1]}" → data-layer-index="${match[1]}"` };
      });
    },
  },
  {
    code: "self_closing_media_tag",
    describe: "Close a media tag properly instead of self-closing it.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        /* The gate is explicit: <video .../> leaves the tag open, the browser
           swallows everything after it, and the composition goes invisible.
           So the tag has to be closed, not merely un-slashed. */
        const next = html.replace(/<(img|source|video|audio)\b([^>]*?)\s*\/>/gi, "<$1$2></$1>");
        if (next === html) return null;
        return { html: next, change: "a self-closing media tag was given a closing tag" };
      });
    },
  },
  {
    code: "visible_markup_comment",
    describe: "Remove a comment that is visible in the rendered frame.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        const next = html.replace(/<!--[\s\S]*?-->/g, "");
        if (next === html) return null;
        return { html: next, change: "a visible markup comment was removed" };
      });
    },
  },
  {
    code: "video_missing_muted",
    describe: "Mute a video that is played without a sound of its own.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        /* A self-closing tag is the self-closing rule's business. Touching it
           here would un-slash it and leave it open, which is worse than the
           problem being fixed. */
        const next = html.replace(/<video\b(?![^>]*\bmuted\b)([^>]*[^/>])>/gi, "<video$1 muted>");
        if (next === html) return null;
        return { html: next, change: "a video without muted was muted" };
      });
    },
  },
  {
    code: "media_missing_id",
    describe: "Give a media element a stable id.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        let counter = 0;
        const next = html.replace(/<(video|audio|img|source)\b((?:(?!\bid=)[^>])*)>/gi, (_m, tag, rest) => {
          counter += 1;
          return `<${tag}${rest} id="media-${counter}">`;
        });
        if (next === html) return null;
        return { html: next, change: `${counter} media element(s) were given an id` };
      });
    },
  },
  {
    code: "root_missing_composition_id",
    describe: "Give the root composition a data-composition-id.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        const root = /<div\b([^>]*\bid=["']root["'][^>]*)>/i.exec(html);
        if (!root) return null;
        if (/data-composition-id\s*=/i.test(root[1])) return null;
        const next = html.replace(root[0], `<div${root[1]} data-composition-id="main">`);
        return { html: next, change: 'the root gained data-composition-id="main"' };
      });
    },
  },
  {
    code: "root_missing_dimensions",
    describe: "Give the root composition its width and height.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        const root = /<div\b([^>]*\bid=["']root["'][^>]*)>/i.exec(html);
        if (!root) return null;
        if (/data-width\s*=/i.test(root[1]) && /data-height\s*=/i.test(root[1])) return null;
        let attributes = root[1];
        if (!/data-width\s*=/i.test(attributes)) attributes += ' data-width="1920"';
        if (!/data-height\s*=/i.test(attributes)) attributes += ' data-height="1080"';
        const next = html.replace(root[0], `<div${attributes}>`);
        return { html: next, change: "the root gained its dimensions" };
      });
    },
  },
  {
    code: "timeline_id_mismatch",
    describe: "Make the timeline name and the composition id agree.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        const id = /data-composition-id\s*=\s*"([^"]+)"/i.exec(html);
        if (!id) return null;
        const next = html
          .replace(/__timelines\[\s*["'][^"']+["']\s*\]/g, `__timelines["${id[1]}"]`)
          .replace(/__timelines\s*=\s*\{\s*["']?[^"'\s:,}]+["']?\s*:/g, `__timelines = { "${id[1]}":`);
        if (next === html) return null;
        return { html: next, change: `the timeline was renamed to "${id[1]}" to match the composition id` };
      });
    },
  },
  {
    code: "text_below_floor",
    describe: "Raise reading type to the floor of 2.6% of the short side.",
    apply(finding, dir) {
      return editHtml(dir, finding.sourceFile ?? "index.html", (html) => {
        const size = /font-size\s*:\s*(\d+(?:\.\d+)?)px/i.exec(html);
        if (!size) return null;
        const current = Number(size[1]);
        const floor = Math.round(1080 * TYPE_FLOOR);
        if (current >= floor) return null;
        const next = html.replace(/font-size\s*:\s*\d+(?:\.\d+)?px/i, `font-size: ${floor}px`);
        return { html: next, change: `font-size ${current}px → ${floor}px` };
      });
    },
  },
];

const BY_CODE = new Map(REMEDIATIONS.map((rule) => [rule.code, rule]));

/**
 * Codes that are known and deliberately not repaired.
 *
 * They are listed rather than left unknown so the failure says *"this code
 * has no repair"* instead of *"this code was not recognised"*. The
 * difference matters: the first is a decision, the second is a gap.
 */
export const UNREPAIRABLE = [
  "missing_gsap_script", "missing_three_script", "missing_lottie_script",
  "missing_gsap_plugin", "missing_local_asset", "missing_timeline_registry",
  "missing_or_empty_sub_composition", "multiple_root_compositions",
  "duplicate_composition_id", "duplicate_media_id",
  "non_deterministic_code", "requestanimationframe_in_composition",
  "motion_frozen", "motion_off_frame", "motion_out_of_order",
  "motion_selector_missing", "motion_selector_ambiguous",
  "motion_appears_late", "console_error", "page_error", "http_error",
  "css_parse_error", "invalid_inline_script_syntax", "invalid_variable_values_json",
  "invalid_composition_variables_declaration", "unbalanced_style_tags",
  "unclosed_tag_swallowed_element", "base64_media_prohibited",
  "inaccessible_media_url", "placeholder_media_url", "media_src_kind_mismatch",
  "media_missing_data_start", "media_missing_src",
  "root_zoom_rescales_a_fixed_canvas", "negative_z_index",
  "split_data_attribute_selector", "template_literal_selector",
  "repeated_id_descendant_selector", "root_composition_missing_duration_source",
  "root_composition_missing_html_wrapper", "host_missing_composition_id",
  "caption_container_relative_position", "caption_overflow_clips_scaled_words",
  "caption_transcript_not_inline", "caption_exit_missing_hard_kill",
  "svg_drawon_css_dasharray_conflict", "subcomposition_root_styled_by_class",
  "texture_class_unknown", "texture_mask_asset_not_found",
  "imperative_media_control", "request_failed", "runtime_hidden_style_opacity",
  "gsap_css_transform_conflict", "gsap_non_transform_motion",
  "gsap_from_opacity_noop", "gsap_fullscreen_overlay_starts_visible",
  "gsap_timeline_not_registered", "gsap_timeline_registered_before_async_build",
  "gsap_timeline_return_used_as_tween", "gsap_animation_clip_element",
  "gsap_relative_value_second_writer", "gsap_repeat_refresh_relative_value",
  "slideshow_invalid", "slideshow_unresolved_ref", "system_font_will_alias",
  "visible_markup_comment", "invalid_parent_traversal_in_asset_path",
  "id_requires_css_escape", "host_missing_composition_id",
] as const;

/** Apply the repair that matches a finding, if there is one. */
export function applyRemediation(dir: string, finding: GateFinding): Repair {
  const rule = BY_CODE.get(finding.code);
  if (!rule) {
    const known = (UNREPAIRABLE as readonly string[]).includes(finding.code);
    return {
      applied: false,
      reason: known
        ? `There is no repair for "${finding.code}" — it needs a person.`
        : `The finding "${finding.code}" is not known to the remediation table — add a rule for it.`,
    };
  }
  return rule.apply(finding, dir);
}

export interface RemediationPlan {
  /** Findings that can be repaired. */
  repairable: GateFinding[];
  /** Findings that need a person, with the reason. */
  unrepairable: { finding: GateFinding; reason: string }[];
}

/** Decide, before touching anything, what can be repaired and what cannot. */
export function planRemediation(findings: GateFinding[]): RemediationPlan {
  const plan: RemediationPlan = { repairable: [], unrepairable: [] };
  for (const finding of findings) {
    if (BY_CODE.has(finding.code)) {
      plan.repairable.push(finding);
    } else {
      const known = (UNREPAIRABLE as readonly string[]).includes(finding.code);
      plan.unrepairable.push({
        finding,
        reason: known
          ? `There is no repair for "${finding.code}" — it needs a person.`
          : `The finding "${finding.code}" is not known to the remediation table — add a rule for it.`,
      });
    }
  }
  return plan;
}
