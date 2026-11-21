// Nodo Cero · la página sigue andando aunque se corte el Wi-Fi.
// Primero la red (así siempre ves lo más nuevo); si no hay conexión o tarda demasiado, la copia guardada.
// Atiende nada más las páginas y archivos de este sitio: la portada, el modo presentación, estilos, scripts,
// tipografías, logos, el QR, el catálogo y los workflows.
const CACHE = 'nodo-cero-v1';
const BASICO = [
  './',
  'index.html',
  'presentar.html',
  'assets/css/estilos.css',
  'assets/css/presentar.css',
  'assets/js/app.js',
  'assets/js/presentar.js',
  'assets/fuentes/InterTight-400.woff',
  'assets/fuentes/InterTight-500.woff',
  'assets/fuentes/GeistMono-400.woff',
  'assets/fuentes/GeistMono-500.woff',
  'assets/favicon.svg',
  'assets/qr-nodo-cero.svg',
  'assets/logos/nodo-cero_horizontal_fondo-oscuro.svg',
  'assets/logos/nodo-cero_simbolo_fondo-oscuro.svg',
  'assets/logos/n8n-logo-white-accent.svg',
  'assets/logos/n8n-symbol-accent.svg',
  'assets/logos/supabase-logo-icon.svg',
  'assets/logos/symbol-light.svg',
  'data/catalogo.json',
];
const ESPERA_MS = 4000;

self.addEventListener('install', (e) => {
  // Si algún archivo falla, los demás se guardan igual.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(BASICO.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves.filter((k) => k.startsWith('nodo-cero-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function esDelSitio(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  return p === '/' || p === '/index.html' || p === '/presentar.html'
    || p.startsWith('/assets/') || p.startsWith('/data/') || /^\/workflows\/[^/]+\.json$/.test(p);
}

function guardada(pedido) {
  return caches.match(pedido, { ignoreSearch: true })
    .then((r) => r || (pedido.mode === 'navigate' ? caches.match('./') : undefined));
}

function primeroLaRed(pedido) {
  return new Promise((resolver) => {
    let listo = false;
    const terminar = (r) => { if (!listo && r) { listo = true; resolver(r); } };
    // Si la red tarda (Wi-Fi saturado), se muestra la copia guardada mientras tanto.
    const reloj = setTimeout(() => guardada(pedido).then(terminar), ESPERA_MS);
    fetch(pedido).then((r) => {
      clearTimeout(reloj);
      if (r.ok && r.type === 'basic') {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(pedido, copia)).catch(() => {});
      }
      terminar(r);
    }).catch(() => {
      clearTimeout(reloj);
      guardada(pedido).then((g) => terminar(g || Response.error()));
    });
  });
}

self.addEventListener('fetch', (e) => {
  const pedido = e.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (!esDelSitio(url)) return;
  e.respondWith(primeroLaRed(pedido));
});
