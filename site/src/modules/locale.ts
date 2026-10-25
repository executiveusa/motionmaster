/* Public page language. English is the source; Mexican Spanish is an opt-in.
   No remote translation services, no fabricated translated prompt content. */
type Locale = 'en' | 'es-MX';
const strings: Record<string, [string, string]> = {
  examples: ['Watch videos', 'Ver videos'],
  makeVideo: ['Create a video', 'Crear un video'],
  library: ['Library', 'Biblioteca'],
  hero: ['Make a video.<br>Keep the source.', 'Crea un video.<br>Conserva el proyecto.'],
  lede: ['Describe the video you need. See real examples, then make your own.', 'Describe el video que necesitas. Mira ejemplos reales y después crea el tuyo.'],
  proofTitle: ['Watch what you can make.', 'Mira lo que puedes crear.'],
  proofLede: ['Play a real video. Copy its prompt, or use it to start your own.', 'Reproduce un video real. Copia las instrucciones o úsalas para crear el tuyo.'],
  fullFilm: ['Watch the full behind-the-scenes film (104 seconds)', 'Ver el video completo del proceso (104 segundos)'],
  footerLine: ['Make a video. Keep the source.', 'Crea un video. Conserva el proyecto.'],
  privateSale: ['Private preview · Not on sale.', 'Vista previa privada · No está a la venta.'],
  consoleTitle: ['Describe your video.', 'Describe tu video.'],
  libraryTitle: ['Find a starting point.', 'Encuentra por dónde empezar.'],
  signInTitle: ['Connect your agent to create videos', 'Conecta tu agente para crear videos'],
  signInButton: ['Connect OpenRouter', 'Conectar OpenRouter'],
  useAgent: ['Connect', 'Conectar'],
  starters: ['Try an example', 'Prueba un ejemplo'],
  create: ['Create', 'Crear'],
  stop: ['Stop', 'Detener'],
  signOut: ['Sign out', 'Cerrar sesión'],
  categories: ['Categories', 'Categorías'],
  clipLaunch: ['Launch title', 'Título de lanzamiento'],
  clipKinetic: ['Kinetic type', 'Tipografía animada'],
  clipProduct: ['Product loop', 'Video de producto en bucle'],
  clipFootage: ['Footage + title', 'Video con título'],
  prompt: ['Prompt', 'Instrucciones'],
  copyPrompt: ['Copy prompt', 'Copiar instrucciones'],
  startPrompt: ['Start from this prompt', 'Crear a partir de este ejemplo'],
  consoleLede: ['Write what you want to make. Your connected agent uses the motion tools to produce the file.', 'Escribe lo que quieres crear. Tu agente conectado usa las herramientas de animación para generar el video.'],
  libraryLede: ['Search real prompts and reusable motion components.', 'Busca instrucciones reales y elementos de animación reutilizables.'],
};
const protectedText = new WeakMap<Element, string>();
export function locale(): Locale {
  return document.documentElement.lang === 'es-MX' ? 'es-MX' : 'en';
}
export function initLocale(): void {
  const selector = document.querySelector<HTMLSelectElement>('[data-locale]');
  const preference = localStorage.getItem('motion-master:locale');
  const defaultLocale: Locale = preference === 'es-MX' ? 'es-MX' : 'en';
  const apply = (lang: Locale): void => {
    document.documentElement.lang = lang;
    if (selector) selector.value = lang;
    for (const [key, pair] of Object.entries(strings)) {
      for (const node of document.querySelectorAll<HTMLElement>(`[data-i18n="${key}"]`)) {
        if (!protectedText.has(node)) protectedText.set(node, node.innerHTML);
        node.innerHTML = lang === 'en' ? protectedText.get(node)! : pair[1];
      }
    }
    document.title = lang === 'en'
      ? 'Motion Master — Make a video. Keep the source.'
      : 'Motion Master — Crea un video. Conserva el proyecto.';
  };
  apply(defaultLocale);
  selector?.addEventListener('change', () => {
    const value: Locale = selector.value === 'es-MX' ? 'es-MX' : 'en';
    localStorage.setItem('motion-master:locale', value);
    apply(value);
  });
}
