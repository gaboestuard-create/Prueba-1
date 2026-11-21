/* =====================================================================
   SISTEMA · NEGOCIACIÓN EN PERSONA
   Eliges un objetivo y, durante 3 rondas, cómo le hablas al otro líder.
   Su personalidad (halcón, paloma, rencoroso, pragmático) decide cómo
   reacciona. Si su disposición supera el umbral del objetivo, hay trato.
   La charla queda en Mundo → Conversaciones. Datos en D.PARLEY (data-talk.js).
   ===================================================================== */
hook('new', () => { S.parley = null; }); hook('load', () => { S.parley = S.parley || null; });
const PY = D.PARLEY;
const pyLine = (L, z) => pick(L).replace(/^\{L\}: /, '').split('{L}').join(S.c[z].lider.n); /* si la línea empieza por «{L}:», el nombre ya lo pone la burbuja */
function pyGoalOk(g, z) { const me = S.player;
  if (g === 'lift') return sanctioned(z, me); if (g === 'aid') return S.c[z].gdp > P().gdp * .5;
  return !!TNEED[g] && !hasT(g, me, z); }
ACT.parleyStart = a => {
  const z = a.iso, c = S.c[z], me = S.player; if (!c || !c.alive || z === me) return fail('País inválido'); if (atWar(me, z)) return fail('Estáis en guerra');
  if (S.parley) return fail('Ya estás negociando'); if (!PY.goals[a.g] || !pyGoalOk(a.g, z)) return fail('Ese objetivo no tiene sentido con este país ahora');
  if ((c.ask.parley || 0) > S.turn) return fail(`${c.lider.n} no quiere verte todavía: espera ${c.ask.parley - S.turn} turnos`);
  if (!useCP(PY.cost)) return fail(`Necesitas ${PY.cost} de capital político`);
  const k = archetype(z); S.parley = { iso: z, g: a.g, k, mood: clamp(rel(me, z) / 2 + 20 + rr(-5, 5), 0, 100), r: 0, used: {}, lines: [[z, pyLine(PY.open[k], z)]] };
  Bus.emit('trip', { a: me, b: z }); return { msg: `Reunión con ${c.lider.n}` };
};
ACT.parleySay = a => {
  const p = S.parley, W = PY.ways[a.w]; if (!p) return fail('No hay negociación abierta'); if (!W) return fail('Enfoque desconocido');
  const z = p.iso, me = S.player; let d = W.fx[p.k] || 0;
  if (W.gift) { const g = P().gdp * PY.giftGdp; if (!canPay(g)) return fail(`Necesitas ${money(g)} para la oferta`); P().tr -= g; S.c[z].tr += g; }
  if (W.ideo) d += 6 - Math.abs(S.c[z].ideo - P().ideo) * 6;
  if (W.power) d = power(me) > power(z) * 1.5 ? Math.abs(d) : -Math.abs(d) - 8;
  if (p.used[a.w]) d *= PY.repeat; p.used[a.w] = 1; d += rr(-4, 4); p.mood = clamp(p.mood + d, 0, 100); p.r++;
  p.lines.push([me, W.n + '.'], [z, pyLine(PY.react[d > 3 ? 'up' : d < -3 ? 'down' : 'flat'], z)]);
  if (p.r < PY.rounds) return { msg: d > 3 ? 'Ha funcionado' : d < -3 ? 'Ha sentado mal' : 'Sin efecto claro' };
  return parleyEnd();
};
function parleyEnd() {
  const p = S.parley, z = p.iso, me = S.player, c = S.c[z], G = PY.goals[p.g], ok = p.mood >= G[1]; let msg;
  p.lines.push([z, pyLine([PY.end[ok ? 'ok' : 'no']], z)]);
  if (ok) { addMod(me, z, 'Negociación en persona', gain(6), .4);
    if (p.g === 'lift') { const s = S.sanc.find(x => x.by === z && x.on === me); if (s) s.emb = 0; liftSanction(z, me); msg = `${c.n} levanta sus sanciones`; }
    else if (p.g === 'aid') { const amt = Math.min(c.tr * .3, P().gdp * .01); c.tr -= amt; P().tr += amt; msg = `${c.n} te concede ${money(amt)} de ayuda`; }
    else { addTreaty(p.g, me, z); msg = `${P().n} y ${c.n} firman: ${TNAME[p.g]}`; }
    news(msg + ' tras una reunión de alto nivel', 'dip', z, 3); }
  else { addMod(me, z, 'Negociación fallida', PY.fail, .5); msg = `Sin acuerdo con ${c.n}`; }
  c.ask.parley = S.turn + PY.cool; addTalk({ k: 'parley', a: me, b: z, lines: p.lines, rep: null, done: 1, title: `Reunión con ${c.lider.n} · ${G[0]}` });
  S.parley = null; return { ok, msg };
}
ACT.parleyQuit = () => { if (!S.parley) return fail('No hay negociación abierta'); S.parley.mood = -1; return parleyEnd(); };
/* una reunión no sobrevive al fin del trimestre: si la dejas a medias, se da por fallida */
hook('player', () => { if (S.parley) { S.parley.mood = -1; parleyEnd(); } });
