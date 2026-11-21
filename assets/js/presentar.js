// Nodo Cero · Modo presentación. JavaScript sin dependencias.
// Arma la portada de cada equipo (vista previa y pantalla completa), guarda los datos en este navegador
// (localStorage) y lleva un cronómetro opcional. Todo anda sin internet una vez que la página cargó.
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const CLAVE = 'nodo-cero:presentacion';

  const LINEAS = { ia: 'IA para tu comunidad', web3: 'Web3 con Avalanche Fuji', apps: 'Apps con login y datos', impacto: 'Impacto social y ambiental' };
  const TEC = { n8n: 'n8n', ia: 'IA', avalanche: 'AVALANCHE FUJI', 'google-cloud': 'GOOGLE CLOUD', supabase: 'SUPABASE', clerk: 'CLERK' };
  const ORDEN_TEC = Object.keys(TEC);
  const MINUTOS = [0, 1, 2, 3, 5];

  // Íconos de los nodos del flujo: los logos oficiales van tal cual (n8n, Supabase, Clerk); el resto son íconos genéricos.
  const T = 'fill="none" stroke="#FAFAFA" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';
  const NODO = {
    n8n: { nombre: 'n8n', img: 'assets/logos/n8n-symbol-accent.svg', proporcion: 240 / 96 },
    ia: { nombre: 'IA', trazo: `<path d="M22 12.5Q22 26 35.5 26Q22 26 22 39.5Q22 26 8.5 26Q22 26 22 12.5Z" ${T}/><path d="M35.5 7Q35.5 12.5 41 12.5Q35.5 12.5 35.5 18Q35.5 12.5 30 12.5Q35.5 12.5 35.5 7Z" fill="#FAFAFA"/>` },
    avalanche: { nombre: 'Avalanche Fuji', trazo: `<path d="M24 7.5 38.5 15.8V32.2L24 40.5 9.5 32.2V15.8Z" ${T}/><path d="M9.5 15.8 24 24.1l14.5-8.3M24 24.1v16.4" ${T}/>` },
    'google-cloud': { nombre: 'Google Cloud', trazo: `<path d="M15.5 36H34a8 8 0 0 0 1.2-15.9A11.5 11.5 0 0 0 13.4 22a7 7 0 0 0 2.1 14Z" ${T}/>` },
    supabase: { nombre: 'Supabase', img: 'assets/logos/supabase-logo-icon.svg', proporcion: 109 / 113 },
    clerk: { nombre: 'Clerk', img: 'assets/logos/symbol-light.svg', proporcion: 1 },
    apps: { nombre: 'Apps', trazo: `<rect x="7.5" y="9" width="33" height="30" rx="5" ${T}/><path d="M7.5 16.5h33" ${T}/><circle cx="24" cy="25" r="4.2" ${T}/><path d="M16 39c.9-4.6 4-7 8-7s7.1 2.4 8 7" ${T}/>` },
    impacto: { nombre: 'Impacto', trazo: `<path d="M24 40.5V24" ${T}/><path d="M24 31.5C15.5 31.5 10 26 10 17.5 18.5 17.5 24 23 24 31.5Z" ${T}/><path d="M24 25C24 16.5 29.5 10.5 38 10.5 38 19 32.5 25 24 25Z" ${T}/><path d="M15 40.5h18" ${T}/>` },
  };
  const NODO_DE_LINEA = { ia: 'ia', web3: 'avalanche', apps: 'apps', impacto: 'impacto' };

  // ================================================================ aviso
  const aviso = $('#aviso');
  let temporizadorAviso = 0;
  function avisar(texto) {
    aviso.textContent = texto;
    aviso.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove('visible'), 4200);
  }

  // ================================================================ datos (localStorage, con try/catch: puede estar bloqueado)
  function leer() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      return d && typeof d === 'object' ? d : {};
    } catch { return {}; }
  }
  function guardar(d) {
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* sin almacenamiento: los datos quedan hasta cerrar la pestaña */ }
  }
  function borrarGuardado() {
    try { localStorage.removeItem(CLAVE); } catch { /* nada que borrar */ }
  }

  const form = $('#pres-form');
  const campoProyecto = $('#f-proyecto');
  const campoEquipo = $('#f-equipo');
  const error = $('#error');

  function datosDelForm() {
    return {
      proyecto: campoProyecto.value,
      equipo: campoEquipo.value,
      linea: $('input[name="linea"]:checked', form)?.value || '',
      tec: $$('input[name="tec"]:checked', form).map((x) => x.value),
      minutos: Number($('input[name="minutos"]:checked', form)?.value || 0),
    };
  }
  function limpio(d) {
    const texto = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
    return {
      proyecto: texto(d.proyecto, 80),
      equipo: texto(d.equipo, 60),
      linea: LINEAS[d.linea] ? d.linea : '',
      tec: Array.isArray(d.tec) ? ORDEN_TEC.filter((t) => d.tec.includes(t)) : [],
      minutos: MINUTOS.includes(Number(d.minutos)) ? Number(d.minutos) : 0,
    };
  }
  function cargarAlForm(d) {
    campoProyecto.value = d.proyecto;
    campoEquipo.value = d.equipo;
    $$('input[name="linea"]', form).forEach((x) => { x.checked = x.value === d.linea; });
    $$('input[name="tec"]', form).forEach((x) => { x.checked = d.tec.includes(x.value); });
    $$('input[name="minutos"]', form).forEach((x) => { x.checked = Number(x.value) === d.minutos; });
  }

  // ================================================================ la lámina
  const plantilla = $('#tpl-lamina');
  const vista = $('#vista');
  const portada = $('#portada');
  const portadaLamina = $('#portada-lamina');
  vista.append(plantilla.content.cloneNode(true));
  portadaLamina.append(plantilla.content.cloneNode(true));
  const laminas = [$('.lamina', vista), $('.lamina', portadaLamina)];
  // La vista previa es decorativa (aria-hidden); la de pantalla completa es la que se lee.
  $('.lamina__proyecto', laminas[0]).removeAttribute('id');
  $('.lamina__proyecto', laminas[1]).id = 'portada-titulo';
  $('.lamina__crono', laminas[0]).removeAttribute('role');

  function iconoNodo(n, cx, cy, t) {
    if (n.img) {
      const lado = t * 0.56;
      const w = n.proporcion >= 1 ? lado : lado * n.proporcion;
      const h = n.proporcion >= 1 ? lado / n.proporcion : lado;
      return `<image href="${n.img}" x="${(cx - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`;
    }
    const s = t * 0.6;
    return `<svg x="${(cx - s / 2).toFixed(1)}" y="${(cy - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" viewBox="0 0 48 48">${n.trazo}</svg>`;
  }

  // Nodo Cero → las tecnologías del proyecto → tu proyecto, como un workflow de n8n.
  function flujoSVG(claves, prefijo) {
    const nodos = claves.map((c) => NODO[c]);
    const W = 560, H = 520, cy = H / 2;
    const k = nodos.length;
    const paso = Math.min(132, (H - 70) / k);
    const t = Math.min(84, paso * 0.62);
    const fuente = Math.max(11, Math.min(16, paso * 0.15));
    const xs = 6, ts = 150, pa = xs + ts * 672 / 744;
    const xm = 300, xf = 482, tf = 88, pf = xf - tf / 2;
    let aristas = '', corrientes = '', cajas = '', puertos = '';
    nodos.forEach((n, i) => {
      const y = cy + (i - (k - 1) / 2) * paso;
      const izq = xm - t / 2, der = xm + t / 2;
      const c1 = (pa + izq) / 2, c2 = (der + pf) / 2;
      const a = `M${pa.toFixed(1)} ${cy}C${c1.toFixed(1)} ${cy} ${c1.toFixed(1)} ${y.toFixed(1)} ${izq.toFixed(1)} ${y.toFixed(1)}`;
      const b = `M${der.toFixed(1)} ${y.toFixed(1)}C${c2.toFixed(1)} ${y.toFixed(1)} ${c2.toFixed(1)} ${cy} ${pf} ${cy}`;
      aristas += `<path class="flujo__arista" d="${a}"/><path class="flujo__arista" d="${b}"/>`;
      corrientes += `<path class="flujo__corriente" d="${a}"/><path class="flujo__corriente" d="${b}"/>`;
      cajas += `<g><rect x="${izq.toFixed(1)}" y="${(y - t / 2).toFixed(1)}" width="${t.toFixed(1)}" height="${t.toFixed(1)}" rx="${(t * 0.17).toFixed(1)}" fill="url(#${prefijo}-nodo)" stroke="#4A4A4A" stroke-width="1.5"/>`
        + iconoNodo(n, xm, y, t)
        + `<text x="${xm}" y="${(y + t / 2 + fuente + 6).toFixed(1)}" class="flujo__etiqueta" font-size="${fuente.toFixed(1)}">${n.nombre}</text></g>`;
      puertos += `<circle cx="${izq.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="#FAFAFA"/><circle cx="${der.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="#FAFAFA"/>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="presentation">
<defs><linearGradient id="${prefijo}-nodo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E2E2E"/><stop offset="1" stop-color="#222222"/></linearGradient>
<radialGradient id="${prefijo}-halo"><stop offset="0" stop-color="#FF91AC" stop-opacity=".55"/><stop offset="1" stop-color="#FF91AC" stop-opacity="0"/></radialGradient></defs>
<circle cx="${xs + ts / 2}" cy="${cy}" r="${ts * 0.62}" fill="url(#${prefijo}-halo)" opacity=".7"/>
<circle cx="${xf}" cy="${cy}" r="${tf * 0.95}" fill="url(#${prefijo}-halo)" class="lamina__halo-fin"/>
<g>${aristas}</g><g>${corrientes}</g>${cajas}
<g><image href="assets/logos/nodo-cero_simbolo_fondo-oscuro.svg" x="${xs}" y="${cy - ts / 2}" width="${ts}" height="${ts}"/><text x="${xs + ts / 2}" y="${cy + ts / 2 + 12}" class="flujo__etiqueta flujo__etiqueta--cero" font-size="16">Nodo Cero</text></g>
<g><rect x="${pf}" y="${cy - tf / 2}" width="${tf}" height="${tf}" rx="14" fill="#262626" stroke="#FF91AC" stroke-width="2" stroke-dasharray="7 6"/><path d="M${xf - 14} ${cy}H${xf + 14}M${xf} ${cy - 14}V${cy + 14}" stroke="#FAFAFA" stroke-width="3" stroke-linecap="round"/><text x="${xf}" y="${cy + tf / 2 + 24}" class="flujo__etiqueta" font-size="16">Tu proyecto</text></g>
<g>${puertos}<circle cx="${pa.toFixed(1)}" cy="${cy}" r="7" fill="#FAFAFA"/><circle cx="${pf}" cy="${cy}" r="5.5" fill="#FAFAFA"/></g>
</svg>`;
  }

  function nodosDelFlujo(d) {
    const tec = d.tec.length ? d.tec : (d.linea ? [NODO_DE_LINEA[d.linea]] : ['n8n']);
    return tec.slice(0, 5);
  }

  let ultimoFlujo = '';
  function pintar(d) {
    const proyecto = d.proyecto.trim();
    const equipo = d.equipo.trim();
    const claveFlujo = nodosDelFlujo(d).join(',');
    laminas.forEach((l, i) => {
      const p = $('[data-campo="proyecto"]', l);
      p.textContent = proyecto || 'Tu proyecto';
      p.classList.toggle('vacio', !proyecto);
      const e = $('[data-campo="equipo"]', l);
      e.textContent = equipo || 'Tu equipo';
      e.classList.toggle('vacio', !equipo);
      const linea = $('[data-campo="linea"]', l);
      linea.hidden = !d.linea;
      linea.textContent = d.linea ? `LÍNEA · ${LINEAS[d.linea].toUpperCase()}` : '';
      const lista = $('[data-campo="tec"]', l);
      lista.replaceChildren(...d.tec.map((t) => Object.assign(document.createElement('li'), { textContent: TEC[t] })));
      if (claveFlujo !== ultimoFlujo) $('[data-campo="flujo"]', l).innerHTML = flujoSVG(nodosDelFlujo(d), `lamina-${i}`);
      $('[data-campo="crono"]', l).hidden = !d.minutos;
      $('[data-campo="crono-barra"]', l).hidden = !d.minutos;
    });
    ultimoFlujo = claveFlujo;
    if (crono.total !== d.minutos * 60000) prepararCrono(d.minutos);
    ajustarTodo();
  }

  // El nombre del proyecto se achica hasta que entra (nombres largos, palabras largas, pantallas chicas).
  function ajustar(l) {
    const p = $('.lamina__proyecto', l);
    const caja = $('.lamina__texto', l);
    if (!caja.clientHeight) return;
    const largo = p.textContent.length;
    let tam = largo <= 12 ? 9 : largo <= 24 ? 7.6 : largo <= 40 ? 6.2 : largo <= 60 ? 5 : 4.2;
    p.style.setProperty('--tam', tam);
    for (let i = 0; i < 30 && tam > 2.2 && (caja.scrollHeight > caja.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1); i++) {
      tam = Math.round(tam * 92) / 100;
      p.style.setProperty('--tam', tam);
    }
  }
  let ajustePendiente = 0;
  function ajustarTodo() {
    cancelAnimationFrame(ajustePendiente);
    ajustePendiente = requestAnimationFrame(() => laminas.forEach(ajustar));
  }
  window.addEventListener('resize', ajustarTodo);
  document.fonts?.ready?.then(ajustarTodo);

  // ================================================================ cronómetro
  const crono = { total: 0, resto: 0, corriendo: false, ultimo: 0, intervalo: 0 };
  const botonAlternar = $('#crono-alternar');
  const botonReiniciar = $('#crono-reiniciar');
  const avisoPortada = $('#portada-aviso');

  function prepararCrono(min) {
    detener();
    crono.total = min * 60000;
    crono.resto = crono.total;
    pintarCrono();
  }
  function detener() { crono.corriendo = false; clearInterval(crono.intervalo); }
  function iniciar() {
    if (!crono.total) return;
    if (crono.resto <= 0) crono.resto = crono.total;
    crono.corriendo = true;
    crono.ultimo = performance.now();
    clearInterval(crono.intervalo);
    crono.intervalo = setInterval(tic, 200);
    pintarCrono();
  }
  function pausar() { detener(); pintarCrono(); }
  function alternar() { if (crono.corriendo) pausar(); else iniciar(); }
  function reiniciar() { detener(); crono.resto = crono.total; pintarCrono(); }
  function tic() {
    const ahora = performance.now();
    crono.resto -= ahora - crono.ultimo;
    crono.ultimo = ahora;
    if (crono.resto <= 0) {
      crono.resto = 0;
      detener();
      avisoPortada.textContent = 'Se terminó el tiempo.';
    }
    pintarCrono();
  }
  function pintarCrono() {
    const seg = Math.max(0, Math.ceil(crono.resto / 1000));
    const fin = crono.total > 0 && crono.resto <= 0;
    const texto = fin ? 'Tiempo' : `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
    laminas.forEach((l) => {
      $('[data-campo="crono-dig"]', l).textContent = texto;
      $('[data-campo="crono-rotulo"]', l).textContent = fin ? 'SE TERMINÓ EL' : 'TIEMPO';
      const caja = $('[data-campo="crono"]', l);
      caja.classList.toggle('lamina__crono--final', !fin && crono.resto < crono.total && seg <= 30);
      caja.classList.toggle('lamina__crono--fin', fin);
      $('[data-campo="crono-barra"]', l).style.setProperty('--resto', crono.total ? String(crono.resto / crono.total) : '1');
    });
    botonAlternar.textContent = crono.corriendo ? 'Pausar' : fin ? 'Empezar de nuevo' : crono.resto < crono.total ? 'Seguir' : 'Iniciar cronómetro';
    botonAlternar.hidden = !crono.total;
    botonReiniciar.hidden = !crono.total;
    if (!fin) avisoPortada.textContent = '';
  }
  botonAlternar.addEventListener('click', alternar);
  botonReiniciar.addEventListener('click', reiniciar);

  // ================================================================ formulario
  let datos = limpio(leer());
  cargarAlForm(datos);
  pintar(datos);

  form.addEventListener('input', () => {
    datos = limpio(datosDelForm());
    guardar(datos);
    if (datos.proyecto.trim() || datos.equipo.trim()) {
      error.textContent = '';
      campoProyecto.removeAttribute('aria-invalid');
    }
    pintar(datos);
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); abrir(); });

  const botonBorrar = $('#borrar');
  let confirmarBorrado = 0;
  botonBorrar.addEventListener('click', () => {
    // Dos toques: el primero pide confirmación, así nadie borra sin querer justo antes de presentar.
    if (!confirmarBorrado) {
      botonBorrar.textContent = 'Tocá de nuevo para borrar';
      confirmarBorrado = setTimeout(() => { confirmarBorrado = 0; botonBorrar.textContent = 'Borrar datos'; }, 3500);
      return;
    }
    clearTimeout(confirmarBorrado);
    confirmarBorrado = 0;
    botonBorrar.textContent = 'Borrar datos';
    borrarGuardado();
    datos = limpio({});
    cargarAlForm(datos);
    pintar(datos);
    avisar('Listo: tus datos se borraron de este navegador.');
    campoProyecto.focus();
  });

  // ================================================================ pantalla completa
  const botonAbrir = $('#abrir');
  const botonCerrar = $('#cerrar');
  let quieto = 0;

  function despertar() {
    portada.classList.remove('portada--quieta');
    clearTimeout(quieto);
    quieto = setTimeout(() => portada.classList.add('portada--quieta'), 2600);
  }

  async function abrir() {
    if (!datos.proyecto.trim() && !datos.equipo.trim()) {
      error.textContent = 'Escribí el nombre del proyecto o del equipo para armar la portada.';
      campoProyecto.setAttribute('aria-invalid', 'true');
      campoProyecto.focus();
      return;
    }
    error.textContent = '';
    portada.hidden = false;
    document.body.classList.add('con-portada');
    reiniciar();
    despertar();
    portada.focus({ preventScroll: true });
    ajustarTodo();
    try {
      if (portada.requestFullscreen) await portada.requestFullscreen({ navigationUI: 'hide' });
      else if (portada.webkitRequestFullscreen) portada.webkitRequestFullscreen();
    } catch { /* sin pantalla completa (por ejemplo, en iPhone): la portada igual ocupa toda la ventana */ }
    ajustarTodo();
  }

  function cerrar() {
    if (portada.hidden) return;
    detener();
    portada.hidden = true;
    document.body.classList.remove('con-portada');
    clearTimeout(quieto);
    const enPantallaCompleta = document.fullscreenElement || document.webkitFullscreenElement;
    if (enPantallaCompleta) {
      try { (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {}); } catch { /* ya salió */ }
    }
    pintarCrono();
    ajustarTodo();
    botonAbrir.focus();
    // Al salir de pantalla completa el navegador puede mover el foco: se devuelve al botón.
    setTimeout(() => { if (portada.hidden && document.activeElement !== botonAbrir) botonAbrir.focus(); }, 250);
  }

  botonAbrir.addEventListener('click', abrir);
  botonCerrar.addEventListener('click', cerrar);
  const alSalirDePantallaCompleta = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) cerrar();
    else ajustarTodo();
  };
  document.addEventListener('fullscreenchange', alSalirDePantallaCompleta);
  document.addEventListener('webkitfullscreenchange', alSalirDePantallaCompleta);
  portada.addEventListener('pointermove', despertar);
  portada.addEventListener('pointerdown', despertar);

  document.addEventListener('keydown', (e) => {
    if (portada.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    if (e.key === 'Tab') {
      // El foco queda dentro de la portada (es una ventana modal).
      despertar();
      const botones = $$('button', portada).filter((b) => !b.hidden);
      if (!botones.length) return;
      const i = botones.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); botones[botones.length - 1].focus(); }
      else if (!e.shiftKey && (i === -1 || i === botones.length - 1)) { e.preventDefault(); botones[0].focus(); }
      return;
    }
    if (e.target.closest?.('button')) return; // los botones ya responden a Espacio y Enter
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); alternar(); }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); reiniciar(); }
  });

  // ================================================================ sin conexión
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
