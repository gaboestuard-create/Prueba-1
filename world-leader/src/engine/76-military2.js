/* =====================================================================
   SISTEMA · EJÉRCITO EN TIEMPO DE PAZ (pulido)
   Preparación que se pierde sin maniobras, misiones que dan uso a las
   tropas (frontera, interior, ayuda, paz, maniobras conjuntas) y una
   lectura de disuasión: quién podría atacarte y quién no se atreve.
   ===================================================================== */
function readyMult() { return S && S.mil ? (.65 + .35 * S.mil.ready / 100) / .895 : 1; } // .895 = preparación media de las IAs (70)
function committed() { return S && S.mil ? Math.min(.45, S.mil.miss.reduce((a, m) => a + D.MISSIONS[m.k].com, 0)) : 0; }
hook('new', () => { S.mil = { ready: 70, miss: [], drill: -9 }; }); hook('load', () => { S.mil = S.mil || { ready: 70, miss: [], drill: -9 }; });
ACT.drill = () => {
  const m = S.mil; if (m.drill === S.turn) return fail('Ya hiciste maniobras este turno'); const cost = upkeep(S.player) * .6 + .2;
  if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(1)) return fail('Necesitas 1 de capital político');
  P().tr -= cost; m.drill = S.turn; m.ready = clamp(m.ready + 15, 0, 100); why('Maniobras militares', () => secAdd('mil', 2));
  for (const z of nb(S.player)) if (rel(S.player, z) < -20) addMod(S.player, z, 'Tus maniobras en la frontera', -2, 1);
  return { msg: `Maniobras: preparación ${Math.round(m.ready)}/100 (${money(cost)})` };
};
ACT.mission = a => {
  const m = S.mil, M = D.MISSIONS[a.k], me = S.player; if (!M) return fail('Misión desconocida');
  if (a.end != null) { const x = m.miss[+a.end]; if (!x) return fail('Esa misión ya no existe'); m.miss.splice(+a.end, 1); return { msg: `Termina: ${D.MISSIONS[x.k].n}${S.c[x.t] ? ' en ' + nm(x.t) : ''}` }; }
  if (m.miss.length >= 3) return fail('Tus fuerzas ya tienen tres misiones: termina una antes'); if (m.miss.some(x => x.k === a.k && x.t === a.t)) return fail('Esa misión ya está en marcha');
  let t = a.t || '';
  if (M.tgt === 'vecino' && !nb(me).includes(t)) return fail('Elige un país vecino');
  if (M.tgt === 'aliado' && !alliesOf(me).includes(t)) return fail('Solo puedes hacer maniobras con un aliado');
  if (M.tgt === 'cualquiera' && (!S.c[t] || !S.c[t].alive || t === me || atWar(me, t))) return fail('Elige un país');
  if (M.tgt === 'guerra') { const w = warById(+a.w); if (!w || w.att.includes(me) || w.def.includes(me)) return fail('Elige una guerra en la que no participes'); t = String(w.id); if (!useCP(1)) return fail('Necesitas 1 de capital político'); }
  m.miss.push({ k: a.k, t, s: S.turn });
  if (a.k === 'frontera') addMod(me, t, 'Tropas en su frontera', -6, .3);
  news(`${P().n} despliega: ${M.n}${t && S.c[t] ? ' (' + nm(t) + ')' : ''}`, 'mil', t && S.c[t] ? t : me, 2);
  return { msg: `${M.n} en marcha: inmoviliza el ${Math.round(M.com * 100)}% de tus fuerzas` };
};
hook('player', () => {
  const m = S.mil, me = S.player, war = inWar(me);
  m.ready = clamp(m.ready + (war ? 1 : -1.5) + (m.miss.some(x => x.k === 'ejercicio') ? 1.5 : 0), 20, 100);
  for (const x of m.miss.slice()) {
    const T = x.t && S.c[x.t]; if (x.k !== 'paz' && x.k !== 'interior' && (!T || !T.alive || (x.k !== 'frontera' && atWar(me, x.t)))) { m.miss.splice(m.miss.indexOf(x), 1); continue; }
    if (x.k === 'frontera') { addMod(me, x.t, 'Tropas en su frontera', -.5, .3); why('Patrulla fronteriza', () => { secAdd('mil', .3); secAdd('rur', .2); }); }
    if (x.k === 'interior') { P().stab = clamp(P().stab + .6, 0, 100); repAdd('dem', -.3); why('Militares en las calles', () => { secAdd('jub', .3); secAdd('med', .2); secAdd('jov', -.4); secAdd('min', -.3); }); }
    if (x.k === 'ayuda') { addMod(me, x.t, 'Tu ayuda humanitaria', gain(2), .3); repAdd('gen', .5); T.stab = clamp(T.stab + .8, 0, 100); P().tr -= P().gdp * .0004; }
    if (x.k === 'ejercicio') addMod(me, x.t, 'Maniobras conjuntas', gain(1.5), .3);
    if (x.k === 'paz') { const w = warById(+x.t); if (!w) { m.miss.splice(m.miss.indexOf(x), 1); news('Tus cascos azules vuelven a casa: la guerra ha terminado', 'peace', me, 2); repAdd('paz', 4); continue; }
      repAdd('paz', .6); w.score *= .85; for (const z of [w.att[0], w.def[0]]) addMod(me, z, 'Tus cascos azules', gain(1), .3);
      if (chance(.15)) { casualties(me, .01); news('Bajas entre tus cascos azules', 'war', me, 2); why('Bajas en la misión de paz', () => secAdd('all', -1)); }
      if (S.turn - w.s > 4 && chance(.12)) endWar(w, 'blanca'); }
  }
});
/* las IAs miden la disuasión: patrullas y preparación cuentan */
function deterrence() {
  const me = S.player, mine = power(me) + .5 * sumPow(alliesOf(me)), out = [];
  for (const z of new Set(nb(me).concat(RIVALS[me] || []))) { const c = S.c[z]; if (!c || !c.alive || alliesOf(me).includes(z)) continue;
    const r = rel(z, me), ratio = (power(z) + .5 * sumPow(alliesOf(z))) / (mine * 1.25 + 1), need = (c.per.agres > .8 ? 1.6 : 2) * (S.mil.miss.some(x => x.k === 'frontera' && x.t === z) ? 1.3 : 1);
    out.push({ iso: z, rel: r, ratio, risk: r < -20 && c.per.agres * (.5 + c.per.expan) >= .32 ? (ratio > need ? 'alto' : ratio > need * .6 ? 'medio' : 'bajo') : 'nulo' }); }
  return out.sort((a, b) => b.ratio - a.ratio);
}
