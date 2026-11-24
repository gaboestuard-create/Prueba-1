/* =====================================================================
   SISTEMA · CONVERSACIONES: los líderes hablan entre ellos (y de ti)
   Durante el turno se anotan los temas (guerras, sanciones, tratados,
   golpes, anexiones, paces, crisis). Al final se convierten en diálogos
   que el jugador puede leer y, si quiere, en los que puede intervenir.
   También: debate en la Asamblea de la ONU y ruedas de prensa.
   Textos y ajustes en src/data-talk.js (D.TALK, D.TALK_CFG…).
   ===================================================================== */
hook('new', () => { S.talk = []; S.talkQ = []; S.tkId = 0; S.pressT = 0; });
hook('load', () => { S.talk = S.talk || []; S.talkQ = S.talkQ || []; S.tkId = S.tkId || 0; S.pressT = S.pressT || 0; });
const TC = D.TALK_CFG;
const fill = (s, m) => s.replace(/\{(\w+)\}/g, (all, k) => m[k] != null ? m[k] : all);
const byGdp = (...not) => alive().filter(z => !isP(z) && !not.includes(z)).sort((a, b) => S.c[b].gdp - S.c[a].gdp);
const bigOther = (...not) => pick(byGdp(...not).slice(0, 12));
const notable = z => !!S.c[z] && S.c[z].alive && !isP(z) && (S.c[z].gdp > TC.notableGdp || nb(S.player).includes(z) || alliesOf(S.player).includes(z));
const topic = (k, a, b) => { if (S.c[a] && S.c[b] && a !== b && !isP(a) && !isP(b) && (notable(a) || notable(b))) S.talkQ.push([k, a, b]); };
const talkOpen = c => !!c.rep && !c.done && c.t >= S.turn - TC.replyTurns;
function addTalk(c) { c.id = ++S.tkId; c.t = S.turn; S.talk.push(c); if (S.talk.length > TC.keep) S.talk.splice(0, S.talk.length - TC.keep); return c; }
/* los temas se anotan donde ocurren */
{ const w0 = startWar; startWar = (a, d) => { const w = w0(a, d); if (w) topic('war', a, d); return w; }; }
{ const s0 = addSanction; addSanction = (by, on) => { const r = s0(by, on); if (r) topic('sanc', by, on); return r; }; }
{ const t0 = addTreaty; addTreaty = (t, a, b) => { const had = hasExplicit(t, a, b), r = t0(t, a, b); if (!had && t !== 'com') topic('treaty', a, b); return r; }; }
{ const e0 = endWar; endWar = (w, kind) => { const live = S.wars.includes(w), a = w.att[0], d = w.def[0]; const r = e0(w, kind); if (live && kind !== 'fin' && S.c[a].alive && S.c[d].alive) topic('peace', a, d); return r; }; }
{ const c0 = coup; coup = iso => { const r = c0(iso); const z = pick(nb(iso).filter(notable)) || bigOther(iso); if (z) topic('coup', iso, z); return r; }; }
{ const a0 = annex; annex = (v, t) => { const was = S.c[v].alive, r = a0(v, t); if (was && !S.c[v].alive) topic('annex', v, t); return r; }; }
{ const i0 = infect; infect = (iso, src) => { const r = i0(iso, src); if (r) topic('crisis', iso, src || bigOther(iso)); return r; }; }

/* arma un diálogo con una plantilla de D.TALK */
function converse(k, a, b) {
  const T = D.TALK[k]; if (!T || !S.c[a] || !S.c[b]) return null; const x = bigOther(a, b);
  const m = { A: nm(a), B: nm(b), X: x ? nm(x) : 'la comunidad internacional', LA: S.c[a].lider.n, LB: S.c[b].lider.n, P: P().n, PL: S.leader.n };
  const lines = pick(T).filter(l => l[0] !== 'X' || x).map(l => [l[0] === 'A' ? a : l[0] === 'B' ? b : x, fill(l[1], m)]);
  return addTalk({ k, a, b, lines, rep: /^gossip/.test(k) ? k : ['war', 'sanc', 'coup', 'annex'].includes(k) ? 'duel' : null, done: 0 });
}
hook('late', () => {
  const seen = new Set(); let n = 0;
  for (const [k, a, b] of shuffle(S.talkQ.splice(0))) { const key = [a, b].sort().join(); if (seen.has(key) || n >= TC.perTurn) continue; seen.add(key); if (converse(k, a, b)) n++; }
  const me = S.player, L = alive().filter(z => z !== me && S.c[z].gdp > TC.notableGdp / 2);
  if (chance(TC.gossip)) { const good = chance(.5), pool = shuffle(L.filter(z => good ? rel(me, z) > 20 : rel(me, z) < -10)); if (pool.length >= 2) converse(good ? 'gossipGood' : 'gossipBad', pool[0], pool[1]); }
  if (chance(TC.chat)) { const [a, b] = shuffle(L.filter(z => S.c[z].gdp > TC.chatGdp)); if (a && b) converse('chat', a, b); }
});
/* intervenir en una conversación pública */
ACT.talkReply = a => {
  const c = S.talk.find(x => x.id === +a.id); if (!c || !talkOpen(c) || !S.c[c.a].alive || !S.c[c.b].alive) return fail('Esa conversación ya no admite respuesta');
  const o = Number.isInteger(a.i) && (D.TALK_REPLY[c.rep] || [])[a.i]; if (!o) return fail('Respuesta inválida');
  applyFx(D.fx(o[1].replace(/rel\.([AB])(?=[+-])/g, (all, w) => 'rel.' + (w === 'A' ? c.a : c.b))), {});
  c.done = 1; c.lines.push([S.player, fill(o[0], { A: nm(c.a), B: nm(c.b) })]); return { msg: 'Tu respuesta da la vuelta al mundo' };
};
FREE.talkReply = 1;

/* Asamblea de la ONU: cada voto deja discursos */
{ const v0 = OPS.unVote; OPS.unVote = a => { const r = S.un.cur; v0(a); const last = S.un.last; if (!r || !last || last.r !== r) return;
  const big = byGdp().slice(0, 14), U = D.UN_LINES, me = S.player, lines = [], pool = { si: shuffle(U.si.slice()), no: shuffle(U.no.slice()) };
  const yes = shuffle(big.filter(z => unScore(z, r) > .12)).slice(0, TC.unSpeakers), no = shuffle(big.filter(z => unScore(z, r) < -.12)).slice(0, TC.unSpeakers);
  for (const [L, side] of [[yes, 'si'], [no, 'no']]) for (const z of L) lines.push([z, fill(pool[side].pop() || pick(U[side]), { C: S.c[z].n })]);
  lines.push([me, U.yo[a.v > 0 ? 'si' : a.v < 0 ? 'no' : 'abs']]);
  lines.push(['', `${last.pass ? U.fin.si : U.fin.no} (${last.yes} a favor, ${last.no} en contra, ${last.abs} abstenciones)`]);
  addTalk({ k: 'un', a: yes[0] || me, b: no[0] || me, lines, rep: null, done: 1, title: 'Asamblea de la ONU · ' + UNT[r.type] }); }; }

/* rueda de prensa: cada pocos turnos, una pregunta según cómo te va */
hook('late', () => {
  if (S.over || S.turn < 3 || S.pend.length > 1 || S.pressT > S.turn || !chance(TC.pressChance)) return;
  const ap = approval(), ok = { war: inWar(S.player), crisis: !!S.eco.cri, low: ap < 40, high: ap > 62, sanc: S.sanc.filter(s => s.on === S.player).length >= 3, any: true };
  const Lq = D.PRESS.filter(q => ok[q.if]), hot = Lq.filter(q => q.if !== 'any'), q = pick(hot.length && chance(.7) ? hot : Lq); if (!q) return;
  const T = pick(alive().filter(z => z !== S.player && (S.c[z].gdp > TC.notableGdp || nb(S.player).includes(z)))) || null;
  S.pressT = S.turn + TC.pressCool;
  fireEvent({ id: 'prensa', tgt: null, t: 'Rueda de prensa', x: `${pick(D.MEDIA)}: «${fill(q.q, { X: T ? nm(T) : 'sus vecinos' })}»`, opts: q.opts }, T || S.player);
});
