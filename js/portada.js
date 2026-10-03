'use strict';
/* Pelotazo · portada ("Pulsa cualquier botón"), menú principal por páginas que se deslizan (Jugar, Carreras,
   Equipo Estrella, Más) y la navegación de todos los menús con teclado y mando:
   flechas / cruceta / stick para moverse, Intro / A para elegir, Esc / B para volver, Q-E / LB-RB para cambiar de página. */

/* ---------- dibujos (SVG en línea, sin archivos) ---------- */
const LOGO_SVG = `<svg class="emblema" viewBox="0 0 120 132" aria-hidden="true">
  <defs><linearGradient id="emOro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset=".45" stop-color="#ffd23f"/><stop offset="1" stop-color="#c7870a"/></linearGradient>
  <linearGradient id="emFondo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d6b3f"/><stop offset="1" stop-color="#0a2716"/></linearGradient>
  <radialGradient id="emBalon" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#e3e9e4"/><stop offset="1" stop-color="#9fb0a5"/></radialGradient></defs>
  <path d="M60 4 112 22v44c0 30-22 50-52 62C30 116 8 96 8 66V22Z" fill="url(#emFondo)" stroke="url(#emOro)" stroke-width="7" stroke-linejoin="round"/>
  <path d="M8 60h104M60 22v100" stroke="rgba(255,255,255,.12)" stroke-width="2"/>
  <circle cx="60" cy="72" r="15" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2"/>
  <path d="M18 92c14 8 30 6 44-2M14 80c12 6 24 6 36 0" stroke="#ffd23f" stroke-width="4" stroke-linecap="round" fill="none" opacity=".8"/>
  <circle cx="66" cy="62" r="27" fill="url(#emBalon)" stroke="#0a2716" stroke-width="2.5"/>
  <path d="M66 52l9.5 6.9-3.6 11.2H60.1l-3.6-11.2Z" fill="#14231a"/>
  <path d="M66 52v-17M75.5 58.9l16-5.2M71.9 70.1l9.9 13.6M60.1 70.1l-9.9 13.6M56.5 58.9l-16-5.2" stroke="#14231a" stroke-width="2.4"/>
  <path d="M58 36.5l8-1.5 8 1.5-2 4h-12ZM90 47l2.5 8-3 8-3.5-3 0-9ZM86 82l-7 6-7 1 1-4 8-5ZM46 82l7 6 7 1-1-4-8-5ZM42 47l-2.5 8 3 8 3.5-3 0-9Z" fill="#14231a"/>
  <path d="M30 18l8 3M30 18l3 8" stroke="none"/>
  <path d="M44 15 60 9l16 6" stroke="#ffd23f" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;
const ICO = {
  rapido: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  amistoso: '<circle cx="12" cy="12" r="9"/><path d="m12 8 3.8 2.8-1.5 4.4H9.7l-1.5-4.4Z M12 3v5M15.8 10.8l4.6-1.5M14.3 15.2l2.7 3.9M9.7 15.2 7 19.1M8.2 10.8 3.6 9.3"/>',
  torneos: '<path d="M7 4h10v5a5 5 0 0 1-10 0Z M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6"/>',
  dt: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3V1.5h6V3M8 8l2 2m0-2-2 2M15 15a1.5 1.5 0 1 0 0 .1M9 16c1-4 4-6 6-7m0 0h-2.5m2.5 0v2.5"/>',
  jug: '<circle cx="14" cy="4" r="2"/><path d="M8 21l3-6 3 2v4M11 15l1-5-4 1-2 3M12 10l3 2 3-1M15 12l-1 5"/><circle cx="19" cy="19" r="2"/>',
  estrella: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="m12 7 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5Z"/>',
  sobres: '<path d="M3 7h18v13H3Z M3 7l9 6 9-6M8 4h8"/>',
  equipo: '<path d="M8 3 4 5 2 10l3 1v10h14V11l3-1-2-5-4-2c0 2-1.5 3-4 3S8 5 8 3Z"/>',
  editor: '<path d="M4 20h4L19 9l-4-4L4 16Z M13 7l4 4"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  ayuda: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11" r=".8"/><circle cx="18" cy="13.5" r=".8"/>',
  copias: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5Z M8.5 12l2.5 2.5 4.5-5"/>',
};
const icono = (k, clase = '') => `<svg class="ico ${clase}" viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
const esTactil = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

/* ---------- portada ---------- */
function mostrarPortada() {
  APP.enPortada = true; APP.enPartido = false;
  fondoMenu();
  pantalla(`<div class="ini">
      <div class="ini-logo">${LOGO_SVG}<h1 class="titulo-juego">PELO<span>TAZO</span></h1><p>Fútbol de acción</p></div>
      <div class="ini-pulsa"><span>${esTactil() ? 'Toca la pantalla para empezar' : 'Pulsa cualquier botón'}</span></div>
      <small class="ini-ver">Versión ${JUEGO_VERSION}</small>
    </div>`, { clase: 'portada-pant', sinBarra: true });
  $('capa').onclick = () => salirPortada();
}
function salirPortada() {
  if (!APP.enPortada) return;
  APP.enPortada = false;
  SFX.desbloquear().then(() => SFX.inicio());
  // en el celular, al tocar la portada el juego se pone a pantalla completa y en horizontal
  if (esTactil() && !enApp() && DATOS.ajustes.completa !== 'no') pantallaCompleta(true);
  menuPrincipal(true);
}

/* ---------- menú principal ---------- */
const PAGINAS = [
  { id: 'jugar', t: 'Jugar' }, { id: 'carreras', t: 'Carreras' }, { id: 'estrella', t: 'Estrella' }, { id: 'mas', t: 'Más' },
];
// una baldosa del menú: botón grande con dibujo, título y una línea de información
function tile({ acc, id, k, t, sub, info = '', grande = false, attrs = '', extra = '' }) {
  return `<button class="tile t-${k}${grande ? ' grande' : ''}" data-acc="${acc}"${id ? ` data-id="${id}"` : ''}${attrs}>
    <span class="tile-arte">${icono(k)}</span>${extra}
    <span class="tile-txt"><small>${sub}</small><b>${t}</b>${info ? `<em>${info}</em>` : ''}</span></button>`;
}
function infoDT() {
  if (!CDT) return 'Elige club y llévalo a lo más alto';
  const c = CDT.mundo.clubes[CDT.club];
  return `${esc(c.nombre)} · temporada ${CDT.temporada}-${String(CDT.temporada + 1).slice(2)}`;
}
function infoJug() {
  if (!CJ) return 'Crea tu futbolista y llega a la cima';
  const j = CJ.mundo.jug[CJ.yo], c = CJ.mundo.clubes[CJ.club];
  return `${esc(nombreCompleto(j))} · media ${j.med} · ${esc(c.nombre)}`;
}
function menuPrincipal(entrada) {
  APP.enPartido = false; APP.enPortada = false;
  fondoMenu();
  const M = APP.mundo, s = DATOS.estad, E = DATOS.estrella, T = DATOS.torneo;
  // los dos clubes del partido rápido se ven en la baldosa (y son los que juegan)
  if (!APP.rapidoPar) { const top = M.clubes.filter(c => c.rep >= 84), a = azElige(top); APP.rapidoPar = [a.id, azElige(top.filter(c => c !== a)).id]; }
  const [ra, rb] = APP.rapidoPar.map(i => M.clubes[i]);
  const am = AMISTOSO.local != null ? `${esc(M.clubes[AMISTOSO.local].nombre)} vs ${esc(M.clubes[AMISTOSO.visita].nombre)}` : 'Tú eliges equipos y lado';
  const vsRapido = `<span class="tile-vs">${escudoHTML(ra, 58)}<i>VS</i>${escudoHTML(rb, 58)}</span>`;
  const pags = {
    jugar: tile({ acc: 'rapido', k: 'rapido', grande: true, t: 'Partido rápido', sub: 'Juega ya', info: `${esc(ra.nombre)} vs ${esc(rb.nombre)}`, attrs: ' id="bJugar"', extra: vsRapido })
      + tile({ acc: 'modo', id: 'amistoso', k: 'amistoso', t: 'Patada inicial', sub: 'Amistoso', info: am })
      + tile({ acc: 'modo', id: 'torneos', k: 'torneos', t: 'Torneos', sub: 'Liga y copas', info: T ? `${esc(T.nombre)} en juego` : 'Liga, copa o Copa de Campeones' }),
    carreras: tile({ acc: 'modo', id: 'dt', k: 'dt', grande: true, t: 'Carrera de técnico', sub: CDT ? 'Continuar' : 'Nueva carrera', info: `<span id="infoDT">${infoDT()}</span>` })
      + tile({ acc: 'modo', id: 'jug', k: 'jug', grande: true, t: 'Carrera de jugador', sub: CJ ? 'Continuar' : 'Nueva carrera', info: `<span id="infoJug">${infoJug()}</span>` }),
    estrella: tile({ acc: 'modo', id: 'estrella', k: 'estrella', grande: true, t: 'Equipo Estrella', sub: 'Cartas', info: E ? `${E.monedas.toLocaleString('es')} monedas · División ${E.division}` : 'Empiezas con 5.000 monedas del juego' })
      + tile({ acc: 'est', id: 'sobres', k: 'sobres', t: 'Sobres', sub: 'Abrir', info: 'Consigue jugadores nuevos' })
      + tile({ acc: 'est', id: 'equipo', k: 'equipo', t: 'Mi equipo', sub: 'Plantilla', info: 'Alineación y formación' }),
    mas: tile({ acc: 'modo', id: 'editor', k: 'editor', t: 'Editor', sub: 'Base de datos', info: 'Clubes, jugadores, escudos y fotos' })
      + tile({ acc: 'ajustes', k: 'ajustes', t: 'Ajustes', sub: 'Opciones', info: 'Sonido, gráficos, cámara, dificultad' })
      + tile({ acc: 'ayuda', k: 'ayuda', t: 'Cómo se juega', sub: 'Controles', info: 'Táctil, teclado y mando' })
      + tile({ acc: 'copias', k: 'copias', t: 'Copias y partida', sub: 'Tu progreso', info: 'Exportar, importar y restaurar' }),
  };
  const pag = APP.pagMenu || 0;
  const c = pantalla(`<div class="mp${entrada ? ' entra' : ''}">
    <header class="mp-top">
      <div class="mp-logo">${LOGO_SVG}<span class="titulo-juego">PELO<span>TAZO</span></span></div>
      <nav class="mp-tabs" role="tablist"><kbd class="atajo">${esTactil() ? '' : 'Q'}</kbd>${PAGINAS.map((p, i) => `<button class="mp-tab${i === pag ? ' sel' : ''}" role="tab" data-acc="pag" data-i="${i}">${p.t}</button>`).join('')}<kbd class="atajo">${esTactil() ? '' : 'E'}</kbd></nav>
      <div class="mp-datos"><button class="b-completa" data-acc="completa" aria-label="Pantalla completa" title="Pantalla completa">${ICONO_COMPLETA}</button>${E ? `<span class="moneda">${E.monedas.toLocaleString('es')}</span>` : ''}<span>${s.jugados} PJ · ${s.ganados} G</span></div>
    </header>
    <div class="mp-pags" id="mpPags">${PAGINAS.map((p, i) => `<section class="mp-pag pg-${p.id}" data-i="${i}" aria-label="${p.t}">${pags[p.id]}</section>`).join('')}</div>
    <footer class="mp-pie"><div class="puntos">${PAGINAS.map((p, i) => `<i class="${i === pag ? 'sel' : ''}"></i>`).join('')}</div>
      <span class="pista">${esTactil() ? 'Desliza para ver más' : '← → moverse · Intro elegir · Q / E cambiar de página'}</span><span class="nota">Pelotazo ${JUEGO_VERSION}</span></footer>
  </div>`, {
    clase: 'principal', sinBarra: true, acciones: {
      rapido: () => partidoRapido(),
      modo: d => MODOS.find(m => m.id === d.id).f(),
      est: d => { APP.pestEst = d.id; menuEstrella(); },
      pag: d => irPagina(+d.i),
      ajustes: () => menuAjustes(menuPrincipal),
      ayuda: () => pantalla(htmlAyuda(), { titulo: 'Cómo se juega', atras: menuPrincipal }),
      copias: () => menuCopias(),
      completa: () => pantallaCompleta(),
    },
  });
  const P = $('mpPags');
  P.scrollLeft = pag * P.clientWidth;
  P.addEventListener('scroll', () => {
    const i = Math.round(P.scrollLeft / Math.max(1, P.clientWidth));
    if (i !== APP.pagMenu) { APP.pagMenu = i; SFX.mover(); marcarPagina(i); }
  }, { passive: true });
  arrastrarConRaton(P);
  c.querySelectorAll('.tile').forEach(t => t.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') SFX.mover(); }));
  APP.pagMenu = pag;
  precargarCarreras();
}
function marcarPagina(i) {
  document.querySelectorAll('.mp-tab').forEach((t, k) => t.classList.toggle('sel', k === i));
  document.querySelectorAll('.mp-pie .puntos i').forEach((t, k) => t.classList.toggle('sel', k === i));
}
function irPagina(i, enfocar) {
  const P = $('mpPags'); if (!P) return;
  i = (i + PAGINAS.length) % PAGINAS.length;
  P.scrollTo({ left: i * P.clientWidth, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
  if (i !== APP.pagMenu) { APP.pagMenu = i; SFX.mover(); marcarPagina(i); }
  if (enfocar) { const t = P.children[i].querySelector('.tile'); if (t) enfocarEn(t, true); }
}
// con el ratón también se puede arrastrar de lado (en pantallas táctiles el deslizamiento es el del navegador)
function arrastrarConRaton(P) {
  let x0 = null, s0 = 0, movido = false;
  P.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; x0 = e.clientX; s0 = P.scrollLeft; movido = false; });
  addEventListener('pointermove', e => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    if (!movido && Math.abs(dx) > 8) { movido = true; P.classList.add('arrastrando'); }
    if (movido) P.scrollLeft = s0 - dx;
  });
  addEventListener('pointerup', e => {
    if (x0 == null) return;
    const dx = e.clientX - x0; x0 = null;
    if (!movido) return;
    P.classList.remove('arrastrando');
    const actual = Math.round(s0 / P.clientWidth), dest = Math.abs(dx) > P.clientWidth * .12 ? actual - Math.sign(dx) : actual;
    irPagina(Math.max(0, Math.min(PAGINAS.length - 1, dest)));
    // que soltar después de arrastrar no cuente como un clic en la baldosa
    const parar = ev => { ev.stopPropagation(); ev.preventDefault(); };
    P.addEventListener('click', parar, { capture: true, once: true });
    setTimeout(() => P.removeEventListener('click', parar, { capture: true }), 50);
  });
}
// las carreras se cargan al abrir el menú para mostrar en qué punto van (sin esperar)
async function precargarCarreras() {
  try {
    if (!CDT && !APP.dtCargada) { APP.dtCargada = true; const r = await cargarRanura('dt'); if (!CDT && r.datos) CDT = r.datos; }
    if (!CJ && !APP.jugCargada) { APP.jugCargada = true; const r = await cargarRanura('jug'); if (!CJ && r.datos) CJ = r.datos; }
    const a = $('infoDT'), b = $('infoJug');
    if (a) a.innerHTML = infoDT();
    if (b) b.innerHTML = infoJug();
  } catch (e) { }
}

/* ---------- navegación con teclado y mando ---------- */
const enfocables = () => Array.from($('capa').querySelectorAll('button:not([disabled]), input, select, textarea, [tabindex="0"]')).filter(e => {
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 1 && r.left < innerWidth - 1 && !e.closest('[hidden]');
});
function enfocarEn(el, sonar = true) {
  document.querySelectorAll('#capa .foco').forEach(e => e.classList.remove('foco'));
  el.classList.add('foco'); el.focus({ preventScroll: !!el.closest('.mp-pags') });
  if (el.closest('.mp-pags')) { const pg = el.closest('.mp-pag'); if (+pg.dataset.i !== APP.pagMenu) irPagina(+pg.dataset.i); }
  else el.scrollIntoView({ block: 'nearest' });
  if (sonar) SFX.mover();
}
// mueve el foco al elemento más cercano en esa dirección (dx, dy = -1, 0 o 1)
function navegar(dx, dy) {
  const capa = $('capa'); if (capa.hidden) return;
  const act = capa.contains(document.activeElement) && document.activeElement !== capa ? document.activeElement : null;
  const todos = enfocables(); if (!todos.length) return;
  const pagAct = act && act.closest('.mp-pag');
  // en el menú principal solo cuentan la página que se ve y las pestañas
  const lista = $('mpPags') ? todos.filter(e => !e.closest('.mp-pag') || +e.closest('.mp-pag').dataset.i === APP.pagMenu) : todos;
  if (!act) return enfocarEn(lista.find(e => e.classList.contains('tile') || e.classList.contains('prin')) || lista[0]);
  const a = act.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  // primero los que están en la misma fila (o columna); si no hay, cualquiera en esa dirección
  const buscar = alineados => {
    let mejor = null, pm = Infinity;
    for (const e of lista) {
      if (e === act) continue;
      const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const prim = dx ? (x - ax) * dx : (y - ay) * dy, sec = dx ? Math.abs(y - ay) : Math.abs(x - ax);
      // tiene que estar en esa dirección (con algo de margen por los tamaños distintos)
      const borde = dx ? (dx > 0 ? r.left >= a.right - 4 : r.right <= a.left + 4) : (dy > 0 ? r.top >= a.bottom - 4 : r.bottom <= a.top + 4);
      const solapa = dx ? r.top < a.bottom - 2 && r.bottom > a.top + 2 : r.left < a.right - 2 && r.right > a.left + 2;
      if (prim <= 0 || !borde || (alineados && !solapa)) continue;
      const p = prim + sec * 2;
      if (p < pm) { pm = p; mejor = e; }
    }
    return mejor;
  };
  // en una página del menú principal, de lado solo se pasa a otra baldosa (o a la página siguiente)
  const mejor = buscar(true) || (pagAct && dx ? null : buscar(false));
  if (mejor) return enfocarEn(mejor);
  // en el borde de una página del menú principal: pasa a la siguiente
  if (pagAct && dx) irPagina(APP.pagMenu + dx, true);
}
function volverAtras() {
  const b = $('capa').querySelector('[data-acc="__atras"]');
  if (b) b.click();
}
function teclaMenu(e) {
  const capa = $('capa');
  if (capa.hidden || !document.body.classList.contains('en-menu')) return;
  if (APP.enPortada) { if (!['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) { e.preventDefault(); salirPortada(); } return; }
  const t = e.target && e.target.tagName, escribiendo = t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA';
  if (e.code === 'Escape' || (e.code === 'Backspace' && !escribiendo)) { e.preventDefault(); return volverAtras(); }
  if (escribiendo) return;
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
  if (dir) { e.preventDefault(); return navegar(...dir); }
  if ($('mpPags')) {
    if (e.code === 'KeyQ' || e.code === 'PageUp') { e.preventDefault(); return irPagina(APP.pagMenu - 1, true); }
    if (e.code === 'KeyE' || e.code === 'PageDown') { e.preventDefault(); return irPagina(APP.pagMenu + 1, true); }
  }
}
// mando en los menús: se lee en cada fotograma desde el bucle
const MANDO_MENU = { antes: [], rep: 0, dir: '' };
function navMando(dt) {
  const capa = $('capa');
  if (capa.hidden || !navigator.getGamepads) return;
  const gp = Array.from(navigator.getGamepads()).find(g => g && g.connected); if (!gp) return;
  const bt = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const nuevo = i => bt(i) && !MANDO_MENU.antes[i];
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  const dir = bt(14) || ax < -.6 ? 'l' : bt(15) || ax > .6 ? 'r' : bt(12) || ay < -.6 ? 'u' : bt(13) || ay > .6 ? 'd' : '';
  const enMenu = document.body.classList.contains('en-menu');
  if (enMenu && APP.enPortada) { if (gp.buttons.some((b, i) => b.pressed && !MANDO_MENU.antes[i])) salirPortada(); }
  else {
    if (dir && (dir !== MANDO_MENU.dir || (MANDO_MENU.rep -= dt) <= 0)) {
      MANDO_MENU.rep = dir === MANDO_MENU.dir ? .14 : .38;
      navegar(...{ l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] }[dir]);
    }
    if (nuevo(0)) { const a = document.activeElement; if (a && capa.contains(a) && a.tagName === 'BUTTON') a.click(); else navegar(0, 1); }
    if (nuevo(1) && enMenu) volverAtras();
    if ($('mpPags') && enMenu) { if (nuevo(4)) irPagina(APP.pagMenu - 1, true); if (nuevo(5)) irPagina(APP.pagMenu + 1, true); }
  }
  MANDO_MENU.dir = dir;
  MANDO_MENU.antes = gp.buttons.map(b => b.pressed);
}
function iniciarNavegacion() {
  addEventListener('keydown', teclaMenu);
  // el navegador solo deja sonar después de un toque o una tecla
  addEventListener('pointerdown', () => SFX.desbloquear());
  addEventListener('keydown', () => SFX.desbloquear());
  $('capa').addEventListener('focusout', e => e.target.classList && e.target.classList.remove('foco'));
}
