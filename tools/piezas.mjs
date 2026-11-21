#!/usr/bin/env node
// Arma las piezas estáticas de index.html (y de tools/og.html):
//   - el flujo de nodos de la portada (dos versiones: compu y celular),
//   - la grilla de mentoría, desde data/mentoria.json.
// Escribe entre los marcadores <!-- heroe:inicio --> / <!-- heroe:fin --> y
// <!-- mentoria:inicio --> / <!-- mentoria:fin -->. Se corre a mano cuando cambia algo:
//   node tools/piezas.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CICLO = 4.8; // segundos que dura una vuelta del flujo

// ------------------------------------------------------------------ íconos
const icono = {
  ia: (cx, cy, s) => {
    const R = 15 * s, r = 6 * s;
    const estrella = (x, y, k) => `M${x} ${y - k}Q${x} ${y} ${x + k} ${y}Q${x} ${y} ${x} ${y + k}Q${x} ${y} ${x - k} ${y}Q${x} ${y} ${x} ${y - k}Z`;
    return `<path d="${estrella(cx - 3 * s, cy + 3 * s, R)}" fill="none" stroke="#FAFAFA" stroke-width="${2.2 * s}" stroke-linejoin="round"/>` +
      `<path d="${estrella(cx + 12 * s, cy - 12 * s, r)}" fill="#FAFAFA"/>`;
  },
  fuji: (cx, cy, s) => {
    const a = 16 * s, h = a * 0.58;
    const p = (dx, dy) => `${(cx + dx).toFixed(1)} ${(cy + dy).toFixed(1)}`;
    return `<path d="M${p(0, -a)}L${p(a * 0.87, -h / 1.16)}L${p(a * 0.87, h)}L${p(0, a + h * 0.2)}L${p(-a * 0.87, h)}L${p(-a * 0.87, -h / 1.16)}Z" fill="none" stroke="#FAFAFA" stroke-width="${2.2 * s}" stroke-linejoin="round"/>` +
      `<path d="M${p(-a * 0.87, -h / 1.16)}L${p(0, 0)}L${p(a * 0.87, -h / 1.16)}M${p(0, 0)}L${p(0, a + h * 0.2)}" fill="none" stroke="#FAFAFA" stroke-width="${2.2 * s}" stroke-linejoin="round"/>`;
  },
  supabase: (cx, cy, s) => { const w = 34 * s, h = w * 113 / 109; return `<image href="assets/logos/supabase-logo-icon.svg" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}"/>`; },
  clerk: (cx, cy, s) => { const w = 36 * s; return `<image href="assets/logos/symbol-light.svg" x="${cx - w / 2}" y="${cy - w / 2}" width="${w}" height="${w}"/>`; },
  mas: (cx, cy, s) => `<path d="M${cx - 14 * s} ${cy}H${cx + 14 * s}M${cx} ${cy - 14 * s}V${cy + 14 * s}" stroke="#FAFAFA" stroke-width="${3 * s}" stroke-linecap="round"/>`,
};

// ------------------------------------------------------------------ flujo
// geo: { ancho, alto, cero:{x,y,lado}, medio:{x,lado,ys[]}, fin:{x,y,lado}, etiqueta, escala }
function flujo(id, geo, clase) {
  const { cero, medio, fin } = geo;
  const s = geo.escala;
  const nodos = [
    { tipo: 'ia', nombre: 'Agente de IA' },
    { tipo: 'supabase', nombre: 'Supabase' },
    { tipo: 'clerk', nombre: 'Clerk' },
    { tipo: 'fuji', nombre: 'Avalanche Fuji' },
  ];
  const puerto = 6.5 * s;
  const curva = (x1, y1, x2, y2) => {
    const dx = Math.max(40 * s, (x2 - x1) * 0.5);
    return `M${x1} ${y1}C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
  };
  const salidaCero = { x: cero.x + cero.lado, y: cero.y + cero.lado / 2 };
  const entradaFin = { x: fin.x, y: fin.y + fin.lado / 2 };

  let defs = `<defs>
  <filter id="${id}-desenfoque" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${16 * s}"/></filter>
  <filter id="${id}-brillo" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="${3 * s}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="${id}-nodo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E2E2E"/><stop offset="1" stop-color="#222222"/></linearGradient>
</defs>`;

  let aristas = '', flujos = '', halos = '', cajas = '', puertos = '', pulsos = '';
  const t = (seg) => (seg / CICLO).toFixed(4);

  // Halo del nodo cero: late al arrancar cada vuelta.
  halos += halo(cero.x, cero.y, cero.lado, cero.lado, 0.0, 0.85, 'cero');

  nodos.forEach((n, i) => {
    const y = medio.ys[i];
    const entrada = { x: medio.x, y: y };
    const salida = { x: medio.x + medio.lado, y: y };
    const d1 = curva(salidaCero.x, salidaCero.y, entrada.x, entrada.y);
    const d2 = curva(salida.x, salida.y, entradaFin.x, entradaFin.y);
    aristas += `<path id="${id}-a${i}" class="flujo__arista" d="${d1}"/><path id="${id}-b${i}" class="flujo__arista" d="${d2}"/>`;
    flujos += `<path class="flujo__corriente" d="${d1}"/><path class="flujo__corriente" d="${d2}"/>`;
    const ini1 = 0.15 + i * 0.12, fin1 = ini1 + 1.05;
    const ini2 = 1.75 + i * 0.12, fin2 = ini2 + 1.05;
    pulsos += pulso(`${id}-a${i}`, ini1, fin1) + pulso(`${id}-b${i}`, ini2, fin2);
    halos += halo(medio.x, y - medio.lado / 2, medio.lado, medio.lado, fin1 - 0.05, 0.75);
    cajas += `<g class="flujo__nodo"><rect x="${medio.x}" y="${y - medio.lado / 2}" width="${medio.lado}" height="${medio.lado}" rx="${14 * s}" fill="url(#${id}-nodo)" stroke="#4A4A4A" stroke-width="${1.5 * s}"/>` +
      icono[n.tipo](medio.x + medio.lado / 2, y, s) +
      `<text x="${medio.x + medio.lado / 2}" y="${y + medio.lado / 2 + geo.etiqueta + 6 * s}" class="flujo__etiqueta" font-size="${geo.etiqueta}">${n.nombre}</text></g>`;
    puertos += circ(entrada.x, entrada.y, puerto) + circ(salida.x, salida.y, puerto);
  });

  // Nodo final: «Tu proyecto», el «+» del canvas de n8n.
  halos += halo(fin.x, fin.y, fin.lado, fin.lado, 1.75 + 0.36 + 1.05, 0.9);
  cajas += `<g class="flujo__nodo flujo__nodo--fin"><rect x="${fin.x}" y="${fin.y}" width="${fin.lado}" height="${fin.lado}" rx="${14 * s}" fill="#262626" stroke="#FF91AC" stroke-width="${2 * s}" stroke-dasharray="${7 * s} ${6 * s}"/>` +
    icono.mas(fin.x + fin.lado / 2, fin.y + fin.lado / 2, s) +
    `<text x="${fin.x + fin.lado / 2}" y="${fin.y + fin.lado + geo.etiqueta + 6 * s}" class="flujo__etiqueta" font-size="${geo.etiqueta}">Tu proyecto</text></g>`;
  puertos += circ(entradaFin.x, entradaFin.y, puerto);

  // Nodo cero: el símbolo oficial (archivo del kit, sin redibujar) con su etiqueta debajo.
  const k = cero.lado / 600; // el símbolo trae 72 px de aire alrededor de un cuadrado de 600
  const nodoCero = `<g class="flujo__nodo flujo__nodo--cero"><image href="assets/logos/nodo-cero_simbolo_fondo-oscuro.svg" x="${(cero.x - 72 * k).toFixed(1)}" y="${(cero.y - 72 * k).toFixed(1)}" width="${(744 * k).toFixed(1)}" height="${(744 * k).toFixed(1)}"/>` +
    `<text x="${cero.x + cero.lado / 2}" y="${cero.y + cero.lado + geo.etiqueta + 8 * s}" class="flujo__etiqueta flujo__etiqueta--cero" font-size="${geo.etiqueta + 1}">Nodo Cero</text></g>`;
  puertos += circ(salidaCero.x, salidaCero.y, puerto * 1.25);

  return `<svg class="flujo ${clase}" id="${id}" viewBox="0 0 ${geo.ancho} ${geo.alto}" role="img" aria-labelledby="${id}-titulo">
<title id="${id}-titulo">Un workflow de n8n: del Nodo Cero salen conexiones rosas hacia un agente de IA, Supabase, Clerk y Avalanche Fuji, que se juntan en tu proyecto.</title>
${defs}
<g class="flujo__halos">${halos}</g>
<g class="flujo__aristas">${aristas}</g>
<g class="flujo__corrientes">${flujos}</g>
${cajas}
${nodoCero}
<g class="flujo__puertos">${puertos}</g>
<g class="flujo__pulsos" filter="url(#${id}-brillo)">${pulsos}</g>
</svg>`;

  function circ(x, y, r) { return `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="#FAFAFA"/>`; }

  function halo(x, y, w, h, enSeg, pico, extra = '') {
    const a = Math.max(0.001, enSeg / CICLO), b = Math.min(0.97, a + 0.05), c = Math.min(0.98, a + 0.2);
    const base = extra === 'cero' ? 0.45 : 0.12;
    const keyTimes = [0, a, b, c, 0.99, 1].map((v) => v.toFixed(4)).join(';');
    const values = [base, base, pico, base + 0.15, base, base].join(';');
    return `<rect x="${x - 6 * s}" y="${y - 6 * s}" width="${w + 12 * s}" height="${h + 12 * s}" rx="${20 * s}" fill="#FF91AC" filter="url(#${id}-desenfoque)" opacity="${base}" class="flujo__halo">` +
      `<animate attributeName="opacity" dur="${CICLO}s" repeatCount="indefinite" keyTimes="${keyTimes}" values="${values}"/></rect>`;
  }

  function pulso(camino, ini, fin) {
    const a = t(ini), b = t(fin);
    const a2 = (ini / CICLO + 0.004).toFixed(4), b2 = (fin / CICLO - 0.004).toFixed(4);
    return `<circle r="${4.5 * s}" fill="#FFE8EC" opacity="0" class="flujo__pulso">` +
      `<animateMotion dur="${CICLO}s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;${a};${b};1" calcMode="spline" keySplines="0 0 1 1;0.45 0 0.55 1;0 0 1 1"><mpath href="#${camino}"/></animateMotion>` +
      `<animate attributeName="opacity" dur="${CICLO}s" repeatCount="indefinite" keyTimes="0;${a};${a2};${b2};${b};1" values="0;0;1;1;0;0"/></circle>`;
  }
}

const compu = flujo('flujo-compu', {
  ancho: 640, alto: 600, escala: 1, etiqueta: 15,
  cero: { x: 20, y: 236, lado: 128 },
  medio: { x: 298, lado: 84, ys: [96, 228, 360, 492] },
  fin: { x: 520, y: 256, lado: 88 },
}, 'flujo--compu');

const celu = flujo('flujo-celu', {
  ancho: 360, alto: 372, escala: 0.72, etiqueta: 12.5,
  cero: { x: 6, y: 128, lado: 92 },
  medio: { x: 158, lado: 58, ys: [36, 124, 212, 300] },
  fin: { x: 290, y: 146, lado: 58 },
}, 'flujo--celu');

// ------------------------------------------------------------------ mentoría
const { personas } = JSON.parse(fs.readFileSync(path.join(SITIO, 'data', 'mentoria.json'), 'utf8'));
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mentoria = `<ul class="mentoria">
${personas.map((p) => `  <li class="persona">
    <div class="persona__nodo">
      <span class="persona__puerto persona__puerto--entrada" aria-hidden="true"></span>
      <img src="${esc(p.foto)}" alt="Foto de ${esc(p.nombre)}" width="480" height="480" loading="lazy" decoding="async">
      <span class="persona__puerto persona__puerto--salida" aria-hidden="true"></span>
    </div>
    <h3 class="persona__nombre">${esc(p.nombre)}</h3>
    <ul class="persona__areas" aria-label="Áreas">${p.areas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
  </li>`).join('\n')}
</ul>`;

// ------------------------------------------------------------------ escribir
function reemplazar(archivo, marca, contenido) {
  const p = path.join(SITIO, archivo);
  if (!fs.existsSync(p)) return;
  const t = fs.readFileSync(p, 'utf8');
  const re = new RegExp(`(<!-- ${marca}:inicio -->)[\\s\\S]*?(<!-- ${marca}:fin -->)`);
  if (!re.test(t)) { console.error(`${archivo}: faltan los marcadores de ${marca}`); process.exit(1); }
  fs.writeFileSync(p, t.replace(re, `$1\n${contenido}\n$2`), 'utf8');
  console.log(`${archivo}: ${marca} listo`);
}

reemplazar('index.html', 'heroe', compu + '\n' + celu);
reemplazar('index.html', 'mentoria', mentoria);
reemplazar('tools/og.html', 'heroe', compu.replaceAll('assets/', '../assets/'));
