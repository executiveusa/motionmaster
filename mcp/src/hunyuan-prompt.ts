/**
 * Optional Hunyuan PromptEnhancer adapter.
 *
 * Upstream is an image-prompt model, not a video renderer. Its output is
 * treated as an OPTIONAL visual-direction appendix to Motion Master's
 * deterministic motion brief; it cannot alter the original subject, timing,
 * constraints or render settings.
 *
 * Explicit opt-in only. No model weights/downloads/dependencies in this repo.
 * The worker is restricted to a loopback URL to avoid external SSRF/spend.
 */
export async function requestHunyuanVisual(
  prompt: string,
  options: {
    enabled?: boolean;
    workerUrl?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<{ visual: string; warning?: string }> {
  const enabled = options.enabled ?? process.env.MOTION_MASTER_HUNYUAN_ENABLED === "1";
  if (!enabled) return { visual: "", warning: "Hunyuan is not enabled on this server." };

  const rawUrl = options.workerUrl ?? process.env.MOTION_MASTER_HUNYUAN_WORKER_URL ?? "";
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { return { visual: "", warning: "Hunyuan local worker URL is not configured." }; }
  if (url.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash ||
      url.pathname !== "/enhance") {
    return { visual: "", warning: "Hunyuan worker must be an exact loopback /enhance URL." };
  }

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 90_000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("worker unavailable");
    const result = await response.json() as { enhanced?: unknown };
    const visual = typeof result.enhanced === "string" ? result.enhanced.trim() : "";
    if (!visual || visual.length > 4000 || /[\u0000-\u0008\u000E-\u001F]/u.test(visual)) {
      throw new Error("invalid response");
    }
    return { visual };
  } catch {
    return { visual: "", warning: "Hunyuan worker was unavailable; kept the deterministic motion brief." };
  }
}
