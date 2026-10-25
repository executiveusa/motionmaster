#!/usr/bin/env node
/** Capture the *built* homepage at comparable widths; screenshot evidence only,
 * not an independent taste decision or production proof. */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const dir = resolve(root, ".completion-proof", "screenshots");
mkdirSync(dir, { recursive: true });
const chrome = [
  process.env.CHROME_BIN, "google-chrome", "chromium", "chromium-browser"
].filter(Boolean).find(command => spawnSync("which", [command], { encoding: "utf8" }).status === 0);
if (!chrome) { console.error("Browser capture unavailable: Chrome/Chromium missing"); process.exit(1); }
const server = spawn("node", [resolve(root, "site/node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1", "--port", "4173"], {
  cwd: resolve(root, "site"), stdio: ["ignore", "pipe", "pipe"]
});
let log = "";
server.stderr.on("data", b => { log += b.toString(); });
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch("http://127.0.0.1:4173/");
      if (res.ok) { ready = true; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  if (!ready) throw Error("Vite preview was not reachable: " + log.slice(-1000));
  for (const [name, width, height, query] of [["desktop",1440,900,""],["mobile",390,844,""],["mobile-es-MX",390,844,"?lang=es-MX"]]) {
    const png = resolve(dir, name + ".png");
    const command = spawnSync(chrome, [
      "--headless=new","--no-sandbox","--disable-gpu","--hide-scrollbars",
      "--disable-dev-shm-usage", "--force-device-scale-factor=1",
      "--virtual-time-budget=5000", `--window-size=${width},${height}`,
      `--screenshot=${png}`, "http://127.0.0.1:4173/" + query
    ], { encoding: "utf8", timeout: 90_000 });
    if (command.status !== 0 || !existsSync(png)) {
      throw Error(`${name} capture failed: ${command.stderr?.slice(-1000)}`);
    }
    console.log(`Captured ${name}: ${png}`);
  }
  // Execute the built JavaScript in a real headless browser for both locales.
  // This proves initial Spanish rendering, not the separate user click path.
  for (const [lang, expected] of [
    ["en", ['lang="en"', "Make a video.", "Play clip", "Search prompts, styles, techniques"]],
    ["es-MX", ['lang="es-MX"', "Crea un video.", "Reproducir video", "Buscar instrucciones, estilos y técnicas"]]
  ]) {
    const check = spawnSync(chrome, [
      "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
      "--virtual-time-budget=5000", "--dump-dom",
      "http://127.0.0.1:4173/?lang=" + lang
    ], { encoding: "utf8", timeout: 90_000, maxBuffer: 8 * 1024 * 1024 });
    if (check.status !== 0) throw Error(lang + " browser DOM failed: " + check.stderr?.slice(-1000));
    writeFileSync(resolve(dir, "dom-" + lang + ".html"), check.stdout);
    for (const phrase of expected) {
      if (!check.stdout.includes(phrase)) {
        throw Error(lang + " browser DOM missing expected translation: " + phrase);
      }
    }
    console.log("PASS: real Chrome DOM, " + lang + ", " + expected.length + " assertions");
  }
} finally {
  server.kill("SIGTERM");
}
