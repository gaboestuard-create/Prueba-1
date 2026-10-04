'use strict';
/* Pelotazo · interfaz del partido (marcador, controles táctiles, pantallas) */
/* =====================================================================
   interfaz
   ===================================================================== */
const $ = id => document.getElementById(id);
let avisoT = 0;
// aviso grande en el centro (goles) o pequeño abajo (saques, palos) para no tapar la jugada
function aviso(t, sub, dur, chico) { const a = $('aviso'); a.innerHTML = t + (sub ? '<small>' + sub + '</small>' : ''); a.classList.toggle('chico', !!chico); a.classList.add('ver'); avisoT = dur; G.ultimoAviso = t; }
let toastT = null;
function toast(t, ms = 3500) { const a = $('toast'); a.textContent = t; a.classList.add('ver'); clearTimeout(toastT); toastT = setTimeout(() => a.classList.remove('ver'), ms); }
function vibrar(p) { try { if (DATOS.ajustes.vibrar && navigator.vibrate) navigator.vibrate(p); } catch (e) { } }
function actualizarMarcador() {
  $('nomL').textContent = G.eqs[0].id; $('nomV').textContent = G.eqs[1].id;
  for (const [el, eq] of [[$('nomL'), G.eqs[0]], [$('nomV'), G.eqs[1]]]) { el.style.background = colorCss(eq.camiseta); el.style.color = difColor(eq.camiseta, 0xffffff) < 200 ? '#111' : '#fff'; }
  $('gL').textContent = G.eqs[0].goles; $('gV').textContent = G.eqs[1].goles;
}
// nombres sobre los jugadores: el que manejas (con triángulo), el que lleva el balón y el compañero al que iría el pase
const ETQ = [];
const _v3 = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
function etiqueta(i, p, clase, txt) {
  let el = ETQ[i];
  if (!el) { el = ETQ[i] = document.createElement('div'); el.className = 'et'; el.hidden = true; $('etiquetas').appendChild(el); }
  if (!p) { if (!el.hidden) el.hidden = true; return; }
  _v3.set(p.x, 2.35, p.z).project(R.cam);
  if (_v3.z > 1 || Math.abs(_v3.x) > 1.05 || Math.abs(_v3.y) > 1.05) { el.hidden = true; return; }
  if (el.className !== 'et ' + clase) el.className = 'et ' + clase;
  if (el.textContent !== txt) el.textContent = txt;
  el.hidden = false;
  el.style.transform = `translate(${((_v3.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - _v3.y) / 2 * innerHeight).toFixed(1)}px) translate(-50%,-100%)`;
}
function actualizarEtiquetas() {
  if (!R || !_v3) return;
  const on = DATOS.ajustes.nombres !== 'no' && !G.autoplay && !G.pausa && !document.body.classList.contains('en-menu');
  if (!on) { for (let i = 0; i < ETQ.length; i++) etiqueta(i, null); return; }
  const c = G.ctrl, b = G.balon, o = b.dueno;
  const nom = p => p.nombre || '';
  etiqueta(0, c, 'yo', c ? nom(c) : '');
  // el que lleva el balón (si no eres tú): compañero en verde, rival en rojizo
  etiqueta(1, o && o !== c && !o.por ? o : null, o && c && o.eq === c.eq ? 'rec' : 'riv', o ? nom(o) : '');
  // compañero al que iría un pase hacia donde apuntas
  let rec = null;
  if (c && o === c && !G.saque && hyp(ENT.mx, ENT.mz) > .3) rec = elegirReceptor(c, ENT.mx, ENT.mz, 'corto');
  etiqueta(2, rec, 'rec', rec ? nom(rec) : '');
}
function actualizarQuien() { const c = G.ctrl; $('quien').textContent = c && !G.autoplay ? (G.unJugador ? 'Tú · ' : '') + c.num + ' · ' + c.nombre : ''; }
function alCambiarEquipos() { if (R) { colorearJugadores(); colorearReal(); } actualizarMarcador(); actualizarQuien(); }
let ultimoContexto = null;
function actualizarBotones() {
  const b = G.balon, at = atacando() || !b.dueno && G.posesion === eqUsuario() && G.saque;
  const pedir = !!(G.unJugador && b.dueno && b.dueno !== G.unJugador && b.dueno.eq === eqUsuario());
  const ctx = pedir ? 'pedir' : at ? 'ataque' : 'defensa';
  if (ctx === ultimoContexto) return; ultimoContexto = ctx;
  const B = k => document.querySelector('.b[data-b="' + k + '"]');
  B('pass').textContent = pedir ? 'Pedir' : at ? 'Pase' : (G.unJugador ? 'Pase' : 'Cambiar');
  B('through').innerHTML = '<span>' + (pedir ? 'Pedir<br>al hueco' : at ? 'Pase en<br>profundidad' : 'Presión') + '</span>';
  B('long').innerHTML = '<span>' + (pedir ? 'Pedir' : at ? 'Pase<br>bombeado' : 'Presión') + '</span>';
  B('through').classList.toggle('apagado', !at && !pedir);
  B('shot').textContent = at || pedir ? 'Disparo' : 'Entrada';
  B('sprint').innerHTML = '<span>' + (at || pedir ? 'Sprint<br>y regate' : 'Sprint<small>desliza: barrida</small>') + '</span>';
}
function dibujarRadar() {
  const c = $('radar'), x = c.getContext('2d'), w = c.width, h = c.height;
  x.clearRect(0, 0, w, h);
  x.fillStyle = 'rgba(20,70,35,.75)'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1; x.strokeRect(.5, .5, w - 1, h - 1);
  x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.stroke();
  const sx = v => (v + HL) / PL * w, sz = v => (v + HW) / PW * h;
  for (const p of G.todos) {
    x.fillStyle = p === G.ctrl && !G.autoplay ? '#ffd23f' : '#' + (p.por ? p.eq.portero : p.eq.camiseta).toString(16).padStart(6, '0');
    x.beginPath(); x.arc(sx(p.x), sz(p.z), p === G.ctrl ? 3.4 : 2.6, 0, 7); x.fill();
  }
  x.fillStyle = '#fff'; x.beginPath(); x.arc(sx(G.balon.x), sz(G.balon.z), 2.2, 0, 7); x.fill();
}
function actualizarHud(dt) {
  const c = G.ctrl, en = $('energia');
  if (en) { const e = c && !G.autoplay ? c.energia : null; en.hidden = e == null; if (e != null && (G.frames & 7) === 0) { en.firstElementChild.style.width = Math.round(e * 100) + '%'; en.classList.toggle('baja', e < .3); } }
  // reloj como en la tele: minutos y segundos del partido (de 0 a 90)
  const seg = Math.min(5400, Math.floor(G.reloj)), txt = String(Math.floor(seg / 60)).padStart(2, '0') + ':' + String(seg % 60).padStart(2, '0');
  if ($('reloj').textContent !== txt) $('reloj').textContent = txt;
  actualizarEtiquetas();
  if (avisoT > 0) { avisoT -= dt; if (avisoT <= 0) $('aviso').classList.remove('ver'); }
  const pot = $('potencia');
  const carga = G.carga ? G.carga.t : G.buffer && G.buffer.a === 'shot' && ENT.shot ? G.buffer.carga : -1;
  pot.classList.toggle('ver', carga >= 0);
  if (carga >= 0) pot.firstElementChild.style.width = Math.min(100, (.2 + .8 * Math.min(1, carga / .85)) * 100) + '%';
  actualizarBotones();
  if ((G.frames & 3) === 0) dibujarRadar();
}

/* ---------- controles táctiles ---------- */
function iniciarTactil() {
  const zona = $('zonaStick'), base = $('stickBase'), knob = $('stickKnob');
  const R0 = 52;
  let id = null, ox = 0, oy = 0;
  const casa = () => { base.style.left = ''; base.style.top = ''; };
  const mover = e => {
    let dx = e.clientX - ox, dy = e.clientY - oy; const d = hyp(dx, dy);
    const m = Math.min(1, d / R0);
    TACT.mx = d ? dx / d * m : 0; TACT.mz = d ? dy / d * m : 0;
    TACT.sprint = d > R0 * 1.35;
    const kd = Math.min(d, R0 * 1.35), kx = d ? dx / d * kd : 0, ky = d ? dy / d * kd : 0;
    knob.style.transform = `translate(${kx}px,${ky}px)`; knob.classList.toggle('sprint', TACT.sprint);
  };
  zona.addEventListener('pointerdown', e => {
    if (id !== null) return; id = e.pointerId; e.preventDefault();
    try { zona.setPointerCapture(id); } catch (er) { }
    activarTactil();
    const r = zona.getBoundingClientRect();
    ox = e.clientX; oy = e.clientY; base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px'; base.classList.add('activo');
    mover(e);
  });
  zona.addEventListener('pointermove', e => { if (e.pointerId === id) { e.preventDefault(); mover(e); } });
  LIMPIAR_TACTIL.push(() => { id = null; knob.style.transform = ''; knob.classList.remove('sprint'); base.classList.remove('activo'); casa(); });
  const fin = e => { if (e.pointerId !== id) return; id = null; TACT.mx = TACT.mz = 0; TACT.sprint = false; knob.style.transform = ''; knob.classList.remove('sprint'); base.classList.remove('activo'); casa(); };
  zona.addEventListener('pointerup', fin); zona.addEventListener('pointercancel', fin); zona.addEventListener('lostpointercapture', fin);
  // botones: Pase, Pase en profundidad, Disparo y Sprint y regate. Al defender, Disparo hace la entrada.
  // Deslizar el dedo sobre Sprint y regate hace un regate hacia ese lado (al defender, una barrida).
  document.querySelectorAll('.b').forEach(bt => {
    const k0 = bt.dataset.b, ids = new Map();
    const tecla = () => k0 === 'shot' && !atacando() && !(G.saque && G.saque.tomador === G.ctrl) ? 'tackle' : k0;
    LIMPIAR_TACTIL.push(() => { ids.clear(); bt.classList.remove('on'); });
    const on = () => { for (const kk of ['shot', 'tackle']) if (k0 === 'shot') TACT[kk] = [...ids.values()].some(v => v.k === kk); if (k0 !== 'shot') TACT[k0] = ids.size > 0; bt.classList.toggle('on', ids.size > 0); };
    bt.addEventListener('pointerdown', e => {
      e.preventDefault(); const k = tecla(); ids.set(e.pointerId, { k, x: e.clientX, y: e.clientY, regate: false }); PULSO[k] = true;
      try { bt.setPointerCapture(e.pointerId); } catch (er) { } activarTactil(); on();
    });
    bt.addEventListener('pointermove', e => {
      const t = ids.get(e.pointerId); if (!t || k0 !== 'sprint' || t.regate) return;
      const dx = e.clientX - t.x, dy = e.clientY - t.y, d = hyp(dx, dy);
      if (d > 26) { t.regate = true; SKILL = { x: dx / d, z: dy / d }; vibrar(12); }
    });
    const up = e => { ids.delete(e.pointerId); on(); };
    bt.addEventListener('pointerup', up); bt.addEventListener('pointercancel', up); bt.addEventListener('lostpointercapture', up);
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
  // si el navegador pierde un dedo (llamada, gesto del sistema, otra app) no se queda ningún botón ni el sprint "pegados"
  const limpiar = () => { TACT.mx = TACT.mz = 0; TACT.sprint = false; for (const k of BOTONES) TACT[k] = false; LIMPIAR_TACTIL.forEach(f => f()); };
  addEventListener('blur', limpiar); document.addEventListener('visibilitychange', limpiar);
  document.addEventListener('touchend', e => { if (e.touches.length === 0) limpiar(); }, { passive: true });
  document.addEventListener('touchcancel', limpiar, { passive: true });
}
const LIMPIAR_TACTIL = [];
function activarTactil() { if (DATOS.ajustes.tactil !== 'no') document.body.classList.add('tactil'); }
function aplicarTactil() {
  const t = DATOS.ajustes.tactil;
  const hay = t === 'si' || (t === 'auto' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0));
  document.body.classList.toggle('tactil', hay);
}
function iniciarTeclado() {
  addEventListener('keydown', e => {
    // en los menús las teclas las maneja la navegación (portada.js)
    if (document.body.classList.contains('en-menu')) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { if (G.pausa && G.fase !== 'menu' && G.fase !== 'fin') reanudarJuego(); else abrirPausa(); e.preventDefault(); return; }
    if (e.target && (e.target.tagName === 'INPUT')) return;
    if (MAPA_TECLAS[e.code] || e.code.startsWith('Arrow') || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      if (e.code === 'Space' && document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
    }
    if (!TECLAS[e.code] && MAPA_TECLAS[e.code]) PULSO[MAPA_TECLAS[e.code]] = true;
    TECLAS[e.code] = true;
  });
  addEventListener('keyup', e => { TECLAS[e.code] = false; });
  addEventListener('blur', () => { for (const k in TECLAS) TECLAS[k] = false; });
}

/* ---------- pantallas ---------- */
const OPCIONES = [
  { k: 'cam', t: 'Cámara', o: [['tele', 'Televisión'], ['diag', 'Alta'], ['lejos', 'Lejana'], ['arriba', 'Desde arriba']] },
  { k: 'nombres', t: 'Nombres en el campo', o: [['si', 'Sí'], ['no', 'No']] },
  { k: 'previa', t: 'Previa del partido', o: [['si', 'Sí'], ['no', 'No']] },
  { k: 'sonido', t: 'Sonido', o: [['si', 'Sí'], ['bajo', 'Bajo'], ['no', 'No']] },
  { k: 'completa', t: 'Pantalla completa (celular)', o: [['si', 'Sí'], ['no', 'No']] },
  { k: 'modelo', t: 'Jugadores', o: [['real', 'Realistas'], ['caricatura', 'Caricatura']] },
  { k: 'estilo', t: 'Estilo', o: [['dia', 'Día'], ['tarde', 'Atardecer'], ['noche', 'Noche']] },
  { k: 'calidad', t: 'Gráficos', o: [['auto', 'Automático'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']] },
  { k: 'dif', t: 'Dificultad', o: [[0, 'Fácil'], [1, 'Normal'], [2, 'Difícil']] },
  { k: 'dur', t: 'Duración del partido', o: [[3, '3 min'], [5, '5 min'], [8, '8 min']] },
  { k: 'tactil', t: 'Botones en pantalla', o: [['auto', 'Automático'], ['si', 'Siempre'], ['no', 'Nunca']] },
  { k: 'vibrar', t: 'Vibración', o: [[true, 'Sí'], [false, 'No']] },
];
function htmlAyuda() {
  return `<div class="etq">Cómo se juega</div>
  <div class="ayuda">
    <b>Pantalla táctil</b><span>Joystick a la izquierda (llévalo hasta el borde para correr). Pase · Pase en profundidad (mantén: bombeado) · Disparo (mantén para más fuerza) · Sprint y regate: mantén para correr y desliza el dedo sobre él hacia un lado para regatear (adelante: cambio de ritmo; a un lado: recorte; atrás: ruleta).</span>
    <b>Teclado</b><span>Flechas o WASD para moverte · J pase · I pase en profundidad (mantén: bombeado) · L pase largo · K tiro (mantén para más fuerza) · Mayús sprint · E regate hacia donde vas · Espacio entrada · Q cambiar · Esc pausa</span>
    <b>Mando</b><span>Stick izquierdo · A/✕ pase · Y/△ pase en profundidad · X/▢ pase largo · B/○ tiro · RB-RT/R1-R2 sprint · stick derecho: regate · LB/L1 cambiar</span>
    <b>Defendiendo</b><span>Pase cambia de jugador · Disparo hace la entrada · desliza sobre Sprint para una barrida · Pase en profundidad (mantener) manda a un compañero a presionar</span>
  </div>`;
}
function htmlAjustes(solo) {
  return '<div class="ops">' + OPCIONES.filter(op => !solo || solo.includes(op.k)).map(op => `<div class="op"><div class="etq">${op.t}</div><div class="seg">${op.o.map(([v, t]) => `<button id="op-${op.k}-${v}" data-k="${op.k}" data-v="${v}" class="${String(DATOS.ajustes[op.k]) === String(v) ? 'sel' : ''}">${t}</button>`).join('')}</div></div>`).join('') + '</div>';
}
function enlazarAjustes(capa) {
  capa.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
    const op = OPCIONES.find(o => o.k === b.dataset.k), val = op.o.find(([v]) => String(v) === b.dataset.v)[0];
    DATOS.ajustes[op.k] = val;
    b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x === b));
    if (op.k === 'estilo') aplicarEstilo();
    if (op.k === 'modelo') aplicarModelo();
    if (op.k === 'calidad') { R.calidad = 1; ajustarTamano(); }
    if (op.k === 'tactil') aplicarTactil();
    if (op.k === 'sonido') { SFX.volumen(); SFX.aceptar(); }
    guardarPronto();
  }));
}
function htmlProgreso() {
  const s = DATOS.estad;
  const est = SAVE.estado === 'futuro' ? 'Tus datos son de una versión más nueva del juego: no se modifican.' : !SAVE.dueno ? 'El juego está abierto en otra pestaña: esta no guarda.' : SAVE.ultimoOk ? 'Progreso guardado.' : 'Todavía no se ha guardado nada.';
  return `<div class="etq">Tu progreso</div><p>${s.jugados} partidos · ${s.ganados} ganados · ${s.empatados} empatados · ${s.perdidos} perdidos · ${s.gf} goles a favor y ${s.gc} en contra.<br>${est}</p>`;
}
function abrirCapa(html) { const c = $('capa'); c.innerHTML = html; c.hidden = false; return c; }
function cerrarCapa() { $('capa').hidden = true; $('cv').focus({ preventScroll: true }); }
function mostrarInicio() { mostrarPortada(); }
function abrirPausa(desdeInicio) {
  if (G.fase === 'fin' || document.body.classList.contains('en-menu')) return;
  G.pausa = true;
  const modo = G.cfg && G.cfg.alTerminar;
  const c = abrirCapa(`<div class="hoja"><h2>Pausa</h2>
    <div class="acciones"><button class="btn prin" id="bSeguir">Seguir jugando</button>
      ${modo ? '<button class="btn" id="bSimular">Simular el resto</button>' : '<button class="btn" id="bReiniciar">Reiniciar partido</button>'}
      ${!modo || G.cfg.modo === 'amistoso' ? '<button class="btn" id="bMenu">Salir al menú</button>' : ''}
      <button class="btn" id="bAyuda">Controles</button>${enApp() ? '' : '<button class="btn" id="bCompleta">Pantalla completa</button>'}</div>
    ${htmlAjustes()}${htmlProgreso()}
    <p style="font-size:12px">Pelotazo ${JUEGO_VERSION} · guardado versión ${SAVE_VERSION}</p></div>`);
  enlazarAjustes(c);
  $('bSeguir').onclick = () => reanudarJuego();
  if ($('bSimular')) $('bSimular').onclick = () => { cerrarCapa(); simularResto(); };
  if ($('bReiniciar')) $('bReiniciar').onclick = () => { nuevoPartido(Date.now() % 1e9); reanudarJuego(); aviso('Partido nuevo', '', 1.2); };
  if ($('bMenu')) $('bMenu').onclick = () => { APP.enPartido = false; APP.fondo = false; menuPrincipal(); };
  if ($('bCompleta')) $('bCompleta').onclick = () => pantallaCompleta();
  $('bAyuda').onclick = () => abrirCapa(`<div class="hoja"><h2>Controles</h2>${htmlAyuda()}<div class="acciones"><button class="btn prin" id="bVolver">Volver</button></div></div>`).querySelector('#bVolver').onclick = () => abrirPausa(desdeInicio);
}
function reanudarJuego() { cerrarCapa(); G.pausa = false; guardarPronto(); }
async function mostrarCopias() {
  const L = await bakList();
  const fecha = t => new Date(t).toLocaleString('es');
  const tipo = { auto: 'automática', partido: 'tras un partido', reemplazo: 'antes de restaurar' };
  const c = abrirCapa(`<div class="hoja"><h2>Copias de seguridad</h2>
    <p>El juego guarda copias de tu progreso. Si algo sale mal, puedes volver a una de ellas. Antes de restaurar se guarda una copia de lo que tienes ahora.</p>
    <div class="lista">${L.length ? L.map(b => `<div><span>${fecha(b.t)} · ${tipo[b.tipo] || b.tipo} · ${b.jugados} partidos</span><button data-k="${b.k}">Restaurar</button></div>`).join('') : '<div><span>Todavía no hay copias.</span></div>'}</div>
    <div class="acciones"><button class="btn prin" id="bVolver">Volver</button></div></div>`);
  c.querySelectorAll('.lista button').forEach(b => b.onclick = async () => { const ok = await bakRestore(b.dataset.k); toast(ok ? 'Progreso restaurado.' : 'Esa copia está dañada y no se puede usar.'); abrirPausa(); });
  $('bVolver').onclick = () => abrirPausa();
}
function mostrarFinal() {
  const [a, b] = G.eqs, S = G.stats, tot = S.pos[0] + S.pos[1] || 1;
  const u = G.usuario, gf = G.eqs[u].goles, gc = G.eqs[1 - u].goles;
  const titulo = gf > gc ? '¡Victoria!' : gf < gc ? 'Derrota' : 'Empate';
  const c = abrirCapa(`<div class="hoja"><div class="etq">Final del partido</div><h2>${titulo}</h2>
    <div class="resultado"><span class="eq" style="background:var(--local)">${a.id}</span>${a.goles} - ${b.goles}<span class="eq" style="background:var(--visita)">${b.id}</span></div>
    <div class="cifras">
      <span>${Math.round(S.pos[0] / tot * 100)}%</span><span>Posesión</span><span>${Math.round(S.pos[1] / tot * 100)}%</span>
      <span>${S.tiros[0]}</span><span>Tiros</span><span>${S.tiros[1]}</span>
      <span>${S.aPuerta[0]}</span><span>Tiros a puerta</span><span>${S.aPuerta[1]}</span>
      <span>${S.pasesOk[0]}/${S.pases[0]}</span><span>Pases buenos</span><span>${S.pasesOk[1]}/${S.pases[1]}</span>
    </div>
    ${htmlProgreso()}
    <div class="acciones"><button class="btn prin" id="bOtra">Jugar otra vez</button><button class="btn" id="bMenuF">Menú principal</button></div></div>`);
  $('bMenuF').onclick = () => { APP.fondo = false; menuPrincipal(); };
  $('bOtra').onclick = () => { nuevoPartido(Date.now() % 1e9); cerrarCapa(); G.pausa = false; aviso('¡A jugar!', 'Saque inicial', 1.4); };
}
function mostrarError(t) { abrirCapa(`<div class="hoja"><h2>No se pudo empezar</h2><p>${t}</p></div>`); }
/* ---------- pantalla completa y app instalada ---------- */
const ICONO_COMPLETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
// ¿abierto como app instalada (sin barra del navegador)?
const enApp = () => { try { return matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
// pone (o quita) la pantalla completa y gira a horizontal. silencioso: sin avisos si el navegador no deja
function pantallaCompleta(silencioso) {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) { if (!silencioso) (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
  const pedir = el.requestFullscreen || el.webkitRequestFullscreen;
  const fallo = () => { if (!silencioso) toast('Aquí no se puede poner pantalla completa. Abre el juego en Chrome o instálalo como app.', 5000); };
  if (!pedir) return fallo();
  try {
    Promise.resolve(pedir.call(el, { navigationUI: 'hide' }))
      .then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(fallo);
  } catch (e) { fallo(); }
}
function iniciarApp() {
  document.body.classList.toggle('app', enApp());
  // como app instalada: guarda los archivos para jugar sin conexión (no dentro de Claude, que va en un marco)
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:' && window.top === window) navigator.serviceWorker.register('sw.js').catch(() => { });
  } catch (e) { }
}
