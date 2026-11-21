/* =====================================================================
   SISTEMA · CONVERSACIONES: los líderes hablan entre ellos (y de ti)
   Durante el turno se anotan los temas (guerras, sanciones, tratados,
   golpes, anexiones, paces, crisis). Al final se convierten en diálogos
   que el jugador puede leer y, si quiere, en los que puede intervenir.
   También: debate en la Asamblea de la ONU y ruedas de prensa.
   Textos en src/data-talk.js.
   ===================================================================== */
hook('new', () => { S.talk = []; S.talkQ = []; S.tkId = 0; }); hook('load', () => { S.talk = S.talk || []; S.talkQ = S.talkQ || []; S.tkId = S.tkId || 0; });
const notable = z => !!S.c[z] && S.c[z].alive && !isP(z) && (S.c[z].gdp > 300 || nb(S.player).includes(z) || alliesOf(S.player).includes(z));
const topic = (k, a, b) => { if (S.talkQ && S.c[a] && S.c[b] && a !== b && !isP(a) && !isP(b) && (notable(a) || notable(b))) S.talkQ.push([k, a, b]); };
{ const w0 = startWar; startWar = (a, d) => { const w = w0(a, d); if (w) topic('war', a, d); return w; }; }
{ const s0 = addSanction; addSanction = (by, on) => { const r = s0(by, on); if (r) topic('sanc', by, on); return r; }; }
{ const t0 = addTreaty; addTreaty = (t, a, b) => { const had = hasExplicit(t, a, b); t0(t, a, b); if (!had && t !== 'com') topic('treaty', a, b); }; }
{ const e0 = endWar; endWar = (w, kind) => { const a = w.att[0], d = w.def[0]; e0(w, kind); if (kind !== 'fin' && S.c[a].alive && S.c[d].alive) topic('peace', a, d); }; }
{ const c0 = coup; coup = iso => { c0(iso); const z = pick(nb(iso).filter(notable)) || bigOther(iso); if (z) topic('coup', iso, z); }; }
{ const a0 = annex; annex = (v, t) => { const r = a0(v, t); topic('annex', v, t); return r; }; }
{ const i0 = infect; infect = (iso, src) => { const r = i0(iso, src); if (r) topic('crisis', iso, src || bigOther(iso)); return r; }; }
const bigOther = (...not) => pick(alive().filter(z => !isP(z) && !not.includes(z)).sort((a, b) => S.c[b].gdp - S.c[a].gdp).slice(0, 12));

/* arma un diálogo con una plantilla de D.TALK */
function converse(k, a, b) {
  const T = D.TALK[k]; if (!T || !S.c[a] || !S.c[b]) return null; const x = bigOther(a, b), me = S.player;
  const sub = s => s.split('{A}').join(nm(a)).split('{B}').join(nm(b)).split('{X}').join(x ? nm(x) : 'la comunidad internacional').split('{LA}').join(S.c[a].lider.n).split('{LB}').join(S.c[b].lider.n)
    .split('{LX}').join(x ? S.c[x].lider.n : '').split('{P}').join(P().n).split('{PL}').join(S.leader.n);
  const lines = pick(T).filter(l => l[0] !== 'X' || x).map(l => [l[0] === 'A' ? a : l[0] === 'B' ? b : x, sub(l[1])]);
  const rep = /^gossip/.test(k) ? k : ['war', 'sanc', 'coup', 'annex'].includes(k) ? 'duel' : null;
  const c = { id: ++S.tkId, t: S.turn, k, a, b, lines, rep, done: 0 }; S.talk.push(c); if (S.talk.length > 40) S.talk.splice(0, S.talk.length - 40); return c;
}
hook('late', () => {
  const Qd = S.talkQ.splice(0), seen = new Set(), done = [];
  for (const [k, a, b] of shuffle(Qd)) { const key = [a, b].sort().join(); if (seen.has(key) || done.length >= 2) continue; seen.add(key); done.push(converse(k, a, b)); }
  const me = S.player, L = alive().filter(z => z !== me && S.c[z].gdp > 150);
  if (chance(.3) && L.length > 3) { const byRel = L.slice().sort((x, y) => rel(me, y) - rel(me, x)), good = chance(.5), pool = good ? byRel.slice(0, 6) : byRel.slice(-6), [a, b] = shuffle(pool);
    if (a && b && (good ? rel(me, a) > 20 : rel(me, a) < -10)) converse(good ? 'gossipGood' : 'gossipBad', a, b); }
  if (chance(.1)) { const [a, b] = shuffle(L.filter(z => S.c[z].gdp > 600)); if (a && b) converse('chat', a, b); }
});
/* intervenir en una conversación pública */
ACT.talkReply = a => {
  const c = S.talk.find(x => x.id === +a.id); if (!c || !c.rep || c.done) return fail('Esa conversación ya no admite respuesta'); if (c.t < S.turn - 2) return fail('Ese debate ya se enfrió');
  const o = (D.TALK_REPLY[c.rep] || [])[+a.i]; if (!o) return fail('Respuesta inválida');
  const s = o[1].replace(/rel\.([AB])(?=[+-])/g, (m, w) => 'rel.' + (w === 'A' ? c.a : c.b));
  applyFx(D.fx(s), {}); c.done = 1; c.lines.push([S.player, o[0].split('{A}').join(nm(c.a)).split('{B}').join(nm(c.b))]); return { msg: 'Tu respuesta da la vuelta al mundo' };
};
FREE.talkReply = 1;

/* Asamblea de la ONU: cada voto importante deja discursos */
{ const v0 = OPS.unVote; OPS.unVote = a => { const r = S.un.cur; v0(a); const last = S.un.last; if (!r || !last || last.r !== r) return;
  const big = alive().filter(z => !isP(z)).sort((x, y) => S.c[y].gdp - S.c[x].gdp).slice(0, 14), U = D.UN_LINES, me = S.player, lines = [];
  const pool = { si: shuffle(U.si.slice()), no: shuffle(U.no.slice()) }, say = (z, side) => lines.push([z, (pool[side].pop() || pick(U[side])).split('{L}').join(S.c[z].lider.n).split('{C}').join(S.c[z].n)]);
  const yes = shuffle(big.filter(z => unScore(z, r) > .12)).slice(0, 2), no = shuffle(big.filter(z => unScore(z, r) < -.12)).slice(0, 2);
  yes.forEach(z => say(z, 'si')); no.forEach(z => say(z, 'no')); lines.push([me, `${S.leader.n} (${P().n}): «${a.v > 0 ? 'Votamos a favor.' : a.v < 0 ? 'Votamos en contra.' : 'Nos abstenemos.'}»`]);
  lines.push(['', `${last.pass ? U.fin.si : U.fin.no} (${last.yes} a favor, ${last.no} en contra, ${last.abs} abstenciones)`]);
  S.talk.push({ id: ++S.tkId, t: S.turn, k: 'un', a: yes[0] || me, b: no[0] || me, lines, rep: null, done: 1, title: 'Asamblea de la ONU · ' + UNT[r.type] }); }; }

/* rueda de prensa: cada pocos turnos, una pregunta según cómo te va */
hook('late', () => {
  if (S.over || S.turn < 3 || S.pend.length > 1 || (S.pressT || 0) > S.turn || !chance(.35)) return;
  const ap = approval(), ok = { war: inWar(S.player), crisis: !!S.eco.cri, low: ap < 40, high: ap > 62, sanc: S.sanc.filter(s => s.on === S.player).length >= 3, any: true };
  const Lq = D.PRESS.filter(q => ok[q.if]), hot = Lq.filter(q => q.if !== 'any'), q = pick(hot.length && chance(.7) ? hot : Lq); if (!q) return;
  const T = pick(alive().filter(z => z !== S.player && (S.c[z].gdp > 400 || nb(S.player).includes(z)))) || null, m = pick(D.MEDIA);
  S.pressT = S.turn + 5;
  fireEvent({ id: 'prensa', tgt: null, t: 'Rueda de prensa', x: `${m}: «${q.q.split('{X}').join(T ? nm(T) : 'sus vecinos')}»`, opts: q.opts }, T || S.player);
});
