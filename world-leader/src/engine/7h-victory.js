/* =====================================================================
   SISTEMA · FASE 5 · VICTORIAS, PUNTUACIÓN, EPÍLOGO Y EVENTOS PROCEDURALES
   Umbrales y pesos en src/data-scenario.js (D.VICT) y src/data-progress.js (D.SCORE).
   ===================================================================== */
const topGdp = n => alive().sort((a, b) => S.c[b].gdp - S.c[a].gdp).slice(0, n); /* las n mayores economías */
const myTr = t => S.tr.filter(x => (x.a === S.player || x.b === S.player) && (!t || t.includes(x.t))).length;
function metrics() {
  const me = S.player, c = P(), p = S.p5 || P5DEF(), o = S.over, K = S.camp;
  return {
    turn: S.turn, gdp: c.gdp, gdpX: c.gdp / Math.max(.001, S.stats.gdp0 || c.gdp), gdpRank: rankOf(z => S.c[z].gdp, me), powRank: rankOf(rawPow, me),
    appr: approval(), stab: c.stab, com: myTr(['com']), ali: myTr(['ali', 'def']), pna: myTr(['pna']), laws: S.stats.laws, wars: S.stats.wars, warsWon: p.warsWon, annex: S.stats.annexed,
    occ: ISOS.reduce((n, z) => n + (z === me ? 0 : S.c[z].terr.filter(t => t.o === me).length), 0), med: p.med, tech: S.tech.done.length, firsts: firstsOf(me),
    conf: S.rep.conf, paz: S.rep.paz, dem: S.rep.dem, gen: S.rep.gen, debt: debtRatio(), cash: c.tr / Math.max(1, c.gdp),
    sancOn: S.sanc.filter(s => s.on === me).length, sancBy: S.sanc.filter(s => s.by === me).length, crimes: (S.war3 || {}).crimes || 0, elections: S.stats.elections,
    treat: p.treat, spy: p.spy, coups: p.coups, nukes: p.nukes, visits: p.visits, betray: p.betray, lowStab: p.lowStab, redTurns: p.redTurns, edited: p.edited,
    friends: alive().filter(z => z !== me && rel(me, z) >= 50).length, mode: mode(), scen: (S.setup || {}).scen, perm: opt('perm'),
    camp: K ? K.id : null, campStage: K ? K.st : 0, campEnd: K && K.end != null ? K.id + ':' + K.end : null, vic: p.vic, over: !!o, overR: o ? o.r : null, traits: S.leader.traits.slice()
  };
}
/* ---- puntuación equilibrada: ocho bloques, ninguno pasa de su máximo ---- */
function score() {
  const m = metrics(), c = P(), ap = S.hist.appr.length ? S.hist.appr.reduce((a, b) => a + b, 0) / S.hist.appr.length : m.appr, k01 = v => clamp(v, 0, 1);
  const K = S.camp, k = K && CA(K.id), objV = k ? (K.done.length / k.stages.length) : m.vic ? 1 : 0;
  const V = {
    eco: k01(.5 + (m.gdpX - 1)) - (m.debt > 1 ? .2 : 0), soc: k01(ap / 100 * .6 + c.stab / 100 * .4), dip: k01(myTr() / 25 * .5 + Math.max(0, m.conf) / 60 * .3 + m.med / 4 * .2),
    paz: k01((m.paz + 50) / 100 * .6 + (m.gen + 50) / 100 * .4 - m.crimes * .1), sci: k01(m.tech / 15 * .6 + m.firsts / 5 * .4),
    pow: k01((1 - (m.powRank - 1) / 30) * .6 + Math.min(1, m.warsWon / 3) * .2 + Math.min(1, m.annex / 3) * .2), dur: k01(m.turn / 60), obj: k01(objV)
  };
  const parts = D.SCORE.map(([id, n, max, why]) => ({ id, n, max, why, v: Math.round(clamp(V[id], 0, 1) * max * 10) / 10 }));
  return { total: Math.round(parts.reduce((a, x) => a + x.v, 0)), parts };
}
/* ---- victorias alternativas (partida libre, reto semanal y sandbox) ---- */
function victCheck() {
  const me = S.player, c = P(), m = metrics(), all = alive().reduce((a, z) => a + power(z), 0) || 1, second = alive().filter(z => z !== me).reduce((a, z) => Math.max(a, S.c[z].gdp), 0);
  return {
    dom: power(me) / all >= .25 && m.annex >= 3, eco: c.gdp >= second * 1.6 && m.gdpX >= 1.5, dip: m.ali >= 12 && m.com >= 30 && m.conf >= 50,
    tec: m.firsts >= 7 && m.tech >= 12, sup: m.turn >= 120, leg: m.turn >= 80 && legacy().score >= 88
  };
}
hook('late', () => {
  if (S.over || !['libre', 'semana', 'sandbox'].includes(mode())) return; const v = victCheck(), p = S.p5;
  for (const x of D.VICT) if (v[x.id] && !p.vicDone[x.id]) { p.vicDone[x.id] = S.turn; p.vic = x.id; p.tl.push({ t: S.turn, x: 'Victoria: ' + x.n }); news(`${S.leader.n} logra la ${x.n.toLowerCase()}`, 'pol', S.player, 3); return over('vic_' + x.id); }
  const cu = (S.setup || {}).custom; if (cu && cu.goals && cu.goals.length && !p.vicDone.obj && cu.goals.every(goalOk)) { p.vicDone.obj = S.turn; p.vic = 'obj'; p.tl.push({ t: S.turn, x: 'Objetivo del escenario cumplido' }); return over('vic_obj'); }
});
/* eventos programados de un escenario propio */
hook('late', () => { const cu = (S.setup || {}).custom; if (!cu || !cu.events || S.pend.length) return; for (const e of cu.events) if (e.at === S.turn && EV[e.id]) fireEvent(EV[e.id], null); });

/* ---- eventos procedurales: plantilla + país + líder + recurso + situación, sin repetir combinación ---- */
function procEvent() {
  const P5 = D.PROC, cd = S.procCd = S.procCd || {}, seen = S.procSeen = S.procSeen || [];
  for (const tp of shuffle(P5.tpl.filter(x => !(cd[x.id] > S.turn)))) {
    const T = tp.tgt ? pickTarget(tp.tgt) : pick(alive().filter(z => z !== S.player && S.c[z].gdp > 200)); if (!T || !S.c[T]) continue;
    const rk = Object.keys(S.c[T].rec).filter(r => S.c[T].rec[r] > 0 && D.COMMODITIES[r]), K = rk.length ? pick(rk) : pick(Object.keys(D.COMMODITIES)), SIT = pick(P5.sit), key = [tp.id, T, K, SIT].join('|');
    if (seen.includes(key)) continue; seen.push(key); if (seen.length > 60) seen.shift(); cd[tp.id] = S.turn + P5.cool;
    const sub = s => s.split('{RES}').join(D.COMMODITIES[K].n.toLowerCase()).split('{K}').join(K).split('{SIT}').join(SIT);
    return fireEvent({ id: 'proc_' + tp.id, tgt: null, t: sub(tp.t), x: sub(tp.x), opts: tp.opts.map(o => ({ t: sub(o[0]), fx: D.fx(sub(o[1])) })) }, T);
  }
  return false;
}
{ const pe0 = playerEvent; playerEvent = () => { const n = S.pend.length; pe0(); if (!S.over && S.pend.length === n && chance(D.PROC.p * p5k('ev'))) safe('evento procedural', procEvent); }; }

/* ---- epílogo: el mundo sigue 10–20 turnos sin ti; luego todo vuelve a su sitio ---- */
function epilogue(n) {
  n = clamp(Math.round(n || 12), 1, 20); const snap = save(), me = S.player, c0 = P(), g0 = c0.gdp, top0 = topGdp(5), heads = [];
  let last = S.nid, played = 0;
  try {
    for (; played < n; played++) { S.over = null; S.pend = []; if (!P().alive) break; ACT.endTurn(); S.pend = [];
      for (const x of S.news) if (x.id > last && x.p >= 3) heads.push({ t: x.t, x: x.x, k: x.k }); last = S.nid; }
  } catch (e) { heads.push({ t: S.turn, x: 'La crónica se interrumpe aquí.', k: 'pol' }); }
  const c = P(), top = topGdp(5);
  const res = { n: played, date: dateStr(), alive: c.alive, gdpCh: c.alive ? (c.gdp / g0 - 1) * 100 : -100, stab: Math.round(c.stab), leader: c.lider && c.lider.n !== S.leader.n ? c.lider.n : null,
    wars: S.wars.length, top, top0, heads: heads.filter(h => !/ asume el poder| tus /.test(h.x)).slice(-14), rise: top.filter(z => !top0.includes(z)), fall: top0.filter(z => !top.includes(z)) };
  load(snap); return res;
}

/* ---- acciones nuevas: mediar por iniciativa propia y herramientas del editor ---- */
ACT.mediate = a => { const w = warById(+a.w), me = S.player; if (!w) return fail('Esa guerra ya terminó');
  if (w.att.includes(me) || w.def.includes(me)) return fail('No puedes mediar en tu propia guerra');
  if (rel(me, w.att[0]) < -25 || rel(me, w.def[0]) < -25) return fail('Uno de los bandos no te ve como neutral: necesitas relación de −25 o más con ambos');
  if ((w.medT || 0) > S.turn) return fail(`Ya lo intentaste: espera ${w.medT - S.turn} turnos`); if (!useCP(2)) return fail('Necesitas 2 de capital político');
  w.medT = S.turn + 4; OPS.mediate({ w: w.id }); return { msg: warById(w.id) ? 'La mediación fracasa por ahora: podrás volver a intentarlo' : 'Mediación lograda: firman la paz' }; };
ACT.fireProc = () => procEvent() ? { msg: 'Evento procedural lanzado' } : fail('No hay ninguna combinación nueva disponible ahora');
ACT.campSkip = () => { const K = S.camp; if (!K || K.end != null) return fail('No hay etapa de campaña en curso'); const k = CA(K.id); K.done.push(S.turn);
  if (K.st + 1 < k.stages.length) { K.st++; K.s0 = S.turn; Bus.emit('campStage', { i: K.st - 1, n: k.stages[K.st - 1].n }); return { msg: 'Etapa cumplida desde el editor' }; }
  K.end = k.endings.findIndex(x => !x.if || x.if.every(goalOk)); over('camp_win'); return { msg: 'Campaña completada desde el editor' }; };
ACT.testVic = a => { const v = D.VICT.find(x => x.id === a.k); if (!v) return fail('Victoria desconocida'); S.p5.vicDone[v.id] = S.turn; S.p5.vic = v.id; over('vic_' + v.id); return { msg: 'Victoria de prueba: ' + v.n }; };
ACT.markEdited = () => { S.p5.edited = 1; return { msg: 'Partida marcada como editada' }; };
Object.assign(FREE, { fireProc: 1, campSkip: 1, testVic: 1, markEdited: 1 });
