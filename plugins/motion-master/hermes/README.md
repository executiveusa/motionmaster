# Motion Master for Hermes

Hermes loads two kinds of package. This is the **native** one — a
`plugin.yaml` and a `register(ctx)` function — because the studio is more
than a pile of markdown: it needs a skill that knows the house rules, and it
needs to know where the server is.

## Install

```bash
hermes plugins install executiveusa/motionmaster --no-enable
hermes plugins list
hermes plugins enable motion-master
```

Or copy the plugin folder into `~/.hermes/plugins/motion-master/` and enable
it there.

## What it gives you

- **Every skill in the pack**, read-only, under the `motion-master:` namespace.
  `skill_view("motion-master:meta-ads")` gets the ad studio; the rest of the
  pack covers film, cutdowns, explainers, sound and the house rules.
- **`/motion`** — the studio's map, and the folder for a job.

Plugin skills are not listed in the system prompt's skill index. They are
opt-in: the agent loads one when the job calls for it.

## The MCP server

Hermes reads MCP servers from `config.yaml`, not from a plugin, so the entry
goes in your profile:

```yaml
mcp_servers:
  motion-master:
    command: node
    args: ["/path/to/motion-master/mcp/dist/stdio.js"]
```

That is the **same server** as the HTTP one — the same tools, the same
registry, one factory (`createMcpServer` in `mcp/src/index.ts`). The HTTP
transport is at `http://127.0.0.1:8787/mcp`; the stdio one is for the hosts
that launch a server as a child process.

If you would rather drive the studio without a server at all, the folders in
`studio/` are the interface: `studio/AGENTS.md` is the map, every pipeline
folder has a `CONTEXT.md`, and every brand lives in `studio/records/<brand>/`.
