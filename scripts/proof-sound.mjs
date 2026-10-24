/**
 * The sound section, checked in a real browser.
 *
 * The shelf has to work for a person: the buttons have to lead to sounds,
 * a sound has to play, and the section has to hold its layout on a narrow
 * screen. This runs against the deployed page.
 *
 * Usage: node scripts/proof-sound.mjs [url]
 */
const url = process.argv[2] ?? 'http://127.0.0.1:4173/';

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const audioRequests = [];
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
    return;
  }
  if (
    message.method === 'Network.responseReceived' &&
    message.params.response.url.includes('/sfx/') &&
    !message.params.response.url.includes('/sfx.json')
  ) {
    audioRequests.push(`${message.params.response.status} ${message.params.response.url.split('/').pop()}`);
  }
};

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'the page threw');
  return result.result.value;
};

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

await send('Page.navigate', { url: `${url}#sound` });
await new Promise((resolve) => setTimeout(resolve, 3000));
await evaluate(`document.querySelector('#sound')?.scrollIntoView()`);
await new Promise((resolve) => setTimeout(resolve, 900));

/* ------------------------------------------------------------- the shelf */

const kinds = await evaluate(
  `document.querySelectorAll('[data-sfx-kinds] .sfx__kind-button').length`,
);
check('the kind buttons are there', kinds > 20, `${kinds} buttons`);

const rows = await evaluate(`document.querySelectorAll('[data-sfx-list] .sfx').length`);
check('the shelf has sounds on it', rows > 10, `${rows} rows`);

const count = await evaluate(`document.querySelector('[data-sfx-count]')?.textContent ?? ''`);
check('the shelf says how many there are', /\d+ of \d+/.test(count), count);

/* ---------------------------------------------------------- the buttons */

const firstKind = await evaluate(
  `(() => {
     const buttons = Array.from(document.querySelectorAll('[data-sfx-kinds] .sfx__kind-button'));
     const whoosh = buttons.find((b) => b.textContent.startsWith('whoosh'));
     if (!whoosh) return null;
     whoosh.click();
     return whoosh.textContent;
   })()`,
);
await new Promise((resolve) => setTimeout(resolve, 600));
const afterKind = await evaluate(`document.querySelector('[data-sfx-count]')?.textContent ?? ''`);
check(
  'a kind button leads to its sounds',
  Boolean(firstKind) && /^\d+ of \d+/.test(afterKind) && !afterKind.startsWith('1470 of 1470'),
  `${firstKind} → ${afterKind}`,
);

const allKinds = await evaluate(
  `(() => {
     const buttons = Array.from(document.querySelectorAll('[data-sfx-kinds] .sfx__kind-button'));
     return buttons.length;
   })()`,
);
let emptyKinds = [];
for (let i = 1; i < allKinds; i += 1) {
  const result = await evaluate(
    `(() => {
       const buttons = Array.from(document.querySelectorAll('[data-sfx-kinds] .sfx__kind-button'));
       buttons[${i}].click();
       return buttons[${i}].textContent;
     })()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 120));
  const n = await evaluate(
    `Number((document.querySelector('[data-sfx-count]')?.textContent ?? '0').split(' ')[0])`,
  );
  if (n === 0) emptyKinds.push(result);
}
check('no kind button leads to nothing', emptyKinds.length === 0, emptyKinds.join(', '));

/* ------------------------------------------------------------ the search */

// Back to everything: the kind loop above left the last kind selected.
await evaluate(
  `(() => {
     const buttons = Array.from(document.querySelectorAll('[data-sfx-kinds] .sfx__kind-button'));
     buttons[0].click();
     return true;
   })()`,
);
await new Promise((resolve) => setTimeout(resolve, 300));

await evaluate(
  `(() => {
     const input = document.querySelector('[data-sfx-search]');
     input.value = 'a short bright pop for a button';
     input.dispatchEvent(new Event('input', { bubbles: true }));
     return true;
   })()`,
);
await new Promise((resolve) => setTimeout(resolve, 500));
const searched = await evaluate(
  `(() => {
     const rows = Array.from(document.querySelectorAll('[data-sfx-list] .sfx'));
     return {
       count: document.querySelector('[data-sfx-count]')?.textContent ?? '',
       kinds: rows.slice(0, 5).map((r) => r.querySelector('.sfx__kind')?.textContent ?? ''),
     };
   })()`,
);
check(
  'a plain question finds sounds',
  Number(searched.count.split(' ')[0]) > 0,
  searched.count,
);
check(
  'the closest sounds are the kind that was asked for',
  searched.kinds.some((k) => k === 'pop'),
  searched.kinds.join(', '),
);

/* ------------------------------------------------------------ the playing */

await evaluate(`document.querySelector('[data-sfx-search]').value = ''`);
await evaluate(
  `(() => {
     const input = document.querySelector('[data-sfx-search]');
     input.dispatchEvent(new Event('input', { bubbles: true }));
     return true;
   })()`,
);
await new Promise((resolve) => setTimeout(resolve, 400));
await evaluate(`document.querySelector('[data-sfx-play]').click()`);
await new Promise((resolve) => setTimeout(resolve, 1600));
check(
  'a sound plays and its file is fetched',
  audioRequests.length > 0 && /^20[06]/.test(audioRequests[0]),
  audioRequests.join(', '),
);

/* ---------------------------------------------------------- the copying */

const copied = await evaluate(
  `(() => {
     const button = document.querySelector('.sfx__copy');
     button.click();
     return true;
   })()`,
);
await new Promise((resolve) => setTimeout(resolve, 500));
const copyLabel = await evaluate(`document.querySelector('.sfx__copy')?.textContent ?? ''`);
check('the copy button copies the id', copyLabel === 'copied', copyLabel);

/* ------------------------------------------------------------- the layout */

for (const width of [320, 390, 768, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await new Promise((resolve) => setTimeout(resolve, 700));
  const overflow = await evaluate(
    `(() => {
       const doc = document.documentElement;
       const wide = [];
       for (const node of document.querySelectorAll('#sound *')) {
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
    `the sound section holds its layout at ${width}px`,
    overflow.scroll <= overflow.client + 1 && overflow.wide.length === 0,
    `scroll ${overflow.scroll} / client ${overflow.client} ${overflow.wide.join(', ')}`,
  );
}

/* --------------------------------------------------------- the contrast */

await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await new Promise((resolve) => setTimeout(resolve, 600));

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
       return [255, 255, 255];
     };
     const bad = [];
     const scope = document.querySelector('#sound');
     for (const node of scope.querySelectorAll('*')) {
       const text = Array.from(node.childNodes)
         .filter((n) => n.nodeType === 3)
         .map((n) => n.textContent.trim())
         .join(' ')
         .trim();
       if (!text) continue;
       const style = getComputedStyle(node);
       if (style.visibility === 'hidden' || style.display === 'none') continue;
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
       if (ratio < need) bad.push({ text: text.slice(0, 40), ratio: Math.round(ratio * 100) / 100, need });
     }
     return bad;
   })()`,
);
check(
  'the sound section clears the contrast floor',
  contrast.length === 0,
  contrast.length ? JSON.stringify(contrast.slice(0, 5)) : '',
);

/* ------------------------------------------------------------ the naming */

const names = await evaluate(
  `(() => {
     const focusable = Array.from(
       document.querySelectorAll('#sound a[href], #sound button, #sound input, #sound select'),
     ).filter((node) => {
       const rect = node.getBoundingClientRect();
       const style = getComputedStyle(node);
       return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
     });
     const unnamed = focusable.filter((node) => {
       const text = (node.textContent || '').trim();
       const label = node.getAttribute('aria-label') || '';
       const id = node.getAttribute('id');
       const hasLabel = id && document.querySelector('#sound label[for="' + id + '"]');
       return !text && !label && !hasLabel;
     });
     return { total: focusable.length, unnamed: unnamed.map((n) => n.className || n.tagName) };
   })()`,
);
check(
  'every control in the sound section has a name',
  names.unnamed.length === 0,
  `${names.total} controls, unnamed: ${names.unnamed.join(', ') || 'none'}`,
);

console.log(`\n${failures === 0 ? 'all sound checks passed' : `${failures} sound check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
