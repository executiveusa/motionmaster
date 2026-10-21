// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Regenerate the example timelines from the bridge code, so the shipped
 * examples can never drift from `buildExplainerTimeline`.
 *
 *   node --experimental-strip-types scripts/generate-examples.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { attachLicense, buildExplainerTimeline } from "../src/explainer.ts";
import { loadTokens } from "../src/tokens.ts";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "..", "examples");
mkdirSync(examplesDir, { recursive: true });

const loaded = await loadTokens();
console.log(`tokens: ${loaded.source}${loaded.path ? ` (${loaded.path})` : ""}`);
if (loaded.warning) console.log(`warning: ${loaded.warning}`);

const footage = attachLicense(
  buildExplainerTimeline(
    {
      source: "assets/video/source.mp4",
      durationSeconds: 16,
      openingSeconds: 3,
      title: "MOTION MASTER",
      subtitle: "Your footage, in motion",
      sectionTitle: "SOURCE FOOTAGE",
      animation: "ken-burns",
    },
    { tokens: loaded.tokens },
  ),
);

writeFileSync(
  join(examplesDir, "footage-title.timeline.json"),
  `${JSON.stringify(footage, null, 2)}\n`,
  "utf8",
);
console.log("wrote examples/footage-title.timeline.json");
