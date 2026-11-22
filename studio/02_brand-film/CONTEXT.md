# 02_brand-film — a brand film or a commercial

One job: turn a brief into a film with a shape — an opening, a beat, a hold,
an end — that a brand would pay for.

## The sequence

The film is a sequence of shots, and each shot has a role: `opening`,
`typography`, `camera`, `data`, `effects`, `interaction`, `ui-entrance`,
`rhythm`, `transition`, `outro`. The house library has ninety-nine scenes
that passed the gate, filed under those roles.

1. **Brief** — the offer, the audience, the single idea the film carries.
2. **Shot list** — `plan_shots` decides the shape of the film before it has
   code: which role, how long, what it has to do.
3. **Scenes** — one house scene per shot, filled from the brief.
4. **Sound** — a bed, an impact, and silence where the words need room.
5. **Render** — one job at a time, gated.

## The tools

```bash
# The shot list
node mcp/dist/index.js  # or use the MCP tool plan_shots
```

The MCP server does this whole sequence: `plan_video` → `plan_shots` →
`fill_block` → `compose_film` → `render_film`, then `list_films` and
`film_status`.

## The rules

- **One idea per film.** A film that says two things says neither.
- **Cuts on a beat grid.** A cut that lands with the music reads as made.
- **The end answers the opening.** The last frame is the thing the first
  frame promised.
