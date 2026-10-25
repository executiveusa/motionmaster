/* Motion Master — landing page entry point.
   Stack: Vite + TypeScript (vanilla), no framework. GSAP and its ScrollTrigger
   plugin drive the scroll scenes and the section entrances; both are bundled
   from npm and served from this origin, so the page makes no external
   requests. Fonts are self-hosted through @fontsource. */

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
import './styles/scenes.css';
import './styles/responsive.css';

import { initClips } from './modules/clips';
import { initFilm } from './modules/film';
import { initTree } from './modules/tree';
import { initMenu, initMobileBar } from './modules/nav';
import { initRail } from './modules/rail';
import { initMotion } from './modules/motion';
import { initScenes } from './modules/scenes';
import { initPricing } from './modules/pricing';
import { initLibrary } from './modules/library';
import { initSound } from './modules/sound';
import { initConsole } from './modules/chat';
import { initLocale } from './modules/locale';
import { initProjectEditor } from './modules/project-editor';
import './styles/simplified.css';
import './styles/project-editor.css';

function boot(): void {
  initRail();
  initMotion();
  initScenes();
  initFilm();
  initClips();
  initTree();
  initMenu();
  initMobileBar();
  initPricing();
  initLibrary();
  initSound();
  initConsole();
  initProjectEditor();
  initLocale();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
