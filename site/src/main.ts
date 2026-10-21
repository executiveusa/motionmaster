/* Motion Master — landing page entry point.
   Stack: Vite + TypeScript (vanilla) + GSAP. No framework, no runtime dep
   other than GSAP. Fonts are self-hosted through @fontsource. */

import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';

import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/responsive.css';

import { initHero } from './modules/hero';
import { initClips } from './modules/clips';
import { initTree } from './modules/tree';
import { initMenu, initMobileBar } from './modules/nav';
import { initRail } from './modules/rail';
import { initReveals } from './modules/reveal';
import { initPricing } from './modules/pricing';

function boot(): void {
  initRail();
  initReveals();
  initHero();
  initClips();
  initTree();
  initMenu();
  initMobileBar();
  initPricing();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
