/* =====================================================================
   INTERFAZ · FASE 5 · modos, escenarios, campañas, logros, récords,
   tarjeta de resultado, legado ampliado y editor de escenarios.
   El progreso del jugador vive en el navegador (wl_prog), nunca en la partida.
   ===================================================================== */
const P5 = Q.p5, clampU = (v, a, b) => Math.max(a, Math.min(b, v));
Object.assign(NG, { mode: 'libre', scen: 'actual', camp: null, opts: {}, dk: { ai: 1, eco: 1, stab: 1, ev: 1 }, alt: { lid: 1, bor: 1, est: 1 }, week: null, view: null, cscen: -1 });
GI.trofeo = 'M7 3h10v2h3v3a5 5 0 01-4.6 5A5 5 0 0113 15.9V18h3v3H8v-3h3v-2.1A5 5 0 018.6 13 5 5 0 014 8V5h3zm0 4H6v1a3 3 0 001.4 2.5A7 7 0 017 8zm10 0v1a7 7 0 01-.4 2.5A3 3 0 0018 8V7z';
GI.bandera = 'M5 2h2v20H5zm3 1h11l-2.5 4.5L19 12H8z';
GI.check = 'M9 16.2l-4.2-4.2-1.4 1.4L9 19 21 7l-1.4-1.4z';
GI.candado = 'M7 10V7a5 5 0 0110 0v3h1a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9a1 1 0 011-1zm2 0h6V7a3 3 0 00-6 0zm3 4a1.5 1.5 0 00-1 2.6V18h2v-1.4a1.5 1.5 0 00-1-2.6z';

/* ---- progreso local: logros, desbloqueos, estadísticas y récords ---- */
const PROG = (() => { const d = { v: 1, ach: {}, unl: {}, g: { games: 0, leaders: {}, countries: {}, campEnds: {} }, rec: {}, gm: {}, theme: 'clasico', frame: 'none' };
  try { const x = JSON.parse(localStorage.getItem('wl_prog') || 'null'); if (x && x.v === 1) { Object.assign(d, x); d.g = Object.assign({ games: 0, leaders: {}, countries: {}, campEnds: {} }, x.g); } } catch (e) { } return d; })();
const progSave = () => { try { localStorage.setItem('wl_prog', JSON.stringify(PROG)); } catch (e) { } };
const isUnl = id => !id || !!PROG.unl[id];
const lockHint = id => { const a = D.ACH.find(x => x[6] === id), c = (D.UNLOCK_BY_COUNT || []).find(x => x[1] === id); return a ? `Logro «${a[2]}»` : c ? `${c[0]} logros` : 'un logro'; };
function gStats() {
  const L = Object.values(PROG.gm), sum = k => L.reduce((a, x) => a + (x[k] || 0), 0), top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const ce = PROG.g.campEnds, tl = top(PROG.g.leaders), tc = top(PROG.g.countries);
  return { games: PROG.g.games, turns: sum('t'), warsWon: sum('w'), treat: sum('tr'), annex: sum('an'), laws: sum('l'), wins: L.filter(x => x.vic || x.r === 'camp_win').length, losses: L.filter(x => x.r && x.r !== 'camp_win' && !/^vic_/.test(x.r) && x.r !== 'tiempo').length,
    campDone: Object.keys(ce).length, twoEnds: Object.values(ce).some(e => e.length >= 2), leader: tl ? tl[0] + ' (' + tl[1] + ')' : '—', country: tc && D.C[tc[0]] ? D.C[tc[0]].n + ' (' + tc[1] + ')' : '—', ach: Object.keys(PROG.ach).length };
}
function unlock(id) { if (!id || PROG.unl[id] || !D.UNLOCK[id]) return; PROG.unl[id] = Date.now(); setTimeout(() => toast(`Desbloqueado: ${D.UNLOCK[id].n}`), 900); }
function snapGame() {
  const s = S(); if (!s || !s.p5) return; if (!s.p5.gid) s.p5.gid = Date.now().toString(36); const p = s.p5;
  PROG.gm[p.gid] = { t: s.turn, w: p.warsWon, tr: p.treat, an: s.stats.annexed, l: s.stats.laws, iso: s.player, vic: p.vic, r: s.over ? s.over.r : null, sc: s.setup.scen, m: s.setup.mode };
  const ks = Object.keys(PROG.gm); if (ks.length > 300) delete PROG.gm[ks[0]];
}
/* comprobación de logros: al final de cada turno y al terminar la partida */
function achCheck() {
  const s = S(); if (!s || !s.p5 || UI.sim) return; snapGame();
  const m = P5.metrics(); if (s.over) m.score = P5.score().total; const g = gStats(), cheat = m.edited && m.mode !== 'sandbox', got = [];
  for (const a of D.ACH) { if (PROG.ach[a[0]] || (cheat && a[0] !== 'sandbox')) continue; let ok = false; try { ok = !!a[4](m, g); } catch (e) { } if (ok) { PROG.ach[a[0]] = Date.now(); got.push(a); if (a[6]) unlock(a[6]); } }
  const n = Object.keys(PROG.ach).length; for (const [k, id] of D.UNLOCK_BY_COUNT || []) if (n >= k) unlock(id);
  progSave(); got.slice(0, 4).forEach((a, i) => setTimeout(() => achPop(a, !i), i * 700));
}
function achPop(a, snd) {
  let box = $('#achbox'); if (!box) { box = document.createElement('div'); box.id = 'achbox'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const d = document.createElement('div'); d.className = 'achpop'; d.innerHTML = `<span class="ach-ic">${gi(a[1])}</span><div><small>Logro desbloqueado</small><b>${esc(a[2])}</b><small>${esc(a[3])}</small></div>`;
  box.appendChild(d); if (snd) Sfx.play('fanfare'); setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 500); }, 4200);
}
Bus.on('turn', () => setTimeout(achCheck, 50));
Bus.on('over', () => setTimeout(() => { achCheck(); recordGame(); permaClean(); }, 60));
Bus.on('loaded', () => { const s = S(); if (s && s.p5mig) { const x = s.p5mig; delete s.p5mig; setTimeout(() => toast(x), 400); } });

/* ---- estilos de interfaz y marcos de retrato ---- */
function applyTheme() {
  const r = document.documentElement; for (const t in D.THEMES) for (const k in D.THEMES[t].v) r.style.removeProperty(k);
  const t = D.THEMES[PROG.theme]; if (t && isUnl(t.lock)) for (const k in t.v) r.style.setProperty(k, t.v[k]);
  document.body.dataset.frame = isUnl((D.FRAMES[PROG.frame] || {}).lock) ? PROG.frame : 'none';
}
H.theme = d => { if (!isUnl((D.THEMES[d.k] || {}).lock)) return toast('Ese estilo aún está bloqueado', false); PROG.theme = d.k; progSave(); applyTheme(); UI.render(); };
H.frame = d => { if (!isUnl((D.FRAMES[d.k] || {}).lock)) return toast('Ese marco aún está bloqueado', false); PROG.frame = d.k; progSave(); applyTheme(); UI.render(); };
const styleHTML = () => `<h4>${gi('ojo')} Estilo de la interfaz</h4><div class="chips">${Object.entries(D.THEMES).map(([k, t]) => `<button class="chip ${PROG.theme === k ? 'gold' : ''}" data-a="theme" data-k="${k}" ${isUnl(t.lock) ? '' : 'disabled title="Se desbloquea con ' + esc(lockHint(t.lock)) + '"'}>${isUnl(t.lock) ? '' : gi('candado')} ${esc(t.n)}</button>`).join('')}</div>
  <h4>${gi('pin')} Marco del retrato</h4><div class="chips">${Object.entries(D.FRAMES).map(([k, t]) => `<button class="chip ${PROG.frame === k ? 'gold' : ''}" data-a="frame" data-k="${k}" ${isUnl(t.lock) ? '' : 'disabled title="Se desbloquea con ' + esc(lockHint(t.lock)) + '"'}>${isUnl(t.lock) ? '' : gi('candado')} ${esc(t.n)}</button>`).join('')}</div>`;
setTimeout(applyTheme, 0);

/* ---- pantalla de inicio: modos de juego ---- */
const MODE_IC = { libre: 'pin', camp: 'bandera', semana: 'trofeo', rapido: 'ofensiva', sandbox: 'ojo' };
function resetSetup(m) { Object.assign(NG, { mode: m, scen: 'actual', camp: null, opts: m === 'rapido' ? { rapido: 1 } : {}, dk: { ai: 1, eco: 1, stab: 1, ev: 1 }, week: null, cscen: -1 }); }
const modeCards = () => `<div class="modes5">${D.MODES.map(m => `<button class="mcard" data-a="${m.id === 'libre' ? 'ngStart' : 'ngMode'}" data-m="${m.id}">${gi(MODE_IC[m.id])}<b>${esc(m.n)}</b><small>${esc(m.x)}</small></button>`).join('')}</div>`;
{ const s0 = startHTML; startHTML = () => NG.view === 'camp' ? campPickHTML() : NG.view === 'prog' ? `<div class="start"><div class="start-in wide5">${progHTML()}<div class="row end"><button class="btn" data-a="ngView" data-v="">Volver</button></div></div></div>` : NG.view === 'code' ? codeHTML()
  : s0().replace('Fase 2', 'Fase 5').replace(/<button class="btn gold lg" data-a="ngStart">Nueva partida<\/button>/, '').replace('<div class="start-btns">', modeCards() + '<div class="start-btns">')
    .replace(/(<button class="btn ghost lg" data-a="importOpen">[^<]*<\/button>)/, '$1<button class="btn ghost lg" data-a="ngView" data-v="code">Código de partida</button><button class="btn ghost lg" data-a="ngView" data-v="prog">Logros y récords</button>'); }
H.ngView = d => { NG.view = d.v || null; UI.render(); };
{ const st0 = H.ngStart; H.ngStart = d => { if (!d || !d.keep) resetSetup('libre'); st0(d); if (NG.mode === 'camp' || NG.mode === 'semana') { NG.step = 1; UI.render(); } }; }
H.ngMode = d => {
  resetSetup(d.m);
  if (d.m === 'camp') { NG.view = 'camp'; return UI.render(); }
  if (d.m === 'semana') { const w = P5.weekly(); NG.week = w; NG.iso = w.iso; NG.seed = String(w.seed); NG.scen = w.scen; NG.custom = false; NG.diff = '1'; }
  NG.view = null; H.ngStart({ keep: 1 });
};
function campPickHTML() {
  return `<div class="start"><div class="start-in wide5"><p class="eyebrow">Campañas</p><h2>Elige una historia</h2><div class="camps">${D.CAMP.map(k => { const ends = PROG.g.campEnds[k.id] || [];
    return `<div class="card camp"><div class="row"><span class="flag xl">${flag(k.iso)}</span><div class="grow"><h3>${esc(k.n)}</h3><small class="mut">${esc(D.C[k.iso].n)} · ${esc(P5.SC(k.scen).n)} · <span class="chip">${esc(k.d)}</span></small></div></div>
      <p>${esc(k.x)}</p><ol class="stages">${k.stages.map(s => `<li>${esc(s.n)}</li>`).join('')}</ol>
      <small class="mut">Finales descubiertos: ${ends.length}/3${ends.length ? ' · ' + ends.map(i => esc(k.endings[i].t)).join(', ') : ''}</small>
      <div class="row end"><button class="btn gold" data-a="ngCamp" data-id="${k.id}">Jugar</button></div></div>`; }).join('')}</div>
    <div class="row end"><button class="btn" data-a="ngView" data-v="">Volver</button></div></div></div>`;
}
H.ngCamp = d => { const k = P5.CA(d.id); if (!k) return; resetSetup('camp'); NG.camp = k.id; NG.scen = k.scen; NG.iso = k.iso; NG.custom = false; NG.name = NG.name || k.lead; NG.partido = ''; NG.view = null; H.ngStart({ keep: 1 }); };
function codeHTML() {
  return `<div class="start"><div class="start-in"><p class="eyebrow">Compartir sin servidor</p><h2>Código de partida</h2><p class="mut">Pega el código que te pasaron: incluye la semilla, el país, el escenario, el modo y las reglas. Empezaréis exactamente con el mismo mundo.</p>
    <textarea id="ng:code" class="code5" rows="4" placeholder="WL5-…" spellcheck="false"></textarea>
    <div class="row end"><button class="btn" data-a="ngView" data-v="">Volver</button><button class="btn gold" data-a="codeGo">Empezar con este código</button></div></div></div>`;
}
H.codeGo = () => { const el = $('#ng\\:code'), o = P5.readCode(el ? el.value : ''); if (!o) return toast('Ese código no es válido o está incompleto', false);
  NG.view = null; NG.mode = o.setup.mode; G.newGame({ diff: o.diff, iso: o.iso, name: o.name || 'Líder', traits: o.traits, seed: o.seed, img: '', pseed: 0, partido: '', custom: null, setup: o.setup }); enterGame(true); };

/* ---- creación: paso 4 «Mundo» (escenario, reglas, dificultad por partes) ---- */
const fixedCountry = () => NG.mode === 'camp' || NG.mode === 'semana';
const myScens = () => { try { const L = JSON.parse(localStorage.getItem('wl_scen') || '[]'); return Array.isArray(L) ? L : []; } catch (e) { return []; } };
const OPTS = [['perm', 'Muerte permanente', 'Sin ranuras manuales; al perder se borra la partida.'], ['solo', 'Un solo país, sin editor', 'El editor queda bloqueado toda la partida.'], ['escasez', 'Escasez de recursos', 'Materias primas un 35% más caras y reservas al 40%.'], ['hostil', 'Mundo hostil', 'Todos empiezan desconfiando de ti y son más agresivos.'], ['alt', 'Mundo alternativo', 'Baraja líderes, fronteras o estados iniciales con reglas de coherencia.']];
function worldHTML() {
  if (NG.mode === 'semana' && NG.week) { const w = NG.week; return `<div class="card"><p class="eyebrow">Reto de la semana ${w.w}</p><h3>${flag(w.iso)} ${esc(D.C[w.iso].n)} · ${esc(P5.SC(w.scen).n)}</h3><p>Reglas: <b>${w.rules.map(esc).join(' · ')}</b></p><p class="mut">Todo el que juegue esta semana empieza con la misma semilla (${w.seed}), el mismo país y las mismas reglas. Compara tu puntuación con tus amigos.</p></div>`; }
  const dk = Object.entries(D.DK).map(([k, x]) => `<label class="vol"><span>${esc(x[0])}</span><input type="range" min="${x[1]}" max="${x[2]}" step="0.05" value="${NG.dk[k]}" data-c="ngDk" data-k="${k}"><b>×${(+NG.dk[k]).toFixed(2)}</b></label>`).join('');
  const k = NG.mode === 'camp' && P5.CA(NG.camp);
  const modes = `<div class="chips">${['libre', 'rapido', 'sandbox'].map(m => `<button class="chip ${NG.mode === m ? 'gold' : ''}" data-a="ngSetMode" data-m="${m}">${gi(MODE_IC[m])} ${esc(D.MODES.find(x => x.id === m).n)}</button>`).join('')}</div>`;
  const scen = k ? `<div class="card"><p class="eyebrow">Campaña</p><h3>${esc(k.n)}</h3><p>${esc(k.x)}</p><small class="mut">Escenario: ${esc(P5.SC(k.scen).n)}</small></div>`
    : `<h4>${gi('pin')} Escenario</h4><div class="scens">${D.SCEN.map(s => { const ok = isUnl(s.lock); return `<button class="scard ${NG.scen === s.id && NG.cscen < 0 ? 'on' : ''}" data-a="ngScen" data-id="${s.id}" ${ok ? '' : 'disabled'}><b>${ok ? '' : gi('candado')} ${esc(s.n)}</b> <span class="chip">${esc(s.d)}</span><small>${esc(ok ? s.x : 'Se desbloquea con ' + lockHint(s.lock))}</small><small class="gold">Objetivo: ${esc(s.obj)}</small></button>`; }).join('')}
      ${myScens().map((c, i) => `<button class="scard ${NG.cscen === i ? 'on' : ''}" data-a="ngMyScen" data-i="${i}"><b>${gi('obras')} ${esc(c.n || 'Escenario propio')}</b> <span class="chip">Tuyo</span><small>${esc(c.x || '')}</small></button>`).join('')}</div>`;
  return `${k ? '' : `<h4>${gi('ojo')} Modo</h4>${modes}<p class="mut fine">${esc(D.MODES.find(x => x.id === NG.mode).x)}</p>`}${scen}
    <h4>${gi('presion')} Reglas opcionales</h4>${OPTS.map(o => `<label class="check opt5"><input type="checkbox" data-c="ngOpt" data-k="${o[0]}" ${NG.opts[o[0]] ? 'checked' : ''}><span><b>${o[1]}</b><small class="mut">${o[2]}</small></span></label>`).join('')}
    ${NG.opts.alt ? `<div class="chips sub5">${[['lid', 'Líderes'], ['bor', 'Fronteras'], ['est', 'Estados iniciales']].map(x => `<label class="check"><input type="checkbox" data-c="ngAlt" data-k="${x[0]}" ${NG.alt[x[0]] ? 'checked' : ''}> ${x[1]}</label>`).join('')}</div>` : ''}
    <h4>${gi('seg')} Dificultad por partes <small class="mut">sobre el nivel elegido en «Líder»</small></h4><div class="vols">${dk}</div>
    ${NG.mode === 'libre' || NG.mode === 'sandbox' ? `<h4>${gi('trofeo')} Caminos a la victoria</h4><ul class="vlist">${D.VICT.map(v => `<li>${gi(v.ic)} <b>${esc(v.n)}</b>: ${esc(v.x)}</li>`).join('')}</ul>` : NG.mode === 'rapido' ? `<p class="mut">Partida de ${D.QUICK_TURNS} turnos: al final cuenta la puntuación (ver la fórmula en Partida → Objetivos).</p>` : ''}`;
}
H.ngSetMode = d => { NG.mode = d.m; NG.opts.rapido = d.m === 'rapido' ? 1 : 0; UI.render(); };
H.ngScen = d => { NG.scen = d.id; NG.cscen = -1; UI.render(); };
H.ngMyScen = d => { const c = myScens()[+d.i]; if (!c) return; NG.cscen = +d.i; NG.scen = c.base || 'actual'; UI.render(); };
H.ngOpt = (d, el) => { NG.opts[el.dataset.k] = el.checked ? 1 : 0; UI.render(); };
H.ngAlt = (d, el) => { NG.alt[el.dataset.k] = el.checked ? 1 : 0; };
H.ngDk = (d, el) => { NG.dk[el.dataset.k] = +el.value; const b = el.parentNode.querySelector('b'); if (b) b.textContent = '×' + (+el.value).toFixed(2); };
H.ngHist = d => { const h = D.HISTNATIONS.find(x => x.id === d.id); if (!h || !isUnl(h.lock)) return; NG.iso = h.iso; NG.custom = true; NG.cname = h.n; NG.creg = h.reg; NG.cideo = String(h.ideo); Globe.focus(h.iso); Globe.select([h.iso]); UI.render(); };
{ const c0 = createHTML; createHTML = () => {
  const st = NG.step, fx = fixedCountry(); if (st === 3) NG.step = 2; let h = c0(); NG.step = st;
  const names = [fx ? 'País: ' + D.C[NG.iso].n : 'País', 'Líder', 'Personalidad', 'Mundo'];
  h = h.replace(/<div class="steps">[\s\S]*?<\/div><\/header>/, `<div class="steps">${names.map((s, i) => `<button data-a="ngStep" data-s="${i}" class="${i === st ? 'on' : ''}" ${fx && !i ? 'disabled' : ''}>${i + 1}. ${esc(s)}</button>`).join('')}</div></header>`);
  if (st === 3) h = h.replace(/<div class="create-body">[\s\S]*<\/div>\s*<footer>/, `<div class="create-body scroll" data-sc="ngw">${worldHTML()}</div>\n    <footer>`);
  if (st === 2) for (const t of D.TRAITS) if (t.lock && !isUnl(t.lock)) h = h.replace(`class="trait  " data-a="ngTrait" data-id="${t.id}"`, `class="trait locked" data-a="ngTrait" data-id="${t.id}" title="Se desbloquea con ${esc(lockHint(t.lock))}"`).replace(`class="trait  locked" data-a="ngTrait" data-id="${t.id}"`, `class="trait locked" data-a="ngTrait" data-id="${t.id}"`);
  if (st === 0 && NG.custom) { const L = D.HISTNATIONS.filter(x => isUnl(x.lock)); if (L.length) h = h.replace('<div class="searchbox">', `<div class="chips">${L.map(x => `<button class="chip" data-a="ngHist" data-id="${x.id}" title="${esc(x.x)}">${flag(x.iso)} ${esc(x.n)}</button>`).join('')}</div><div class="searchbox">`); }
  const back = st === 0 || (fx && st === 1) ? `<button class="btn ghost" data-a="ngBack">Atrás</button>` : `<button class="btn ghost" data-a="ngStep" data-s="${st - 1}">Atrás</button>`;
  return h.replace(/<footer>[\s\S]*<\/footer>/, `<footer>${back}${st === 2 ? `<button class="btn" data-a="ngStep" data-s="3">Mundo y reglas</button>` : ''}${st < 2 ? `<button class="btn gold" data-a="ngStep" data-s="${st + 1}">Siguiente</button>` : `<button class="btn gold" data-a="ngGo">Comenzar mandato</button>`}</footer>`);
}; }
H.ngBack = () => { NG.view = NG.mode === 'camp' ? 'camp' : null; H.toStart(); };
H.ngStep = d => { NG.step = clampU(+d.s, fixedCountry() ? 1 : 0, 3); UI.render(); };
{ const p0 = H.ngPick; H.ngPick = d => { if (fixedCountry()) return toast('En este modo el país viene fijado', false); p0(d); }; }
{ const t0 = H.ngTrait; H.ngTrait = d => { const t = D.TRAITS.find(x => x.id === d.id); if (t && t.lock && !isUnl(t.lock)) return toast(`Rasgo bloqueado: se consigue con ${lockHint(t.lock)}`, false); t0(d); }; }
function curSetup() {
  if (NG.mode === 'semana' && NG.week) return NG.week.setup;
  const c = NG.cscen >= 0 ? myScens()[NG.cscen] : null, opts = Object.assign({}, NG.opts); if (opts.alt) opts.alt = Object.assign({}, NG.alt);
  return { mode: NG.mode, scen: NG.scen, camp: NG.camp, opts, dk: Object.assign({}, NG.dk), custom: c ? { n: c.n, ops: c.ops || [], goals: c.goals || [], events: c.events || [] } : null };
}
{ const g0 = G.newGame; G.newGame = o => { const r = g0(Object.assign({ setup: curSetup() }, o)); const s = S(); s.p5.gid = Date.now().toString(36);
  PROG.g.games++; PROG.g.leaders[s.leader.n] = (PROG.g.leaders[s.leader.n] || 0) + 1; PROG.g.countries[s.player] = (PROG.g.countries[s.player] || 0) + 1; snapGame(); progSave(); return r; }; }
{ const g0 = H.ngGo; H.ngGo = d => { if (NG.mode === 'semana' && NG.week) { NG.iso = NG.week.iso; NG.seed = String(NG.week.seed); NG.custom = false; } g0(d); const s = S(); if (!s || UI.screen !== 'game' || s.turn !== 0) return; briefing(); }; }
/* informe inicial: escenario o campaña, antes del tutorial */
function briefing() {
  const s = S(), ci = P5.campInfo(), sc = P5.SC(s.setup.scen), cu = s.setup.custom;
  const html = ci ? `<p class="eyebrow">Campaña · ${esc(ci.k.d)}</p><h2>${esc(ci.k.n)}</h2><p>${esc(ci.k.x)}</p><div class="card"><small class="eyebrow">Etapa 1 de ${ci.k.stages.length} · ${esc(ci.st.n)}</small><p>${esc(ci.st.x)}</p>${goalsHTML(ci)}</div>`
    : `<p class="eyebrow">${esc(D.MODES.find(m => m.id === s.setup.mode).n)} · ${esc(sc.d)}</p><h2>${esc(cu ? cu.n : sc.n)}</h2><p>${esc(sc.x)}</p><p class="gold">${esc(sc.obj)}</p>${s.setup.mode === 'rapido' ? `<p>Tienes ${D.QUICK_TURNS} turnos. Al final cuenta la puntuación.</p>` : ''}${cu && cu.goals.length ? `<div class="card"><small class="eyebrow">Objetivo del escenario</small><ul>${cu.goals.map(g => `<li>${esc(P5.goalText(g))}</li>`).join('')}</ul></div>` : ''}`;
  SQ.unshift(modalScene(html, 'event')); runSQ();
}
const goalsHTML = ci => `<ul class="goals5">${ci.goals.map(g => `<li class="${g.ok ? 'ok' : ''}">${gi(g.ok ? 'check' : 'pin')} ${esc(g.t)}${!g.ok && GOAL_GO[g.k] ? `<button class="btn sm" data-a="goGoal" data-k="${g.k}">Ir</button>` : ''}</li>`).join('')}</ul>${ci.left != null ? `<small class="${ci.left <= 4 ? 'red' : 'mut'}">Plazo: ${Math.max(0, ci.left)} turnos</small>` : ''}`;
Bus.on('campStage', e => { const ci = P5.campInfo(); if (!ci || ci.K.end != null) return; scene(modalScene(`<p class="eyebrow">Etapa cumplida · ${esc(e.n)}</p><h2>${esc(ci.st.n)}</h2><p>${esc(ci.st.x)}</p>${goalsHTML(ci)}`, 'event')); });

/* ---- en partida: objetivos, mediación, sin editor y muerte permanente ---- */
PTABS.sys.splice(1, 0, ['obj', 'Objetivos']);
{ const s0 = PANELS.sys; PANELS.sys = t => t === 'obj' ? objHTML() : t === 'aju' ? s0(t) + styleHTML() : t === 'gen' ? s0(t) + codeBoxHTML() : s0(t); }
function objHTML() {
  const s = S(), ci = P5.campInfo(), sc = P5.score(), v = P5.victCheck(), cu = s.setup.custom, md = s.setup.mode;
  const camp = ci ? `<div class="card"><p class="eyebrow">Campaña · etapa ${Math.min(ci.K.st + 1, ci.k.stages.length)} de ${ci.k.stages.length}</p><h3>${esc(ci.k.n)} · ${esc(ci.st.n)}</h3><p>${esc(ci.st.x)}</p>${goalsHTML(ci)}
    <small class="mut">Derrota si: ${(ci.k.lose || []).map(g => esc(P5.goalText(g))).join(' · ') || 'pierdes el poder'}</small></div>` : '';
  const vic = md === 'libre' || md === 'semana' || md === 'sandbox' ? `<h4>${gi('trofeo')} Victorias</h4><ul class="vlist">${D.VICT.map(x => `<li class="${s.p5.vicDone[x.id] ? 'ok' : ''}">${gi(x.ic)} <b>${esc(x.n)}</b>${s.p5.vicDone[x.id] ? ' · conseguida' : v[x.id] ? ' · ¡al alcance!' : ''}<small>${esc(x.x)}</small></li>`).join('')}</ul>${cu && cu.goals.length ? `<h4>Objetivo del escenario</h4><ul class="goals5">${cu.goals.map(g => `<li class="${P5.goalOk(g) ? 'ok' : ''}">${esc(P5.goalText(g))}</li>`).join('')}</ul>` : ''}` : md === 'rapido' ? `<p class="card">Turno ${s.turn + 1} de ${D.QUICK_TURNS}: al final cuenta la puntuación.</p>` : '';
  return `${camp}${vic}<h4>${gi('trofeo')} Puntuación actual: ${sc.total} / 100${bestRec() != null ? ` <small class="mut">· tu récord aquí: ${bestRec()}</small>` : ''}</h4>${scoreHTML(sc)}<p class="mut fine">La fórmula es pública: ocho bloques con un máximo cada uno, así que ni la guerra ni el dinero bastan por sí solos.</p>
    <p class="mut">Escenario: ${esc(P5.SC(s.setup.scen).n)} · Modo: ${esc(D.MODES.find(m => m.id === md).n)}${Object.keys(s.setup.opts).filter(k => s.setup.opts[k]).length ? ' · Reglas: ' + Object.keys(s.setup.opts).filter(k => s.setup.opts[k]).map(k => (OPTS.find(o => o[0] === k) || [0, k === 'rapido' ? 'Rápido' : k])[1]).join(', ') : ''}</p>`;
}
const scoreHTML = sc => `<div class="score5">${sc.parts.map(p => `<div class="arow"><div class="grow"><b>${esc(p.n)}</b><small>${esc(p.why)}</small></div>${bar(p.v, p.max, p.v / p.max >= .6 ? 'green' : p.v / p.max < .3 ? 'red' : '')}<b class="num">${p.v.toFixed(1)}/${p.max}</b></div>`).join('')}</div>`;
const codeBoxHTML = () => `<h4>${gi('acuerdo')} Compartir esta partida</h4><p class="mut fine">El código guarda la semilla y la configuración inicial: quien lo pegue empezará con el mismo mundo.</p><input class="code5" readonly value="${esc(P5.gameCode())}" onclick="this.select()">`;
{ const d0 = dockHTML; dockHTML = () => { let h = d0(); const s = S(), ci = s && P5.campInfo(); if (s && P5.opt('solo') && s.setup.mode !== 'sandbox') h = h.replace(/<button data-a="open" data-p="edit"[\s\S]*?<\/button>/, '');
  if (ci && ci.K.end == null) h += `<button class="camp-pill glass" data-a="objOpen" title="Objetivos de la campaña">${gi('bandera')} ${esc(ci.st.n)} · ${ci.goals.filter(g => g.ok).length}/${ci.goals.length}${ci.left != null ? ` · ${Math.max(0, ci.left)}t` : ''}</button>`;
  else if (s && !s.over && (s.setup.mode === 'rapido' || s.setup.mode === 'semana')) { const sc = P5.score().total, br = bestRec(), rec = br != null ? ' · récord ' + br : '';
    h += `<button class="camp-pill glass" data-a="objOpen">${s.setup.mode === 'rapido' ? `${gi('ofensiva')} Turno ${s.turn + 1}/${D.QUICK_TURNS}` : `${gi('trofeo')} Reto semanal`} · ${sc} pts${rec}</button>`; } return h; }; }
const GOAL_GO = { tr: ['dip'], rel: ['dip'], relBig: ['dip'], noSanc: ['dip'], bloc: ['dip'], rep: ['dip'], med: ['world'], laws: ['pol'], reg: ['pol'], appr: ['pol'], stab: ['pol'], gdpX: ['eco'], gdpRank: ['eco'], debtLt: ['eco'], tech: ['tec'], firsts: ['tec'], annex: ['mil'], occ: ['mil'], warsWon: ['mil'], powRank: ['mil'], peace: ['mil'] };
H.goGoal = d => { const g = GOAL_GO[d.k]; if (!g) return; closeModal(); UI.panel = g[0]; UI.render(); refreshMap(); if (d.k === 'med') toast('Toca en el globo a uno de los bandos de una guerra y pulsa «Mediar»'); };
H.objOpen = () => { UI.panel = 'sys'; UI.tab.sys = 'obj'; UI.render(); };
{ const x0 = sheetExtra; sheetExtra = iso => { const s = S(), w = s.wars.filter(w => (w.att.includes(iso) || w.def.includes(iso)) && !w.att.includes(me()) && !w.def.includes(me()));
  return x0(iso) + (w.length && iso !== me() ? `<h4>${gi('paz')} Mediar</h4>${w.map(x => `<div class="arow"><div class="grow"><b>${cname(x.att[0])} contra ${cname(x.def[0])}</b><small>2 de capital político · necesitas relación de −25 o más con ambos</small></div><button class="btn sm gold" data-a="mediate" data-w="${x.id}">Mediar</button></div>`).join('')}` : ''); }; }
H.mediate = d => { act('mediate', { w: +d.w }); };
const permaClean = () => { const s = S(); if (s && s.over && P5.opt('perm')) { try { localStorage.removeItem('wl_save'); localStorage.removeItem('wl_save_bak'); } catch (e) { } } };
{ const a0 = autosave; autosave = () => { const s = S(); if (s && s.over && P5.opt('perm')) return permaClean(); a0(); }; }
for (const k of ['slotSave', 'slotLoad']) { const f0 = H[k]; H[k] = d => S() && P5.opt('perm') && UI.screen === 'game' ? toast('Muerte permanente: no hay ranuras manuales en esta partida', false) : f0(d); }

/* ---- final de partida: textos nuevos, puntuación, legado ampliado y epílogo ---- */
Object.assign(OVER, {
  tiempo: ['Se acabó el tiempo', 'La partida rápida ha terminado. Ahora habla la puntuación.'], camp_lose: ['La campaña fracasa', 'Lo que te propusiste se ha vuelto imposible. Otros escribirán el final de esta historia.'],
  camp_time: ['Se agotó el plazo', 'La historia no espera: el momento ha pasado sin que lograras el objetivo de la etapa.'], camp_win: ['Campaña completada', ''], vic_obj: ['Objetivo cumplido', 'Has completado el objetivo de tu escenario.']
});
for (const v of D.VICT) OVER['vic_' + v.id] = [v.n, v.x];
{ const o0 = showOver; showOver = () => { o0(); const box = $('#modal .over'), s = S(); if (!box || !s || !s.over) return; const ci = P5.campInfo(), sc = P5.score(), r = s.over.r, win = /^vic_|camp_win/.test(r);
  const head = ci && ci.end ? `<div class="card ending"><p class="eyebrow">Final ${ci.K.end + 1} de 3</p><h2>${esc(ci.end.t)}</h2><p>${esc(ci.end.x)}</p></div>` : '';
  box.querySelector('h1').insertAdjacentHTML('afterend', head);
  const legacyCard = box.querySelector('.card.legacy');
  (legacyCard || box.querySelector('.kvs')).insertAdjacentHTML('afterend', `<details class="p5det" open><summary>${gi('trofeo')} Puntuación: <b>${sc.total} / 100</b></summary>${scoreHTML(sc)}</details>
    <details class="p5det"><summary>${gi('pin')} La línea del tiempo de tu mandato</summary>${timelineHTML()}</details>
    <details class="p5det"><summary>${gi('regalo')} Cómo te recuerda cada país</summary>${memoryHTML()}</details>
    <details class="p5det" id="epiBox"><summary>${gi('ojo')} Qué pasó después</summary><p class="mut">Simula el mundo durante los años siguientes sin ti. Nada de lo que pase cambia tu partida.</p><div class="row wrap">${[10, 15, 20].map(n => `<button class="btn" data-a="epilogue" data-n="${n}">${n} turnos</button>`).join('')}</div></details>`);
  box.querySelector('.row.end').insertAdjacentHTML('afterbegin', `${win && !s.p5.cont ? '<button class="btn gold" data-a="keepPlaying">Seguir gobernando</button>' : ''}<button class="btn" data-a="resultCard">Tarjeta de resultado</button>`); }; }
H.keepPlaying = () => { const r = act('keepPlaying'); if (r.ok) { closeModal(); UI.render(); refreshMap(); autosave(); } };
function timelineHTML() { const s = S(), L = (s.p5.tl || []).concat((s.diary || []).filter(d => ['war', 'peace', 'elec', 'coup'].includes(d.k)).map(d => ({ t: d.t, x: d.x }))).sort((a, b) => a.t - b.t);
  const seen = new Set(), out = L.filter(x => { const k = x.t + x.x; if (seen.has(k)) return false; seen.add(k); return true; }).slice(-30);
  return `<ol class="tl5">${out.map(x => `<li><small>${esc(turnDate(x.t))}</small> ${esc(x.x)}</li>`).join('') || '<li class="mut">Un mandato sin sobresaltos.</li>'}</ol>`; }
const turnDate = t => { const s = S(), a = s.year * 4 + s.q - (s.turn - t); return 'T' + (t + 1) + ' · ' + Math.floor(a / 4); };
function memoryHTML() { const s = S(), L = Object.keys(s.c).filter(z => z !== me() && CC(z).alive).sort((a, b) => CC(b).gdp - CC(a).gdp).slice(0, 10).concat(Q.nb(me()).filter(z => CC(z).alive)).filter((z, i, a) => a.indexOf(z) === i).slice(0, 14);
  return `<div class="mem5">${L.map(z => { const r = Q.rel(me(), z), m = Q.memOf(me(), z).sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0], w = r >= 50 ? 'como un gran amigo' : r >= 20 ? 'con simpatía' : r > -20 ? 'con indiferencia' : r > -50 ? 'con recelo' : 'como un enemigo';
    return `<div class="arow"><span>${flag(z)}</span><div class="grow"><b>${cname(z)}</b><small>Te recuerda ${w}${m ? ' · sobre todo: «' + esc(m.k) + '»' : ''}</small></div><b class="num ${r >= 0 ? 'green' : 'red'}">${sgn(r)}</b></div>`; }).join('')}</div>`; }
H.epilogue = d => { const box = $('#epiBox'); if (!box) return; const h = Bus.h; Bus.h = {}; UI.sim = 1; let e; try { e = P5.epilogue(+d.n || 12); } finally { Bus.h = h; UI.sim = 0; }
  box.innerHTML = `<summary>${gi('ojo')} Qué pasó después</summary><p class="eyebrow">Hasta ${esc(e.date)} (${e.n} trimestres)</p>
    <p>${e.alive ? `${cname(me())} ${e.gdpCh >= 0 ? 'siguió creciendo' : 'perdió fuelle'} (${sgn(e.gdpCh, 0)}% de PIB) con estabilidad de ${e.stab}.` : `${cname(me())} no sobrevivió a los años siguientes.`} ${e.wars ? `Quedaron ${e.wars} guerras abiertas en el mundo.` : 'El mundo vivió en paz.'}
    ${e.rise.length ? ` Ascendieron ${e.rise.map(cname).join(', ')}.` : ''}${e.fall.length ? ` Cayeron del podio ${e.fall.map(cname).join(', ')}.` : ''}</p>
    <ol class="tl5">${e.heads.map(x => `<li>${esc(x.x)}</li>`).join('') || '<li class="mut">Años tranquilos.</li>'}</ol>`; box.open = true; };
const recKey = s => s.setup.camp ? 'camp:' + s.setup.camp : s.setup.mode === 'semana' ? 'semana:' + s.setup.week : s.setup.scen;
const bestRec = () => { const s = S(), R = s && (PROG.rec[recKey(s)] || []).filter(x => x.gid !== s.p5.gid); return R && R.length ? R[0].sc : null; };
function recordGame() {
  const s = S(); if (!s || !s.over || UI.sim) return; const sc = P5.score(), L = Q.legacy(), key = recKey(s), gid = s.p5.gid || '';
  const R = PROG.rec[key] = (PROG.rec[key] || []).filter(x => x.gid !== gid); R.push({ gid, n: s.leader.n, iso: s.player, sc: sc.total, t: s.turn, r: s.over.r, leg: L.title, d: Q.dateStr(), m: s.setup.mode });
  R.sort((a, b) => b.sc - a.sc); R.splice(10);
  const ci = P5.campInfo(); if (ci && ci.K.end != null) { const E = PROG.g.campEnds[ci.k.id] = PROG.g.campEnds[ci.k.id] || []; if (!E.includes(ci.K.end)) E.push(ci.K.end); }
  progSave(); achCheck();
}
/* ---- tarjeta de resultado (lienzo → imagen) ---- */
H.resultCard = () => {
  const s = S(), c = CC(me()), sc = P5.score(), L = Q.legacy(), txt = (OVER[s.over ? s.over.r : ''] || ['En curso'])[0], ci = P5.campInfo(), W = 1200, Hh = 630, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const x = cv.getContext('2d'), cs = getComputedStyle(document.documentElement), gold = cs.getPropertyValue('--gold').trim() || '#e8c36a', cyan = cs.getPropertyValue('--cyan').trim() || '#4fd8ff';
  const g = x.createLinearGradient(0, 0, W, Hh); g.addColorStop(0, '#0b1426'); g.addColorStop(1, '#03060d'); x.fillStyle = g; x.fillRect(0, 0, W, Hh);
  x.strokeStyle = gold; x.globalAlpha = .5; x.lineWidth = 2; x.strokeRect(24, 24, W - 48, Hh - 48); x.globalAlpha = 1;
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(160,190,255,${.05 + (i % 5) * .03})`; x.beginPath(); x.arc((i * 197) % W, (i * 89) % Hh, 1 + (i % 3), 0, 7); x.fill(); }
  const t = (s2, X, Y, f, col, al) => { x.font = f; x.fillStyle = col; x.textAlign = al || 'left'; x.fillText(s2, X, Y); };
  t('WORLD LEADER', 60, 92, '600 30px Georgia, serif', gold); t(ci ? 'Campaña · ' + ci.k.n : P5.SC(s.setup.scen).n + ' · ' + D.MODES.find(m => m.id === s.setup.mode).n, 60, 128, '400 22px system-ui, sans-serif', '#8d9bb4');
  t(flag(me()) + ' ' + c.n, 60, 215, '700 56px system-ui, sans-serif', '#e9eef7'); t(s.leader.n + ', ' + L.title, 60, 262, 'italic 400 30px Georgia, serif', '#e9eef7');
  t(txt + (ci && ci.end ? ' · ' + ci.end.t : ''), 60, 318, '600 28px system-ui, sans-serif', /^vic_|camp_win/.test(s.over ? s.over.r : '') ? '#5fe3a1' : s.over ? '#ff8a7a' : cyan);
  t(s.turn + ' trimestres · ' + Q.dateStr() + ' · legado ' + L.score + '/100', 60, 360, '400 22px system-ui, sans-serif', '#8d9bb4');
  sc.parts.forEach((p, i) => { const X = 60 + (i % 4) * 270, Y = 420 + Math.floor(i / 4) * 80; t(p.n, X, Y, '500 18px system-ui, sans-serif', '#8d9bb4'); x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(X, Y + 12, 230, 10); x.fillStyle = gold; x.fillRect(X, Y + 12, 230 * p.v / p.max, 10); t(p.v.toFixed(1) + '/' + p.max, X + 230, Y, '600 18px system-ui, sans-serif', '#e9eef7', 'right'); });
  t(String(sc.total), W - 70, 230, '700 150px Georgia, serif', gold, 'right'); t('PUNTOS', W - 74, 270, '600 20px system-ui, sans-serif', '#8d9bb4', 'right');
  t(P5.gameCode().slice(0, 64) + (P5.gameCode().length > 64 ? '…' : ''), 60, Hh - 44, '400 14px ui-monospace, monospace', '#5b6a85');
  let url = ''; try { url = cv.toDataURL('image/png'); } catch (e) { return toast('Tu navegador no permite crear la imagen', false); }
  openModal(`<h2>Tarjeta de resultado</h2><img class="rcard" src="${url}" alt="Tarjeta de resultado de la partida"><p class="mut fine">Mantén pulsada la imagen o usa el botón para guardarla.</p>
    <div class="row end"><button class="btn" data-a="backOver">Volver</button><a class="btn gold" download="world-leader-${esc(me())}.png" href="${url}">Descargar PNG</a></div>`, false, 'event wide');
};
{ const b0 = H.backOver; H.backOver = () => S() && S().over ? b0() : closeModal(); }

/* ---- logros, estadísticas y récords (inicio y Partida) ---- */
function progHTML() {
  const g = gStats(), got = Object.keys(PROG.ach).length, recs = Object.entries(PROG.rec);
  const scName = k => k.startsWith('camp:') ? 'Campaña · ' + ((P5.CA(k.slice(5)) || {}).n || k) : k.startsWith('semana:') ? 'Reto semanal ' + k.slice(7) : P5.SC(k).n;
  return `<p class="eyebrow">Tu historial en este navegador</p><h2>Logros y récords</h2>
    <div class="kvs big">${kv('Partidas', g.games)}${kv('Victorias', g.wins)}${kv('Derrotas', g.losses)}${kv('Turnos jugados', g.turns)}${kv('Guerras ganadas', g.warsWon)}${kv('Tratados firmados', g.treat)}${kv('Anexiones', g.annex)}${kv('Leyes', g.laws)}${kv('Líder más usado', esc(g.leader))}${kv('País favorito', esc(g.country))}${kv('Campañas terminadas', g.campDone + '/8')}${kv('Logros', got + '/' + D.ACH.length)}</div>
    <h4>${gi('trofeo')} Récords por escenario</h4>${recs.length ? recs.map(([k, R]) => `<details class="p5det"><summary><b>${esc(scName(k))}</b> · mejor: ${R[0].sc} pts</summary><table class="rec5"><tr><th>#</th><th>Líder</th><th>País</th><th>Pts</th><th>Turnos</th><th>Final</th></tr>${R.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.n)}</td><td>${flag(r.iso)} ${esc((D.C[r.iso] || {}).n || r.iso)}</td><td class="num">${r.sc}</td><td class="num">${r.t}</td><td>${esc((OVER[r.r] || [r.r])[0])}</td></tr>`).join('')}</table></details>`).join('') : '<p class="mut">Termina una partida para estrenar la tabla.</p>'}
    <h4>${gi('pin')} Logros (${got}/${D.ACH.length})</h4><div class="ach5">${D.ACH.map(a => { const on = PROG.ach[a[0]], hid = a[5] && !on; return `<div class="ach ${on ? 'on' : ''}" title="${esc(hid ? 'Logro oculto' : a[3])}"><span class="ach-ic">${gi(hid ? 'candado' : a[1])}</span><div><b>${esc(hid ? '???' : a[2])}</b><small>${esc(hid ? 'Logro oculto: sigue jugando' : a[3])}${a[6] ? ' · desbloquea ' + esc(D.UNLOCK[a[6]].n) : ''}</small></div></div>`; }).join('')}</div>
    <h4>${gi('regalo')} Desbloqueables</h4><ul class="vlist">${Object.entries(D.UNLOCK).map(([k, u]) => `<li class="${PROG.unl[k] ? 'ok' : ''}">${gi(PROG.unl[k] ? 'check' : 'candado')} ${esc(u.n)} <small>${PROG.unl[k] ? 'desbloqueado' : 'se consigue con ' + esc(lockHint(k))}</small></li>`).join('')}</ul>${styleHTML()}`;
}
PTABS.sys.push(['log', 'Logros']);
{ const s0 = PANELS.sys; PANELS.sys = t => t === 'log' ? progHTML() : s0(t); }

/* ---- editor: escenario propio y simulación rápida con la IA jugando por ti ---- */
PTABS.edit.push(['esc', 'Escenarios']);
{ const e0 = PANELS.edit; PANELS.edit = t => t === 'esc' ? edScenHTML() : e0(t); }
const OPHELP = 'rel US CN -30 · war RU UA · peace * * · sanc US IR · tr com MX US · gdp * 0.9 · stab P -10 · coups 3 · wars 2 · crisis 4 · price pet 1.5 · inf 4 · leader US "Nombre" · reg VE dem · tension -20';
const GOALHELP = 'gdpX 1.5 · gdpRank 5 · powRank 3 · tr com 10 · stab 60 · appr 55 · rep paz 20 · peace · annex 1 · rel US 30 · tech 8 · med 2 · laws 10 · turn 40';
function parseLines(txt) { return String(txt || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => (l.match(/"[^"]*"|\S+/g) || []).map(w => /^".*"$/.test(w) ? w.slice(1, -1) : isFinite(+w) && w !== '*' ? +w : w)); }
const unparse = L => (L || []).map(a => a.map(v => typeof v === 'string' && /\s/.test(v) ? `"${v}"` : v).join(' ')).join('\n');
function edScenHTML() {
  const s = S(), dk = s.setup.dk, f = UI.form.esc || {}, L = myScens(), ci = P5.campInfo();
  return `<h4>${gi('ojo')} Simulación rápida: la IA juega por ti</h4><p class="mut fine">Juega N turnos con un bot (decide siempre la primera opción). Sirve para probar el balance. Al terminar puedes deshacer.</p>
    <div class="row wrap"><label>Turnos ${inp('ed:sim', '20', 'inputmode="numeric" style="width:5em"')}</label><label>Estilo ${sel('ed:bot', [['eq', 'Equilibrado'], ['com', 'Comerciante'], ['pas', 'Pasivo'], ['mil', 'Militarista']], 'eq')}</label><button class="btn gold" data-a="autoSim">Simular</button></div><div id="simOut"></div>
    <h4>${gi('presion')} Esta partida (Fase 5)</h4><div class="vols">${Object.entries(D.DK).map(([k, x]) => `<label class="vol"><span>${esc(x[0])}</span><input type="range" min="${x[1]}" max="${x[2]}" step="0.05" value="${dk[k]}" data-c="edDk" data-k="${k}"><b>×${(+dk[k]).toFixed(2)}</b></label>`).join('')}</div>
    <div class="row wrap">${['perm', 'solo', 'rapido'].map(k => `<label class="check"><input type="checkbox" data-c="edOpt" data-k="${k}" ${s.setup.opts[k] ? 'checked' : ''}> ${k === 'perm' ? 'Muerte permanente' : k === 'solo' ? 'Sin editor' : 'Límite de ' + D.QUICK_TURNS + ' turnos'}</label>`).join('')}</div>
    <div class="row wrap"><button class="btn sm" data-a="edProc">Lanzar evento procedural</button>${ci && ci.K.end == null ? `<button class="btn sm" data-a="edStage">Cumplir la etapa «${esc(ci.st.n)}»</button>` : ''}${D.VICT.map(v => `<button class="btn sm" data-a="edVic" data-k="${v.id}">Probar ${esc(v.n.toLowerCase())}</button>`).join('')}</div>
    <h4>${gi('obras')} Crear un escenario propio</h4><p class="mut fine">Una línea por elemento. Las líneas con # se ignoran.</p>
    <div class="grid2"><label>Nombre${inp('esc:n', f.n || '', 'maxlength="40"')}</label><label>Escenario base${sel('esc:base', D.SCEN.filter(x => !x.lock).map(x => [x.id, x.n]), f.base || 'actual')}</label></div>
    <label>Descripción${inp('esc:x', f.x || '', 'maxlength="160"')}</label>
    <label>Estado inicial <small class="mut">${esc(OPHELP)}</small><textarea id="esc:ops" data-f="esc:ops" rows="4" spellcheck="false">${esc(f.ops || '')}</textarea></label>
    <label>Objetivos <small class="mut">${esc(GOALHELP)}</small><textarea id="esc:goals" data-f="esc:goals" rows="3" spellcheck="false">${esc(f.goals || '')}</textarea></label>
    <label>Eventos activos <small class="mut">«turno id»: ${esc(Object.keys(Q.EV()).slice(0, 8).join(', '))}…</small><textarea id="esc:ev" data-f="esc:ev" rows="2" spellcheck="false">${esc(f.ev || '')}</textarea></label>
    <div class="row wrap"><button class="btn gold" data-a="escSave">Guardar escenario</button><button class="btn" data-a="escImport">Importar JSON</button></div>
    ${L.length ? `<h4>Tus escenarios</h4>${L.map((c, i) => `<div class="arow"><div class="grow"><b>${esc(c.n)}</b><small>${(c.ops || []).length} operaciones · ${(c.goals || []).length} objetivos · ${(c.events || []).length} eventos</small></div><button class="btn sm" data-a="escEdit" data-i="${i}">Editar</button><button class="btn sm" data-a="escExport" data-i="${i}">Exportar</button><button class="btn sm red" data-a="escDel" data-i="${i}" data-confirm="1">Borrar</button></div>`).join('')}<p class="mut fine">Aparecen en Nueva partida → paso «Mundo».</p>` : ''}`;
}
H['in:esc'] = (v, el) => { (UI.form.esc = UI.form.esc || {})[el.dataset.f.split(':')[1]] = v; };
H.edDk = (d, el) => { S().setup.dk[el.dataset.k] = +el.value; S().p5.edited = 1; const b = el.parentNode.querySelector('b'); if (b) b.textContent = '×' + (+el.value).toFixed(2); };
H.edOpt = (d, el) => { S().setup.opts[el.dataset.k] = el.checked ? 1 : 0; S().p5.edited = 1; UI.render(); };
H.edProc = () => { act('fireProc'); runSQ(); };
H.edStage = () => { act('campSkip'); runSQ(); };
H.edVic = d => { act('testVic', { k: d.k }); };
const clrEsc = () => { UI.form.esc = {}; for (const k of ['n', 'x', 'base', 'ops', 'goals', 'ev']) delete UI.form['esc:' + k]; };
function readEsc() { const v = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  const goals = parseLines(v('esc:goals')), ops = parseLines(v('esc:ops')), events = parseLines(v('esc:ev')).filter(a => typeof a[0] === 'number' && a[1]).map(a => ({ at: a[0], id: String(a[1]) }));
  return { n: v('esc:n').trim() || 'Escenario propio', base: v('esc:base') || 'actual', x: v('esc:x').trim(), ops, goals, events, verificado: false }; }
function escValid(c) { const bad = c.goals.filter(g => P5.goalText(g) === g[0] && !['flag', 'noflag'].includes(g[0])).map(g => g[0]), badE = c.events.filter(e => !Q.EV()[e.id]).map(e => e.id);
  return bad.length ? 'Objetivo desconocido: ' + bad.join(', ') : badE.length ? 'Evento desconocido: ' + badE.join(', ') : ''; }
H.escSave = () => { const c = readEsc(), e = escValid(c); if (e) return toast(e, false); const L = myScens(), i = L.findIndex(x => x.n === c.n); if (i >= 0) L[i] = c; else L.push(c);
  try { localStorage.setItem('wl_scen', JSON.stringify(L.slice(-20))); toast(`Escenario «${c.n}» guardado`); } catch (er) { toast('No se pudo guardar en este navegador', false); } clrEsc(); UI.render(); };
H.escEdit = d => { const c = myScens()[+d.i]; if (!c) return; clrEsc(); UI.form.esc = { n: c.n, base: c.base, x: c.x, ops: unparse(c.ops), goals: unparse(c.goals), ev: (c.events || []).map(e => e.at + ' ' + e.id).join('\n') }; UI.render(); };
H.escDel = d => { const L = myScens(); L.splice(+d.i, 1); try { localStorage.setItem('wl_scen', JSON.stringify(L)); } catch (e) { } UI.render(); };
H.escExport = d => { const c = myScens()[+d.i]; if (!c) return; openModal(`<h2>Exportar «${esc(c.n)}»</h2><p class="mut">Copia este JSON y compártelo.</p><textarea class="code5" rows="10" readonly onclick="this.select()">${esc(JSON.stringify(c, null, 1))}</textarea><div class="row end"><button class="btn gold" data-a="closeModal">Cerrar</button></div>`, true); };
H.escImport = () => openModal(`<h2>Importar escenario</h2><textarea id="escJson" class="code5" rows="10" placeholder='{"n": "...", "ops": [...], "goals": [...], "events": [...]}' spellcheck="false"></textarea><div class="row end"><button class="btn" data-a="closeModal">Cancelar</button><button class="btn gold" data-a="escImportGo">Importar</button></div>`, true);
H.escImportGo = () => { let c; try { c = JSON.parse($('#escJson').value); } catch (e) { return toast('Ese texto no es un JSON válido', false); }
  if (!c || typeof c !== 'object' || !Array.isArray(c.ops || []) || !Array.isArray(c.goals || []) || !Array.isArray(c.events || [])) return toast('Al JSON le faltan ops, goals o events (listas)', false);
  c = { n: String(c.n || 'Escenario importado').slice(0, 40), base: D.SCEN.some(x => x.id === c.base) ? c.base : 'actual', x: String(c.x || '').slice(0, 160), ops: (c.ops || []).filter(Array.isArray).slice(0, 80), goals: (c.goals || []).filter(Array.isArray).slice(0, 12), events: (c.events || []).filter(e => e && Q.EV()[e.id]).map(e => ({ at: +e.at || 1, id: String(e.id) })).slice(0, 20), verificado: false };
  const e = escValid(c); if (e) return toast(e, false); const L = myScens(); L.push(c); try { localStorage.setItem('wl_scen', JSON.stringify(L.slice(-20))); } catch (er) { } closeModal(); toast(`Importado: ${c.n}`); UI.render(); };
const BOTS = {
  eq: (s, z) => { const t = s.turn; if (t % 3 === 0) G.act('proposeLaw', { id: ['edu_publica', 'pymes', 'becas_tec', 'banda_ancha', 'salud_universal', 'vacunas'][(t / 3) % 6] }); if (!s.tech.cur) { const x = D.TECHS.find(y => Q.techOpen(y)); if (x) G.act('research', { id: x.id }); } G.act('buildInd', { k: 'man' }); const c = Object.keys(s.c).filter(y => y !== z && s.c[y].alive && !Q.hasT('com', z, y)).sort((a, b) => Q.rel(z, b) - Q.rel(z, a)); if (t % 2 && c[0]) G.act('propose', { iso: c[0], t: 'com' }); },
  com: (s, z) => { const c = Object.keys(s.c).filter(y => y !== z && s.c[y].alive && !Q.hasT('com', z, y)).sort((a, b) => Q.rel(z, b) - Q.rel(z, a)); if (c[0]) G.act('propose', { iso: c[0], t: 'com' }); if (c[1]) G.act('visit', { iso: c[1] }); },
  pas: () => { },
  mil: (s, z) => { for (const k of ['inf', 'tan', 'art']) G.act('recruit', { k, n: 2 }); }
};
H.autoSim = () => {
  const n = clampU(+fv('ed:sim', 20) || 20, 1, 120), bot = BOTS[fv('ed:bot', 'eq')] || BOTS.eq, s0 = S(), snap = G.save(), sc0 = P5.score().total, g0 = CC(me()).gdp, h = Bus.h; Bus.h = {}; UI.sim = 1; let i = 0;
  try { for (; i < n && !S().over; i++) { let k = 0; while (S().pend.length && k++ < 40) G.act('decide', { i: 0 }); if (S().over) break; bot(S(), me()); k = 0; while (S().pend.length && k++ < 40) G.act('decide', { i: 0 }); G.act('endTurn'); } }
  catch (e) { toast('La simulación se detuvo: ' + e.message, false); } finally { Bus.h = h; UI.sim = 0; }
  const s = S(), sc = P5.score().total; UI.simSnap = snap;
  const out = `<div class="card"><b>${i} turnos simulados</b>${s.over ? ` · la partida terminó: ${esc((OVER[s.over.r] || [s.over.r])[0])}` : ''}<div class="kvs">${kv('PIB', sgn((CC(me()).gdp / g0 - 1) * 100, 0) + '%')}${kv('Aprobación', Math.round(Q.approval()) + '%')}${kv('Estabilidad', Math.round(CC(me()).stab))}${kv('Guerras', Q.warsOf(me()).length)}${kv('Puntos', sc0 + ' → ' + sc)}${kv('Errores', (s.errs || []).length)}</div>
    <div class="row end"><button class="btn" data-a="simUndo">Deshacer la simulación</button><button class="btn gold" data-a="simKeep">Quedarme con el resultado</button></div></div>`;
  UI.render(); refreshMap(); const o = $('#simOut'); if (o) o.innerHTML = out; };
H.simUndo = () => { if (!UI.simSnap) return; const h = Bus.h; Bus.h = {}; try { G.load(UI.simSnap); } finally { Bus.h = h; } UI.simSnap = null; UI.render(); refreshMap(); toast('Simulación deshecha'); };
H.simKeep = () => { UI.simSnap = null; S().p5.edited = 1; autosave(); UI.render(); if (S().over) showOver(); toast('Resultado conservado (la partida queda marcada como editada: no cuenta para logros)'); };
