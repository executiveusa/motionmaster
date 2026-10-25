import test from "node:test";
import assert from "node:assert/strict";
import { openApiDocument } from "../dist/api.js";

test("OpenAPI paths are relative to an unprefixed server", () => {
  const spec = openApiDocument({ host: "127.0.0.1", port: 8787 });
  const serverUrl = spec.servers[0].url;
  assert.equal(serverUrl, "/", "API_PREFIX is already present in every path");
  assert.ok(spec.paths["/api/v1/skills"]);
  assert.ok(spec.paths["/api/v1/films"]);
  for (const path of Object.keys(spec.paths)) {
    assert.ok(path.startsWith("/api/v1/"), `unexpected API path ${path}`);
    assert.ok(!path.includes("/api/v1/api/v1"), `doubled prefix in ${path}`);
  }
});
