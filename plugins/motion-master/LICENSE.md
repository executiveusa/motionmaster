# Licences — Motion Master plugin

This directory contains two different kinds of work. They are licensed
separately and the split is deliberate.

---

## 1. The Motion Master layer — proprietary

The files written for Motion Master itself are proprietary and are sold as a
**paid, one-time licence** (Solo $99, Studio $399 — one payment, no
subscription).

| Path | Licence |
| --- | --- |
| `plugin.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `mcp.json`, `.mcp.json` | proprietary |
| `assets/motion-tokens.json`, `assets/brand.json` | proprietary |
| `skills/motion-master/**` (the router and its `references/`) | proprietary |
| `skills/<upstream>/**` | **MIT**, unchanged — see below |

The licence key is delivered by email after checkout.

Motion Master does not run a hosted render service. Compositions are rendered
on the buyer's own machine with Remotion, and real footage is mixed by a
Montage instance the buyer runs themselves.

---

## 2. The bundled upstream skills — MIT, unchanged

Every upstream skill keeps its original MIT licence and its original
attribution. Nothing upstream has been relicensed, and no upstream file has
been edited in a way that changes its licence or its copyright notice.

| Skill(s) | Upstream | Copyright | Licence |
| --- | --- | --- | --- |
| `skills/motion-design/**` | LottieFiles `motion-design` skill | © LottieFiles | MIT |
| `skills/gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-utils`, `gsap-plugins`, `gsap-react`, `gsap-frameworks`, `gsap-performance` | GreenSock — the official GSAP skills | © GreenSock / Webflow, Inc. | MIT |
| `skills/remotion-create`, `remotion-markup`, `remotion-render`, `remotion-studio`, `remotion-captions`, `remotion-interactivity`, `remotion-maps`, `remotion-multimedia`, `remotion-docs`, `remotion-saas`, `remotion-upgrade` | Remotion — the official Remotion skills | © Remotion (remotion.dev) | MIT |

Each upstream `SKILL.md` still carries its own `license: MIT` frontmatter
(where the upstream used that key) and its own attribution lines. The MIT
licence text of each upstream project is reproduced by that project's own
repository; the notices below are the attribution this package carries.

> The MIT Licence (MIT)
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

---

## 3. The Montage bridge is not in this package

`bridge/` lives outside `plugins/` on purpose. It is a separate **AGPL-3.0-only**
work because it is the component that talks to an AGPL interface. This plugin
does not contain, import or vendor any part of it. See
`docs/05-MONTAGE-INTEGRATION.md` for the boundary and its reason.
