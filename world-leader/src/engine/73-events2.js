/* =====================================================================
   SISTEMA · EVENTOS AMPLIADOS (Fase 2): condiciones nuevas, cadenas,
   arcos de rival y aliado, alertas priorizadas y periódico del turno.
   ===================================================================== */
const EV = {}; D.EVENTS.forEach(e => EV[e.id] = e);
{ // se amplían condiciones y objetivos de la Fase 1 envolviendo sus funciones
  const c0 = condOk, t0 = pickTarget;
  condOk = q => {
    if (!c0(q)) return false; if (!q || q.any) return true; const E = S.eco, c = P();
    if (q.infGt && !(E.inf > q.infGt)) return false; if (q.unempGt && !(E.unemp > q.unempGt)) return false; if (q.debtGt && !(debtRatio() > q.debtGt)) return false; if (q.fxLt && !(E.fx < q.fxLt)) return false;
    if (q.cri && !E.cri) return false; if (q.minority && !S.flags.minority) return false; if (q.war && !inWar(S.player)) return false; if (q.peace && inWar(S.player)) return false;
    if (q.dem && !isDem()) return false; if (q.bloc && !c.blocs.length) return false; if (q.every && S.turn % q.every) return false; if (q.techGte && S.tech.done.length < q.techGte) return false;
    if (q.gpcGt && !(c.gdp / c.pop > q.gpcGt)) return false; if (q.gdpGt && !(c.gdp > q.gdpGt)) return false;
    if (q.arc && !(S.arc && S.arc[q.arc[0]] && S.arc[q.arc[0]].st === q.arc[1] && S.c[S.arc[q.arc[0]].iso].alive)) return false;
    return true;
  };
  pickTarget = kind => {
    const me = S.player, ok = z => z && z !== me && S.c[z].alive;
    if (kind === 'arcRival') return S.arc && ok(S.arc.rival.iso) ? S.arc.rival.iso : null; if (kind === 'arcAlly') return S.arc && ok(S.arc.ally.iso) ? S.arc.ally.iso : null;
    if (kind === 'neighbor') { const n = nb(me).filter(z => !atWar(me, z)); return n.length ? pick(n) : t0('any'); }
    if (kind === 'power') { const p = alive().filter(z => z !== me && !atWar(me, z)).sort((a, b) => S.c[b].gdp - S.c[a].gdp).slice(0, 12); return p.length ? pick(p) : null; }
    return t0(kind);
  };
}
function initArc() { // el rival y el aliado recurrentes de la partida
  if (S.arc) return; const me = S.player, cand = alive().filter(z => z !== me && S.c[z].gdp > 30).map(z => [z, rel(me, z), nb(me).includes(z) || S.c[z].gdp > 700]);
  const rv = cand.filter(x => x[2]).sort((a, b) => a[1] - b[1])[0] || cand.sort((a, b) => a[1] - b[1])[0], al = cand.filter(x => !rv || x[0] !== rv[0]).sort((a, b) => b[1] - a[1])[0];
  S.arc = { rival: { iso: rv ? rv[0] : me, st: 0 }, ally: { iso: al ? al[0] : me, st: 0 } };
}
hook('new', initArc); hook('load', initArc);
const arcInfo = () => S.arc;

function fireEvent(e, T) { // lanza un evento concreto (cadenas y editor)
  if (!e || S.over) return false; if (e.tgt && !T) T = pickTarget(e.tgt); if (e.tgt && !T) return false;
  if (!T) T = S.player; S.evSeen[e.id] = S.turn; if (e.pre) applyFx(e.pre, {});
  const mine = P().terr.filter(t => t.o === S.player), R = (pick(mine.length > 1 ? mine.slice(1) : mine) || { n: 'la capital' }).n, O = (S.pol.seats.filter(p => !p.g).sort((a, b) => b.s - a.s)[0] || { n: 'la oposición' }).n;
  const sub = s => s.split('{T}').join(nm(T)).split('{L}').join(C(T).lider.n).split('{R}').join(R).split('{O}').join(O);
  const sfx = l => (l || []).map(f => f.map(v => typeof v === 'string' ? sub(v) : Array.isArray(v) && Array.isArray(v[0]) ? sfx(v) : v)); // los textos dentro de los efectos también se sustituyen
  pushPend({ k: 'event', id: e.id, t: sub(e.t), x: sub(e.x), iso: T, opts: e.opts.map(o => ({ t: sub(o.t), fx: sfx(o.fx), hid: sfx(o.hid) })) });
  return true;
}
{ // playerEvent de la Fase 1 elige el evento; aquí se le pasa por fireEvent para tener {L}, {R} y {O}
  const pe = playerEvent;
  playerEvent = () => { const n = S.pend.length; pe(); const p = S.pend[n]; if (p && p.k === 'event' && EV[p.id] && /\{[LRO]\}/.test(EV[p.id].t + EV[p.id].x + JSON.stringify(EV[p.id].opts))) { S.pend.splice(n, 1); fireEvent(EV[p.id], p.iso); } };
}
hook('late', () => { // cadenas: el siguiente eslabón llega cuando toca
  const due = S.chain.filter(x => x.t <= S.turn); S.chain = S.chain.filter(x => x.t > S.turn);
  for (const x of due) fireEvent(EV[x.id], x.T && S.c[x.T] && S.c[x.T].alive ? x.T : null);
  for (const k of ['rival', 'ally']) if (S.arc && !S.c[S.arc[k].iso].alive) { const o = S.arc[k === 'rival' ? 'ally' : 'rival'].iso; S.arc = null; initArc(); if (S.arc[k].iso === o) S.arc[k].st = 9; }
});
ACT.fireEvent = a => { const e = EV[a.id]; if (!e) return fail('Evento desconocido'); return fireEvent(e, a.iso && S.c[a.iso] ? a.iso : null) ? { msg: `Evento lanzado: ${e.t}` } : fail('Ese evento necesita un país objetivo que ahora no existe'); };
FREE.fireEvent = 1;

/* ---- alertas priorizadas: lo que requiere tu atención ---- */
function alerts() {
  const c = P(), E = S.eco, pol = S.pol, ap = approval(), out = [], add = (p, t, panel, tab) => out.push({ p, t, panel, tab });
  if (S.pend.length) add(5, `Tienes ${S.pend.length} decisión${S.pend.length > 1 ? 'es' : ''} pendiente${S.pend.length > 1 ? 's' : ''}`, '', '');
  if (c.stab < 30) add(5, `Estabilidad crítica (${Math.round(c.stab)}): riesgo de golpe`, 'pol', 'sec');
  for (const w of warsOf(S.player)) { const sc = w.att.includes(S.player) ? w.score : -w.score; if (sc < -20) add(5, `Vas perdiendo la guerra contra ${nm(w.att.includes(S.player) ? w.def[0] : w.att[0])}`, 'mil', 'gue'); }
  if (isDem()) { const left = pol.nextElec - S.turn; if (left <= 3 && left > 0) add(4, `Elecciones en ${left} turno${left > 1 ? 's' : ''}; aprobación ${Math.round(ap)}%`, 'pol', 'ele'); if (S.flags.minority) add(4, `Sin mayoría en el congreso (${Math.round(govSeats())} escaños)`, 'pol', 'con'); }
  if (E.cri) add(4, 'Crisis financiera en curso', 'eco', 'ind'); if (E.inf > 9) add(3, `Inflación del ${E.inf.toFixed(1)}%`, 'eco', 'ind'); if (E.unemp > 11) add(3, `Desempleo del ${E.unemp.toFixed(1)}%`, 'eco', 'ind');
  if (debtRatio() > .9) add(4, `Deuda en el ${Math.round(debtRatio() * 100)}% del PIB`, 'eco', 'ind'); if (c.tr < 0) add(4, `Caja en números rojos (${money(c.tr)})`, 'eco', 'pre'); if (E.fx < 85) add(3, `Tu moneda ha caído a ${Math.round(E.fx)}`, 'eco', 'ind');
  for (const k in pol.sec) if (pol.sec[k].a < 32) add(3, `${D.SECTORS[k].n} al límite (${Math.round(pol.sec[k].a)})`, 'pol', 'sec');
  for (const s of S.sanc) if (s.on === S.player && S.turn - s.s <= 1) add(3, `${nm(s.by)} te ha ${s.emb ? 'impuesto un embargo' : 'sancionado'}`, 'dip', 'tra');
  for (const e of intelList().slice(0, 3)) if (e.est.t === S.player && (e.est.k === 'guerra' || e.est.k === 'presion')) add(4, `Inteligencia: ${nm(e.iso)} ${e.est.k === 'guerra' ? 'prepara la guerra contra ti' : 'planea presionarte'} (${Math.round(e.conf * 100)}% de certeza)`, 'dip', 'int');
  if (!S.tech.cur && S.tech.done.length < D.TECHS.length) add(2, 'Tus laboratorios no tienen proyecto', 'tec', ''); if (pol.cp >= 11) add(1, 'Capital político al máximo: úsalo o se pierde', 'pol', 'ley');
  return out.sort((a, b) => b.p - a.p).slice(0, 8);
}
/* ---- periódico mundial: las noticias del último turno por secciones ---- */
function paper() {
  const t = S.turn - 1, all = S.news.filter(n => n.t === t || n.t === S.turn).sort((a, b) => b.p - a.p), sec = { 'Guerra y paz': ['war', 'peace', 'mil'], Diplomacia: ['dip', 'un'], 'Economía': ['eco'], 'Política': ['pol', 'elec', 'coup'], Mundo: ['world'] }, out = {};
  for (const k in sec) out[k] = all.filter(n => sec[k].includes(n.k)).slice(0, 6);
  return { date: dateStr(), head: all[0] || null, sec: out, n: all.length };
}
