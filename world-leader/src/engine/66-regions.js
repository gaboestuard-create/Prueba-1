/* =====================================================================
   SISTEMA · REGIONES (Fase 2)
   La geometría, el peso (w población, e economía) y los recursos (r) de
   cada región viven en DATA; el dueño, el partido y la autoridad, en S.
   ===================================================================== */
const CARRIERS = {}; // por país y recurso: índices de las regiones que lo producen
for (const iso of ISOS) { const m = CARRIERS[iso] = {}; D.C[iso].terr.forEach((t, i) => (t.r || []).forEach(k => (m[k] = m[k] || []).push(i))); }
/* producción del jugador: la de cada región que controla, sea suya o conquistada */
function regionProd(k) {
  const me = S.player; let v = 0;
  for (const iso of ISOS) {
    const c = S.c[iso], lvl = c.rec[k] || 0; if (!lvl) continue;
    const car = CARRIERS[iso][k];
    if (!car || !car.length) { if (iso === me) v += D.PROD[Math.min(5, lvl)]; continue; }
    let n = 0; for (const i of car) if (c.terr[i] && c.terr[i].o === me) n++;
    if (n) v += D.PROD[Math.min(5, lvl)] * n / car.length;
  }
  return v;
}
/* ficha de una región para la UI */
function regionInfo(iso, i) {
  const c = C(iso), g = D.C[iso].terr[i], t = c.terr[i]; if (!g || !t) return null;
  const own = k => c.terr.reduce((a, x, j) => a + (x.o === iso ? D.C[iso].terr[j][k] || 0 : 0), 0) || 1, mine = t.o === iso;
  return { n: t.n, o: t.o, p: t.p, gob: t.gob, v: t.v, r: g.r || [], pop: mine ? c.pop * g.w / own('w') : t.pp || 0, gdp: mine ? c.gdp * g.e / own('e') : t.g || 0, cap: i === 0 };
}
hook('new', o => { // el partido del jugador hereda las regiones del oficialismo (también en un país fundado)
  const c = P(), old = D.SUB_RULING[S.player] || D.C[S.player].partido;
  if (c.custom || (o.partido && o.partido !== D.C[S.player].partido)) c.terr.forEach(t => { if (t.p === old) t.p = c.partido; });
});
