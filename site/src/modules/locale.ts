/* Public page language. English is the source; Mexican Spanish is an opt-in.
   No remote translation services, no fabricated translated prompt content. */
type Locale = 'en' | 'es-MX';
const strings: Record<string, [string, string]> = {
  examples: ['Examples', 'Ejemplos'],
  makeVideo: ['Create a video', 'Crear un video'],
  createNav: ['Create', 'Crear'],
  agentsNav: ['MCP / Plugins', 'MCP / Plugins'],
  docsNav: ['Docs', 'Guía'],
  signInNav: ['Sign in', 'Iniciar sesión'],
  startCreating: ['Start Creating', 'Empezar a crear'],
  browseExamples: ['Browse Examples', 'Explorar ejemplos'],
  watchDemo: ['Watch Demo', 'Ver demo'],
  library: ['Library', 'Biblioteca'],
  hero: ['<span class="hero__line">Create Motion </span><span class="hero__line">Videos For Your </span><span class="hero__line">Brand Today</span>', '<span class="hero__line">Crea videos de </span><span class="hero__line">motion para tu </span><span class="hero__line">marca hoy</span>'],
  lede: ['Browse real motion examples, start from one, then edit and export your own.', 'Explora ejemplos reales de motion, empieza con uno y después edita y exporta el tuyo.'],
  proofTitle: ['Start with real motion.', 'Empieza con motion real.'],
  proofLede: ['Search the examples. Play one. Copy its prompt or use it as your starting point.', 'Busca entre los ejemplos. Reproduce uno. Copia su prompt o úsalo como punto de partida.'],
  fullFilm: ['Watch the full behind-the-scenes film (104 seconds)', 'Ver el video completo del proceso (104 segundos)'],
  footerLine: ['Make a video. Keep the source.', 'Crea un video. Conserva el proyecto.'],
  privateSale: ['Private preview · Not on sale.', 'Vista previa privada · No está a la venta.'],
  consoleTitle: ['Create from an example or a brief.', 'Crea desde un ejemplo o una descripción.'],
  libraryTitle: ['Prompt & skill library.', 'Biblioteca de prompts y skills.'],
  signInTitle: ['Connect your agent to create videos', 'Conecta tu agente para crear videos'],
  signInButton: ['Connect OpenRouter', 'Conectar OpenRouter'],
  useAgent: ['Connect', 'Conectar'],
  starters: ['Try an example', 'Prueba un ejemplo'],
  create: ['Create', 'Crear'],
  enhanceAction: ['Improve prompt', 'Mejorar prompt'],
  enhanceProviderLabel: ['Prompt enhancement provider', 'Proveedor para mejorar prompts'],
  enhanceTitle: ['Suggested motion brief', 'Descripción de motion sugerida'],
  enhanceDisclaimer: ['Review the suggestion before using it. Your original is unchanged.', 'Revisa la sugerencia antes de usarla. Tu texto original no cambia.'],
  enhanceUse: ['Use this brief', 'Usar esta descripción'],
  enhanceDismiss: ['Keep original', 'Conservar original'],
  stop: ['Stop', 'Detener'],
  signOut: ['Sign out', 'Cerrar sesión'],
  categories: ['Categories', 'Categorías'],
  clipLaunch: ['Launch title', 'Título de lanzamiento'],
  clipKinetic: ['Kinetic type', 'Tipografía animada'],
  clipProduct: ['Product loop', 'Video de producto en bucle'],
  clipFootage: ['Footage + title', 'Video con título'],
  prompt: ['Prompt', 'Prompt original en inglés'],
  copyPrompt: ['Copy prompt', 'Copiar prompt original'],
  startPrompt: ['Start from this prompt', 'Crear con este prompt'],
  consoleLede: ['Start with a prompt above or describe what you need. The same Motion Master tools plan, render and return the file.', 'Empieza con un prompt de arriba o describe lo que necesitas. Las mismas herramientas de Motion Master planean, generan y devuelven el archivo.'],
  libraryLede: ['Search the reusable prompts, techniques and motion blocks that the human interface and agent use.', 'Busca los prompts, técnicas y bloques de motion reutilizables que usan la interfaz y el agente.'],
  searchExamples: ['Search examples', 'Buscar ejemplos'],
  searchExamplesPlaceholder: ['Search motion examples, prompts, or skills', 'Buscar ejemplos, prompts o skills de motion'],
  filterAll: ['All', 'Todos'],
  agentsTitle: ['Use the same product from Claude, Codex or MCP.', 'Usa el mismo producto desde Claude, Codex o MCP.'],
  agentsLede: ['Human UI and agent clients share the same Motion Master tools and project state. The private preview does not fake a hosted agent connection.', 'La interfaz humana y los clientes de agente comparten las mismas herramientas y el mismo estado del proyecto. La vista privada no simula una conexión alojada.'],
  claudeBody: ['The repository ships a Claude plugin manifest and the Motion Master skills.', 'El repositorio incluye un manifiesto para Claude y las skills de Motion Master.'],
  codexBody: ['The repository ships a Codex / ChatGPT plugin manifest that points to the same skills and MCP server.', 'El repositorio incluye un manifiesto para Codex / ChatGPT que usa las mismas skills y el mismo servidor MCP.'],
  mcpBody: ['Run the private Motion Master server locally, then connect any compatible client to this endpoint.', 'Ejecuta el servidor privado de Motion Master y conecta cualquier cliente compatible a este endpoint.'],
  copyEndpoint: ['Copy endpoint', 'Copiar endpoint'],
  docsTitle: ['Private quickstart', 'Inicio rápido privado'],
  docsOne: ['Run the Motion Master server and worker on the owner-controlled machine.', 'Ejecuta el servidor y el worker de Motion Master en el equipo controlado por el propietario.'],
  docsTwo: ['Connect the browser, Claude, Codex or another MCP client to the same server.', 'Conecta el navegador, Claude, Codex u otro cliente MCP al mismo servidor.'],
  docsThree: ['Create, edit, render, export and reopen the same saved project.', 'Crea, edita, genera, exporta y vuelve a abrir el mismo proyecto guardado.'],
  docsNote: ['This preview is not on sale and does not claim a public hosted render service.', 'Esta vista previa no está a la venta y no afirma ofrecer un servicio público de generación alojada.'],
    editorSummary: ['Edit a saved video', 'Editar un video guardado'],
  editorIntro: ['Private workspace. Connect your own running agent to create, edit and export a video. Nothing is published.', 'Espacio privado. Conecta tu agente para crear, editar y exportar videos. No se publica nada.'],
  editorServer: ['Private agent address', 'Dirección del agente privado'],
  editorKey: ['Private access key (kept only until this page closes)', 'Clave de acceso privada (solo durante esta sesión)'],
  editorConnect: ['Open workspace', 'Abrir espacio de trabajo'],
  editorProjects: ['Saved projects', 'Proyectos guardados'],
  editorOpen: ['Open project', 'Abrir proyecto'],
  editorRefresh: ['Refresh', 'Actualizar'],
  editorNewButton: ['New video', 'Nuevo video'],
  editorChange: ['Change connection', 'Cambiar conexión'],
  editorNew: ['New lower-third video', 'Nuevo video con rótulo inferior'],
  editorTitle: ['Project title', 'Título del proyecto'],
  editorBrief: ['Video brief', 'Descripción del video'],
  editorText: ['On-screen text', 'Texto en pantalla'],
  editorCreate: ['Create editable video', 'Crear video editable'],
  editorEdit: ['Edit this video', 'Editar este video'],
  editorDuration: ['Duration (seconds)', 'Duración (segundos)'],
  editorSave: ['Save changes', 'Guardar cambios'],
  editorRender: ['Render saved version', 'Generar versión guardada'],
  editorCancel: ['Cancel render', 'Cancelar generación'],
  editorColor: ['Color', 'Color'],
  editorDownload: ['Download MP4', 'Descargar MP4'],
  editorSource: ['Export editable source', 'Exportar proyecto editable'],
  editorImportButton: ['Import source', 'Importar proyecto'],
  editorImportTitle: ['Import an editable project', 'Importar un proyecto editable'],
  editorImportIntro: ['Choose a Motion Master .json.gz export. Import creates a new private project; source assets require review before reuse.', 'Elige un archivo .json.gz exportado de Motion Master. Se creará un proyecto privado nuevo; revisa los recursos antes de reutilizarlos.'],
  editorImportFile: ['Source archive (.json.gz)', 'Archivo de proyecto (.json.gz)'],
  editorImportSubmit: ['Import and open', 'Importar y abrir'],
  editorImported: ['Source imported as a new private project. Review its assets before rendering.', 'Proyecto importado como nuevo proyecto privado. Revisa sus recursos antes de generar el video.'],
  editorImportError: ['The source archive was rejected. Choose a valid Motion Master .json.gz export.', 'No se aceptó el archivo. Elige un .json.gz válido exportado de Motion Master.'],
  editorImportSize: ['Source archive exceeds the 64 MB upload limit.', 'El archivo supera el límite de carga de 64 MB.'],
  editorReady: ['Connected to private workspace.', 'Conectado al espacio privado.'],
  editorOffline: ['Cannot connect. Check the address, key and server CORS settings.', 'No se pudo conectar. Revisa la dirección, la clave y la configuración de acceso del servidor.'],
  editorChoose: ['Select a saved project or create a lower-third video.', 'Selecciona un proyecto guardado o crea un video con rótulo inferior.'],
  editorLoaded: ['Project reopened. Edit the fields below.', 'Proyecto abierto. Edita los campos de abajo.'],
  editorCreated: ['Project created. Save or render when ready.', 'Proyecto creado. Guárdalo o genera el video cuando esté listo.'],
  editorSaved: ['Changes saved as a new revision.', 'Cambios guardados como una nueva versión.'],
  editorConflict: ['This project changed elsewhere. Reopen before editing.', 'Este proyecto cambió en otra sesión. Ábrelo de nuevo antes de editar.'],
  editorQueued: ['Render queued. The private worker must be running.', 'Video en espera. El motor privado debe estar funcionando.'],
  editorWorking: ['Rendering your video…', 'Generando tu video…'],
  editorComplete: ['Video ready. Watch or download it.', 'Video listo. Reprodúcelo o descárgalo.'],
  editorFailed: ['The render stopped. Select Render saved version to retry without creating another job.', 'Se detuvo la generación. Selecciona Generar versión guardada para reintentar sin crear otro trabajo.'],
  editorCancelled: ['Render cancelled. Your saved project is unchanged.', 'Generación cancelada. Tu proyecto guardado no cambió.'],
  editorNoShots: ['This project has no editable shots. Create a lower-third to begin.', 'Este proyecto no tiene tomas editables. Crea un video con rótulo inferior para empezar.'],
  editorError: ['The request failed. Check your connection and permissions.', 'Falló la solicitud. Revisa la conexión y los permisos.'],
};

/**
 * Translate presentation chrome, including DOM created after the page loads.
 * Original prompts, catalogue records, licences, user input and agent output
 * remain untouched. No remote translation or loss of source fidelity.
 */
const chromeText: Record<string, string> = {
  'Skip to content': 'Ir al contenido',
  'Menu': 'Menú',
  'Sections': 'Secciones',
  'Footer': 'Pie de página',
  'Motion Master, back to top': 'Motion Master, volver al inicio',
  'Videos': 'Videos',
  'Clip not yet rendered': 'Video todavía no generado',
  'The prompt below is the whole deliverable — paste it into an agent and it starts from here.': 'Las instrucciones originales están abajo. Pégalas en tu agente para comenzar.',
  'Play clip': 'Reproducir video',
  'Pause clip': 'Pausar video',
  'Not available': 'No disponible',
  'Copied': 'Copiado',
  'Copy failed': 'No se pudo copiar',
  'The creation console is not available. Copy the prompt instead.': 'La herramienta de creación no está disponible. Copia las instrucciones.',
  'Copy failed — select the prompt text and copy it manually.': 'No se pudo copiar. Selecciona las instrucciones y cópialas manualmente.',
  'Prompt copied to the clipboard.': 'Instrucciones copiadas al portapapeles.',
  'Example loaded into the video brief. Connect your agent if prompted, then create.': 'Ejemplo cargado. Conecta tu agente si es necesario y después crea el video.',
  'Rendered with the shipped skills — the exact prompt behind each one is printed above and copied to your clipboard in one click.': 'Estos videos se generaron con las herramientas incluidas. Las instrucciones originales de cada uno están arriba y puedes copiarlas con un clic.',
  'The brief: make a launch film.': 'El encargo: crear un video de lanzamiento.',
  'A motion film: a brief becomes a shot list, the shot list becomes code, the code renders a file.': 'Un video en movimiento: del encargo al guion visual, del guion al código y del código al archivo final.',
  'A white title card. A wordmark rises into a masked reveal, an accent rule draws in beneath it, the card holds, then fades out.': 'Una tarjeta blanca: aparece el logotipo tipográfico, se dibuja una línea de acento, se mantiene y se desvanece.',
  'On black, the brief arrives one line at a time: “a 14s launch title”, then “on a white canvas”. The second line is in the accent colour.': 'Sobre negro, el encargo aparece línea por línea; la segunda línea lleva el color de acento.',
  'A product turns on a light ground beside a shot list. Text reads “the product, on loop”, then “and the project is editable”.': 'Un producto gira sobre fondo claro junto a una lista de tomas. El texto explica que el video se repite y el proyecto se puede editar.',
  'A dark moving source clip with a title sequence burned in over the top.': 'Un video oscuro en movimiento con títulos integrados.',
  'checking the agent…': 'comprobando el agente…',
  'Agent address': 'Dirección del agente',
  'Your rendered video': 'Tu video generado',
  'Your name': 'Tu nombre',
  'OpenRouter holds the model. Your key stays in this browser and is sent only with your own requests.': 'OpenRouter proporciona el modelo. Tu clave permanece en este navegador y solo se envía con tus solicitudes.',
  'title card': 'título',
  'kinetic text': 'texto animado',
  'product demo': 'demostración de producto',
  'data': 'datos',
  'brand': 'marca',
  'transition': 'transición',
  'Conversation': 'Conversación',
  'Results': 'Resultados',
  'Brief': 'Descripción del video',
  'Attach': 'Adjuntar',
  'Attach your own files': 'Adjunta tus archivos',
  'a title card and a product reveal for ACME coffee, 12 seconds': 'un título y una presentación de café ACME, 12 segundos',
  'Click a starting point, or ask for a film. The tools are the product.': 'Elige un ejemplo o describe el video que necesitas. El agente utiliza las herramientas de creación.',
  'you': 'tú',
  'working': 'trabajando',
  'shot': 'toma',
  'length': 'duración',
  'notes': 'notas',
  'items': 'elementos',
  'collections': 'colecciones',
  'categories': 'categorías',
  'motion blocks': 'bloques de animación',
  'Search the library': 'Buscar en la biblioteca',
  'Search prompts, styles, techniques': 'Buscar instrucciones, estilos y técnicas',
  'Filter by kind': 'Filtrar por tipo',
  'All': 'Todos',
  'Styles': 'Estilos',
  'Prompts': 'Instrucciones',
  'Cases': 'Casos',
  'Skills': 'Herramientas',
  'Collection': 'Colección',
  'All collections': 'Todas las colecciones',
  'Nothing matches that. Clear the search or pick another category.': 'No hay resultados. Borra la búsqueda o elige otra categoría.',
  'Loading the index…': 'Cargando el índice…',
  'The library index could not be loaded.': 'No se pudo cargar el índice de la biblioteca.',
  'Style recipe': 'Receta de estilo',
  'Production prompt': 'Instrucciones de producción',
  'Case study': 'Caso de estudio',
  'Skill': 'Herramienta',
  'partial': 'parcial',
  'Source': 'Fuente',
  'Show more': 'Mostrar más',
  'Copy prompt': 'Copiar prompt',
  'ready': 'listo',
  'rendering': 'generando',
  'failed': 'falló',
  'queued': 'en espera',
  'agent': 'agente',
  'Download the MP4': 'Descargar MP4',
  'The render did not finish.': 'No se pudo terminar de generar el video.',
  'Rendering on the machine. This takes a minute or two.': 'Generando el video en tu equipo. Puede tardar uno o dos minutos.',
  'Still rendering. Ask for the film again in a minute.': 'El video sigue generándose. Vuelve a consultarlo en un minuto.',
  'no agent here · start it with: cd mcp && npm start': 'No hay agente conectado · inícialo con: cd mcp && npm start',
  ' · a deployed page also needs the browser’s local-network permission': ' · una página publicada también necesita permiso del navegador para acceder a la red local',
  'copy': 'copiar',
  'copied': 'copiado',
  'film': 'video',
  'weak': 'débil',
  'strong': 'fuerte',
};
const originalNodes = new WeakMap<Text, { en: string; es: string }>();
const originalAttrs = new WeakMap<Element, Map<string, { en: string; es: string }>>();
const protectedSelectors = 'pre,code,script,style,noscript,textarea,svg,[data-i18n-ignore],.console__text,.library__item-title,.library__item-summary,.library__licence,.sfx__title,.sfx__note,.film__title,.film__shot-title,.artifact__headline,.artifact__notes,.artifact__title,.project-editor__user-text';
function translateLabel(value: string): string | undefined {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (chromeText[normalized]) return chromeText[normalized];
  let m = /^(\d+) visible items$/.exec(normalized);
  if (m) return m[1] + ' elementos visibles';
  m = /^Show (\d+) more$/.exec(normalized);
  if (m) return 'Mostrar ' + m[1] + ' más';
  m = /^(\d+) of (\d+) sounds$/.exec(normalized);
  if (m) return m[1] + ' de ' + m[2] + ' sonidos';
  m = /^no agent here · start it with: cd mcp && npm start(?: · a deployed page also needs the browser’s local-network permission)?$/.exec(normalized);
  if (m) return 'No hay agente conectado · inícialo con: cd mcp && npm start' +
    (normalized.includes('local-network permission') ? ' · una página publicada también necesita permiso del navegador para acceder a la red local' : '');
  m = /^agent connected · (\d+) tools$/.exec(normalized);
  if (m) return 'agente conectado · ' + m[1] + ' herramientas';
  m = /^weak (\d+) → strong (\d+)$/.exec(normalized);
  if (m) return 'débil ' + m[1] + ' → fuerte ' + m[2];
  m = /^everything · (\d+)$/.exec(normalized);
  if (m) return 'todo · ' + m[1];
  m = /^The gate dropped (.+)\. They are recorded so they are not used again\.$/.exec(normalized);
  if (m) return 'La revisión descartó ' + m[1] + '. Se registraron para evitar volver a usarlos.';
  m = /^The sound library could not be loaded: (.+)$/.exec(normalized);
  if (m) return 'No se pudo cargar la biblioteca de sonidos: ' + m[1];
  m = /^Copy the id of (.+)$/.exec(normalized);
  if (m) return 'Copiar el identificador de ' + m[1];
  m = /^Play (.+)$/.exec(normalized);
  if (m) return 'Reproducir ' + m[1];
  m = /^(.+) failed$/.exec(normalized);
  if (m) return m[1] + ': error al subir el archivo';
  return undefined;
}
function translateChrome(lang: Locale): void {
  if (!document.body) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const node = current as Text;
    if (!node.parentElement || node.parentElement.closest(protectedSelectors)) continue;
    const now = node.nodeValue ?? '';
    const previous = originalNodes.get(node);
    if (lang === 'en') {
      if (previous && now === previous.es) node.nodeValue = previous.en;
      continue;
    }
    if (previous && now === previous.es) continue;
    const es = translateLabel(now);
    if (!es) continue;
    const leading = now.match(/^\s*/)?.[0] ?? '';
    const trailing = now.match(/\s*$/)?.[0] ?? '';
    const translated = leading + es + trailing;
    originalNodes.set(node, { en: now, es: translated });
    if (translated !== now) node.nodeValue = translated;
  }
  for (const element of document.body.querySelectorAll('*')) {
    for (const attribute of ['aria-label', 'placeholder', 'title', 'alt']) {
      const now = element.getAttribute(attribute);
      if (now === null) continue;
      const previous = originalAttrs.get(element)?.get(attribute);
      if (lang === 'en') {
        if (previous && now === previous.es) element.setAttribute(attribute, previous.en);
        continue;
      }
      if (previous && now === previous.es) continue;
      const es = translateLabel(now);
      if (!es || es === now) continue;
      let entries = originalAttrs.get(element);
      if (!entries) { entries = new Map(); originalAttrs.set(element, entries); }
      entries.set(attribute, { en: now, es });
      element.setAttribute(attribute, es);
    }
  }
}

const protectedText = new WeakMap<Element, { key: string; en: string }>();
/** Also apply to components inserted after initial page load. */
function translateDataNodes(lang: Locale): void {
  for (const [key, pair] of Object.entries(strings)) {
    for (const node of document.querySelectorAll<HTMLElement>(`[data-i18n="${key}"]`)) {
      // Dynamic status nodes can reuse the same element with a NEW i18n key.
      // An English snapshot from the previous key must never overwrite it.
      const previous = protectedText.get(node);
      if (!previous || previous.key !== key) protectedText.set(node, { key, en: node.innerHTML });
      const next = lang === 'en' ? protectedText.get(node)!.en : pair[1];
      if (node.innerHTML !== next) node.innerHTML = next;
    }
    for (const node of document.querySelectorAll<HTMLInputElement>(`[data-i18n-placeholder="${key}"]`)) {
      const next = lang === 'en' ? pair[0] : pair[1];
      if (node.placeholder !== next) node.placeholder = next;
    }
  }
}
export function locale(): Locale {
  return document.documentElement.lang === 'es-MX' ? 'es-MX' : 'en';
}
export function initLocale(): void {
  const selector = document.querySelector<HTMLSelectElement>('[data-locale]');
  const preference = localStorage.getItem('motion-master:locale');
  const queryLocale = new URLSearchParams(window.location.search).get('lang');
  const defaultLocale: Locale = queryLocale === 'es-MX' || (queryLocale !== 'en' && preference === 'es-MX') ? 'es-MX' : 'en';
  const apply = (lang: Locale): void => {
    document.documentElement.lang = lang;
    if (selector) selector.value = lang;
    translateDataNodes(lang);
    translateChrome(lang);
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', lang === 'en'
      ? 'Browse real motion examples, start from one, then create, edit, render and export your own motion video with Motion Master.'
      : 'Explora ejemplos reales de motion y después crea, edita, genera y exporta tu propio video con Motion Master.');
    document.title = lang === 'en'
      ? 'Motion Master — Create Motion Videos For Your Brand Today'
      : 'Motion Master — Crea videos de motion para tu marca hoy';
  };
  apply(defaultLocale);
  // The library and agent console build their UI asynchronously. Translate
  // new controls without altering the original catalogue or user messages.
  const observer = new MutationObserver(() => {
    if (locale() === 'es-MX') {
      translateDataNodes('es-MX');
      translateChrome('es-MX');
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ['aria-label', 'placeholder', 'title', 'alt', 'data-i18n'] });
  selector?.addEventListener('change', () => {
    const value: Locale = selector.value === 'es-MX' ? 'es-MX' : 'en';
    localStorage.setItem('motion-master:locale', value);
    apply(value);
  });
}
