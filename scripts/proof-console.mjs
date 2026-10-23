/**
 * The console, checked in a real browser.
 *
 * A real agent is running. The page is given a key so the console opens, and
 * the checks are the ones that matter for a surface that is mostly a form:
 *
 *   - the agent is found and the console says so
 *   - the layout does not widen the page at 320, 390, 768 or 1440
 *   - the text in the console clears the contrast floor
 *   - the console can be driven from the keyboard alone
 *
 * Usage: node scripts/proof-console.mjs [url] [agentBase]
 */
const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const agent = process.argv[3] ?? 'http://127.0.0.1:8787';

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    const timer = setTimeout(() => reject(new Error('timeout ' + method)), 25000);
    pending.set(i, (value) => {
      clearTimeout(timer);
      resolve(value);
    });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await new Promise((resolve) => {
  ws.onopen = resolve;
});
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  }
};

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'the page threw');
  }
  return result.result.value;
};

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

await send('Page.enable');
await send('Runtime.enable');

/* Set the key and the agent address before the page runs, so the console
   opens as it would for a signed-in user. */
await send('Page.navigate', { url });
await new Promise((resolve) => setTimeout(resolve, 1500));
await evaluate(
  `localStorage.setItem('openrouter_api_key', 'sk-or-proof');
   localStorage.setItem('motion-master:agent', ${JSON.stringify(agent)});
   'set'`,
);
/* A hash does not reload the page, and the console reads the key when it
   starts, so the page is reloaded rather than re-pointed. */
await send('Page.reload', { ignoreCache: true });
await new Promise((resolve) => setTimeout(resolve, 2500));
await evaluate(`document.querySelector('#console')?.scrollIntoView()`);
await new Promise((resolve) => setTimeout(resolve, 400));

/* ---------------------------------------------------------- the agent row */

const agentState = await evaluate(
  `(() => {
     const state = document.querySelector('[data-console-agent-state]');
     const dot = document.querySelector('[data-console-agent-dot]');
     return { text: state ? state.textContent : null, on: dot ? dot.classList.contains('console__agent-dot--on') : false };
   })()`,
);
check(
  'the console finds the agent',
  agentState.on && /agent connected/.test(agentState.text ?? ''),
  agentState.text ?? 'no state',
);

const formVisible = await evaluate(
  `(() => {
     const form = document.querySelector('[data-console-form]');
     const gate = document.querySelector('[data-console-gate]');
     return { form: form ? !form.hidden : false, gate: gate ? !gate.hidden : false };
   })()`,
);
check('the console opens when signed in', formVisible.form, JSON.stringify(formVisible));

/* ------------------------------------------------------------- the layout */

for (const width of [320, 390, 768, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await send('Page.navigate', { url: `${url}#console` });
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const overflow = await evaluate(
    `(() => {
       const doc = document.documentElement;
       const wide = [];
       for (const node of document.querySelectorAll('body *')) {
         const rect = node.getBoundingClientRect();
         if (rect.width === 0) continue;
         if (rect.right > doc.clientWidth + 1 || rect.left < -1) {
           let scrollable = false;
           for (let p = node.parentElement; p; p = p.parentElement) {
             const style = getComputedStyle(p);
             if (style.overflowX === 'auto' || style.overflowX === 'scroll') { scrollable = true; break; }
           }
           if (!scrollable) wide.push(node.className || node.tagName);
         }
       }
       return { scroll: doc.scrollWidth, client: doc.clientWidth, wide: wide.slice(0, 6) };
     })()`,
  );
  check(
    `nothing widens the page at ${width}px`,
    overflow.scroll <= overflow.client + 1 && overflow.wide.length === 0,
    `scroll ${overflow.scroll} / client ${overflow.client} ${overflow.wide.join(', ')}`,
  );
}

/* ------------------------------------------------------------- the contrast */

await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: `${url}#console` });
await new Promise((resolve) => setTimeout(resolve, 2000));

const contrast = await evaluate(
  `(() => {
     const lum = (rgb) => {
       const [r, g, b] = rgb.map((v) => {
         const s = v / 255;
         return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
       });
       return 0.2126 * r + 0.7152 * g + 0.0722 * b;
     };
     const parse = (value) => {
       const m = value.match(/rgba?\\(([^)]+)\\)/);
       if (!m) return null;
       const parts = m[1].split(',').map((n) => parseFloat(n));
       if (parts.length > 3 && parts[3] === 0) return null;
       return parts.slice(0, 3);
     };
     const backgroundOf = (node) => {
       let el = node;
       while (el) {
         const bg = parse(getComputedStyle(el).backgroundColor);
         if (bg) return bg;
         el = el.parentElement;
       }
       return [0, 0, 0];
     };
     const bad = [];
     const scope = document.querySelector('.console');
     if (!scope) return { bad: ['no console'], checked: 0 };
     for (const node of scope.querySelectorAll('*')) {
       const text = Array.from(node.childNodes)
         .filter((n) => n.nodeType === 3)
         .map((n) => n.textContent.trim())
         .join(' ')
         .trim();
       if (!text) continue;
       const style = getComputedStyle(node);
       if (style.visibility === 'hidden' || style.display === 'none') continue;
       if (style.visibility === 'hidden') continue;
       const rect = node.getBoundingClientRect();
       if (rect.width === 0 || rect.height === 0) continue;
       const fg = parse(style.color);
       if (!fg) continue;
       const bg = backgroundOf(node);
       const l1 = lum(fg), l2 = lum(bg);
       const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
       const size = parseFloat(style.fontSize);
       const bold = Number(style.fontWeight) >= 700;
       const large = size >= 24 || (size >= 18.66 && bold);
       const need = large ? 3 : 4.5;
       if (ratio < need) {
         bad.push({ text: text.slice(0, 40), ratio: Math.round(ratio * 100) / 100, need, size });
       }
     }
     return { bad, checked: scope.querySelectorAll('*').length };
   })()`,
);
check(
  'the console text clears the contrast floor',
  contrast.bad.length === 0,
  contrast.bad.length ? JSON.stringify(contrast.bad.slice(0, 5)) : `${contrast.checked} nodes`,
);

/* ------------------------------------------------------------- the keyboard */

/* ------------------------------------------------- the disconnected state */

await evaluate(
  `localStorage.setItem('motion-master:agent', 'http://127.0.0.1:8799');
   'set'`,
);
await send('Page.reload', { ignoreCache: true });
await new Promise((resolve) => setTimeout(resolve, 2200));
const offline = await evaluate(
  `(() => {
     const state = document.querySelector('[data-console-agent-state]');
     const dot = document.querySelector('[data-console-agent-dot]');
     const doc = document.documentElement;
     return {
       text: state ? state.textContent : '',
       off: dot ? dot.classList.contains('console__agent-dot--off') : false,
       scroll: doc.scrollWidth,
       client: doc.clientWidth,
     };
   })()`,
);
check(
  'the console says plainly when there is no agent',
  offline.off && /no agent/.test(offline.text),
  offline.text,
);
check(
  'the disconnected state does not widen the page',
  offline.scroll <= offline.client + 1,
  `scroll ${offline.scroll} / client ${offline.client}`,
);

/* The disconnected message is the longest text in the console, so it is the
   one that has to survive the narrowest screen. */
await send('Emulation.setDeviceMetricsOverride', {
  width: 320,
  height: 900,
  deviceScaleFactor: 1,
  mobile: true,
});
await new Promise((resolve) => setTimeout(resolve, 500));
const narrowOffline = await evaluate(
  `(() => {
     const doc = document.documentElement;
     const wide = [];
     for (const node of document.querySelectorAll('body *')) {
       const rect = node.getBoundingClientRect();
       if (rect.width === 0) continue;
       if (rect.right > doc.clientWidth + 1) {
         let scrollable = false;
         for (let p = node.parentElement; p; p = p.parentElement) {
           const style = getComputedStyle(p);
           if (style.overflowX === 'auto' || style.overflowX === 'scroll') { scrollable = true; break; }
         }
         if (!scrollable) wide.push(node.className || node.tagName);
       }
     }
     return { scroll: doc.scrollWidth, client: doc.clientWidth, wide: wide.slice(0, 5) };
   })()`,
);
check(
  'the disconnected message fits 320px',
  narrowOffline.scroll <= narrowOffline.client + 1 && narrowOffline.wide.length === 0,
  `scroll ${narrowOffline.scroll} / client ${narrowOffline.client} ${narrowOffline.wide.join(', ')}`,
);

await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

await evaluate(
  `localStorage.setItem('motion-master:agent', ${JSON.stringify(agent)});
   'set'`,
);
await send('Page.reload', { ignoreCache: true });
await new Promise((resolve) => setTimeout(resolve, 2000));

const keyboard = await evaluate(
  `(() => {
     const input = document.querySelector('[data-console-input]');
     if (!input) return { ok: false, why: 'no input' };
     input.focus();
     const focused = document.activeElement === input;
     return { ok: focused, tag: document.activeElement ? document.activeElement.tagName : null };
   })()`,
);
check('the brief field takes the keyboard', keyboard.ok, JSON.stringify(keyboard));

const tabOrder = await evaluate(
  `(() => {
     const focusable = Array.from(
       document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'),
     ).filter((node) => {
       const rect = node.getBoundingClientRect();
       const style = getComputedStyle(node);
       return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
     });
     const noName = focusable.filter((node) => {
       const text = (node.textContent || '').trim();
       const label = node.getAttribute('aria-label') || '';
       const title = node.getAttribute('title') || '';
       const id = node.getAttribute('id');
       const hasLabel = id && document.querySelector('label[for="' + id + '"]');
       // A label that wraps the control names it too.
       const wrapped = node.closest('label');
       return !text && !label && !title && !hasLabel && !wrapped;
     });
     return { total: focusable.length, unnamed: noName.map((n) => n.className || n.tagName) };
   })()`,
);
check(
  'every control has a name',
  tabOrder.unnamed.length === 0,
  `${tabOrder.total} controls, unnamed: ${tabOrder.unnamed.join(', ') || 'none'}`,
);

console.log(`\n${failures === 0 ? 'all console checks passed' : `${failures} console check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
