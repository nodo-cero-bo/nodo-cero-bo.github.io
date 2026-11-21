// Nodo Cero · Hackathon n8n Bolivia. JavaScript mínimo, sin dependencias.
// Catálogo de workflows (filtros por línea, tecnología y nivel; copiar, descargar), las 4 líneas,
// guías, agenda en vivo, chispas de la portada y respeto por prefers-reduced-motion.
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ================================================================ aviso
  const aviso = $('#aviso');
  let temporizadorAviso = 0;
  function avisar(texto, error = false) {
    aviso.textContent = texto;
    aviso.classList.toggle('aviso--error', error);
    aviso.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), error ? 6000 : 4200);
  }

  // ================================================================ portapapeles
  const esSafari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);

  function copiarConRespaldo(texto) {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }

  async function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(texto); return true; } catch { /* se prueba el respaldo */ }
    }
    return copiarConRespaldo(texto);
  }

  // Los workflows se piden una vez y quedan en memoria (se adelantan al pasar el mouse).
  const pedidos = new Map();
  const textos = new Map();
  function traer(url) {
    if (!pedidos.has(url)) {
      const p = fetch(url, { cache: 'no-cache' })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
        .then((t) => { JSON.parse(t); textos.set(url, t); return t; })
        .catch((e) => { pedidos.delete(url); throw e; });
      pedidos.set(url, p);
    }
    return pedidos.get(url);
  }

  async function copiarWorkflow(url) {
    // Si ya está en memoria, se copia sin esperar: el navegador conserva el gesto del clic.
    if (textos.has(url)) {
      if (await copiarTexto(textos.get(url))) return;
      throw new Error('portapapeles');
    }
    // Safari pide escribir el portapapeles dentro del clic: se le pasa la promesa.
    if (esSafari && window.ClipboardItem && navigator.clipboard?.write && window.isSecureContext) {
      const blob = traer(url).then((t) => new Blob([t], { type: 'text/plain' }));
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return;
    }
    const texto = await traer(url);
    if (!(await copiarTexto(texto))) throw new Error('portapapeles');
  }

  $$('[data-copiar-texto]').forEach((b) => {
    b.addEventListener('click', async () => {
      const ok = await copiarTexto(b.dataset.copiarTexto);
      avisar(ok ? (b.dataset.aviso || 'Copiado') : 'No se pudo copiar: seleccioná el texto y copialo a mano.', !ok);
    });
  });

  // ================================================================ catálogo
  const CATEGORIA = { fundamentos: 'Fundamentos', ia: 'IA', avalanche: 'Avalanche Fuji', clerk: 'Clerk', supabase: 'Supabase', proyectos: 'Proyecto completo', 'google-cloud': 'Google Cloud', casos: 'Caso de uso' };
  const TECNOLOGIA = { n8n: 'n8n', ia: 'IA', avalanche: 'AVALANCHE', clerk: 'CLERK', supabase: 'SUPABASE', 'google-cloud': 'GOOGLE CLOUD' };
  // Las 4 líneas de la hackathon: nombre corto para los chips de cada tarjeta y nombre completo para el título.
  const LINEA = { ia: 'IA', web3: 'WEB3', apps: 'APPS', impacto: 'IMPACTO' };
  const LINEA_NOMBRE = { ia: 'IA para tu comunidad', web3: 'Web3 con Avalanche Fuji', apps: 'Apps con login y datos', impacto: 'Impacto social y ambiental' };
  const NIVEL = { inicial: 'Inicial', intermedio: 'Intermedio', avanzado: 'Avanzado' };
  const ICONO_OK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.4 4.8 9 10 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const lista = $('#catalogo');
  const estado = $('#catalogo-estado');
  const filtros = { linea: '', tec: '', nivel: '', sinCredenciales: false };
  let tarjetas = [];

  function el(etiqueta, atributos = {}, ...hijos) {
    const n = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(atributos)) {
      if (v === false || v === null || v === undefined) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('data-')) n.setAttribute(k, v);
      else if (k in n && typeof v !== 'string') n[k] = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const h of hijos.flat()) if (h !== null && h !== undefined && h !== false) n.append(h);
    return n;
  }

  function cargarScript(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = mal;
      document.head.appendChild(s);
    });
  }

  async function leerCatalogo() {
    // Abierta como archivo (doble clic, sin servidor): el navegador no deja usar fetch, se usa la copia en JavaScript.
    if (location.protocol === 'file:') {
      try { await cargarScript('data/catalogo.js'); return window.CATALOGO_NODO_CERO || null; } catch { return null; }
    }
    try {
      const r = await fetch('data/catalogo.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } catch {
      // Si falla el JSON, se prueba la copia en JavaScript.
      try { await cargarScript('data/catalogo.js'); return window.CATALOGO_NODO_CERO || null; } catch { return null; }
    }
  }

  function tarjetaWorkflow(w) {
    const pronto = !w.disponible;
    const num = String(w.orden ?? w.id.slice(0, 2)).padStart(2, '0');
    let insignia;
    if (pronto) insignia = el('span', { class: 'insignia insignia--pronto' }, 'Pronto');
    else if (w.probado === 'ejecutado') insignia = el('span', { class: 'insignia insignia--probado', title: 'Corrió de verdad en n8n y dio el resultado esperado', html: `${ICONO_OK}Probado` });
    else insignia = el('span', { class: 'insignia insignia--auditado', title: 'Pasa el auditor e importa bien; para correr necesita tus cuentas' }, 'Auditado');

    const datos = el('ul', { class: 'wf__datos', 'aria-label': 'Datos' },
      el('li', {}, NIVEL[w.nivel] || w.nivel),
      w.minutos ? el('li', {}, `${w.minutos} min`) : null,
      w.nodos ? el('li', {}, `${w.nodos} ${w.nodos === 1 ? 'nodo' : 'nodos'}`) : null);

    const tec = el('ul', { class: 'wf__tec', 'aria-label': 'Tecnologías' }, (w.tecnologias || []).map((t) => el('li', {}, TECNOLOGIA[t] || t)));

    // Si sirve a las cuatro líneas, un chip en lugar de cuatro.
    const lineasWf = (w.lineas || []).filter((l) => LINEA[l]);
    const lineas = lineasWf.length
      ? el('ul', { class: 'wf__lineas', 'aria-label': 'Líneas' },
        lineasWf.length === Object.keys(LINEA).length
          ? el('li', { title: 'Sirve para las cuatro líneas' }, 'LAS 4 LÍNEAS')
          : lineasWf.map((l) => el('li', { title: `Línea ${LINEA_NOMBRE[l]}` }, LINEA[l])))
      : null;

    const creds = (w.credenciales || []).length
      ? el('p', { class: 'wf__creds' }, el('b', {}, 'Credenciales: '), w.credenciales.map((c) => c.nombre).join(' · '))
      : el('p', { class: 'wf__creds' }, el('b', {}, 'Sin credenciales: '), 'lo importás y lo probás');

    const archivo = w.archivo || `workflows/${w.id}.json`;
    const copiar = el('button', { type: 'button', class: 'boton boton--rosa wf__copiar', disabled: pronto, 'data-accion': 'copiar', 'data-url': archivo },
      pronto ? 'Llega pronto' : 'Copiar workflow');
    const crudo = el('button', { type: 'button', class: 'boton boton--borde wf__crudo', disabled: pronto, 'data-accion': 'crudo', 'data-url': w.crudo, title: 'Para pegar en n8n: menú de tres puntos → Import from URL' },
      'Copiar enlace crudo');
    const github = pronto
      ? el('button', { type: 'button', class: 'boton boton--borde', disabled: true }, 'Ver en GitHub')
      : el('a', { class: 'boton boton--borde', href: w.github, target: '_blank', rel: 'noopener' }, 'Ver en GitHub');
    const descargar = pronto
      ? el('button', { type: 'button', class: 'boton boton--borde', disabled: true }, 'Descargar')
      : el('a', { class: 'boton boton--borde', href: archivo, download: `nodo-cero-${w.id}.json` }, 'Descargar');

    const t = el('article', { class: `wf tarjeta${pronto ? ' wf--pronto' : ''}`, 'data-id': w.id, 'aria-labelledby': `wf-${w.id}` },
      el('div', { class: 'wf__cabeza' }, el('span', { class: 'wf__num' }, num), el('span', { class: 'wf__cat' }, CATEGORIA[w.categoria] || w.categoria), insignia),
      el('h3', { id: `wf-${w.id}` }, w.titulo),
      el('p', { class: 'wf__resumen' }, w.resumen),
      datos, tec, lineas, creds,
      el('div', { class: 'wf__acciones' }, copiar, crudo, github, descargar));
    t._datos = w;
    return t;
  }

  // Sin filtros se muestran los primeros (9 en compu, 6 en celular) y un botón para ver todos.
  const cajaMas = $('#catalogo-mas');
  const botonMas = $('#catalogo-ver-todos');
  const enCelu = window.matchMedia('(max-width: 640px)');
  let verTodos = false;

  function aplicarFiltros() {
    let visibles = 0;
    const sinFiltros = !filtros.linea && !filtros.tec && !filtros.nivel && !filtros.sinCredenciales;
    const tope = sinFiltros && !verTodos ? (enCelu.matches ? 6 : 9) : Infinity;
    for (const t of tarjetas) {
      const w = t._datos;
      const ok = (!filtros.linea || (w.lineas || []).includes(filtros.linea))
        && (!filtros.tec || (w.tecnologias || []).includes(filtros.tec))
        && (!filtros.nivel || w.nivel === filtros.nivel)
        && (!filtros.sinCredenciales || !(w.credenciales || []).length);
      t.classList.toggle('oculto-filtro', !ok || visibles >= tope);
      if (ok) visibles++;
    }
    const vacio = $('.catalogo__vacio', lista);
    if (!visibles && !vacio) lista.append(el('p', { class: 'catalogo__vacio' }, 'No hay workflows con esos filtros. Probá con otra combinación.'));
    if (visibles && vacio) vacio.remove();
    const total = tarjetas.length;
    const listos = tarjetas.filter((t) => t._datos.disponible).length;
    const filtrado = visibles === total ? `${total} workflows` : `${visibles} de ${total} workflows`;
    estado.textContent = listos === total ? filtrado : `${filtrado} · ${listos} listos para copiar, el resto llega pronto`;
    if (cajaMas && botonMas) {
      const ocultos = visibles - Math.min(visibles, tope);
      cajaMas.hidden = ocultos <= 0;
      botonMas.textContent = `Ver los ${visibles} workflows`;
      botonMas.setAttribute('aria-expanded', String(ocultos <= 0));
    }
  }
  botonMas?.addEventListener('click', () => {
    const primeroOculto = tarjetas.find((t) => t.classList.contains('oculto-filtro'));
    verTodos = true;
    aplicarFiltros();
    // El foco pasa a la primera tarjeta nueva, para seguir con el teclado desde ahí.
    const destino = primeroOculto && $('h3', primeroOculto);
    if (destino) { destino.setAttribute('tabindex', '-1'); destino.focus({ preventScroll: false }); }
  });
  enCelu.addEventListener?.('change', () => { if (tarjetas.length) aplicarFiltros(); });

  function elegir(grupo, valor) {
    const contenedor = $(`.filtros__chips[data-filtro="${grupo}"]`);
    if (!contenedor) return;
    $$('.chip', contenedor).forEach((c) => c.setAttribute('aria-checked', String(c.dataset.valor === valor)));
    filtros[grupo] = valor;
    aplicarFiltros();
  }

  $$('.filtros__chips').forEach((grupo) => {
    grupo.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) elegir(grupo.dataset.filtro, chip.dataset.valor);
    });
    // Flechas del teclado dentro del grupo (patrón radiogroup).
    grupo.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const chips = $$('.chip', grupo);
      const i = chips.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const j = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + chips.length) % chips.length;
      chips[j].focus();
      elegir(grupo.dataset.filtro, chips[j].dataset.valor);
    });
  });
  $('#filtro-sin-credenciales')?.addEventListener('change', (e) => { filtros.sinCredenciales = e.target.checked; aplicarFiltros(); });
  // Los botones de otras secciones (Avalanche, Google Cloud, Supabase, Clerk, las 4 líneas) filtran el catálogo.
  function limpiarFiltros() {
    for (const g of ['linea', 'tec', 'nivel']) {
      filtros[g] = '';
      const contenedor = $(`.filtros__chips[data-filtro="${g}"]`);
      if (contenedor) $$('.chip', contenedor).forEach((c) => c.setAttribute('aria-checked', String(c.dataset.valor === '')));
    }
    const sc = $('#filtro-sin-credenciales'); if (sc) { sc.checked = false; filtros.sinCredenciales = false; }
    tarjetas.forEach((x) => x.classList.toggle('wf--destacado', false));
  }
  $$('[data-filtrar]').forEach((a) => a.addEventListener('click', () => { limpiarFiltros(); elegir('tec', a.dataset.filtrar); }));
  $$('[data-filtrar-linea]').forEach((a) => a.addEventListener('click', () => { limpiarFiltros(); elegir('linea', a.dataset.filtrarLinea); }));

  // «Para arrancar» de cada línea: filtra por la línea, baja hasta la tarjeta del workflow y la ilumina.
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[data-wf]');
    if (!a || !tarjetas.length) return;
    const t = tarjetas.find((x) => x._datos.id === a.dataset.wf);
    if (!t) return; // sin catálogo, el enlace lleva a la sección y listo
    e.preventDefault();
    limpiarFiltros();
    elegir('linea', a.dataset.linea || '');
    void t.offsetWidth; // reinicia la animación si se toca dos veces seguidas
    t.classList.add('wf--destacado');
    t.scrollIntoView({ behavior: movimientoReducido.matches ? 'auto' : 'smooth', block: 'center' });
    const titulo = $('h3', t);
    if (titulo) { titulo.setAttribute('tabindex', '-1'); titulo.focus({ preventScroll: true }); }
    history.replaceState(null, '', '#workflows');
  });

  // Con el catálogo cargado: los workflows nuevos reemplazan a los de respaldo en «Para arrancar»
  // y cada botón de línea dice cuántos workflows tiene.
  function completarLineas(todos) {
    const porId = new Map(todos.map((w) => [w.id, w]));
    $$('a[data-wf-preferido]').forEach((a) => {
      const w = porId.get(a.dataset.wfPreferido);
      if (!w || !w.disponible) return;
      const repetido = $$('a[data-wf]', a.closest('ol') || document).some((x) => x !== a && x.dataset.wf === w.id);
      if (repetido) return;
      a.dataset.wf = w.id;
      const num = $('.linea__wf-num', a); if (num) num.textContent = String(w.orden ?? w.id.slice(0, 2)).padStart(2, '0');
      const tit = $('.linea__wf-titulo', a); if (tit) tit.textContent = w.titulo;
    });
    $$('[data-filtrar-linea]').forEach((b) => {
      const n = todos.filter((w) => (w.lineas || []).includes(b.dataset.filtrarLinea)).length;
      if (n) b.textContent = `Ver los ${n} workflows de esta línea`;
    });
    // Un filtro que hoy no encontraría nada (por ejemplo, una tecnología cuyos workflows todavía
    // no se publicaron) no se muestra: así nadie llega a un catálogo vacío.
    const hay = (campo, valor) => todos.some((w) => (w[campo] || []).includes(valor));
    $$('.filtros__chips[data-filtro="tec"] .chip:not([data-valor=""])').forEach((c) => { c.hidden = !hay('tecnologias', c.dataset.valor); });
    $$('.filtros__chips[data-filtro="linea"] .chip:not([data-valor=""])').forEach((c) => { c.hidden = !hay('lineas', c.dataset.valor); });
    $$('[data-filtrar]').forEach((a) => { a.hidden = !hay('tecnologias', a.dataset.filtrar); });
  }

  lista?.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-accion]');
    if (!b || b.disabled) return;
    if (b.dataset.accion === 'copiar') {
      const original = b.textContent;
      b.textContent = 'Copiando…';
      try {
        await copiarWorkflow(b.dataset.url);
        avisar('Copiado: pegalo en el canvas de n8n con Ctrl+V');
        b.textContent = 'Copiado';
      } catch {
        avisar(location.protocol === 'file:'
          ? 'Abriste la página como archivo: para copiar, servila con un servidor local (mirá el README) o usá «Descargar».'
          : 'No se pudo copiar. Probá de nuevo o usá «Descargar».', true);
        b.textContent = original;
      }
      setTimeout(() => { b.textContent = original; }, 2200);
    } else if (b.dataset.accion === 'crudo') {
      const ok = await copiarTexto(b.dataset.url);
      avisar(ok ? 'Enlace copiado: en n8n, abrí el menú de tres puntos → Import from URL y pegalo.' : 'No se pudo copiar el enlace.', !ok);
    }
  });
  // Adelanta la descarga del JSON cuando el puntero o el foco llegan al botón.
  const adelantar = (e) => {
    const b = e.target.closest?.('button[data-accion="copiar"]');
    if (b && !b.disabled) traer(b.dataset.url).catch(() => {});
  };
  lista?.addEventListener('pointerover', adelantar);
  lista?.addEventListener('focusin', adelantar);

  (async () => {
    if (!lista) return;
    const cat = await leerCatalogo();
    if (!cat || !Array.isArray(cat.workflows)) {
      estado.innerHTML = 'No se pudo cargar el catálogo. Están todos en <a href="https://github.com/nodo-cero-bo/workflows">el repo de workflows</a>.';
      return;
    }
    tarjetas = cat.workflows.map(tarjetaWorkflow);
    lista.replaceChildren(...tarjetas);
    aplicarFiltros();
    completarLineas(cat.workflows);
  })();

  // ================================================================ agenda en vivo
  const DIA = '2026-11-21';
  function horaBolivia() {
    const forzada = new URLSearchParams(location.search).get('ahora'); // para probar: ?ahora=2026-11-21T10:15
    if (forzada && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(forzada)) return { fecha: forzada.slice(0, 10), hm: forzada.slice(11) };
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hm: `${partes.hour}:${partes.minute}` };
  }
  function marcarAgenda() {
    const { fecha, hm } = horaBolivia();
    for (const li of $$('#agenda-lista .agenda__item')) {
      li.classList.remove('agenda__item--ahora', 'agenda__item--pasado');
      $('.agenda__ahora', li)?.remove();
      li.removeAttribute('aria-current');
      if (fecha !== DIA) continue;
      const { desde, hasta } = li.dataset;
      if (hm >= hasta) li.classList.add('agenda__item--pasado');
      else if (hm >= desde) {
        li.classList.add('agenda__item--ahora');
        li.setAttribute('aria-current', 'time');
        li.append(el('span', { class: 'agenda__ahora' }, 'AHORA'));
      }
    }
  }
  marcarAgenda();
  setInterval(marcarAgenda, 60000);

  // ================================================================ menú del celular
  const botonMenu = $('.cabecera__menu');
  const menu = $('#menu');
  function cerrarMenu() { menu.classList.remove('abierto'); botonMenu.setAttribute('aria-expanded', 'false'); }
  botonMenu?.addEventListener('click', () => {
    const abierto = menu.classList.toggle('abierto');
    botonMenu.setAttribute('aria-expanded', String(abierto));
  });
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) cerrarMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('abierto')) { cerrarMenu(); botonMenu.focus(); } });

  // ================================================================ brillo de las tarjetas
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest?.('.tarjeta');
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', `${e.clientX - r.left}px`);
    t.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  // ================================================================ agregar Fuji a la wallet
  const botonFuji = $('#agregar-fuji');
  if (botonFuji && window.ethereum && typeof window.ethereum.request === 'function') {
    botonFuji.hidden = false;
    botonFuji.addEventListener('click', async () => {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xa869',
            chainName: 'Avalanche Fuji C-Chain',
            nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
            rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
            blockExplorerUrls: ['https://build.avax.network/explorer/fuji/c-chain'],
          }],
        });
        avisar('Listo: Fuji quedó en tu wallet.');
      } catch {
        avisar('La wallet no agregó la red. Probá de nuevo o activá el modo testnet en Core.', true);
      }
    });
  }

  // ================================================================ portada: chispas y movimiento
  const flujos = $$('svg.flujo');
  const lienzo = $('#chispas');
  const heroe = $('#inicio');
  const ctx = lienzo?.getContext('2d');
  let chispas = [];
  let animando = false;
  let visible = true;
  let ancho = 0, alto = 0, escala = 1;

  function medir() {
    if (!lienzo) return;
    escala = Math.min(window.devicePixelRatio || 1, 2);
    ancho = lienzo.clientWidth; alto = lienzo.clientHeight;
    lienzo.width = Math.round(ancho * escala); lienzo.height = Math.round(alto * escala);
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    const cantidad = ancho < 640 ? 30 : 64;
    chispas = Array.from({ length: cantidad }, () => nuevaChispa(true));
  }
  function nuevaChispa(inicio) {
    // Más chispas del lado del flujo (derecha en compu, abajo en celular).
    const enCelu = ancho < 960;
    const x = enCelu ? Math.random() * ancho : ancho * (0.35 + Math.random() * 0.65);
    return {
      x, y: inicio ? Math.random() * alto : alto + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.12 + Math.random() * 0.42,
      vx: (Math.random() - 0.5) * 0.12,
      fase: Math.random() * Math.PI * 2,
      rosa: Math.random() < 0.7,
    };
  }
  function dibujar(t, mover) {
    ctx.clearRect(0, 0, ancho, alto);
    ctx.globalCompositeOperation = 'lighter';
    for (const c of chispas) {
      if (mover) {
        c.y -= c.vy; c.x += c.vx + Math.sin(t / 1800 + c.fase) * 0.08;
        if (c.y < -10) Object.assign(c, nuevaChispa(false));
      }
      const brillo = 0.45 + 0.55 * Math.abs(Math.sin(t / 900 + c.fase));
      const color = c.rosa ? '255,145,172' : '255,232,236';
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r * 6);
      g.addColorStop(0, `rgba(${color},${0.55 * brillo})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,250,251,${0.85 * brillo})`;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function bucle(t) {
    if (!animando) return;
    dibujar(t, true);
    requestAnimationFrame(bucle);
  }
  function arrancar() {
    if (!ctx || animando || movimientoReducido.matches || !visible || document.hidden) return;
    animando = true;
    requestAnimationFrame(bucle);
  }
  function frenar() { animando = false; }

  function aplicarMovimiento() {
    if (movimientoReducido.matches) {
      frenar();
      if (ctx) dibujar(1200, false);
      flujos.forEach((s) => { try { s.pauseAnimations(); s.setCurrentTime(1.5); } catch { /* sin SMIL */ } });
    } else {
      flujos.forEach((s) => { try { s.unpauseAnimations(); } catch { /* sin SMIL */ } });
      arrancar();
    }
  }

  if (lienzo && ctx) {
    medir();
    let espera = 0;
    window.addEventListener('resize', () => {
      clearTimeout(espera);
      espera = setTimeout(() => { medir(); if (!animando) dibujar(1200, false); }, 150);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entrada]) => {
        visible = entrada.isIntersecting;
        if (visible) arrancar(); else frenar();
        flujos.forEach((s) => { try { if (visible && !movimientoReducido.matches) s.unpauseAnimations(); else if (!visible) s.pauseAnimations(); } catch { /* sin SMIL */ } });
      }).observe(heroe);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) frenar(); else arrancar(); });
  }
  movimientoReducido.addEventListener?.('change', aplicarMovimiento);
  aplicarMovimiento();
})();
