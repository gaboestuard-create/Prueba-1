'use strict';
/* Pelotazo · menús: sistema de pantallas, menú principal, selector de clubes, partido amistoso, previa y resultado.
   Cada modo de juego vive en su archivo (torneos.js, carrera_dt.js, carrera_jug.js, estrella.js, editor.js) y usa
   lo que hay aquí: pantalla(), escudoHTML(), elegirClub(), jugarPartido() y mostrarResultado(). */
const APP = { mundo: null, enPartido: false, volver: null };
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// muestra una pantalla de menú. acciones: { nombre: (datos del botón, botón) => ... } para los elementos con data-acc
function pantalla(html, { titulo = '', atras = null, extra = '', acciones = {}, clase = '', sinBarra = false } = {}) {
  document.body.classList.add('en-menu');
  G.pausa = true;
  const c = $('capa');
  c.innerHTML = `<div class="pant ${clase}">${sinBarra ? '' : `
    <div class="barra">${atras ? '<button class="b-atras" data-acc="__atras" aria-label="Volver">‹</button>' : ''}<h2>${titulo}</h2><div class="barra-extra">${extra}</div></div>`}
    <div class="cuerpo">${html}</div></div>`;
  c.hidden = false; c.scrollTop = 0;
  c.onclick = e => {
    const b = e.target.closest('[data-acc]'); if (!b || b.disabled) return;
    const a = b.dataset.acc;
    if (a === '__atras') { SFX.atras(); return atras(); }
    if (acciones[a]) { if (a !== 'pag') SFX.aceptar(); acciones[a](b.dataset, b); }
  };
  c.onchange = e => { const b = e.target.closest('[data-cambio]'); if (b && acciones[b.dataset.cambio]) acciones[b.dataset.cambio](b.dataset, b); };
  return c;
}
function salirDeMenus() { document.body.classList.remove('en-menu'); cerrarCapa(); }
// escudo: la imagen subida por el usuario o una insignia con los colores del club
function escudoHTML(c, t = 34) {
  if (!c) return '';
  if (c.escudo) return `<img class="escudo" src="${c.escudo}" alt="" style="width:${t}px;height:${t}px">`;
  return `<span class="escudo" style="width:${t}px;height:${t}px;font-size:${Math.round(t * (c.corto.length > 3 ? .22 : .27))}px;background:linear-gradient(135deg,${colorCss(c.camiseta)} 0 55%,${colorCss(c.camiseta2 === c.camiseta ? c.pantalon : c.camiseta2)} 55%);color:${difColor(c.camiseta, 0xffffff) < 200 ? '#111' : '#fff'}">${esc(c.corto)}</span>`;
}
function fotoHTML(j, t = 36) {
  if (j && j.foto) return `<img class="foto" src="${j.foto}" alt="" style="width:${t}px;height:${t}px">`;
  const ini = j ? (j.nombre1 ? j.nombre1[0] : '') + (j.nombre ? j.nombre[0] : '') : '';
  return `<span class="foto" style="width:${t}px;height:${t}px;background:${colorCss(j ? j.piel : 0x999999)}">${esc(ini)}</span>`;
}
const estrellasHTML = rep => { const e = estrellas(rep); return '<span class="estrellas" aria-label="' + e + ' estrellas">' + '★'.repeat(Math.floor(e)) + (e % 1 ? '½' : '') + '</span>'; };
const mediaHTML = m => `<span class="med ${m >= 85 ? 'm-oro' : m >= 75 ? 'm-plata' : m >= 65 ? 'm-bronce' : ''}">${m}</span>`;
const fecha = t => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- menú principal ---------- */
const MODOS = [
  { id: 'amistoso', t: 'Patada inicial', d: 'Partido amistoso con cualquier equipo', f: () => menuAmistoso() },
  { id: 'torneos', t: 'Torneos', d: 'Ligas y copas a tu medida', f: () => menuTorneos() },
  { id: 'dt', t: 'Carrera de técnico', d: 'Tu plantilla, fichajes y tácticas; juegas los partidos', f: () => menuCarreraDT() },
  { id: 'jug', t: 'Carrera de jugador', d: 'Crea tu futbolista y llega a la cima', f: () => menuCarreraJug() },
  { id: 'estrella', t: 'Equipo Estrella', d: 'Sobres, cartas y monedas del juego', f: () => menuEstrella() },
  { id: 'editor', t: 'Editor', d: 'Clubes, jugadores, escudos y fotos', f: () => menuEditor() },
];
// el menú principal y la portada están en portada.js
function menuAjustes(volver) {
  pantalla(`<div class="hoja-in">${htmlAjustes()}</div>`, { titulo: 'Ajustes', atras: volver });
  enlazarAjustes($('capa'));
}
async function menuCopias() {
  const L = await bakList();
  const tipo = { auto: 'automática', partido: 'tras un partido', reemplazo: 'antes de restaurar' };
  pantalla(`<p class="intro">Copias de tus ajustes, resultados, Equipo Estrella y torneo. Las carreras guardan sus propias copias automáticamente.</p>
    <div class="lista">${L.length ? L.map(b => `<div><span>${new Date(b.t).toLocaleString('es')} · ${tipo[b.tipo] || b.tipo} · ${b.jugados} partidos</span><button class="btn chico" data-acc="rest" data-k="${b.k}">Restaurar</button></div>`).join('') : '<div><span>Todavía no hay copias.</span></div>'}</div>`, {
    titulo: 'Copias de seguridad', atras: menuPrincipal,
    acciones: { rest: async d => { const ok = await bakRestore(d.k); toast(ok ? 'Progreso restaurado.' : 'Esa copia está dañada y no se puede usar.'); menuCopias(); } },
  });
}
// de fondo: el estadio con dos equipos de verdad y la cámara girando despacio
function fondoMenu() {
  if (APP.fondo && G.cfg && G.cfg.fondo) return;
  const M = APP.mundo, top = M.clubes.filter(c => c.rep >= 85);
  const a = azElige(top), b = azElige(top.filter(c => c !== a));
  nuevoPartido({ local: equipoParaPartido(M, a.id), visita: equipoParaPartido(M, b.id), usuario: 0, fondo: true });
  APP.fondo = true; G.pausa = true;
}

/* ---------- elegir club ---------- */
// muestra las ligas y sus clubes; al tocar uno llama a alElegir(club)
function elegirClub({ titulo = 'Elige un club', alElegir, atras, liga = null, filtro = null, mundo = APP.mundo }) {
  const M = mundo;
  const lg = liga || APP.ultimaLiga || M.ligas[0].id; APP.ultimaLiga = lg;
  const clubes = clubesDeLiga(M, lg).filter(c => !filtro || filtro(c)).sort((a, b) => b.rep - a.rep);
  pantalla(`<div class="chips">${M.ligas.map(l => `<button class="chip ${l.id === lg ? 'sel' : ''}" data-acc="liga" data-id="${l.id}">${esc(l.nombre)}</button>`).join('')}</div>
    <div class="clubes">${clubes.map(c => `<button class="club" data-acc="club" data-id="${c.id}">${escudoHTML(c, 40)}<span><b>${esc(c.nombre)}</b><small>${estrellasHTML(c.rep)} · media ${Math.round(fuerzaDe(M, c))}</small></span></button>`).join('')}</div>`, {
    titulo, atras, acciones: {
      liga: d => elegirClub({ titulo, alElegir, atras, liga: d.id, filtro, mundo }),
      club: d => alElegir(M.clubes[+d.id]),
    },
  });
}

/* ---------- jugar un partido desde un modo ---------- */
// cfg: { local, visita (definiciones para el motor), usuario, jugadorId, titulo, modo, alTerminar(res) }
function jugarPartido(cfg) {
  APP.fondo = false; APP.enPartido = true;
  salirDeMenus();
  const fin = cfg.alTerminar;
  nuevoPartido({ ...cfg, semilla: Date.now() % 1e9, alTerminar: r => { APP.enPartido = false; fin(r); } });
  G.pausa = false;
  pantallaCompleta();
  if (typeof SFX !== 'undefined') SFX.silbato('corto');
  aviso(cfg.titulo || '¡A jugar!', `${cfg.local.nombre} – ${cfg.visita.nombre}`, 1.8);
}
// termina el partido simulando lo que falta (botón de la pausa)
function simularResto() {
  const frac = Math.max(0, (5400 - G.reloj) / 5400);
  const fuerza = eq => eq.pl.reduce((s, p) => s + (p.vel + p.pas + p.tir + p.reg + p.def) / 5, 0) / eq.pl.length;
  for (const eq of G.eqs) {
    const n = poisson(1.3 * frac * Math.exp((fuerza(eq) - fuerza(eq.rival)) * 5));
    for (let i = 0; i < n; i++) {
      const autor = elegirPorPeso(eq.pl, p => ({ DEL: 4, MED: 2, DEF: .6, POR: .01 }[p.rol]));
      eq.goles++; autor.st.g++;
      G.goles.push({ lado: eq.i, id: autor.id, nombre: autor.nombre, min: Math.min(90, minutoActual() + 1 + Math.floor(AZ() * (90 - minutoActual()))) });
    }
  }
  G.goles.sort((a, b) => a.min - b.min);
  G.reloj = 5400; actualizarMarcador(); finPartido();
}
// pantalla de resultado. botones: [{ t, f, prin }]
function mostrarResultado(res, { local, visita, titulo = 'Final del partido', extra = '', botones = [] }) {
  const linea = g => `<li><span class="min">${g.min}'</span> ${esc(g.nombre)}${g.propia ? ' (p.p.)' : ''}</li>`;
  const S = res.stats;
  const est = S ? `<div class="cifras">
      <span>${Math.round(S.pos[0] / ((S.pos[0] + S.pos[1]) || 1) * 100)}%</span><span>Posesión</span><span>${Math.round(S.pos[1] / ((S.pos[0] + S.pos[1]) || 1) * 100)}%</span>
      <span>${S.tiros[0]}</span><span>Tiros</span><span>${S.tiros[1]}</span>
      <span>${S.aPuerta[0]}</span><span>A puerta</span><span>${S.aPuerta[1]}</span>
      <span>${S.pasesOk[0]}/${S.pases[0]}</span><span>Pases buenos</span><span>${S.pasesOk[1]}/${S.pases[1]}</span>
      ${S.faltas ? `<span>${S.faltas[0]}</span><span>Faltas</span><span>${S.faltas[1]}</span>
      <span>${S.amarillas[0]}</span><span>Amarillas</span><span>${S.amarillas[1]}</span>
      <span>${S.rojas[0]}</span><span>Rojas</span><span>${S.rojas[1]}</span>` : ''}</div>` : '<p class="nota">Partido simulado</p>';
  pantalla(`<div class="marcador-final">
      <div class="lado">${escudoHTML(local, 64)}<b>${esc(local.nombre)}</b><ul>${res.goles.filter(g => g.lado === 0).map(linea).join('')}</ul></div>
      <div class="goles-final">${res.gl} - ${res.gv}</div>
      <div class="lado">${escudoHTML(visita, 64)}<b>${esc(visita.nombre)}</b><ul>${res.goles.filter(g => g.lado === 1).map(linea).join('')}</ul></div>
    </div>${est}${extra}
    <div class="acciones">${botones.map((b, i) => `<button class="btn ${b.prin ? 'prin' : ''}" data-acc="b" data-i="${i}">${b.t}</button>`).join('')}</div>`, {
    titulo, acciones: { b: d => botones[+d.i].f() },
  });
}

/* ---------- partido amistoso ---------- */
const AMISTOSO = { local: null, visita: null, lado: 0 };
function partidoRapido() {
  const M = APP.mundo, top = M.clubes.filter(c => c.rep >= 84);
  // los clubes que se ven en la baldosa del menú; la próxima vez salen otros
  const par = APP.rapidoPar || [azElige(top).id, azElige(top).id];
  APP.rapidoPar = null;
  AMISTOSO.local = par[0]; AMISTOSO.visita = par[1] !== par[0] ? par[1] : azElige(top.filter(c => c.id !== par[0])).id; AMISTOSO.lado = 0;
  empezarAmistoso();
}
function menuAmistoso() {
  const M = APP.mundo;
  if (AMISTOSO.local == null) { AMISTOSO.local = M.clubes.find(c => c.nombre === 'Real Madrid').id; AMISTOSO.visita = M.clubes.find(c => c.nombre === 'FC Barcelona').id; }
  const L = M.clubes[AMISTOSO.local], V = M.clubes[AMISTOSO.visita];
  const lado = AMISTOSO.lado;
  pantalla(`<div class="vs">
      <button class="equipo-vs" data-acc="elegir" data-cual="local">${escudoHTML(L, 72)}<b>${esc(L.nombre)}</b><small>Local · ${estrellasHTML(L.rep)}</small><span class="cambiar">Cambiar</span></button>
      <span class="vs-x">VS</span>
      <button class="equipo-vs" data-acc="elegir" data-cual="visita">${escudoHTML(V, 72)}<b>${esc(V.nombre)}</b><small>Visitante · ${estrellasHTML(V.rep)}</small><span class="cambiar">Cambiar</span></button>
    </div>
    <p class="nota centro">${esc(L.estadio)}</p>
    <div class="etq">Controlas</div>
    <div class="seg">${[[0, L.nombre], [1, V.nombre], [-1, 'Nadie (ver el partido)']].map(([v, t]) => `<button class="${lado === v ? 'sel' : ''}" data-acc="lado" data-v="${v}">${esc(t)}</button>`).join('')}</div>
    ${htmlAjustes(['dif', 'dur'])}
    <div class="acciones"><button class="btn prin grande" data-acc="jugar">Saque inicial</button><button class="btn" data-acc="cambiar">Intercambiar equipos</button></div>`, {
    titulo: 'Patada inicial', atras: menuPrincipal, acciones: {
      elegir: d => elegirClub({ titulo: d.cual === 'local' ? 'Equipo local' : 'Equipo visitante', atras: menuAmistoso, alElegir: c => { AMISTOSO[d.cual] = c.id; menuAmistoso(); } }),
      lado: d => { AMISTOSO.lado = +d.v; menuAmistoso(); },
      cambiar: () => { [AMISTOSO.local, AMISTOSO.visita] = [AMISTOSO.visita, AMISTOSO.local]; menuAmistoso(); },
      jugar: () => empezarAmistoso(),
    },
  });
  enlazarAjustes($('capa'));
}
function empezarAmistoso() {
  const M = APP.mundo, L = M.clubes[AMISTOSO.local], V = M.clubes[AMISTOSO.visita];
  jugarPartido({
    local: equipoParaPartido(M, L.id), visita: equipoParaPartido(M, V.id), usuario: AMISTOSO.lado, modo: 'amistoso', titulo: 'Amistoso',
    alTerminar: res => {
      if (AMISTOSO.lado >= 0) { const gf = AMISTOSO.lado ? res.gv : res.gl, gc = AMISTOSO.lado ? res.gl : res.gv; registrarPartido(gf, gc); }
      mostrarResultado(res, { local: L, visita: V, botones: [{ t: 'Revancha', prin: true, f: empezarAmistoso }, { t: 'Cambiar equipos', f: menuAmistoso }, { t: 'Menú principal', f: menuPrincipal }] });
    },
  });
}
