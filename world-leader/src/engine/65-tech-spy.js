/* =====================================================================
   SISTEMA · TECNOLOGÍA y ESPIONAJE (Fase 2)
   Las tecnologías terminadas se suman a mod() y lawSum() (ver núcleo).
   ===================================================================== */
const researchRate = () => 2 + Math.log10(P().gdp + 10) * 1.2 + (S.pol.laws.edu_publica != null ? 1 : 0) + (S.pol.laws.becas_tec != null ? 2 : 0) + mod('rp');
const techOpen = t => !S.tech.done.includes(t.id) && (t.t === 1 || S.tech.done.includes(t.b + (t.t - 1)));
const fundCost = () => P().gdp * .001;
ACT.research = a => {
  const t = TECH[a.id]; if (!t) return fail('Tecnología desconocida');
  if (S.tech.done.includes(t.id)) return fail('Ya la dominas'); if (!techOpen(t)) return fail('Primero necesitas el nivel anterior de esa rama');
  S.tech.cur = t.id; return { msg: `Tus laboratorios se centran en: ${t.n}` };
};
ACT.fundResearch = () => {
  if (S.tech.funded === S.turn) return fail('Ya inyectaste fondos este turno'); if (!S.tech.cur) return fail('Elige primero qué investigar');
  const c = fundCost(); if (!canPay(c)) return fail(`Necesitas ${money(c)}`);
  P().tr -= c; S.tech.pts += 6; S.tech.funded = S.turn; techCheck();
  return { msg: `Financiación extraordinaria: +6 puntos de investigación (${money(c)})` };
};
function techCheck() {
  const T = S.tech, t = TECH[T.cur]; if (!t || T.pts < D.TECH_COST[t.t]) return;
  T.pts -= D.TECH_COST[t.t]; T.done.push(t.id); T.cur = null;
  news(`Avance tecnológico: ${P().n} domina ${t.n}`, 'eco', S.player, 3); Bus.emit('tech', { id: t.id, n: t.n });
}
function techTurn() { const T = S.tech; T.pts = T.cur ? T.pts + researchRate() : Math.min(30, T.pts + researchRate()); techCheck(); }

/* ---- espionaje ---- */
const spyNet = iso => S.spy.net[iso] || 0;
const spyCost = (iso, op) => (.2 + C(iso).gdp * .0003) * D.SPYOPS[op].k;
function spyOdds(iso, op) { const c = C(iso); return clamp(D.SPYOPS[op].base + spyNet(iso) * .12 + mod('spy') * .15 + mod('spyOp') - (c.gdp > 2000 ? .1 : 0) - (c.reg === 'aut' || c.reg === 'com' ? .08 : 0), .05, .95); }
/* informe de inteligencia: lo que tu red sabe de un país (null si no tienes red) */
function intel(iso) {
  const n = spyNet(iso); if (!n) return null; const c = C(iso);
  let rival = null, rv = 0; for (const z of nb(iso).concat(RIVALS[iso] || [])) if (C(z).alive) { const r = rel(iso, z); if (r < rv) { rv = r; rival = z; } }
  return { net: n, per: c.per, tr: c.tr, threat: threat(iso), rival, nextElec: c.nextElec ? c.nextElec - S.turn : null, grudge: grudge(iso, S.player) };
}
ACT.spy = a => {
  const iso = a.iso, op = D.SPYOPS[a.op], me = S.player; if (!op || !S.c[iso] || !S.c[iso].alive || iso === me) return fail('Operación inválida');
  const c = C(iso), cost = spyCost(iso, a.op);
  if (a.op === 'red' && spyNet(iso) >= 3) return fail('Tu red allí ya es la mejor posible');
  if (a.op === 'gol' && c.stab >= 40) return fail(`${c.n} es demasiado estable para un golpe (estabilidad ${Math.round(c.stab)})`);
  if (a.op === 'tec' && c.gdp / c.pop <= P().gdp / P().pop) return fail(`${c.n} no tiene tecnología que te sirva`);
  if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(op.cp)) return fail(`Necesitas ${op.cp} de capital político`);
  P().tr -= cost;
  if (chance(spyOdds(iso, a.op))) {
    if (a.op === 'red') { S.spy.net[iso] = spyNet(iso) + 1; return { msg: `Tu red en ${c.n} sube a nivel ${S.spy.net[iso]}` }; }
    if (a.op === 'pro') { addMod(me, iso, 'Opinión pública favorable', gain(10), .5); return { msg: `La prensa de ${c.n} habla bien de ti: relación +10` }; }
    if (a.op === 'tec') { S.tech.pts += 15; techCheck(); return { msg: `Tus agentes traen planos de ${c.n}: +15 puntos de investigación` }; }
    if (a.op === 'des') { const d = ri(8, 12); c.stab = clamp(c.stab - d, 0, 100); c.stab0 = Math.max(10, c.stab0 - 4); return { msg: `Protestas y rumores sacuden ${c.n}: estabilidad −${d}` }; }
    if (a.op === 'sab') { const cat = pick(Object.keys(D.CATS)); for (const u in D.UNITS) if (D.UNITS[u].cat === cat) c.u[u] = Math.floor((c.u[u] || 0) * .92); return { msg: `Sabotaje en ${c.n}: pierde el 8% de sus fuerzas de ${D.CATS[cat].toLowerCase()}` }; }
    coup(iso); addMod(me, iso, 'Te debe el poder', 45, .3);
    if (chance(.3)) { repAdd('dem', -10); relAll(-5, `Tu mano detrás del golpe en ${c.n}`, 'big'); news(`Se señala a ${P().n} como instigador del golpe en ${c.n}`, 'dip', iso, 3); }
    return { msg: `El golpe triunfa en ${c.n}: ${c.lider.n} te debe el poder` };
  }
  if (chance(op.risk)) { // descubiertos
    S.spy.net[iso] = 0; addMod(me, iso, 'Operación encubierta descubierta', a.op === 'gol' ? -45 : -25, .3, 1); repAdd('conf', a.op === 'gol' ? -10 : -6);
    for (const z of alliesOf(iso)) if (z !== me) addMod(me, z, 'Espiaste a su aliado', -5, .5, 1);
    news(`${c.n} desmantela una red de espionaje de ${P().n}`, 'dip', iso, 3);
    return { ok: false, msg: `Descubiertos: ${c.n} desmantela tu red y lo hace público` };
  }
  return { ok: false, msg: `La operación en ${c.n} fracasa, pero nadie la relaciona contigo` };
};
