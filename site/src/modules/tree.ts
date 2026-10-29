import { qs, qsa } from '../lib/dom';

interface Node {
  label: string;
  text: string;
}

const NODES: Record<string, Node> = {
  'motion-master': {
    label: 'motion-master/',
    text:
      'The package root. One folder, one licence, one install — the same files load into every host that supports plugins.',
  },
  skills: {
    label: 'skills/',
    text:
      'Thirty-eight motion skills: the LottieFiles motion-design doctrine, the official GreenSock GSAP and Remotion packs, the motionmaxxing craft law with its measured gates, sixty complete film styles, and libraries for launch films, canvas animation and a 637-technique catalogue. Each keeps its own licence and attribution. The agent loads the two or three a brief actually needs.',
  },
  'motion-design': {
    label: 'skills/motion-design/',
    text:
      'The motion doctrine the agent reads before it animates anything: duration tables, easing roles, stagger budgets, and the anti-slop rules the rest of the pack points back to.',
  },
  'remotion-markup': {
    label: 'skills/remotion-markup/',
    text:
      'Compositions, timing and typography — how a brief becomes a frame layout, which type scale it uses, and where the accent is allowed to appear.',
  },
  'remotion-render': {
    label: 'skills/remotion-render/',
    text:
      'Render and codec settings: the composition is rendered locally, encoded to a real video file, and handed back as a file you own.',
  },
  'gsap-timeline': {
    label: 'skills/gsap-timeline/',
    text:
      'Sequencing and position parameters — the choreography layer: tween order, stagger budgets, and the easing role each movement is allowed to use.',
  },
  'more-skills': {
    label: 'skills/ — 37 more',
    text:
      'Remotion captions, multimedia, interactivity and rendering, the GSAP core, plugins and utilities, plus the craft law, the film-style library and the technique catalogue. Forty-two in total, every one licensed and attributed.',
  },
  tokens: {
    label: 'tokens/',
    text:
      'Springs, easings and durations in one file. The agent pulls the number from the token set instead of inventing a duration, which is why the motion feels the same in every video.',
  },
  starters: {
    label: 'starters/',
    text:
      'Four working scene starters — showreel, title, launch and changelog — so the first video is a known shape rather than a blank composition.',
  },
  plugin: {
    label: 'plugin.json',
    text:
      'The portable manifest. The same package installs into ChatGPT, Codex, Claude and Cursor, and into the other hosts that read the same manifest.',
  },
  mcp: {
    label: 'mcp.json',
    text:
      'One URL, sixteen hosts. The MCP server is the tool surface — skills, tokens, the storyboard planner, the composition builder — and it is reached the same way everywhere.',
  },
};

const INSTALL_COMMANDS: Record<string, string> = {
  ChatGPT:
    'Settings > Apps > Advanced > Create app > paste the MCP URL from your licence email.',
  Codex:
    'codex plugin marketplace add <owner>/<repo>\ncodex plugin install motion-master',
  Claude:
    '/plugin marketplace add <owner>/<repo>\n/plugin install motion-master@<market>',
  Cursor: 'Add the plugin directory, then point Cursor at the same MCP URL.',
};

/**
 * The package tree is a tab list: one detail panel, keyboard navigable, and
 * never hover-only.
 */
export function initTree(): void {
  const list = qs<HTMLElement>('.tree__list');
  const panel = qs<HTMLElement>('[data-tree-detail]');
  if (!list || !panel) return;

  const label = qs<HTMLElement>('[data-tree-detail-label]', panel);
  const text = qs<HTMLElement>('[data-tree-detail-text]', panel);
  const rows = qsa<HTMLButtonElement>('[data-tree-node]', list);

  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-orientation', 'vertical');
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('tabindex', '0');

  const select = (row: HTMLButtonElement, focus = false) => {
    const id = row.dataset.treeNode ?? '';
    const node = NODES[id];
    if (!node) return;
    for (const other of rows) {
      const active = other === row;
      other.setAttribute('role', 'tab');
      other.setAttribute('aria-selected', active ? 'true' : 'false');
      other.setAttribute('aria-controls', 'tree-panel');
      other.tabIndex = active ? 0 : -1;
      if (active) {
        other.setAttribute('id', `tree-tab-${id}`);
      } else {
        other.removeAttribute('id');
      }
    }
    if (label) label.textContent = node.label;
    if (text) text.textContent = node.text;
    panel.setAttribute('aria-labelledby', `tree-tab-${id}`);
    if (focus) row.focus();
  };

  rows.forEach((row, index) => {
    row.removeAttribute('aria-expanded');
    row.addEventListener('click', () => select(row));
    row.addEventListener('keydown', (event) => {
      const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowDown') next = (index + 1) % rows.length;
      if (event.key === 'ArrowUp') next = (index - 1 + rows.length) % rows.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = rows.length - 1;
      select(rows[next], true);
    });
  });

  const first = rows.find((row) => row.dataset.treeNode === 'motion-design') ?? rows[0];
  if (first) select(first);
  panel.id = 'tree-panel';

  const commandBox = qs<HTMLElement>('[data-install-command]');
  const commandText = qs<HTMLElement>('[data-install-command-text]');
  for (const button of qsa<HTMLButtonElement>('[data-install]')) {
    button.addEventListener('click', () => {
      const host = button.dataset.install ?? '';
      const command = INSTALL_COMMANDS[host];
      if (!command || !commandBox || !commandText) return;
      commandText.textContent = command;
      commandBox.hidden = false;
      button.setAttribute('aria-expanded', 'true');
    });
  }
}
