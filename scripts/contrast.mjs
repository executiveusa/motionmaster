// WCAG contrast audit against the live page: every visible text node is
// resolved against its effective background and checked at its computed size.
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (m, p = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => rej(new Error('timeout ' + m)), 20000);
    pending.set(i, (v) => {
      clearTimeout(t);
      res(v);
    });
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
};

const expression = `(() => {
  const lum = (r,g,b) => { const f = c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const parse = s => { const m = s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null; const p = m[1].split(',').map(x=>parseFloat(x)); return { r:p[0], g:p[1], b:p[2], a: p.length>3?p[3]:1 }; };
  const over = (fg,bg) => { const a = fg.a; return { r: fg.r*a + bg.r*(1-a), g: fg.g*a + bg.g*(1-a), b: fg.b*a + bg.b*(1-a), a:1 }; };
  const ratio = (a,b) => { const l1 = lum(a.r,a.g,a.b), l2 = lum(b.r,b.g,b.b); const hi=Math.max(l1,l2), lo=Math.min(l1,l2); return (hi+0.05)/(lo+0.05); };
  const bgOf = el => {
    let node = el, acc = null;
    while (node && node !== document.documentElement) {
      const s = getComputedStyle(node);
      const c = parse(s.backgroundColor);
      if (c && c.a > 0) { acc = acc ? over(acc, c) : c; if (acc.a >= 0.999) return acc; }
      node = node.parentElement;
    }
    const root = parse(getComputedStyle(document.body).backgroundColor) || { r:255,g:255,b:255,a:1 };
    return acc ? over(acc, root) : root;
  };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length) continue;
    let hasText = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
    if (!hasText) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.closest('[hidden]')) continue;
    const fg = parse(s.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const c = fg.a < 1 ? over(fg, bg) : fg;
    const size = parseFloat(s.fontSize);
    const weight = Number(s.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3.0 : 4.5;
    const got = ratio(c, bg);
    if (got < need) {
      out.push({
        sel: el.tagName + '.' + (typeof el.className === 'string' ? el.className.split(' ').slice(0,2).join('.') : ''),
        text: el.textContent.trim().slice(0, 44),
        size: Math.round(size), weight, large,
        got: Math.round(got*100)/100, need,
        fg: s.color, bg: 'rgb(' + Math.round(bg.r)+','+Math.round(bg.g)+','+Math.round(bg.b)+')'
      });
    }
  }
  return JSON.stringify(out);
})()`;

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: process.argv[2] ?? 'http://127.0.0.1:4173/' });
await new Promise((r) => setTimeout(r, 2000));

const r = await send('Runtime.evaluate', { expression, returnByValue: true });
const fails = JSON.parse(r.result.value);
if (!fails.length) {
  console.log('CONTRAST OK — every visible text node meets WCAG AA (4.5:1 body, 3:1 large)');
} else {
  console.log(`${fails.length} contrast failure(s):`);
  for (const f of fails) {
    console.log(`  ${f.got}:1 (need ${f.need}) ${f.sel} ${f.size}px/${f.weight} "${f.text}" fg=${f.fg} bg=${f.bg}`);
  }
}
