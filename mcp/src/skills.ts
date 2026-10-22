/**
 * Reads the bundled Motion Master skill catalogue straight from the plugin
 * package on disk, so the server always describes the skills it actually ships.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * What a skill teaches, which is how an agent decides what to load.
 * Order matters: the router first, then the general principles, then the
 * craft rules, then the style libraries, then the tooling.
 */
export type SkillGroup =
  | "motion-master"
  | "motion-design"
  | "craft"
  | "styles"
  | "production"
  | "web"
  | "catalogue"
  | "gsap"
  | "remotion";

export interface SkillSummary {
  name: string;
  description: string;
  group: SkillGroup;
  license: string | null;
  version: string | null;
  path: string;
  upstream: string | null;
  loads: string[];
}

export interface Frontmatter {
  name?: string;
  description?: string;
  license?: string;
  version?: string;
  metadata?: { author?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/** Minimal YAML frontmatter reader — enough for the flat frontmatter used here. */
export function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
  if (!source.startsWith("---")) return { data: {}, body: source };
  const end = source.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: source };
  const block = source.slice(3, end);
  const body = source.slice(end + 4);
  const data: Frontmatter = {};

  const lines = block.split("\n");
  let currentKey: string | undefined;
  let listBuffer: string[] | undefined;
  let blockBuffer: string[] | undefined;
  let blockFolded = false;

  const flush = (): void => {
    if (currentKey && listBuffer) {
      data[currentKey] = listBuffer;
      listBuffer = undefined;
    }
    if (currentKey && blockBuffer) {
      data[currentKey] = blockFolded
        ? blockBuffer.join(" ").replace(/\s+/g, " ").trim()
        : blockBuffer.join("\n").trim();
      blockBuffer = undefined;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");

    // Block scalar continuation: indented lines belong to the previous key.
    if (blockBuffer) {
      if (line.trim() === "") {
        blockBuffer.push("");
        continue;
      }
      if (/^\s+\S/.test(line)) {
        blockBuffer.push(line.trim());
        continue;
      }
      flush();
    }

    if (!line.trim() || line.trim().startsWith("#")) continue;

    const listItem = /^\s*-\s+(.*)$/.exec(line);
    if (listItem && currentKey) {
      listBuffer = listBuffer ?? [];
      listBuffer.push(unquote(listItem[1].trim()));
      continue;
    }

    const keyValue = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
    if (!keyValue) continue;
    flush();
    currentKey = keyValue[1];
    const rawValue = keyValue[2].trim();
    if (rawValue === "" || rawValue === ">" || rawValue === "|") {
      if (rawValue === ">" || rawValue === "|") {
        blockBuffer = [];
        blockFolded = rawValue === ">";
      } else {
        listBuffer = [];
      }
      continue;
    }
    data[currentKey] = unquote(rawValue);
  }
  flush();

  return { data, body };
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

const GROUP_BY_NAME: Record<string, SkillGroup> = {
  "motion-master": "motion-master",
  "motion-design": "motion-design",
  // Craft law: what good is, what never ships, and the measured gates.
  "motionmaxxing": "craft",
  // Film style libraries — a style prompt you can reuse on your own brief.
  "lemo-opuscar": "styles",
  "huashu-art-motion": "styles",
  // Producing a whole film, end to end.
  "product-launch-motion": "production",
  "guizang-product-video": "production",
  "jacky-motion": "production",
  // Browser and canvas animation.
  "oil-motion": "web",
  "animate": "web",
  "claude-motion-motion-design": "web",
  "claude-motion-review-loop": "web",
  "claude-motion-sound-design": "web",
  "claude-motion-web-sims": "web",
  // A technique catalogue to look things up in.
  "awesome-ai-motion": "catalogue",
};

function groupFor(name: string): SkillGroup {
  if (name.startsWith("gsap-")) return "gsap";
  if (name.startsWith("remotion-")) return "remotion";
  return GROUP_BY_NAME[name] ?? "motion-master";
}

const UPSTREAM: Record<string, string> = {
  "motion-design": "LottieFiles motion-design skill (MIT)",
  gsap: "GreenSock GSAP official skills (MIT)",
  remotion: "Remotion official skills (MIT)",
  craft: "motionmaxxing (Apache-2.0)",
  styles: "lemo-opuscar (MIT + CC BY 4.0), huashu-art-motion (MIT)",
  production: "product-launch-motion (MIT), guizang-product-video (MIT), jacky-motion (MIT)",
  web: "oil-motion (MIT), animate (MIT), claude-motion (MIT)",
  catalogue: "awesome-ai-motion (MIT)",
};

function upstreamFor(group: SkillGroup): string | null {
  if (group === "motion-master") return null;
  return UPSTREAM[group] ?? null;
}

/** Extract the "Related skills" pointers so the agent knows what to load next. */
function relatedSkills(body: string): string[] {
  const found = new Set<string>();
  const pattern = /\*\*([a-z0-9-]+)\*\*|skills\/([a-z0-9-]+)\//g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    const name = match[1] ?? match[2];
    if (name && name !== "motion-master") found.add(name);
  }
  return [...found].sort();
}

export function listSkills(skillsDir: string): SkillSummary[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(skillsDir);
  } catch {
    return [];
  }

  const skills: SkillSummary[] = [];
  for (const entry of entries.sort()) {
    const skillPath = join(skillsDir, entry, "SKILL.md");
    let stats;
    try {
      stats = statSync(skillPath);
    } catch {
      continue;
    }
    if (!stats.isFile()) continue;

    const source = readFileSync(skillPath, "utf8");
    const { data, body } = parseFrontmatter(source);
    const name = typeof data.name === "string" ? data.name : entry;
    const description =
      typeof data.description === "string" ? data.description : "";
    const group = groupFor(name);

    skills.push({
      name,
      description: description.replace(/\s+/g, " ").trim(),
      group,
      license: typeof data.license === "string" ? data.license : null,
      version:
        typeof data.version === "string"
          ? data.version
          : data.metadata && typeof data.metadata.version === "string"
            ? data.metadata.version
            : null,
      path: `skills/${entry}/SKILL.md`,
      upstream: upstreamFor(group),
      loads: relatedSkills(body),
    });
  }

  return skills;
}
