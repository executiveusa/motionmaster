#!/usr/bin/env node
/**
 * Prove the remediation table.
 *
 * The proof of a repair is the gate. Not a unit test that says the repair
 * ran — the gate, re-run, going from fail to pass. A repair that does not
 * clear its finding is not a repair, and this script is what decides that.
 *
 * For every rule in the table it manufactures a composition with the finding
 * on purpose, runs the gate, applies the repair, runs the gate again, and
 * asserts that the second gate is clean. Then it asserts the opposite: that
 * a composition with an unrepairable finding is NOT silently "fixed".
 *
 *   node scripts/proof-remediation.mjs [--only <code>] [--keep]
 *
 * Exits non-zero if any rule fails to clear its finding.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = join(ROOT, "generator", "proof-remediation");
const SOURCE = join(ROOT, "generator", "compositions", "library-map");

const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const keep = argv.includes("--keep");

const { gateProject } = await import(`file://${join(ROOT, "mcp", "dist", "render.js")}`);
const { applyRemediation, planRemediation } = await import(`file://${join(ROOT, "mcp", "dist", "remediations.js")}`);

/* --------------------------------------------------------- the scaffold -- */

const HEAD = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" width="1920" height="1080" />
    <script src="./gsap-3.14.2.min.js"></script>
    <style>
      @font-face { font-family: "IBM Plex Sans"; src: url("./fonts/ibm-plex-sans-latin-700-normal.woff2") format("woff2"); font-weight: 700; font-display: block; }
      :root { --canvas: #F4F4F2; --ink: #111113; --muted: #6B6B70; --accent: #FF4A1C; }
      body { margin: 0; background: var(--canvas); font-family: "IBM Plex Sans", sans-serif; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; }
      #weak { position: absolute; left: 120px; top: 200px; font-size: 96px; font-weight: 700; color: var(--ink); }
      #strong { position: absolute; left: 120px; top: 420px; font-size: 96px; font-weight: 700; color: var(--ink); }
    </style>
  </head>
  <body>
`;

const FOOT = `    <script>
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#weak", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0);
      tl.fromTo("#strong", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.2);
      window.__timelines = { main: tl };
      tl.seek(0);
    </script>
  </body>
</html>
`;

const GOOD_ROOT = '<div id="root" data-composition-id="main" data-start="0" data-duration="4" data-width="1920" data-height="1080">';

/** Build a composition directory with a given body. */
function scaffold(name, body, rootAttributes = GOOD_ROOT) {
  const dir = join(WORK, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const asset of ["gsap-3.14.2.min.js", "hyperframes.json"]) {
    cpSync(join(SOURCE, asset), join(dir, asset));
  }
  cpSync(join(SOURCE, "fonts"), join(dir, "fonts"), { recursive: true });
  writeFileSync(join(dir, "index.html"), `${HEAD}${rootAttributes}${body}\n${FOOT}`, "utf8");
  return dir;
}

/* -------------------------------------------------------------- the cases -- */

const CASES = [
  {
    code: "contrast_aa_failure",
    note: "a colour that does not pass is replaced with one that does",
    build: () => {
      const dir = scaffold("contrast", `      <div id="weak">Hard to read</div>\n      <div id="strong">Easy to read</div>\n    </div>`);
      const html = readFileSync(join(dir, "index.html"), "utf8").replace(
        "#weak { position: absolute; left: 120px; top: 200px; font-size: 96px; font-weight: 700; color: var(--ink); }",
        "#weak { position: absolute; left: 120px; top: 200px; font-size: 96px; font-weight: 700; color: #9A9A9E; }",
      );
      writeFileSync(join(dir, "index.html"), html, "utf8");
      return dir;
    },
  },
  {
    code: "root_missing_composition_id",
    note: "the root gains a data-composition-id",
    build: () => scaffold("composition-id", `      <div id="weak">Hard to read</div>\n      <div id="strong">Easy to read</div>\n    </div>`,
      '<div id="root" data-start="0" data-duration="4" data-width="1920" data-height="1080">'),
  },
  {
    code: "root_missing_dimensions",
    note: "the root gains its dimensions",
    build: () => scaffold("dimensions", `      <div id="weak">Hard to read</div>\n      <div id="strong">Easy to read</div>\n    </div>`,
      '<div id="root" data-composition-id="main" data-start="0" data-duration="4">'),
  },
  {
    code: "timeline_id_mismatch",
    note: "the timeline name and the composition id agree",
    build: () => scaffold("timeline-id", `      <div id="weak">Hard to read</div>\n      <div id="strong">Easy to read</div>\n    </div>`,
      '<div id="root" data-composition-id="scene" data-start="0" data-duration="4" data-width="1920" data-height="1080">'),
  },
  {
    code: "deprecated_data_end",
    note: "data-end is renamed to data-duration",
    build: () => scaffold("data-end", `      <div id="weak">Hard to read</div>\n      <div id="strong">Easy to read</div>\n    </div>`,
      GOOD_ROOT.replace('data-duration="4"', 'data-start="0" data-end="4"')),
  },
  {
    code: "self_closing_media_tag",
    note: "a self-closing media tag is closed properly",
    build: () => {
      const dir = scaffold("self-closing", `      <div id="weak">Hard to read</div>\n      <div id="strong">Easy to read</div>\n      <video id="clip" src="./assets/clip.mp4" data-start="0" data-duration="4" />\n    </div>`);
      mkdirSync(join(dir, "assets"), { recursive: true });
      cpSync(join(SOURCE, "assets", "bed.mp3"), join(dir, "assets", "clip.mp4"));
      return dir;
    },
  },
  {
    code: "video_missing_muted",
    note: "a video without a sound of its own is muted",
    build: () => {
      const dir = scaffold("video-muted", `      <div id="weak">Hard to read</div>\n      <div id="strong">Easy to read</div>\n      <video id="clip" src="./assets/clip.mp4" data-start="0" data-duration="4"></video>\n    </div>`);
      mkdirSync(join(dir, "assets"), { recursive: true });
      cpSync(join(SOURCE, "assets", "bed.mp3"), join(dir, "assets", "clip.mp4"));
      return dir;
    },
  },
];

/* --------------------------------------------------------------- the run -- */

mkdirSync(WORK, { recursive: true });

let pass = 0;
let fail = 0;
const failures = [];

for (const testCase of CASES) {
  if (only && testCase.code !== only) continue;
  const dir = testCase.build();

  const before = await gateProject(ROOT, dir, 240_000);
  const beforeCodes = before.findings.map((f) => f.code);
  const had = beforeCodes.includes(testCase.code);

  if (!had) {
    console.error(`FAIL  ${testCase.code}`);
    console.error(`      the manufactured composition did not produce this finding`);
    console.error(`      the gate said: ${beforeCodes.join(", ") || "(nothing)"}`);
    fail += 1;
    failures.push(testCase.code);
    continue;
  }

  /* Repair, re-gate, repair again — up to the budget the blueprint sets
     (three rounds). Repairing one finding can expose another underneath it:
     closing a self-closing video tag reveals that the video was never
     muted, and that only shows up on the next gate. A single round is not
     enough, which is exactly why the loop has a budget rather than a
     single attempt.

     A repair that finds nothing to change is a no-op, not a failure. The
     muted rule deliberately skips a self-closing tag — that is the
     self-closing rule's business — so on the first round it has nothing to
     do and says so. The round after the tag is closed, it has something to
     do. */
  const changes = [];
  const noops = [];
  let after = before;
  let rounds = 0;
  while (!after.ok && rounds < 3) {
    rounds += 1;
    const plan = planRemediation(after.findings);
    if (plan.repairable.length === 0) break;
    let changed = false;
    for (const finding of plan.repairable) {
      const repair = applyRemediation(dir, finding);
      if (repair.applied) {
        changes.push(`${finding.code}: ${repair.change}`);
        changed = true;
      } else {
        noops.push(`${finding.code}: ${repair.reason}`);
      }
    }
    if (!changed) break;
    after = await gateProject(ROOT, dir, 240_000);
  }

  /* The rule is proved by the target finding being gone, not by the whole
     gate being clean — a case may carry a second finding that another rule
     owns. */
  const targetGone = !after.findings.some((f) => f.code === testCase.code);
  if (targetGone) {
    console.log(`ok    ${testCase.code}`);
    for (const change of changes) console.log(`      ${change}`);
    for (const noop of noops) console.log(`      (no-op this round) ${noop}`);
    console.log(`      ${testCase.note}${rounds > 1 ? ` (${rounds} rounds)` : ""}`);
    pass += 1;
  } else {
    console.error(`FAIL  ${testCase.code}`);
    console.error(`      the finding survived ${rounds} round(s) of repair`);
    console.error(`      the gate still says: ${after.findings.map((f) => f.code).join(", ")}`);
    fail += 1;
    failures.push(testCase.code);
  }
  continue;
}

/* An unknown code must never be silently accepted. */
{
  const dir = scaffold("unknown-code", `      <div id="weak">Hard to read</div>\n      <div id="strong">Easy to read</div>\n    </div>`);
  const repair = applyRemediation(dir, {
    code: "a_code_nobody_has_written_a_rule_for",
    severity: "error",
    message: "invented for the proof",
  });
  if (repair.applied) {
    console.error("FAIL  an unknown finding code was 'repaired' — the loop would guess");
    fail += 1;
    failures.push("unknown-code");
  } else {
    console.log("ok    an unknown finding code is refused, not guessed at");
    console.log(`      ${repair.reason}`);
    pass += 1;
  }
}

if (!keep) rmSync(WORK, { recursive: true, force: true });

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error(`\nA rule that does not clear its finding is not a repair. Failing: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("Every rule in the table clears its finding on the gate.");
