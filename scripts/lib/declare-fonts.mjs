/**
 * Declare the font families a composition names but does not declare.
 *
 * The renderer resolves a family from its own list. Anything else falls back
 * to a generic font and the typography is quietly wrong — which is the kind
 * of failure nobody sees until the film is done.
 *
 * These compositions name CJK system fonts. The honest declaration for a
 * system font is a `@font-face` with `src: local(...)`, which is what the
 * gate asks for: it tells the renderer where the family is without pretending
 * to ship a file we do not have.
 *
 *   declareFonts(html) → { html, declared }
 */
const FONT_STACK = /font-family\s*:\s*([^;{}]+)/g;

const GENERIC = /^(sans-serif|serif|monospace|system-ui|-apple-system|inherit|initial|unset|cursive|fantasy|emoji|math|fangsong)$/i;

export function undeclaredFamilies(html) {
  const declared = new Set(
    [...html.matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*['"]([^'"]+)['"]/g)].map((m) =>
      m[1].toLowerCase(),
    ),
  );
  const families = new Set();
  for (const match of html.matchAll(FONT_STACK)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().replace(/^['"]|['"]$/g, "");
      if (!name || GENERIC.test(name)) continue;
      if (declared.has(name.toLowerCase())) continue;
      families.add(name);
    }
  }
  return [...families];
}

export function declareFonts(html) {
  const families = undeclaredFamilies(html);
  if (!families.length) return { html, declared: [] };
  const faces = families
    .map((family) => `      @font-face { font-family: '${family}'; src: local('${family.replace(/'/g, "\\'")}'); }`)
    .join("\n");
  return { html: html.replace(/<style>/, `<style>\n${faces}`), declared: families };
}
