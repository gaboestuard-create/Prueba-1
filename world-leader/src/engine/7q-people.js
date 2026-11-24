/* =====================================================================
   SISTEMA · PERSONAJES RECURRENTES, CUMBRE ANUAL Y SALA DE CRISIS
   - Cuatro personajes con nombre (oposición, periodista, general, magnate)
     cuya actitud hacia ti cambia con tus decisiones y tiene consecuencias.
   - Cumbre anual de las grandes economías: eliges con quién reunirte y el tema.
   - Crisis en tres fases, una por turno; el resultado depende de la suma.
   Datos en src/data-people.js.
   ===================================================================== */
const PPC = D.PEOPLE_CFG, SUM = D.SUMMIT, CRC = D.CRISIS_CFG;
function pplInit() { S.ppl = {}; for (const k in D.PEOPLE) S.ppl[k] = { n: genLeader(S.player), att: ri(-10, 10), cd: 0, log: [], pseed: ri(0, 96) }; }
hook('new', () => { pplInit(); S.crisis = null; S.crisisCd = 0; }); hook('load', () => { if (!S.ppl) pplInit(); for (const k in D.PEOPLE) S.ppl[k] = S.ppl[k] || { n: genLeader(S.player), att: 0, cd: 0, log: [], pseed: 0 }; if (S.crisis === undefined) S.crisis = null; S.crisisCd = S.crisisCd || 0; });
const oppName = () => (S.pol.seats.filter(p => !p.g).sort((a, b) => b.s - a.s)[0] || { n: 'la oposición' }).n;
const pplFill = (s, k) => s.split('{N}').join(S.ppl[k].n).split('{O}').join(oppName()).split('{P}').join(P().n).split('{PL}').join(S.leader.n);
function pplCond(c, k) { const a = S.ppl[k].att, el = S.pol.nextElec - S.turn;
  return c === 'any' || (c === 'lowAppr' && approval() < 42) || (c === 'elecNear' && el >= 1 && el <= 3) || (c === 'hostile' && a < PPC.hostile) || (c === 'friendly' && a > PPC.friendly) || (c === 'war' && inWar(S.player)) || (c === 'milLow' && S.pol.sec.mil.a < 40); }
OPS.pplAtt = a => { const p = S.ppl[a.k]; if (!p) return; p.att = clamp(p.att + a.v, -100, 100); p.log.push({ t: S.turn, x: a.x, v: a.v }); if (p.log.length > 12) p.log.shift(); };
hook('late', () => {
  if (S.over || S.pend.length > 1 || !chance(PPC.p)) return;
  const L = shuffle(Object.keys(D.PEOPLE).filter(k => S.ppl[k].cd <= S.turn)); for (const k of L) {
    const sc = D.PEOPLE[k].scenes.filter(x => pplCond(x.if, k)), pickS = pick(sc.filter(x => x.if !== 'any').length && chance(.7) ? sc.filter(x => x.if !== 'any') : sc); if (!pickS) continue;
    S.ppl[k].cd = S.turn + PPC.cool;
    pushPend({ k: 'event', id: 'ppl', who: k, t: pplFill(pickS.t, k), x: pplFill(pickS.x, k), iso: S.player, opts: pickS.opts.map(o => ({ t: o.t, fx: o.fx.concat([['do', 'pplAtt', { k, v: o.att, x: pplFill(pickS.t, k) + ': ' + o.t }]]) })) });
    return; }
});
/* consecuencias pasivas de cada relación */
hook('player', () => { const P2 = S.ppl;
  if (P2.per.att < PPC.hostile && chance(PPC.perPress)) { secAdd('all', -2); news(`${P2.per.n} publica una exclusiva demoledora contra ${S.leader.n}`, 'pol', S.player, 3); }
  if (P2.gen.att < PPC.genCoup && S.pol.sec.mil.a < 35) { P().stab = clamp(P().stab - .5, 0, 100); if (chance(.1)) news(`Rumores de malestar en los cuarteles: el general ${P2.gen.n} no oculta su desprecio`, 'pol', S.player, 2); }
  if (P2.mag.att > PPC.friendly) P().tr += P().gdp * PPC.magInc; });
{ const m0 = mod; mod = k => { const v = m0(k); if (k !== 'elect' || !S || !S.ppl) return v; const a = S.ppl.opo.att; return v + (a < PPC.hostile ? -PPC.opoElect : a > PPC.friendly ? PPC.opoElect / 2 : 0); }; }

/* ---- cumbre anual ---- */
hook('late', () => { if (S.over || S.turn % SUM.every !== SUM.at || rankOf(z => S.c[z].gdp, S.player) > SUM.rank) return;
  const inv = alive().filter(z => !isP(z)).sort((a, b) => S.c[b].gdp - S.c[a].gdp).slice(0, SUM.invites);
  pushPend({ k: 'summit', t: `Cumbre de las grandes economías · ${dateStr()}`, x: 'Los líderes de las mayores economías del mundo se reúnen. Puedes tener dos reuniones bilaterales y proponer el tema central.', iso: S.player, inv,
    opts: [{ t: 'Asistir sin reuniones', fx: [] }, { t: 'No asistir', fx: [['rep', 'conf', -3]] }] }); });
ACT.summitYear = a => { const p = S.pend[0]; if (!p || p.k !== 'summit') return fail('No hay cumbre en curso'); const T = SUM.topics[a.topic]; if (!T) return fail('Elige un tema');
  const meet = (a.meet || []).filter(z => p.inv.includes(z)).slice(0, SUM.meet), me = S.player, got = [], lines = [];
  for (const z of meet) { addMod(me, z, 'Reunión en la cumbre', gain(SUM.rel), .4); lines.push([z, `${S.c[z].lider.n} se reúne contigo en un aparte de la cumbre.`]);
    const t = ['com', 'pna'].find(x => !hasT(x, me, z)); if (t && !sanctioned(z, me) && chance(SUM.treatyP)) { addTreaty(t, me, z); got.push(`${TNAME[t]} con ${nm(z)}`); lines.push([me, `Firmáis: ${TNAME[t]}.`]); } }
  applyFx(T.fx, {}); S.pend.shift(); news(`Cumbre de las grandes economías: ${S.leader.n} impulsa «${T.n}»${got.length ? '; firma ' + got.join(' y ') : ''}`, 'dip', me, 3);
  addTalk({ k: 'summit', a: meet[0] || me, b: meet[1] || me, lines: lines.concat([['', `Foto de familia. Tema central: ${T.n}.`]]), rep: null, done: 1, title: 'Cumbre de las grandes economías' });
  return { msg: `Cumbre: ${T.n}${got.length ? ' · ' + got.join(', ') : ''}` }; };
FREE.summitYear = 1;

/* ---- sala de crisis ---- */
function crisisPend() { const K = S.crisis, C = D.CRISES.find(x => x.id === K.id), st = C.steps[K.st];
  pushPend({ k: 'event', id: 'crisis', t: `Sala de crisis · ${C.n} (fase ${K.st + 1} de ${C.steps.length})`, x: st.x, iso: S.player, opts: st.opts.map(o => ({ t: o.t, fx: o.fx.concat([['do', 'crisisStep', { v: o.v }]]) })) }); }
OPS.crisisStep = a => { const K = S.crisis; if (!K) return; K.sc += a.v; K.st++; const C = D.CRISES.find(x => x.id === K.id);
  if (K.st < C.steps.length) { K.due = S.turn + 1; return; }
  const r = K.sc >= CRC.ok ? 'ok' : K.sc >= CRC.mid ? 'mid' : 'bad'; applyFx(C.end[r], {});
  news(`${C.n}: ${r === 'ok' ? 'la crisis se resuelve con éxito' : r === 'mid' ? 'la crisis se cierra con un sabor agridulce' : 'la gestión de la crisis acaba en desastre'}`, 'pol', S.player, 3);
  if (S.p5) S.p5.tl.push({ t: S.turn, x: `${C.n}: ${r === 'ok' ? 'éxito' : r === 'mid' ? 'resultado a medias' : 'desastre'}` }); S.crisis = null; S.crisisCd = S.turn + CRC.cool; Bus.emit('crisisEnd', { r, n: C.n }); };
hook('late', () => { if (S.over) return; const K = S.crisis;
  if (K) { if (K.due <= S.turn && !S.pend.some(p => p.id === 'crisis')) crisisPend(); return; }
  if (S.turn >= CRC.from && S.crisisCd <= S.turn && S.pend.length < 2 && chance(CRC.p)) { S.crisis = { id: pick(D.CRISES).id, st: 0, sc: 0, due: S.turn }; crisisPend(); } });
const pplInfo = () => S.ppl, crisisInfo = () => S.crisis;
