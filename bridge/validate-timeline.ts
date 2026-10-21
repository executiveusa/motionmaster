// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Motion Master
// This directory is a separate AGPL-3.0 work that talks to a Montage instance
// over its public HTTP/MCP interfaces. It is NOT part of the proprietary
// Motion Master product and is excluded from its licence by design.

/**
 * Validate Montage timeline JSON against the schema and the Montage rules.
 *
 *   node --experimental-strip-types validate-timeline.ts <file.json> [more.json]
 *   node --experimental-strip-types validate-timeline.ts --json <file.json>
 *   node --experimental-strip-types validate-timeline.ts --schema <schema.json> <file.json>
 *
 * Exit code 0 = every file is valid, 1 = at least one file failed.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import {
  DEFAULT_SCHEMA_PATH,
  formatValidationResult,
  loadSchema,
  validateTimeline,
} from "./src/validate.ts";

interface CliOptions {
  files: string[];
  json: boolean;
  schemaPath: string;
  quiet: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { files: [], json: false, schemaPath: DEFAULT_SCHEMA_PATH, quiet: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--quiet" || arg === "-q") options.quiet = true;
    else if (arg === "--schema") {
      const next = argv[index + 1];
      if (!next) throw new Error("--schema needs a path to a JSON Schema file");
      options.schemaPath = next;
      index += 1;
    } else if (arg.startsWith("--schema=")) {
      options.schemaPath = arg.slice("--schema=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: validate-timeline.ts [--json] [--quiet] [--schema <path>] <timeline.json> [...]",
      );
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.files.push(arg);
    }
  }
  return options;
}

function main(): number {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    return 1;
  }

  if (options.files.length === 0) {
    console.error("No timeline file given. Usage: validate-timeline.ts <timeline.json> [...]");
    return 1;
  }

  const schema = loadSchema(options.schemaPath);
  const report: { file: string; valid: boolean; errors: unknown[]; warnings: unknown[] }[] = [];
  let failed = 0;

  for (const file of options.files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${file}: not valid JSON — ${message}`);
      report.push({ file, valid: false, errors: [{ path: "/", rule: "JSON_PARSE", message }], warnings: [] });
      failed += 1;
      continue;
    }

    const result = validateTimeline(parsed, { schema });
    report.push({
      file,
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    });
    if (!result.valid) failed += 1;

    if (!options.json && !options.quiet) {
      console.log(`${file}`);
      console.log(
        formatValidationResult(result)
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n"),
      );
    }
  }

  if (options.json) {
    console.log(JSON.stringify({ ok: failed === 0, files: report }, null, 2));
  } else if (options.quiet) {
    for (const entry of report) {
      console.log(`${entry.valid ? "OK" : "FAIL"} ${basename(entry.file)}`);
    }
  }

  if (failed > 0) {
    console.error(`${failed} of ${options.files.length} timeline(s) failed validation.`);
    return 1;
  }
  return 0;
}

process.exitCode = main();
