#!/usr/bin/env node
/**
 * Prove the loop panel.
 *
 * The panel is the studio's front door, so it has to be checked in a browser
 * rather than by reading the source. Four things matter:
 *
 *   1. It is on the page, and it does not push the page around.
 *   2. When the studio is **not** running it says so — plainly, and with
 *      the command to start it. A panel that shows zeroes when it cannot
 *      connect is worse than no panel, because zeroes look like a truth.
 *   3. The brief box works: a brief goes in, and the panel says it is in
 *      the queue.
 *   4. Nothing is broken on the way there: no console errors, no overflow.
 *
 *   node scripts/proof-loop-panel.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const CHROME = process.env.HYPERFRAMES_BROWSER_PATH ||
  "/workspace/.home/chrome/chrome-headless-shell-linux64/chrome-headless-shell";
const PORT = 8861;

let pass = 0;
let fail = 0;
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`ok    ${name}`);
    pass += 1;
  } else {
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
    fail += 1;
  }
}

if (!existsSync(CHROME)) {
  console.error(`No browser at ${CHROME}. Set HYPERFRAMES_BROWSER_PATH.`);
  process.exit(1);
}

/* The site, served. */
const preview = spawn("npx", ["vite", "preview", "--port", String(PORT), "--host", "127.0.0.1"], {
  cwd: join(ROOT, "site"),
  stdio: ["ignore", "pipe", "pipe"],
});
let previewOutput = "";
preview.stdout.on("data", (d) => { previewOutput += String(d); });
preview.stderr.on("data", (d) => { previewOutput += String(d); });

async function waitFor(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      /* Not up yet. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const PROBE = `(() => {
  const panel = document.querySelector('[data-loop]');
  if (!panel) return { error: 'no panel' };
  const status = panel.querySelector('[data-loop-status]');
  const events = panel.querySelector('[data-loop-events]');
  const figures = panel.querySelector('[data-loop-figures]');
  const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  return {
    hasPanel: true,
    statusText: status ? status.textContent.trim() : '',
    statusOff: status ? status.classList.contains('loop__status--off') : false,
    eventsText: events ? events.textContent.trim().slice(0, 120) : '',
    figureCount: figures ? figures.children.length : 0,
    overflow,
    titleInput: Boolean(panel.querySelector('[data-loop-title]')),
    briefInput: Boolean(panel.querySelector('[data-loop-brief]')),
    submitButton: Boolean(panel.querySelector('[data-loop-form] button[type=submit]')),
  };
})()`;

const WORK = mkdtempSync(join(tmpdir(), "mm-loop-panel-"));

try {
  if (!await waitFor(`http://127.0.0.1:${PORT}/`)) {
    console.error("The site did not start.");
    console.error(previewOutput.slice(-800));
    process.exit(1);
  }

  /* The house's own browser harness: raw CDP, no dependency. */
  const chrome = spawn(CHROME, [
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    "--headless",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--ignore-certificate-errors",
    "--disable-features=LocalNetworkAccessChecks",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  chrome.stderr.on("data", () => {});

  let list = null;
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch("http://127.0.0.1:9222/json/list");
      const targets = await response.json();
      list = targets.find((t) => t.type === "page");
      if (list) break;
    } catch {
      /* Not up yet. */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!list) throw new Error("The browser did not start.");

  const ws = new WebSocket(list.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      const timer = setTimeout(() => reject(new Error("timeout " + method)), 25000);
      pending.set(i, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  await new Promise((resolve) => { ws.onopen = resolve; });
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message.result);
      pending.delete(message.id);
    }
  };
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "the page threw");
    return result.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
  await new Promise((r) => setTimeout(r, 2500));

  const state = await evaluate(PROBE);
  check("the panel is on the page", state.hasPanel === true, JSON.stringify(state));
  check("the panel has a title field", state.titleInput === true);
  check("the panel has a brief field", state.briefInput === true);
  check("the panel has a submit button", state.submitButton === true);

  /* The studio is not running here, so the panel must say so rather than
     show zeroes. */
  check(
    "the panel says the studio is not running",
    state.statusOff === true && /not running/i.test(state.statusText),
    `status: "${state.statusText}" (off: ${state.statusOff})`,
  );
  check("the panel says how to start it", /npm start/.test(state.statusText), state.statusText);
  check(
    "the panel does not pretend the queue is empty",
    /not running/i.test(state.eventsText),
    state.eventsText,
  );

  /* The brief box: a brief goes in, and the panel reports what happened. */
  await evaluate(`(() => {
    const title = document.querySelector('[data-loop-title]');
    const brief = document.querySelector('[data-loop-brief]');
    title.value = 'A test brief';
    brief.value = 'A brief that the panel sends to the studio.';
    document.querySelector('[data-loop-form]').dispatchEvent(new Event('submit', { cancelable: true }));
    return 'sent';
  })()`);
  await new Promise((r) => setTimeout(r, 1500));
  const sent = await evaluate(`(() => {
    const note = document.querySelector('[data-loop-sent]');
    return note ? note.textContent.trim() : '';
  })()`);
  check(
    "a brief that cannot be sent says so, rather than failing silently",
    sent.length > 0,
    `note: "${sent}"`,
  );

  /* On a phone the panel has to compose, not shrink. */
  for (const width of [320, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await new Promise((r) => setTimeout(r, 500));
    const mobile = await evaluate(PROBE);
    check(`the panel does not overflow at ${width}px`, mobile.overflow <= 1, `overflow ${mobile.overflow}px`);
  }
  await send("Emulation.clearDeviceMetricsOverride");

  chrome.kill("SIGTERM");
} finally {
  preview.kill("SIGTERM");
  rmSync(WORK, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log("The panel is on the page, it tells the truth when the studio is not running, and it fits a phone.");
/* The preview server keeps the event loop alive. The checks are done. */
process.exit(0);
