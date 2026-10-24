/* Motion Master — landing page entry point.
   Stack: Vite + TypeScript (vanilla). No framework, no runtime dependency at
   all: the hero is a rendered video, not a live animation, so the page ships
   zero JavaScript beyond this entry point. Fonts are self-hosted through
   @fontsource. */

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

import { initClips } from './modules/clips';
import { initFilm } from './modules/film';
import { initTree } from './modules/tree';
import { initMenu, initMobileBar } from './modules/nav';
import { initRail } from './modules/rail';
import { initReveals } from './modules/reveal';
import { initPricing } from './modules/pricing';
import { initLibrary } from './modules/library';
import { initSound } from './modules/sound';
import { initConsole } from './modules/chat';

function boot(): void {
  initRail();
  initReveals();
  initFilm();
  initClips();
  initTree();
  initMenu();
  initMobileBar();
  initPricing();
  initLibrary();
  initSound();
  initConsole();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
