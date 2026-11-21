#!/usr/bin/env node
// Arma el catálogo de la página a partir del repo de workflows.
//
//   node tools/construir.mjs
//   node tools/construir.mjs --workflows ../workflows --guias ../guias --config ../config.json
//   node tools/construir.mjs --sin-pendientes       (no agrega los workflows que todavía faltan)
//
// Qué hace:
//   1. Lee cada <categoria>/<id>/meta.json y workflow.json del repo de workflows.
//   2. Escribe data/catalogo.json (lo lee la página) y data/catalogo.js (lo mismo,
//      para cuando la página se abre como archivo, sin servidor).
//   3. Copia cada workflow.json a workflows/<id>.json: así «Copiar workflow» y
//      «Descargar» funcionan desde el mismo dominio de la página.
//   4. Si encuentra el repo de guías, arma data/guias.json con sus títulos y pinta las
//      tarjetas de la sección «Guías» en index.html (y los enlaces de «Empezá en 3 pasos»).
//   5. Si cambió la organización en config.json, actualiza los enlaces de las páginas.
//
// Los workflows de la lista oficial que todavía no existen quedan en el catálogo con
// "disponible": false y la página muestra «pronto» (salvo con --sin-pendientes).
// Sin dependencias: Node 22 o más nuevo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SITIO = path.resolve(AQUI, '..');
const RAIZ = path.resolve(SITIO, '..'); // github_nodo_cero/ cuando se trabaja con todos los repos juntos

function arg(nombre, porDefecto) {
  const i = process.argv.indexOf(nombre);
  return i > -1 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : porDefecto;
}
const SIN_PENDIENTES = process.argv.includes('--sin-pendientes');
const DIR_WORKFLOWS = arg('--workflows', path.join(RAIZ, 'workflows'));
const DIR_GUIAS = arg('--guias', path.join(RAIZ, 'guias'));
const ARCHIVO_CONFIG = arg('--config', path.join(RAIZ, 'config.json'));

// Configuración: la de github_nodo_cero/config.json; si no está (repo del sitio suelto),
// se usa la que quedó guardada en el último catálogo.
const CONFIG_BASE = {
  org: 'nodo-cero-bo',
  repos: { workflows: 'workflows', guias: 'guias', sitio: 'nodo-cero-bo.github.io', perfil: '.github', proyectos: 'proyectos' },
  sitio_url: 'https://nodo-cero-bo.github.io',
  rama: 'main',
};
const anterior = leerJSON(path.join(SITIO, 'data', 'catalogo.json'));
const config = { ...CONFIG_BASE, ...(anterior?.config ?? {}), ...(leerJSON(ARCHIVO_CONFIG) ?? {}) };
config.repos = { ...CONFIG_BASE.repos, ...(anterior?.config?.repos ?? {}), ...(config.repos ?? {}) };

const GH = `https://github.com/${config.org}`;
const CRUDO = `https://raw.githubusercontent.com/${config.org}`;

// La lista oficial de la especificación (ids fijos). Sirve para el catálogo provisional
// y para avisar qué falta. Los datos reales salen siempre de cada meta.json.
const OFICIALES = [
  ['00-fundamentos', '01-hola-n8n', 'Hola n8n: datos, expresiones y decisiones', 'fundamentos', 'inicial', 10, ['n8n'], [], 'Tu primer workflow: armá datos, usá expresiones y tomá una decisión con IF.'],
  ['00-fundamentos', '02-mi-primera-api', 'Tu primera API', 'fundamentos', 'inicial', 10, ['n8n'], [], 'Un Webhook que responde JSON: tu propia API en dos nodos.'],
  ['00-fundamentos', '03-http-request', 'Llamar a cualquier API con HTTP Request', 'fundamentos', 'inicial', 15, ['n8n', 'avalanche'], [], 'Consultá una API pública y el RPC de Fuji, y leé la respuesta.'],
  ['00-fundamentos', '04-formulario', 'Un formulario de n8n', 'fundamentos', 'inicial', 10, ['n8n'], [], 'Un formulario que procesa la respuesta y muestra una página final.'],
  ['00-fundamentos', '05-agente-ia', 'Tu primer agente de IA', 'ia', 'inicial', 15, ['n8n', 'ia'], [['Google Gemini', 'googlePalmApi']], 'Chat Trigger, AI Agent, Google Gemini y memoria: un agente que conversa.'],
  ['10-avalanche-fuji', '10-fuji-estado-de-la-red', 'Estado de la red Fuji', 'avalanche', 'inicial', 10, ['n8n', 'avalanche'], [], 'chainId, último bloque y precio del gas de Fuji, en números legibles.'],
  ['10-avalanche-fuji', '11-fuji-saldo-wallet', 'Saldo de una wallet en Fuji', 'avalanche', 'inicial', 15, ['n8n', 'avalanche'], [], 'Pasale una dirección y te devuelve su saldo en AVAX.'],
  ['10-avalanche-fuji', '12-fuji-leer-transaccion', 'Leer una transacción en Fuji', 'avalanche', 'inicial', 15, ['n8n', 'avalanche'], [], 'Dado un hash: quién envió, a quién, cuánto, gas, estado y enlace al explorador.'],
  ['10-avalanche-fuji', '13-fuji-verificar-pago', 'Verificar un pago en Fuji', 'avalanche', 'intermedio', 20, ['n8n', 'avalanche', 'supabase'], [], 'Valida destino, monto y confirmaciones de un pago, y responde si está verificado.'],
  ['10-avalanche-fuji', '14-fuji-monitor-wallet', 'Monitor de una wallet en Fuji', 'avalanche', 'intermedio', 15, ['n8n', 'avalanche'], [], 'Revisa un saldo cada cierto tiempo y avisa cuando cambia.'],
  ['10-avalanche-fuji', '15-fuji-token-erc20', 'Saldo de un token ERC-20 en Fuji', 'avalanche', 'intermedio', 20, ['n8n', 'avalanche'], [], 'Saldo, símbolo y decimales de un token con eth_call.'],
  ['10-avalanche-fuji', '16-fuji-eventos-contrato', 'Leer eventos de un contrato en Fuji', 'avalanche', 'avanzado', 25, ['n8n', 'avalanche'], [], 'Trae eventos con eth_getLogs y los decodifica.'],
  ['20-clerk', '20-clerk-webhook-a-supabase', 'De Clerk a Supabase con un webhook', 'clerk', 'intermedio', 20, ['n8n', 'clerk', 'supabase'], [['Supabase API', 'supabaseApi']], 'Cada alta, cambio o baja de usuaria en Clerk se sincroniza en Supabase.'],
  ['20-clerk', '21-clerk-api-protegida', 'Una API protegida con Clerk', 'clerk', 'avanzado', 25, ['n8n', 'clerk', 'supabase'], [['Supabase API', 'supabaseApi']], 'Verifica la sesión de Clerk y devuelve el perfil; si no hay sesión, 401.'],
  ['20-clerk', '22-clerk-invitaciones', 'Invitaciones con Clerk', 'clerk', 'intermedio', 15, ['n8n', 'clerk'], [['Clerk Backend API', 'httpHeaderAuth']], 'Invitá participantes por correo con la Backend API de Clerk.'],
  ['30-supabase', '30-formulario-a-supabase', 'Formulario a Supabase', 'supabase', 'inicial', 15, ['n8n', 'supabase'], [['Supabase API', 'supabaseApi']], 'Lo que llega por un formulario queda guardado como fila en Supabase.'],
  ['30-supabase', '31-api-crud-supabase', 'Una API sobre Supabase', 'supabase', 'intermedio', 20, ['n8n', 'supabase'], [['Supabase API', 'supabaseApi']], 'Listá y creá filas de Supabase desde tu propia API.'],
  ['30-supabase', '32-cargar-documentos-rag', 'Cargar documentos para RAG', 'supabase', 'intermedio', 25, ['n8n', 'ia', 'supabase'], [['Supabase API', 'supabaseApi'], ['Google Gemini', 'googlePalmApi']], 'Subí un archivo, partilo en trozos y guardá sus embeddings en Supabase.'],
  ['30-supabase', '33-agente-con-memoria-y-rag', 'Agente con memoria y tus documentos', 'supabase', 'avanzado', 30, ['n8n', 'ia', 'supabase'], [['Supabase API', 'supabaseApi'], ['Postgres', 'postgres'], ['Google Gemini', 'googlePalmApi']], 'Un agente que recuerda la conversación y busca en tus documentos.'],
  ['30-supabase', '34-supabase-webhook-ia', 'La IA clasifica cada fila nueva', 'supabase', 'intermedio', 20, ['n8n', 'ia', 'supabase'], [['Supabase API', 'supabaseApi'], ['Google Gemini', 'googlePalmApi']], 'Un Database Webhook avisa a n8n y la IA completa la fila.'],
  ['40-proyectos', '40-agente-web3-fuji', 'Agente de IA para Fuji', 'proyectos', 'avanzado', 30, ['n8n', 'ia', 'avalanche'], [['Google Gemini', 'googlePalmApi']], 'Un agente que responde sobre Fuji con herramientas: saldo, transacción y último bloque.'],
  ['40-proyectos', '41-pagos-fuji-con-login', 'Pagos en Fuji con login', 'proyectos', 'avanzado', 40, ['n8n', 'clerk', 'avalanche', 'supabase'], [['Supabase API', 'supabaseApi']], 'Login con Clerk, la usuaria manda el hash de su pago, n8n lo verifica en Fuji y lo registra.'],
  ['40-proyectos', '42-reporte-kpis', 'Reporte de KPIs del evento', 'proyectos', 'intermedio', 20, ['n8n', 'avalanche'], [['GitHub', 'githubApi']], 'Cuenta los proyectos por tecnología, trae el tráfico de los repos y verifica los hashes en Fuji.'],
];

const CATEGORIAS = ['fundamentos', 'ia', 'avalanche', 'clerk', 'supabase', 'proyectos'];
const NIVELES = ['inicial', 'intermedio', 'avanzado'];
const TECNOLOGIAS = ['n8n', 'ia', 'avalanche', 'clerk', 'supabase'];
const PROBADO = ['ejecutado', 'auditado'];

const avisos = [];
const errores = [];

// ---------------------------------------------------------------- workflows reales
const reales = [];
if (fs.existsSync(DIR_WORKFLOWS)) {
  for (const archivoMeta of buscar(DIR_WORKFLOWS, 'meta.json')) {
    const dir = path.dirname(archivoMeta);
    const ruta = path.relative(DIR_WORKFLOWS, dir).split(path.sep).join('/');
    const meta = leerJSON(archivoMeta);
    if (!meta) { errores.push(`${ruta}/meta.json no es JSON válido`); continue; }
    const problemas = validarMeta(meta, ruta);
    if (problemas.length) { errores.push(...problemas); continue; }
    const archivoWf = path.join(dir, 'workflow.json');
    const wf = leerJSON(archivoWf);
    if (!wf || !Array.isArray(wf.nodes)) { errores.push(`${ruta}/workflow.json falta o no es un workflow de n8n`); continue; }
    const notas = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.stickyNote').length;
    reales.push({
      ...entrada(meta, ruta),
      nodos: wf.nodes.length - notas,
      notas,
      disponible: true,
      provisional: false,
      _origen: archivoWf,
    });
  }
} else {
  avisos.push(`no encontré el repo de workflows en ${DIR_WORKFLOWS}: el catálogo queda provisional`);
}

const ids = new Set();
for (const w of reales) {
  if (ids.has(w.id)) errores.push(`id repetido: ${w.id}`);
  ids.add(w.id);
}

// ---------------------------------------------------------------- pendientes (provisionales)
const pendientes = [];
for (const [carpeta, id, titulo, categoria, nivel, minutos, tecnologias, creds, resumen] of OFICIALES) {
  if (ids.has(id)) continue;
  if (SIN_PENDIENTES) { avisos.push(`falta ${id} (se deja afuera por --sin-pendientes)`); continue; }
  avisos.push(`falta ${id}: queda en el catálogo como «pronto»`);
  pendientes.push({
    ...entrada({
      id, titulo, resumen, categoria, nivel, minutos, tecnologias,
      credenciales: creds.map(([nombre, tipo_n8n]) => ({ nombre, tipo_n8n, como: '' })),
      aprendes: [], probado: null, orden: Number(id.slice(0, 2)),
    }, `${carpeta}/${id}`),
    nodos: null,
    notas: null,
    disponible: false,
    provisional: true,
  });
}
const extra = reales.filter((w) => !OFICIALES.some((o) => o[1] === w.id)).map((w) => w.id);
if (extra.length) avisos.push(`workflows que no están en la lista oficial (se publican igual): ${extra.join(', ')}`);

if (errores.length) {
  console.error('No se puede armar el catálogo:\n  - ' + errores.join('\n  - '));
  process.exit(1);
}

const workflows = [...reales, ...pendientes].sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id));

// ---------------------------------------------------------------- copiar workflow.json
const DIR_DESTINO = path.join(SITIO, 'workflows');
fs.mkdirSync(DIR_DESTINO, { recursive: true });
const vigentes = new Set();
for (const w of workflows) {
  if (!w._origen) continue;
  const destino = path.join(DIR_DESTINO, `${w.id}.json`);
  fs.copyFileSync(w._origen, destino);
  vigentes.add(`${w.id}.json`);
  delete w._origen;
}
for (const f of fs.readdirSync(DIR_DESTINO)) {
  if (f.endsWith('.json') && !vigentes.has(f)) fs.rmSync(path.join(DIR_DESTINO, f));
}

// ---------------------------------------------------------------- catálogo
const catalogo = {
  generado: new Date().toISOString(),
  provisional: reales.length === 0,
  config: { org: config.org, repos: config.repos, sitio_url: config.sitio_url, rama: config.rama },
  repo_workflows: `${GH}/${config.repos.workflows}`,
  total: workflows.length,
  disponibles: reales.length,
  workflows,
};
fs.mkdirSync(path.join(SITIO, 'data'), { recursive: true });
escribir(path.join(SITIO, 'data', 'catalogo.json'), JSON.stringify(catalogo, null, 2) + '\n');
escribir(path.join(SITIO, 'data', 'catalogo.js'),
  '// Copia de catalogo.json para abrir la página sin servidor. La genera tools/construir.mjs.\n' +
  `window.CATALOGO_NODO_CERO = ${JSON.stringify(catalogo)};\n`);

// ---------------------------------------------------------------- guías
// Lee los .md del repo de guías, escribe data/guias.json y arma las tarjetas de la
// sección «Guías» directo en index.html (entre <!-- guias:inicio --> y <!-- guias:fin -->),
// agrupadas por carpeta. Si no hay guías, la página conserva las tarjetas fijas.
const GRUPOS = {
  '00-empezar': ['EMPEZAR', 'Cuentas y primeros pasos', 'Creá cada cuenta, importá tu primer workflow y conectá tus credenciales.'],
  empezar: ['EMPEZAR', 'Cuentas y primeros pasos', 'Creá cada cuenta, importá tu primer workflow y conectá tus credenciales.'],
  proyectos: ['PROYECTOS', 'Guías de proyecto', 'Proyectos completos, paso a paso, que juntan IA, Supabase, Clerk y Avalanche Fuji.'],
  avalanche: ['AVALANCHE FUJI', 'Avalanche Fuji', 'Contratos, wallets y transacciones en la red de prueba de Avalanche.'],
  ideas: ['IDEAS', 'Ideas para tu proyecto', 'Problemas reales que se resuelven con un workflow.'],
  presentar: ['PRESENTAR', 'Cómo presentar', 'Qué mostrar para que se entienda qué hace tu proyecto.'],
  seguir: ['DESPUÉS', 'Seguí construyendo', 'Cómo llevar tu workflow a algo que use más gente.'],
};
const RAIZ_GUIAS = ['IDEAS, DEMO Y DESPUÉS', 'De la idea a la demo, y después', 'De dónde sacar la idea, cómo mostrarla en la presentación y cómo seguir cuando termine el día.'];
if (fs.existsSync(DIR_GUIAS)) {
  const guias = [];
  for (const archivo of buscar(DIR_GUIAS, /\.md$/i, new Set(['node_modules', '.git', '.github', 'tools', 'assets']))) {
    const ruta = path.relative(DIR_GUIAS, archivo).split(path.sep).join('/');
    if (/(^|\/)(LICENSE|CONTRIBUTING|CODE_OF_CONDUCT|CHANGELOG)\.md$/i.test(ruta)) continue;
    if (/(^|\/)readme\.md$/i.test(ruta)) continue;
    const md = fs.readFileSync(archivo, 'utf8');
    const titulo = limpiarMarkdown(md.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(ruta, '.md'));
    const parrafo = md.split(/\r?\n\s*\r?\n/).map((p) => p.trim())
      .find((p) => p && !/^(#|!|<|\||>|```|-|\*\s|\d+\.\s|\[!)/.test(p)) ?? '';
    const grupo = ruta.includes('/') ? ruta.split('/')[0] : '';
    guias.push({
      titulo,
      resumen: resumir(limpiarMarkdown(parrafo)),
      ruta,
      grupo,
      url: `${GH}/${config.repos.guias}/blob/${config.rama}/${ruta.split('/').map(encodeURIComponent).join('/')}`,
    });
  }
  guias.sort((a, b) => (a.grupo === '' ? 1 : 0) - (b.grupo === '' ? 1 : 0) || a.ruta.localeCompare(b.ruta));
  escribir(path.join(SITIO, 'data', 'guias.json'), JSON.stringify({
    generado: new Date().toISOString(), provisional: false, repo: `${GH}/${config.repos.guias}`, guias,
  }, null, 2) + '\n');
  if (guias.length) {
    pintarGuias(guias);
  } else {
    avisos.push('el repo de guías todavía no tiene guías: la sección queda con las tarjetas fijas');
  }
} else {
  avisos.push(`no encontré el repo de guías en ${DIR_GUIAS}: data/guias.json queda como está`);
}

function pintarGuias(guias) {
  const archivo = path.join(SITIO, 'index.html');
  let html = fs.readFileSync(archivo, 'utf8');
  const repo = `${GH}/${config.repos.guias}`;
  const carpeta = (g) => (g ? `${repo}/tree/${config.rama}/${g.split('/').map(encodeURIComponent).join('/')}` : repo);
  const ORDEN = ['empezar', 'proyectos', 'avalanche', 'ideas', 'presentar', 'seguir'];
  const peso = (g) => (g === '' ? 99 : (i => (i < 0 ? 50 : i))(ORDEN.indexOf(g.replace(/^\d+[-_ ]*/, '').toLowerCase())));
  const grupos = [...new Set(guias.map((g) => g.grupo))].sort((a, b) => peso(a) - peso(b) || a.localeCompare(b));
  const bloques = grupos.map((g) => {
    const lista = guias.filter((x) => x.grupo === g);
    const clave = g.replace(/^\d+[-_ ]*/, '').toLowerCase();
    // Las guías sueltas en la raíz del repo (ideas, presentar, seguir construyendo) van juntas al final.
    const [rotulo, titulo, bajada] = g === '' ? RAIZ_GUIAS : GRUPOS[g] ?? GRUPOS[clave] ??
      [clave.replace(/[-_]+/g, ' ').toUpperCase(), capitalizar(clave.replace(/[-_]+/g, ' ')), ''];
    const id = `guias-${(clave || 'mas').replace(/[^a-z0-9]+/g, '-')}`;
    const tarjetas = lista.map((x, i) => {
      const num = (path.basename(x.ruta).match(/^(\d+)/)?.[1] ?? String(i + 1)).padStart(2, '0');
      return `      <li><a class="guia tarjeta" href="${esc(x.url)}" target="_blank" rel="noopener">
        <span class="guia__num">${esc(num)}</span>
        <span class="guia__titulo">${esc(x.titulo)}</span>
        ${x.resumen ? `<span class="guia__resumen">${esc(x.resumen)}</span>` : ''}
      </a></li>`;
    }).join('\n');
    return `  <section class="guias-grupo" aria-labelledby="${id}">
    <header class="guias-grupo__cabeza">
      <p class="guias-grupo__rotulo">${rotulo ? `${esc(rotulo)} · ` : ''}${lista.length} ${lista.length === 1 ? 'GUÍA' : 'GUÍAS'}</p>
      <h3 id="${id}">${esc(titulo)}</h3>
      ${bajada ? `<p class="guias-grupo__bajada">${esc(bajada)}</p>` : ''}
      <a class="enlace-flecha" href="${esc(carpeta(g))}" target="_blank" rel="noopener">${g ? 'Ver la carpeta en GitHub' : 'Ver el repo de guías'}</a>
    </header>
    <ol class="guias">
${tarjetas}
    </ol>
  </section>`;
  }).join('\n');
  const re = /(<!-- guias:inicio -->)[\s\S]*?(<!-- guias:fin -->)/;
  if (!re.test(html)) { avisos.push('index.html no tiene los marcadores de guías: no actualicé la sección'); return; }
  html = html.replace(re, `$1\n<div class="guias-grupos" id="guias-lista">\n${bloques}\n</div>\n$2`);

  // Los enlaces de «Empezá en 3 pasos» llevan a la guía que corresponde.
  const buscarGuia = (re) => guias.find((g) => re.test(g.ruta) || re.test(g.titulo));
  const destino = {
    cuentas: (() => { const g = buscarGuia(/cuenta/i); return g ? (guias.filter((x) => x.grupo === g.grupo && /cuenta/i.test(x.ruta)).length > 1 ? carpeta(g.grupo) : g.url) : null; })(),
    importar: buscarGuia(/import/i)?.url,
    credenciales: buscarGuia(/credencial/i)?.url,
  };
  for (const [clave, url] of Object.entries(destino)) {
    if (!url) continue;
    html = html.replace(new RegExp(`(data-guia="${clave}" href=")[^"]*(")`, 'g'), `$1${esc(url)}$2`);
  }
  escribir(archivo, html);
}

// ---------------------------------------------------------------- organización en los enlaces
const orgAnterior = anterior?.config?.org;
if (orgAnterior && orgAnterior !== config.org) {
  for (const f of ['index.html', '404.html', 'README.md', 'assets/js/app.js']) {
    const p = path.join(SITIO, f);
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8')
      .replaceAll(`github.com/${orgAnterior}/`, `github.com/${config.org}/`)
      .replaceAll(`githubusercontent.com/${orgAnterior}/`, `githubusercontent.com/${config.org}/`)
      .replaceAll(`${orgAnterior}.github.io`, `${config.org}.github.io`);
    escribir(p, t);
  }
  avisos.push(`la organización cambió de ${orgAnterior} a ${config.org}: actualicé los enlaces`);
}

// ---------------------------------------------------------------- resumen
console.log(`Catálogo: ${reales.length} workflows publicados, ${pendientes.length} pendientes («pronto»).`);
if (avisos.length) console.log('Avisos:\n  - ' + avisos.join('\n  - '));

// ================================================================= utilidades
function entrada(meta, ruta) {
  return {
    id: meta.id,
    titulo: meta.titulo,
    resumen: meta.resumen,
    categoria: meta.categoria,
    nivel: meta.nivel,
    minutos: meta.minutos,
    tecnologias: meta.tecnologias,
    credenciales: (meta.credenciales ?? []).map((c) => ({ nombre: c.nombre, tipo_n8n: c.tipo_n8n, como: c.como ?? '' })),
    aprendes: meta.aprendes ?? [],
    probado: meta.probado,
    orden: meta.orden,
    ruta,
    github: `${GH}/${config.repos.workflows}/tree/${config.rama}/${ruta}`,
    crudo: `${CRUDO}/${config.repos.workflows}/${config.rama}/${ruta}/workflow.json`,
    archivo: `workflows/${meta.id}.json`,
  };
}

function validarMeta(m, ruta) {
  const p = [];
  const donde = `${ruta}/meta.json`;
  for (const campo of ['id', 'titulo', 'resumen', 'categoria', 'nivel', 'minutos', 'tecnologias', 'probado', 'orden']) {
    if (m[campo] === undefined || m[campo] === '') p.push(`${donde}: falta «${campo}»`);
  }
  if (m.id && m.id !== path.basename(ruta)) p.push(`${donde}: el id «${m.id}» no coincide con la carpeta`);
  if (m.categoria && !CATEGORIAS.includes(m.categoria)) p.push(`${donde}: categoría «${m.categoria}» no válida`);
  if (m.nivel && !NIVELES.includes(m.nivel)) p.push(`${donde}: nivel «${m.nivel}» no válido`);
  if (m.probado && !PROBADO.includes(m.probado)) p.push(`${donde}: probado «${m.probado}» no válido`);
  if (m.tecnologias && (!Array.isArray(m.tecnologias) || m.tecnologias.some((t) => !TECNOLOGIAS.includes(t)))) p.push(`${donde}: tecnologías no válidas`);
  if (m.credenciales && !Array.isArray(m.credenciales)) p.push(`${donde}: «credenciales» tiene que ser una lista`);
  if (m.minutos !== undefined && !(Number.isFinite(m.minutos) && m.minutos > 0)) p.push(`${donde}: «minutos» tiene que ser un número`);
  if (m.orden !== undefined && !Number.isFinite(m.orden)) p.push(`${donde}: «orden» tiene que ser un número`);
  return p;
}

function buscar(dir, patron, ignorar = new Set(['node_modules', '.git', '.github', 'tools', 'docs'])) {
  const out = [];
  (function rec(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!ignorar.has(e.name)) rec(path.join(d, e.name)); continue; }
      if (typeof patron === 'string' ? e.name === patron : patron.test(e.name)) out.push(path.join(d, e.name));
    }
  })(dir);
  return out.sort();
}

function leerJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function escribir(p, contenido) {
  fs.writeFileSync(p, contenido.replace(/\r\n/g, '\n'), 'utf8');
}

function limpiarMarkdown(t) {
  return t.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '').replace(/[*_`>#]/g, '').replace(/\s+/g, ' ').trim();
}

function recortar(t, max) {
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  return corte.slice(0, Math.max(corte.lastIndexOf(' '), max * 0.6)).replace(/[\s,;:.]+$/, '') + '…';
}

// Para las tarjetas de guías: la primera oración si entra en tres renglones; si no, un corte prolijo.
function resumir(t, max = 112) {
  const oracion = t.match(/^.+?\.(?=\s|$)/)?.[0];
  if (oracion && oracion.length <= max && oracion.length >= 40) return oracion;
  return recortar(t, max);
}

function capitalizar(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function esc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
