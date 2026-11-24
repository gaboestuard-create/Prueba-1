/* =====================================================================
   SISTEMA · FASE 5 · ESCENARIOS, MODOS, CAMPAÑAS Y DIFICULTAD POR PARTES
   newGame(o) acepta o.setup = { mode, scen, camp, opts:{perm, solo, escasez, hostil, rapido, alt}, dk:{ai, eco, stab, ev}, week, custom }
   y deja en S.setup lo elegido. Los datos están en src/data-scenario.js.
   ===================================================================== */
const P5DEF = () => ({ treat: 0, warsWon: 0, med: 0, spy: 0, coups: 0, nukes: 0, visits: 0, betray: 0, decl: 0, lowStab: 0, redTurns: 0, edited: 0, vic: null, vicDone: {}, cont: 0, tl: [] });
const SETDEF = () => ({ mode: 'libre', scen: 'actual', camp: null, opts: {}, dk: { ai: 1, eco: 1, stab: 1, ev: 1 }, week: 0, rel0: 0 });
hook('new', () => { S.setup = SETDEF(); S.p5 = P5DEF(); S.camp = null; });
hook('load', () => {
  if (!S.setup) { S.setup = SETDEF(); S.p5mig = 'Partida de una versión anterior: se ha adaptado a la Fase 5 (modo libre, escenario actual). Todo lo demás se conserva.'; }
  S.setup.dk = Object.assign({ ai: 1, eco: 1, stab: 1, ev: 1 }, S.setup.dk); S.setup.opts = S.setup.opts || {};
  S.p5 = Object.assign(P5DEF(), S.p5 || {}); if (S.camp === undefined) S.camp = null;
});
const SC = id => D.SCEN.find(x => x.id === id) || D.SCEN[0];
const CA = id => D.CAMP.find(x => x.id === id);
const p5k = k => (S && S.setup && S.setup.dk && S.setup.dk[k]) || 1;
const mode = () => (S.setup || {}).mode || 'libre';
const opt = k => !!((S.setup || {}).opts || {})[k];

/* ---- selección de países para las operaciones de escenario ---- */
function selC(f) {
  if (f === '*') return alive(); if (f === 'P') return [S.player];
  if (f === 'big') return alive().sort((a, b) => S.c[b].gdp - S.c[a].gdp).slice(0, 20);
  return S.c[f] && S.c[f].alive ? [f] : [];
}
function scenOp(op) {
  const [k, a, b, v, lab] = op, me = S.player;
  if (k === 'rel') { if (a === '*' && b === '*') { S.setup.rel0 += v; return; } for (const x of selC(a)) for (const y of selC(b)) if (x !== y) addMod(x, y, lab || 'Escenario', v, 0); return; }
  if (k === 'blocRel') { const A = alive().filter(z => S.c[z].blocs.includes(a)), B = alive().filter(z => S.c[z].blocs.includes(b)); for (const x of A) for (const y of B) if (x !== y) addMod(x, y, op[4] || 'Bloques rivales', v, 0); return; }
  if (k === 'gdp') { for (const z of selC(a)) { S.c[z].gdp *= b; S.c[z].tr *= b; } return; }
  if (k === 'stab') { for (const z of selC(a)) S.c[z].stab = clamp(S.c[z].stab + b, 5, 95); return; }
  if (k === 'war') { if (S.c[a] && S.c[b]) startWar(a, b); return; }
  if (k === 'peace') { for (const w of S.wars.slice()) if ((a === '*' || w.att.includes(a) || w.def.includes(a)) && (b === '*' || w.att.includes(b) || w.def.includes(b))) endWar(w, 'blanca'); return; }
  if (k === 'sanc') { if (S.c[a] && S.c[b]) addSanction(a, b); return; }
  if (k === 'tr') { if (S.c[b] && S.c[v]) addTreaty(a, b, v); return; }
  if (k === 'untr') { endTreaties(a, b); return; }
  if (k === 'coups') { const L = alive().filter(z => z !== me && S.c[z].reg !== 'mil').map(z => [z, S.c[z].stab + rr(-25, 25)]).sort((x, y) => x[1] - y[1]).map(x => x[0]); /* una clave por país: el sort no consume azar distinto según el navegador */ for (const z of L.slice(0, a)) coup(z); return; }
  if (k === 'wars') {
    let n = a; const used = new Set([me]);
    for (const x of shuffle(alive().filter(z => z !== me && S.c[z].gdp > 15))) { if (n <= 0) break; if (used.has(x)) continue;
      const t = nb(x).filter(y => !used.has(y) && !atWar(x, y) && !alliesOf(x).includes(y) && power(y) < power(x) * 1.2).sort((p, q) => rel(x, p) - rel(x, q))[0];
      if (t && rel(x, t) < 20 && startWar(x, t)) { used.add(x); used.add(t); n--; } }
    return; }
  if (k === 'crisis') { const L = alive().filter(z => z !== me).sort((x, y) => S.c[y].gdp - S.c[x].gdp).slice(0, 20); for (const z of shuffle(L).slice(0, a)) infect(z); if (b === 'P') infect(me); return; }
  if (k === 'price') { for (const c in S.mkt.com) if (a === '*' || a === c) S.mkt.com[c].p *= b; return; }
  if (k === 'inf') { S.eco.inf = clamp(S.eco.inf + a, -5, 200); return; }
  if (k === 'year') { S.year = a; return; }
  if (k === 'leader') { if (S.c[a] && a !== me) { S.c[a].lider = { n: b, verificado: false, img: '' }; if (v) S.c[a].partido = v; } return; }
  if (k === 'reg') { if (S.c[a] && a !== me) S.c[a].reg = b; return; }
  if (k === 'blocs') { const c = S.c[a]; if (!c) return; const bl = b.slice(1); c.blocs = c.blocs.filter(x => x !== bl); if (b[0] === '+') c.blocs.push(bl); return; }
  if (k === 'per') { for (const z of selC(a)) if (z !== me) S.c[z].per[b] = clamp(S.c[z].per[b] + v, 0, 1); return; }
  if (k === 'tension') { const big = alive().filter(z => z !== me).sort((x, y) => S.c[y].gdp - S.c[x].gdp).slice(0, 6); for (const x of big) { const t = big.filter(y => y !== x).sort((p, q) => rel(x, p) - rel(x, q))[0]; if (t) addMod(x, t, 'Pulso entre potencias', a, 0); } return; }
}
/* relación de fondo de todo el escenario (no crea 19.000 modificadores) */
{ const r0 = rel; rel = (a, b) => { const v = r0(a, b), o = S && S.setup ? S.setup.rel0 : 0; return !o || a === b || v === -100 ? v : clamp(v + o, -100, 100); }; }

/* ---- mundo alternativo con reglas de coherencia (ver D.ALT) ---- */
function altWorld(o) {
  const me = S.player, L = alive().filter(z => z !== me);
  if (o.lid) { const byR = {}; for (const z of L) (byR[D.C[z].region] = byR[D.C[z].region] || []).push(z);
    for (const r in byR) { const g = byR[r], ls = shuffle(g.map(z => S.c[z].lider)); g.forEach((z, i) => { S.c[z].lider = ls[i]; }); } }
  if (o.bor) { const used = new Set([me]); let n = 12;
    for (const a of shuffle(L)) { if (n <= 0) break; if (used.has(a) || S.c[a].terr.length < 3) continue; const b = shuffle(nb(a).filter(y => !used.has(y) && S.c[y].alive))[0]; if (!b) continue;
      const i = ri(1, S.c[a].terr.length - 1); if (S.c[a].terr[i].o === a && moveTerr(a, i, b, .9)) { used.add(a); used.add(b); n--; } } }
  if (o.est) for (const z of L) { const c = S.c[z]; c.gdp *= rr(.75, 1.25); c.stab = clamp(c.stab + ri(-15, 15), 8, 95); if (chance(.15)) { const nx = D.ALT.regNear[c.reg]; if (nx) c.reg = pick(nx); } }
}
/* ---- opciones de partida ---- */
function applyOpts(st) {
  const me = S.player, c = P(), O = st.opts;
  if (O.escasez) { for (const k in S.mkt.com) S.mkt.com[k].p *= 1.35; for (const k in c.stock) c.stock[k] = Math.round(c.stock[k] * .4); for (const z of alive()) for (const k in S.c[z].rec) if (chance(.4)) S.c[z].rec[k] = Math.max(0, S.c[z].rec[k] - 1); }
  if (O.hostil) for (const z of alive()) if (z !== me) { addMod(me, z, 'Mundo hostil', -20, 0); S.c[z].per.agres = clamp(S.c[z].per.agres + .1, 0, 1); }
  if (O.caosev) st.dk.ev = Math.max(st.dk.ev, 2); if (O.pobre) st.dk.eco = Math.min(st.dk.eco, .8);
}
function normSetup(x) {
  const s = Object.assign(SETDEF(), x || {}); s.opts = Object.assign({}, s.opts); s.dk = Object.assign({ ai: 1, eco: 1, stab: 1, ev: 1 }, s.dk);
  for (const k in D.DK) s.dk[k] = clamp(+s.dk[k] || 1, D.DK[k][1], D.DK[k][2]);
  if (!D.MODES.some(m => m.id === s.mode)) s.mode = 'libre'; if (s.mode === 'rapido') s.opts.rapido = 1;
  if (s.mode === 'camp') { const k = CA(s.camp); if (!k) s.mode = 'libre'; else s.scen = k.scen; } else s.camp = null;
  if (!D.SCEN.some(c => c.id === s.scen)) s.scen = 'actual'; s.rel0 = 0; return s;
}
{ const n0 = newGame; newGame = o => {
  const st = normSetup(o.setup); if (st.mode === 'camp') { const k = CA(st.camp); o = Object.assign({}, o, { iso: k.iso, custom: null, name: o.name || k.lead }); }
  n0(o); S.setup = st;
  const sc = SC(st.scen); for (const op of sc.ops) safe('escenario', scenOp, op);
  if (st.custom) for (const op of st.custom.ops || []) safe('escenario propio', scenOp, op);
  if (st.opts.alt) altWorld(st.opts.alt === 1 ? { lid: 1, bor: 1, est: 1 } : st.opts.alt);
  applyOpts(st);
  if (st.mode === 'camp') { const k = CA(st.camp); S.camp = { id: k.id, st: 0, s0: 0, end: null, fired: {}, done: [] }; news(`Comienza la campaña: ${k.n}`, 'pol', S.player, 3); }
  S.stats.gdp0 = P().gdp; S.p5.tl.push({ t: 0, x: `${S.leader.n} llega al poder en ${P().n} · ${sc.n}` });
  dirty(); S.fin = finance(true); return S; }; }

/* ---- dificultad por componentes (sobre los 4 niveles: ver diffK en 68-brain.js) ---- */
hook('late', () => { const k = p5k('stab'); if (k !== 1) P().stab = clamp(P().stab - (k - 1) * .9, 0, 100); });
{ const pe0 = playerEvent; playerEvent = () => { const k = p5k('ev'); if (k < 1 && chance(1 - k)) return; const n = S.pend.length; pe0(); if (k > 1 && S.pend.length === n && chance(k - 1)) pe0(); }; }

/* ---- sandbox (no pierdes por política) y modo rápido ---- */
{ const o0 = over; over = r => { if (S.over) return; if (mode() === 'sandbox' && ['eleccion', 'censura', 'golpe', 'revolucion'].includes(r)) { P().stab = Math.max(P().stab, 30); news('Modo sandbox: sigues en el poder pese a todo', 'pol', S.player, 2); return; }
  o0(r); if (S.over && S.p5) S.p5.tl.push({ t: S.turn, x: 'Fin del mandato: ' + r }); }; }
hook('late', () => { if (opt('rapido') && S.turn >= D.QUICK_TURNS && !S.over) over('tiempo'); });

/* ---- contadores de la partida (logros, estadísticas y puntuación) ---- */
{ const t0 = addTreaty; addTreaty = (t, a, b) => { const had = hasExplicit(t, a, b); t0(t, a, b); if (!had && (isP(a) || isP(b)) && S.p5) { S.p5.treat++; if (t === 'ali' || t === 'def') S.p5.tl.push({ t: S.turn, x: `${TNAME[t]} con ${nm(isP(a) ? b : a)}` }); } }; }
{ const w0 = startWar; startWar = (a, d) => { const pact = S.p5 && isP(a) && (hasExplicit('pna', a, d) || alliesOf(a).includes(d)); const w = w0(a, d); if (w && S.p5) { if (pact) S.p5.betray++; if (isP(a)) S.p5.decl++; if (isP(a) || isP(d)) S.p5.tl.push({ t: S.turn, x: `Guerra con ${nm(isP(a) ? d : a)}` }); } return w; }; }
{ const e0 = endWar; endWar = (w, kind) => { const me = S.player, mine = S.p5 && (w.att.includes(me) || w.def.includes(me)), sc = mine ? (w.att.includes(me) ? w.score : -w.score) : 0, foe = mine ? (w.att.includes(me) ? w.def[0] : w.att[0]) : null;
  e0(w, kind); if (mine) { if (sc >= 25 || (foe && !S.c[foe].alive)) S.p5.warsWon++; S.p5.tl.push({ t: S.turn, x: `Paz con ${nm(foe)}${sc >= 25 ? ' (victoria)' : sc <= -25 ? ' (derrota)' : ''}` }); } }; }
{ const m0 = OPS.mediate; OPS.mediate = a => { const had = !!warById(a.w); m0(a); if (had && !warById(a.w)) { S.p5.med++; S.p5.tl.push({ t: S.turn, x: 'Mediación de paz con éxito' }); } }; }
{ const s0 = ACT.spy; ACT.spy = a => { const r = s0(a); if (r && r.ok !== false) S.p5.spy++; return r; }; }
{ const v0 = ACT.visit; ACT.visit = a => { const r = v0(a); if (r && r.ok !== false) S.p5.visits++; return r; }; }
if (ACT.strat) { const n0 = ACT.strat; ACT.strat = a => { const r = n0(a); if (r && r.ok !== false) { S.p5.nukes++; S.p5.tl.push({ t: S.turn, x: 'Ataque estratégico' }); } return r; }; }
{ const c0 = coup; coup = iso => { c0(iso); if (S.p5) S.p5.coups++; }; }
hook('late', () => { const p = S.p5; p.lowStab = P().stab < 15 ? p.lowStab + 1 : 0; p.redTurns = P().tr < 0 ? p.redTurns + 1 : 0; if (p.tl.length > 60) p.tl.splice(1, p.tl.length - 60); });
OPS.setReg = a => { if (D.REGIMES[a.v]) { P().reg = a.v; if ((a.v === 'dem' || a.v === 'hib') && !(S.pol.nextElec > S.turn)) S.pol.nextElec = S.turn + 8; dirty(); news(`${P().n} cambia de régimen: ${D.REGIMES[a.v]}`, 'pol', S.player, 3); } };

/* ---- puerta de acciones: un solo país sin editor, y seguir jugando tras ganar ---- */
const EDIT_ACTS = { edit: 1, edWar: 1, fireEvent: 1, fireProc: 1, campSkip: 1, testVic: 1 };
{ const a0 = act; act = (name, a) => {
  if (name === 'keepPlaying') { if (!S || !S.over || !/^(vic_|camp_win|tiempo)/.test(S.over.r) || S.over.r === 'tiempo') return fail('Solo puedes seguir tras una victoria'); S.p5.cont = 1; S.over = null; S.pend = []; news('El mandato continúa', 'pol', S.player, 2); Bus.emit('state'); return { ok: true, msg: 'Sigues gobernando: la victoria queda registrada' }; }
  if (S && EDIT_ACTS[name]) { if (opt('solo') && mode() !== 'sandbox') { const r = fail('Esta partida es de un solo país sin editor'); Bus.emit('toast', r); return r; } S.p5.edited = 1; }
  return a0(name, a); }; }

/* ---- condiciones de objetivos (campañas, finales, escenarios propios) ---- */
const rankOf = (f, iso) => alive().sort((a, b) => f(b) - f(a)).indexOf(iso) + 1;
/* poder militar "en bruto" para objetivos y logros: sin el castigo de preparación o tropas desplegadas que power() aplica solo al jugador */
const rawPow = iso => { const c = C(iso); if (!c.alive) return 0; let v = 0; for (const k in D.UNITS) v += (c.u[k] || 0) * D.UNITS[k].pow; return v * (.7 + .3 * Math.min(1, c.gdp / Math.max(.001, c.pop) / 40)) * (.75 + c.stab / 400); };
function goalOk(g) {
  const me = S.player, c = P(), [k, a, b] = g;
  switch (k) {
    case 'any': return g.slice(1).some(L => L.every(goalOk));
    case 'gdpX': return c.gdp >= (S.stats.gdp0 || c.gdp) * a;
    case 'gdpRank': return rankOf(z => S.c[z].gdp, me) <= a; case 'gdpRankGt': return rankOf(z => S.c[z].gdp, me) > a;
    case 'powRank': return rankOf(rawPow, me) <= a; case 'powRankGt': return rankOf(rawPow, me) > a;
    case 'tr': return S.tr.filter(t => (t.a === me || t.b === me) && (a === 'any' || t.t === a || (a === 'ali' && t.t === 'def'))).length >= b;
    case 'stab': return c.stab >= a; case 'stabLt': return c.stab < a; case 'appr': return approval() >= a;
    case 'rep': return S.rep[a] >= b; case 'peace': return !inWar(me);
    case 'annex': return S.stats.annexed >= a; case 'occ': return ISOS.reduce((n, z) => n + (z === me ? 0 : S.c[z].terr.filter(t => t.o === me).length), 0) >= a;
    case 'occFree': return c.terr.every(t => t.o === me); case 'occBy': return c.terr.filter(t => t.o !== me).length >= a;
    case 'rel': return !!S.c[a] && S.c[a].alive && rel(me, a) >= b; case 'relLt': return !!S.c[a] && rel(me, a) < b;
    case 'relBig': return alive().filter(z => z !== me).sort((x, y) => S.c[y].gdp - S.c[x].gdp).slice(0, 5).every(z => rel(me, z) >= a);
    case 'warsWon': return S.p5.warsWon >= a; case 'declared': return S.p5.decl >= a; case 'med': return S.p5.med >= a;
    case 'tech': return S.tech.done.length >= a; case 'firsts': return firstsOf(me) >= a;
    case 'debtLt': return debtRatio() < a; case 'noSanc': return !S.sanc.some(s => s.on === me);
    case 'bloc': return c.blocs.includes(a); case 'flag': return !!S.flags[a]; case 'noflag': return !S.flags[a];
    case 'laws': return S.stats.laws >= a; case 'reg': return c.reg === a;
    case 'turns': return !!S.camp && S.turn - S.camp.s0 >= a; case 'turn': return S.turn >= a; case 'dead': return !c.alive;
  }
  return false;
}
const firstsOf = iso => S.disc ? D.DISC.filter(x => (S.disc.own[x.id] || [])[0] === iso).length : 0;
const GOALN = { gdpX: g => `PIB ×${g[1]} del inicial`, gdpRank: g => `Entre las ${g[1]} mayores economías`, powRank: g => `Entre los ${g[1]} ejércitos más fuertes`, tr: g => `${g[2]} ${g[1] === 'com' ? 'tratados comerciales' : g[1] === 'ali' ? 'alianzas o pactos de defensa' : g[1] === 'pna' ? 'pactos de no agresión' : 'tratados'}`,
  stab: g => `Estabilidad ${g[1]}`, appr: g => `Aprobación ${g[1]}%`, rep: g => `Reputación (${({ paz: 'paz', conf: 'confianza', dem: 'democracia', gen: 'humanitaria' })[g[1]] || g[1]}) ${g[2]}`, peace: () => 'Sin guerras propias',
  annex: g => `${g[1]} anexiones`, occ: g => `${g[1]} regiones extranjeras ocupadas`, occFree: () => 'Todo tu territorio libre', rel: g => `Relación ${g[2]} con ${nm(g[1])}`, relBig: g => `Relación ${g[1]} con las 5 grandes potencias`,
  warsWon: g => `${g[1]} guerra${g[1] > 1 ? 's' : ''} ganada${g[1] > 1 ? 's' : ''}`, med: g => `${g[1]} mediaci${g[1] > 1 ? 'ones' : 'ón'} de paz`, tech: g => `${g[1]} tecnologías`, firsts: g => `Primero del mundo en ${g[1]} descubrimientos`,
  debtLt: g => `Deuda por debajo del ${Math.round(g[1] * 100)}% del PIB`, noSanc: () => 'Nadie te sanciona', bloc: g => `Miembro de ${g[1]}`, laws: g => `${g[1]} leyes aprobadas`, reg: g => `Régimen: ${D.REGIMES[g[1]]}`,
  stabLt: g => `Estabilidad por debajo de ${g[1]}`, occBy: g => `Perder ${g[1]} regiones a manos extranjeras`, gdpRankGt: g => `Caer del puesto ${g[1]} en PIB mundial`, powRankGt: g => `Caer del puesto ${g[1]} en poder militar`, declared: () => 'Declarar tú una guerra', dead: () => 'Que tu país desaparezca',
  turns: g => `Mantenerlo ${g[1]} turnos`, turn: g => `Llegar al turno ${g[1]}`, any: g => g.slice(1).map(L => L.map(goalText).join(' y ')).join(' — o — '), flag: () => 'Una decisión concreta', noflag: () => 'Evitar cierta decisión' };
const goalText = g => (GOALN[g[0]] || (() => g[0]))(g);

/* ---- campaña: eventos por etapa, objetivos, plazos y finales ---- */
hook('late', () => {
  const K = S.camp; if (!K || K.end != null || S.over) return; const k = CA(K.id); if (!k) return; const st = k.stages[K.st];
  for (const e of k.events) if (e.st === K.st && !K.fired[e.id] && S.turn - K.s0 >= e.at && S.pend.length < 2) { K.fired[e.id] = 1; fireEvent(Object.assign({ tgt: null }, e), null); }
  if ((k.lose || []).some(goalOk)) { S.p5.tl.push({ t: S.turn, x: 'La campaña fracasa' }); return over('camp_lose'); }
  if (st.goal.every(goalOk)) {
    K.done.push(S.turn); S.p5.tl.push({ t: S.turn, x: `Etapa cumplida: ${st.n}` }); news(`Campaña · etapa cumplida: ${st.n}`, 'pol', S.player, 3); Bus.emit('campStage', { i: K.st, n: st.n });
    if (K.st + 1 < k.stages.length) { K.st++; K.s0 = S.turn; return; }
    K.end = k.endings.findIndex(x => !x.if || x.if.every(goalOk)); return over('camp_win');
  }
  if (st.turns && S.turn - K.s0 > st.turns) { S.p5.tl.push({ t: S.turn, x: `Se agota el plazo de «${st.n}»` }); over('camp_time'); }
});
function campInfo() {
  const K = S.camp; if (!K) return null; const k = CA(K.id); if (!k) return null; const st = k.stages[Math.min(K.st, k.stages.length - 1)];
  return { k, K, st, left: st.turns ? st.turns - (S.turn - K.s0) : null, goals: st.goal.map(g => ({ t: goalText(g), ok: goalOk(g), k: g[0] })), end: K.end != null ? k.endings[K.end] : null };
}

/* ---- código de partida: semilla + configuración en texto corto ---- */
function shareCode(x) { const j = JSON.stringify(x), b = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(j))) : Buffer.from(j, 'utf8').toString('base64'); return 'WL5-' + b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function readCode(s) {
  try { s = String(s || '').trim(); if (!/^WL5-[\w-]+$/.test(s)) return null; let b = s.slice(4).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    const j = typeof atob === 'function' ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, 'base64').toString('utf8'), o = JSON.parse(j);
    if (!o || typeof o !== 'object' || !D.C[o.iso] || !(o.seed >>> 0)) return null;
    return { iso: o.iso, seed: o.seed >>> 0, diff: clamp(+o.diff || 0, 0, 3), traits: (o.traits || []).filter(t => TR[t]).slice(0, D.TRAIT_POINTS), name: String(o.name || '').slice(0, 40), setup: normSetup(o.setup) };
  } catch (e) { return null; }
}
const gameCode = () => shareCode({ iso: S.player, seed: S.seed, diff: S.diff, traits: S.leader.traits, name: S.leader.n, setup: Object.assign({}, S.setup, { rel0: undefined }) });
/* reto semanal: la semana del año fija semilla, país, escenario y dos reglas */
function weekly(now) {
  const w = Math.floor(((now || Date.now()) / 864e5 + 3) / 7), R = D.WEEK_RULES, a = R[w % R.length], b = R[(w * 3 + 1) % R.length], opts = {};
  for (const r of a === b ? [a] : [a, b]) opts[r.id] = 1; if (opts.alt) opts.alt = 1;
  const ul = D.SCEN.filter(x => !x.lock), sc = ul[w % ul.length];
  return { w, iso: D.WEEK_COUNTRIES[w % D.WEEK_COUNTRIES.length], seed: (w * 7919) % 2147483647 || 1, scen: sc.id, rules: (a === b ? [a] : [a, b]).map(r => r.n), setup: { mode: 'semana', scen: sc.id, opts, week: w, dk: { ai: 1, eco: 1, stab: 1, ev: 1 } } };
}
