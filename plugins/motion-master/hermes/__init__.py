"""Motion Master — an in-house motion design studio, as a Hermes plugin.

Hermes loads two kinds of package. This is the native one: a ``plugin.yaml``
and a ``register(ctx)`` function. The native path is used here because the
studio is more than a pile of markdown — it needs a skill that knows the
house rules, and it needs to know where the server is.

What this plugin registers:

  * every skill in the pack, read-only, under the ``motion-master:`` namespace
  * a ``/motion`` command that points at the right folder for the job

The skills are copied into ``skills/`` by the contract generator, so the
plugin works both in this repository and after it has been copied into
``~/.hermes/plugins/``. When the copy is not there — a development checkout
that has not been synced — it falls back to the pack beside it, so a missing
sync never silently empties the plugin.

The MCP server is the same one every other host gets. Hermes reads its MCP
servers from ``config.yaml`` rather than from a plugin, so the entry is
printed by the ``/motion`` command and documented in the README:

    mcp_servers:
      motion-master:
        command: node
        args: ["/path/to/motion-master/mcp/dist/stdio.js"]

The stdio entry point is the same server as the HTTP one. Same tools, same
registry, one factory.
"""

from __future__ import annotations

from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent


def _skills_dir() -> Path:
    """Where the bundled skills are.

    The copied ``skills/`` directory first, because that is what survives the
    plugin being installed on its own. The pack beside the plugin second,
    because that is what a checkout without a sync has.
    """
    sibling = PLUGIN_ROOT.parent / "skills"
    if sibling.is_dir() and any(sibling.iterdir()):
        return sibling
    bundled = PLUGIN_ROOT / "skills"
    if bundled.is_dir() and any(bundled.iterdir()):
        return bundled
    return sibling


def register(ctx) -> None:
    """Register the studio's skills and its command."""
    skills_dir = _skills_dir()
    registered = 0

    if skills_dir.is_dir():
        for child in sorted(skills_dir.iterdir()):
            skill_md = child / "SKILL.md"
            if child.is_dir() and skill_md.exists():
                ctx.register_skill(child.name, skill_md)
                registered += 1

    def _handle_motion(raw_args: str) -> str:
        """Point at the right folder for the job."""
        args = (raw_args or "").strip()
        if args and args.lower() not in {"help", "--help", "-h"}:
            return (
                f"For “{args}”, work in the studio folder that matches the job:\n"
                "  a Meta ad          studio/01_meta-ad/\n"
                "  a brand film       studio/02_brand-film/\n"
                "  cutting a video    studio/03_cutdown/\n"
                "  an explainer       studio/04_explainer/\n"
                "\nEach one has a CONTEXT.md saying what it reads, what it writes and "
                "what a person checks. studio/AGENTS.md is the map."
            )
        return (
            "Motion Master — an in-house motion design studio.\n"
            f"{registered} skills, loaded as motion-master:<name>.\n"
            "\nThe jobs:\n"
            "  a Meta ad        studio/01_meta-ad/    sizes, safe zones, copy limits, the gate\n"
            "  a brand film     studio/02_brand-film/ a shot list, house scenes, a score\n"
            "  cutting a video  studio/03_cutdown/    transcripts, silences, mistakes, story\n"
            "  an explainer     studio/04_explainer/  diagrams, choreography, the camera\n"
            "\nstudio/AGENTS.md is the map. /motion <the job> names the folder.\n"
            "\nThe MCP server is the same studio behind a tool surface:\n"
            "  node <repo>/mcp/dist/stdio.js"
        )

    ctx.register_command(
        "motion",
        handler=_handle_motion,
        description="Motion Master: the studio's map, and the folder for a job.",
        args_hint="[a Meta ad | a brand film | cutting a video | an explainer]",
    )
