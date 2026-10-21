/**
 * A test double for a user-run Montage instance.
 *
 * It implements the routes the Motion Master MCP server talks to, exactly as
 * they are documented in docs/05-MONTAGE-INTEGRATION.md and in the bridge:
 *
 *   GET  /api/health
 *   GET  /api/projects
 *   GET  /api/project/{project_id}/state
 *   GET  /api/v1/projects/{project_id}/timeline
 *   PUT  /api/v1/projects/{project_id}/timeline   body: { expected_version, timeline }
 *   POST /api/v1/projects/{project_id}/validate
 *
 * It stores what it was given and records every request, so a test can prove
 * that the timeline really travelled over the wire.
 */
import { createServer } from "node:http";

/**
 * Start the fake instance.
 *
 * @param {object} [options]
 * @param {number} [options.port] 0 picks a free port.
 * @param {number} [options.version] The version the stored timeline starts at.
 */
export async function startFakeMontage(options = {}) {
  const state = {
    requests: [],
    version: options.version ?? 3,
    document: {
      version: options.version ?? 3,
      canvas: { width: 1920, height: 1080, fps: 30, durationSeconds: 0, background: null },
      tracks: [],
      extensions: {},
    },
    projects: [{ id: "demo-project", name: "Demo project" }],
  };

  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const entry = {
        method: req.method,
        path: url.pathname,
        headers: req.headers,
        body: raw.length > 0 ? safeJson(raw) : null,
      };
      state.requests.push(entry);

      const send = (status, payload) => {
        const body = JSON.stringify(payload);
        res.writeHead(status, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        res.end(body);
      };

      if (url.pathname === "/api/health" && req.method === "GET") {
        send(200, { ok: true, app: "backlot" });
        return;
      }
      if (url.pathname === "/api/projects" && req.method === "GET") {
        send(200, state.projects);
        return;
      }
      if (/^\/api\/project\/[^/]+\/state$/.test(url.pathname) && req.method === "GET") {
        send(200, { project_id: "demo-project", timeline: state.document });
        return;
      }
      if (/^\/api\/v1\/projects\/[^/]+\/timeline$/.test(url.pathname)) {
        if (req.method === "GET") {
          send(200, state.document);
          return;
        }
        if (req.method === "PUT") {
          const body = entry.body ?? {};
          const expected = Number(body.expected_version);
          if (expected !== state.version) {
            send(409, {
              error: "version conflict",
              expected_version: expected,
              current_version: state.version,
            });
            return;
          }
          state.version += 1;
          state.document = { ...body.timeline, version: state.version };
          send(200, state.document);
          return;
        }
      }
      if (/^\/api\/v1\/projects\/[^/]+\/validate$/.test(url.pathname) && req.method === "POST") {
        send(200, { valid: true, project_id: "demo-project", issues: [] });
        return;
      }
      send(404, { error: "not found", path: url.pathname });
    });
  });

  await new Promise((resolve) => server.listen(options.port ?? 0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    state,
    requests: state.requests,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
