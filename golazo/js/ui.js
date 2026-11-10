// UI: menú de partido rápido, HUD, radar, pausa, descanso/final, plantillas, ayuda y panel de afinado en vivo.
(function () {
  'use strict';
  const G = window.G, P = G.P, b = G.ball, $ = (id) => document.getElementById(id);
  const UI = (G.UI = { inMatch: false });
  const S = { home: null, away: null, diff: 'normal', len: 180, lg: 'all', form: null }; // selección del menú (se recuerda)
  try { Object.assign(S, JSON.parse(localStorage.getItem('golazo.sel') || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem('golazo.sel', JSON.stringify(S)); } catch (e) {} };
  const DIFF = ['facil', 'normal', 'dificil', 'leyenda'], LEN = [120, 180, 300, 480], FORMS = ['4-4-2', '4-3-3', '3-5-2'];
  const SKIN = ['#f0c7a2', '#e0ac82', '#c68958', '#9a6238', '#6b4326'], HAIR = ['#1a1410', '#2c1e12', '#5a3a1c', '#b08a4a', '#0d0d0d', '#7a4a22'];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cyc = (arr, cur, d) => arr[(arr.indexOf(cur) + d + arr.length) % arr.length];

  // ---------- Escudos y avatares generados por código ----------
  UI.crest = function (cv, team) {
    const g = cv.getContext('2d'), w = cv.width, c1 = team.colors.shirt, c2 = team.colors.second || team.colors.shorts;
    g.clearRect(0, 0, w, w);
    g.beginPath(); g.moveTo(w * 0.12, w * 0.07); g.lineTo(w * 0.88, w * 0.07); g.lineTo(w * 0.88, w * 0.5); g.quadraticCurveTo(w * 0.86, w * 0.8, w * 0.5, w * 0.96); g.quadraticCurveTo(w * 0.14, w * 0.8, w * 0.12, w * 0.5); g.closePath();
    g.save(); g.clip(); g.fillStyle = c1; g.fillRect(0, 0, w, w); g.fillStyle = c2;
    switch (team.crest) {
      case 'stripes': for (let i = 0; i < 5; i += 2) g.fillRect(w * (0.12 + i * 0.152), 0, w * 0.152, w); break;
      case 'hoops': for (let i = 1; i < 6; i += 2) g.fillRect(0, w * i * 0.16, w, w * 0.16); break;
      case 'half': g.fillRect(w / 2, 0, w / 2, w); break;
      case 'sash': g.beginPath(); g.moveTo(0, w * 0.1); g.lineTo(w * 0.3, 0); g.lineTo(w, w * 0.75); g.lineTo(w * 0.75, w); g.closePath(); g.fill(); break;
      case 'cross': g.fillRect(w * 0.42, 0, w * 0.16, w); g.fillRect(0, w * 0.3, w, w * 0.16); break;
      default: g.fillRect(0, 0, w, w * 0.2);
    }
    g.restore(); g.lineWidth = w * 0.05; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(w * 0.14, w * 0.36, w * 0.72, w * 0.26);
    g.fillStyle = '#fff'; g.font = `800 ${w * 0.22}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(team.short, w / 2, w * 0.5, w * 0.68);
  };
  UI.avatar = function (cv, pl, shirt) {
    const g = cv.getContext('2d'), w = cv.width, h = G.hash(pl.name);
    g.clearRect(0, 0, w, w); g.save(); g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.clip();
    g.fillStyle = '#243049'; g.fillRect(0, 0, w, w);
    g.fillStyle = shirt; g.beginPath(); g.ellipse(w / 2, w * 1.02, w * 0.42, w * 0.3, 0, 0, 7); g.fill();
    g.fillStyle = SKIN[h % 5]; g.fillRect(w * 0.43, w * 0.6, w * 0.14, w * 0.16); g.beginPath(); g.arc(w / 2, w * 0.44, w * 0.2, 0, 7); g.fill();
    g.fillStyle = HAIR[(h >>> 4) % 6]; const st = (h >>> 9) % 3;
    if (st < 2) { g.beginPath(); g.arc(w / 2, w * 0.4, w * 0.21, Math.PI, 0); g.lineTo(w * 0.71, w * (st ? 0.5 : 0.42)); g.lineTo(w * 0.62, w * 0.32); g.lineTo(w * 0.38, w * 0.32); g.lineTo(w * 0.29, w * (st ? 0.5 : 0.42)); g.closePath(); g.fill(); }
    g.restore();
  };

  // ---------- Menú ----------
  function teams() { const all = G.Data.teams; const f = all.filter((t) => S.lg === 'all' || t.league === S.lg); return f.length ? f : all; }
  function fix() {
    const all = G.Data.teams;
    if (!G.Data.byId(S.home)) S.home = all[0].id;
    if (!G.Data.byId(S.away) || S.away === S.home) S.away = (all.find((t) => t.id !== S.home) || all[0]).id;
    if (!G.DIFFS[S.diff]) S.diff = 'normal';
    if (LEN.indexOf(S.len) < 0) S.len = 180;
  }
  function card(side, t) {
    const r = G.Data.rating(t), bar = (l, v) => `<span>${l}</span><u><i style="width:${G.clamp((v - 55) * 2.4, 4, 100)}%"></i></u><b>${v}</b>`;
    const lg = G.Data.leagues.find((l) => l.id === t.league);
    return `<div class="card"><div class="pick"><button class="arr" data-a="${side}-" aria-label="Equipo anterior">◀</button><canvas class="crest" width="128" height="128" data-crest="${esc(t.id)}"></canvas><button class="arr" data-a="${side}+" aria-label="Equipo siguiente">▶</button></div>
      <div class="nm">${esc(t.name)}</div><div class="tag">${side === 'h' ? 'TÚ · local' : 'CPU · visitante'} · ${esc(lg ? lg.name : '')} · ${esc(side === 'h' && S.form ? S.form : t.formation)}</div>
      <div class="bars">${bar('ATA', r.att)}${bar('MED', r.mid)}${bar('DEF', r.def)}</div></div>`;
  }
  const opt = (k, label, val) => `<div class="opt"><button class="arr" data-a="${k}-" aria-label="${label} anterior">◀</button><span><small>${label}</small>${esc(val)}</span><button class="arr" data-a="${k}+" aria-label="${label} siguiente">▶</button></div>`;
  function paint(root) { root.querySelectorAll('[data-crest]').forEach((c) => UI.crest(c, G.Data.byId(c.dataset.crest))); }

  UI.menu = function () {
    fix(); UI.inMatch = false;
    const h = G.Data.byId(S.home), a = G.Data.byId(S.away), lgs = [{ id: 'all', name: 'Todas las ligas' }].concat(G.Data.leagues), lg = lgs.find((l) => l.id === S.lg) || lgs[0];
    const m = $('menu');
    m.innerHTML = `<h1>GOLAZO</h1><div class="sub">Fútbol 3D · partido rápido</div>
      <div class="row">${card('h', h)}<div class="vs">VS</div>${card('a', a)}</div>
      <div class="row">${opt('lg', 'Liga', lg.name)}${opt('diff', 'Dificultad', G.DIFFS[S.diff].name)}${opt('len', 'Duración', S.len / 60 * 2 + ' min')}${opt('form', 'Tu formación', S.form || h.formation)}${opt('cam', 'Cámara', G.Cam.names[G.Cam.mode])}</div>
      <div class="row"><button class="btn go" data-a="play">JUGAR</button><button class="btn" data-a="squads">Plantillas</button><button class="btn" data-a="help">Controles</button><button class="btn" data-a="mute">${G.Audio.muted ? 'Sonido: no' : 'Sonido: sí'}</button></div>`;
    paint(m); m.classList.remove('hide');
    ['hud', 'touch', 'pause', 'end', 'panel'].forEach((id) => $(id).classList.add('hide'));
  };

  function act(a) {
    G.Audio.init();
    const d = a.slice(-1) === '+' ? 1 : -1, k = a.slice(0, -1), ts = teams(), ids = ts.map((t) => t.id);
    if (a === 'play') return play();
    if (a === 'squads') return squads();
    if (a === 'help') return help();
    if (a === 'mute') G.Audio.mute(!G.Audio.muted);
    else if (k === 'h') { S.home = ids[(ids.indexOf(S.home) + d + ids.length) % ids.length]; if (S.home === S.away) S.home = ids[(ids.indexOf(S.home) + d + ids.length) % ids.length]; S.form = null; }
    else if (k === 'a') { S.away = ids[(ids.indexOf(S.away) + d + ids.length) % ids.length]; if (S.home === S.away) S.away = ids[(ids.indexOf(S.away) + d + ids.length) % ids.length]; }
    else if (k === 'lg') { S.lg = cyc(['all'].concat(G.Data.leagues.map((l) => l.id)), S.lg, d); const t = teams(); if (t.length > 1) { S.home = t[0].id; S.away = t[1].id; S.form = null; } }
    else if (k === 'diff') S.diff = cyc(DIFF, S.diff, d);
    else if (k === 'len') S.len = cyc(LEN, S.len, d);
    else if (k === 'form') S.form = cyc(FORMS, S.form || G.Data.byId(S.home).formation, d);
    else if (k === 'cam') G.Cam.set(cyc(G.Cam.modes, G.Cam.mode, d));
    save(); UI.menu(); G.Audio.music(true);
  }

  function play() {
    fix(); save();
    const h = G.Data.byId(S.home), a = G.Data.byId(S.away);
    G.Audio.init(); G.Audio.music(false);
    if (G.Render.mobile) { try { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el).catch(() => {}); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* no disponible: se juega igual */ } }
    G.Game.play({ home: h, away: a, human: 0, diff: S.diff, halfLen: S.len, formations: [S.form || h.formation, a.formation] });
    UI.inMatch = true;
    ['menu', 'pause', 'end', 'panel'].forEach((id) => $(id).classList.add('hide'));
    $('hud').classList.remove('hide');
    const touch = G.Render.mobile || G.Input.touch; $('touch').classList.toggle('hide', !touch); document.body.classList.toggle('touch', touch);
    const M = G.M; UI.crest($('crA'), M.teams[0].data); UI.crest($('crB'), M.teams[1].data); $('nA').textContent = M.teams[0].short; $('nB').textContent = M.teams[1].short;
    last = {};
  }
  UI.play = play;

  function squads() {
    const pn = $('panel'), col = (t, form) => {
      const xi = G.Data.lineup(t, form), ids = new Set(xi.map((x) => x.info));
      const row = (pl, pos, bench) => `<div class="pl${bench ? ' bench' : ''}"><canvas width="60" height="60" data-av="${esc(t.id)}|${esc(pl.name)}"></canvas><span class="ps">${pos}</span><span>${esc(pl.name)}<small>${esc((G.STYLES[pl.style] || G.STYLES.equilibrado).label)} · ${pl.age} años · ${esc(pl.nat)} · pot ${pl.pot}</small></span><span class="ov">${pl.ovr}</span></div>`;
      return `<div class="squad"><h3><canvas class="crest" width="64" height="64" data-crest="${esc(t.id)}"></canvas>${esc(t.name)} · ${form}</h3>${xi.map((x) => row(x.info, x.slot.r, false)).join('')}${t.players.filter((p) => !ids.has(p)).map((p) => row(p, p.pos, true)).join('')}</div>`;
    };
    const h = G.Data.byId(S.home), a = G.Data.byId(S.away);
    pn.innerHTML = `<h2>Plantillas</h2><div class="squads">${col(h, S.form || h.formation)}${col(a, a.formation)}</div><button class="btn" data-a="back">Volver</button>`;
    paint(pn);
    pn.querySelectorAll('[data-av]').forEach((c) => { const [id, name] = c.dataset.av.split('|'), t = G.Data.byId(id); UI.avatar(c, t.players.find((p) => p.name === name), t.colors.shirt); });
    pn.classList.remove('hide'); pn.scrollTop = 0;
  }

  function help() {
    const pn = $('panel');
    pn.innerHTML = `<h2>Controles</h2><div class="help">
      <div><h3>Teclado</h3><p><kbd>WASD</kbd> / flechas: moverse</p><p><kbd>J</kbd> pase (sale al pulsar) · <kbd>K</kbd> tiro (mantener = potencia)</p><p><kbd>L</kbd> pase largo / centro · <kbd>I</kbd> pase al hueco</p><p><kbd>U</kbd>+<kbd>K</kbd> tiro colocado · <kbd>Shift</kbd> sprint</p><p><kbd>Espacio</kbd> filigrana · <kbd>O</kbd> proteger balón</p><p><kbd>Q</kbd> cambiar jugador · <kbd>C</kbd> cámara · <kbd>Esc</kbd> pausa</p><p><kbd>F2</kbd> o <kbd>\`</kbd>: panel de afinado</p></div>
      <div><h3>Defendiendo</h3><p><kbd>J</kbd> / PASE: cambiar de jugador</p><p><kbd>K</kbd> / TIRO: entrada</p><p><kbd>L</kbd> / LARGO: barrida (riesgo de falta y tarjeta)</p><p><kbd>I</kbd> o <kbd>Espacio</kbd> / FILIGRANA: un compañero presiona</p><p>Sin sprint, tu jugador se perfila hacia el balón. Si llegas de frente con el balón al alcance, la entrada sale sola (se apaga en Pausa).</p></div>
      <div><h3>Táctil</h3><p>Joystick: mitad izquierda. Llévalo al borde para sprintar.</p><p>PASE: va al compañero marcado con el aro blanco. AL HUECO: pase filtrado al espacio por delante del compañero.</p><p>TIRO: mantener = potencia. <b>Deslizar</b> sobre TIRO = tiro colocado hacia donde deslizas.</p><p>LARGO: pase aéreo; desde la banda es centro.</p><p>FILIGRANA + joystick: adelante bicicleta, al lado bola cruzada, atrás giro.</p></div>
      <div><h3>Gamepad</h3><p>A pase · B tiro · X largo · Y al hueco</p><p>RT sprint · LT proteger · RB tiro colocado</p><p>LB cambiar · stick derecho: filigrana</p><p>Start pausa · Select cámara</p></div>
      <div><h3>Consejos</h3><p>Apunta el tiro con el stick hacia un palo; sin dirección va al palo lejano.</p><p>En sprint los toques son largos: suelta el sprint para regatear en corto.</p><p>Puedes pedir pase o tiro antes de que llegue el balón: saldrá de primera.</p><p>Toca 3 veces el reloj para abrir el panel de afinado.</p></div>
    </div><button class="btn" data-a="back">Volver</button>`;
    pn.classList.remove('hide'); pn.scrollTop = 0;
  }

  // ---------- Pausa y fin de tiempo ----------
  UI.pause = function (on) {
    if (!UI.inMatch || !$('end').classList.contains('hide')) return;
    G.Game.paused = on; const p = $('pause');
    if (!on) return p.classList.add('hide');
    p.innerHTML = `<h2>Pausa</h2><div class="col">
      <button class="btn go" data-a="resume">Reanudar</button>
      <button class="btn" data-a="pcam">Cámara: ${G.Cam.names[G.Cam.mode]}</button>
      <button class="btn" data-a="pdiff">Dificultad: ${G.DIFFS[S.diff].name}</button>
      <button class="btn" data-a="mute2">${G.Audio.muted ? 'Sonido: no' : 'Sonido: sí'}</button>
      <button class="btn" data-a="auto">Entrada automática: ${G.Control.autoTackle ? 'sí' : 'no'}</button>
      <button class="btn" data-a="help">Controles</button>
      <button class="btn" data-a="tune">Panel de afinado</button>
      <button class="btn" data-a="restart">Reiniciar partido</button>
      <button class="btn" data-a="quit">Salir al menú</button></div>`;
    p.classList.remove('hide');
  };

  function endScreen(full) {
    const M = G.M, A = M.teams[0], B = M.teams[1], tp = A.stats.poss + B.stats.poss || 1, e = $('end');
    const row = (l, x, y) => `<tr><td>${x}</td><td>${l}</td><td>${y}</td></tr>`, pa = Math.round((A.stats.poss / tp) * 100);
    const res = !full ? '' : A.score === B.score ? 'Empate' : (A.score > B.score) === (M.human === 0) ? '¡Victoria!' : 'Derrota';
    e.innerHTML = `<h2>${full ? 'Final del partido' : 'Descanso'}${res ? ' · ' + res : ''}</h2>
      <div class="big"><canvas class="crest" width="96" height="96" data-crest="${esc(A.data.id)}"></canvas>${esc(A.short)} ${A.score} - ${B.score} ${esc(B.short)}<canvas class="crest" width="96" height="96" data-crest="${esc(B.data.id)}"></canvas></div>
      <table class="stats">${row('Posesión', pa + '%', 100 - pa + '%')}${row('Tiros (al arco)', `${A.stats.shots} (${A.stats.onTarget})`, `${B.stats.shots} (${B.stats.onTarget})`)}${row('Pases', A.stats.passes, B.stats.passes)}${row('Faltas', A.stats.fouls, B.stats.fouls)}${row('Tarjetas', `${A.stats.yellow}A ${A.stats.red}R`, `${B.stats.yellow}A ${B.stats.red}R`)}${row('Córners', A.stats.corners, B.stats.corners)}${row('Fueras de lugar', A.stats.offsides, B.stats.offsides)}</table>
      <div class="row">${full ? '<button class="btn go" data-a="restart">Revancha</button><button class="btn" data-a="quit">Menú</button>' : '<button class="btn go" data-a="half2">Segundo tiempo</button>'}</div>`;
    paint(e); e.classList.remove('hide');
  }

  function act2(a) {
    if (a === 'back') return $('panel').classList.add('hide');
    if (a === 'resume') return UI.pause(false);
    if (a === 'pcam') { G.Cam.next(); return UI.pause(true); }
    if (a === 'pdiff') { S.diff = cyc(DIFF, S.diff, 1); save(); for (const t of G.M.teams) if (!t.human) t.D = G.DIFFS[S.diff]; return UI.pause(true); }
    if (a === 'auto') { G.Control.autoTackle = !G.Control.autoTackle; try { localStorage.setItem('golazo.auto', G.Control.autoTackle ? '1' : '0'); } catch (e) {} return UI.pause(true); }
    if (a === 'mute2') { G.Audio.mute(!G.Audio.muted); return UI.pause(true); }
    if (a === 'tune') { UI.pause(false); return debug(true); }
    if (a === 'restart') { $('end').classList.add('hide'); return play(); }
    if (a === 'quit') { G.Game.demo(); UI.menu(); return G.Audio.music(true); }
    if (a === 'half2') { $('end').classList.add('hide'); return G.Match.secondHalf(); }
    act(a);
  }

  // ---------- Mensajes ----------
  let msgT = 0;
  UI.msg = function (t, sub, cls, dur) { const m = $('msg'); m.innerHTML = esc(t) + (sub ? `<small>${esc(sub)}</small>` : ''); m.className = 'on ' + (cls || ''); msgT = dur || 2; };

  // ---------- Panel de afinado ----------
  const TUNE = [['speed', 'Velocidad de jugadores'], ['accel', 'Aceleración'], ['friction', 'Fricción del balón'], ['bounce', 'Rebote del balón'], ['shot', 'Fuerza de tiro'], ['pass', 'Fuerza de pase'], ['curve', 'Efecto / curva'], ['touch', 'Largo del toque al conducir'], ['aiAggr', 'Agresividad de la IA'], ['aiReact', 'Tiempo de reacción IA'], ['timeScale', 'Velocidad del juego']];
  function debug(on) {
    const d = $('debug'); if (on === undefined) on = d.classList.contains('hide');
    d.classList.toggle('hide', !on); if (!on) return;
    d.innerHTML = '<b>Afinado en vivo</b><pre id="dbg-info"></pre>' + TUNE.map(([k, l]) => `<label><span>${l}</span><b id="tv-${k}">${G.T[k].toFixed(2)}</b><input type="range" min="0.3" max="2" step="0.05" value="${G.T[k]}" data-t="${k}" aria-label="${l}"></label>`).join('') +
      '<div class="r"><button data-d="reset">Restablecer</button><button data-d="q-">Calidad −</button><button data-d="q+">Calidad +</button><button data-d="auto">Auto calidad</button><button data-d="close">Cerrar</button></div>';
  }
  UI.debug = debug;

  UI.init = function () {
    document.addEventListener('click', (e) => { const t = e.target.closest('[data-a]'); if (t) act2(t.dataset.a); });
    $('btn-pause').addEventListener('click', () => UI.pause(true));
    let taps = 0, tapT = 0; // botón oculto: 3 toques al reloj
    $('score').addEventListener('click', () => { const n = performance.now(); taps = n - tapT < 600 ? taps + 1 : 1; tapT = n; if (taps >= 3) { taps = 0; debug(); } });
    const d = $('debug');
    d.addEventListener('input', (e) => { const k = e.target.dataset.t; if (!k) return; G.T[k] = +e.target.value; $('tv-' + k).textContent = G.T[k].toFixed(2); try { localStorage.setItem('golazo.tune', JSON.stringify(G.T)); } catch (er) {} });
    d.addEventListener('click', (e) => {
      const a = e.target.dataset.d; if (!a) return;
      if (a === 'reset') { Object.assign(G.T, G.T0); try { localStorage.removeItem('golazo.tune'); } catch (er) {} debug(true); }
      else if (a === 'close') debug(false);
      else if (a === 'auto') G.Game.autoQ = true;
      else { G.Game.autoQ = false; G.Render.setQuality(G.Render.q + (a === 'q+' ? 1 : -1)); }
    });
    G.on('msg', (e) => UI.msg(e.t, e.c ? e.c.name : ''));
    G.on('goal', (gi) => UI.msg('¡GOOOL!', (gi.own || !gi.scorer ? 'Autogol' : gi.scorer.name) + ' · ' + gi.minute + "'", 'goal', 4));
    G.on('foul', (e) => UI.msg(e.pen ? '¡PENAL!' : 'Falta', (e.card === 'red' ? 'Tarjeta roja · ' : e.card === 'yellow' ? 'Tarjeta amarilla · ' : '') + e.p.name, '', 2.6));
    G.on('halftime', () => UI.inMatch && endScreen(false));
    G.on('fulltime', () => UI.inMatch && endScreen(true));
    G.on('cut', () => { const f = $('flash'); f.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on'))); });
    addEventListener('visibilitychange', () => { if (document.hidden && UI.inMatch && !G.Game.paused) UI.pause(true); });
    G.Input.initTouch();
    addEventListener('touchstart', () => { if (UI.inMatch && $('touch').classList.contains('hide')) { $('touch').classList.remove('hide'); document.body.classList.add('touch'); } }, { passive: true });
  };

  // teclas globales (pausa, cámara, debug)
  UI.input = function () {
    const B = G.Input.s.b;
    if (B.debug.press) debug();
    if (!UI.inMatch) return;
    if (B.pause.press) UI.pause(!G.Game.paused);
    if (B.cam.press && !G.Game.paused) UI.msg(G.Cam.next(), 'Cámara', '', 1.2);
  };

  // ---------- HUD por cuadro ----------
  let last = {}, radarT = 0;
  const DEF_LABEL = { pass: 'CAMBIAR', shoot: 'ENTRADA', lob: 'BARRIDA', through: 'PRESIÓN', skill: 'PRESIÓN' }, ATT_LABEL = { pass: 'PASE', shoot: 'TIRO', lob: 'LARGO', through: 'AL HUECO', skill: 'FILIGRANA' };
  function set(id, key, val, fn) { if (last[key] !== val) { last[key] = val; fn($(id), val); } }
  UI.update = function (dt) {
    if (msgT > 0 && (msgT -= dt) <= 0) $('msg').className = '';
    const dbg = $('debug');
    if (!dbg.classList.contains('hide')) $('dbg-info').textContent = `${G.Game.fps.toFixed(0)} fps · calidad ${G.Render.q}${G.Game.autoQ ? ' (auto)' : ''} · ${G.M.state}`;
    if (!UI.inMatch) return;
    const M = G.M, A = M.teams[0], B = M.teams[1], min = G.Match.minute(), sec = Math.floor(((M.clock / M.halfLen) * 2700) % 60);
    set('sc', 'sc', A.score + ' - ' + B.score, (e, v) => (e.textContent = v));
    set('clock', 'ck', (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec, (e, v) => (e.textContent = v));
    const t = M.teams[M.human], a = t && t.active;
    if (a) {
      set('pname', 'pn', a.name, (e, v) => (e.textContent = v));
      set('stam', 'st', Math.round(a.stamina / 4), (e, v) => { e.firstChild.style.width = v * 4 + '%'; e.firstChild.style.background = v < 6 ? '#ff4a3a' : v < 13 ? '#ffb23a' : ''; });
    }
    const pw = Math.round(G.Control.power * 50);
    set('power', 'pw', pw, (e, v) => { e.style.visibility = v ? 'visible' : 'hidden'; e.firstChild.style.width = v * 2 + '%'; });
    set('touch', 'ctx', G.Control.ctx, (e, v) => { const L = v === 'def' ? DEF_LABEL : ATT_LABEL; for (const k in L) $('tb-' + k).textContent = L[k]; });
    if (M.state === 'ready' && a && M.rs.taker === a && M.stateT > 2.5 && msgT <= 0) UI.msg('Tu saque', M.rs.type === 'penalty' ? 'TIRO: apunta con el stick' : 'PASE o LARGO para sacar', '', 2.5);
    if ((radarT -= dt) <= 0) { radarT = 0.066; radar(M, a); }
  };

  function radar(M, a) {
    const cv = $('radar'), g = cv.getContext('2d'), w = cv.width, h = cv.height, s = w / 110, X = (x) => w / 2 + x * s, Z = (z) => h / 2 + z * s;
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(12,60,26,0.72)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1; g.strokeRect(X(-P.HL), Z(-P.HW), 105 * s, 68 * s);
    g.beginPath(); g.moveTo(X(0), Z(-P.HW)); g.lineTo(X(0), Z(P.HW)); g.stroke();
    for (const d of [-1, 1]) g.strokeRect(X(Math.min(d * P.HL, d * (P.HL - P.BOXL))), Z(-P.BOXW), P.BOXL * s, P.BOXW * 2 * s);
    const kits = G.Render.kits || [{ shirt: '#f33' }, { shirt: '#39f' }];
    for (const p of M.players) {
      if (p.off) continue;
      g.fillStyle = kits[p.team.id].shirt; g.beginPath(); g.arc(X(p.x), Z(p.z), p === a ? 4.2 : 3.2, 0, 7); g.fill();
      g.lineWidth = p === a ? 2 : 0.8; g.strokeStyle = p === a ? '#ffe14a' : 'rgba(0,0,0,0.7)'; g.stroke();
    }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(X(b.x), Z(b.z), 2.4, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 0.8; g.stroke();
  }
})();
