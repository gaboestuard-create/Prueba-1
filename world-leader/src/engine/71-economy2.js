/* =====================================================================
   SISTEMA · ECONOMÍA PROFUNDA (Fase 2)
   Industria (cadena materia prima → industria → exportación), palancas
   (interés, aranceles, gasto), inflación, desempleo, deuda, tipo de
   cambio, reservas y crisis financieras con contagio entre países.
   ===================================================================== */
function initEco() {
  const c = P(), gpc = c.gdp / Math.max(.001, c.pop);
  if (!S.eco) S.eco = { inf: gpc < 10 ? 6 : 3, unemp: gpc < 10 ? 9 : 6, debt: c.gdp * (gpc > 25 ? .5 : .35), fx: 100, res: c.gdp * .03, rate: 1, tar: 1, fis: 1, set: {},
    ind: { man: Math.max(1, Math.round(c.gdp * .004)), tec: Math.max(0, Math.round(c.gdp * (gpc > 20 ? .002 : .0006))), agr: Math.max(1, Math.round(c.gdp * .002)) }, cri: 0, wcd: 6 };
  S.chain = S.chain || []; const h = S.hist; for (const k of ['debt', 'inf', 'unemp']) h[k] = h[k] || [];
}
hook('new', initEco); hook('load', initEco);
const debtRatio = () => S.eco.debt / Math.max(1, P().gdp);
const bondRate = () => clamp(.25 + debtRatio() * .6 + (S.eco.inf > 8 ? .5 : 0) + (S.eco.rate === 2 ? .3 : S.eco.rate === 0 ? -.15 : 0) - S.rep.conf * .004 + (P().stab < 40 ? .5 : 0) + (S.eco.cri ? .6 : 0), .2, 6); // % por turno
const hasRes = k => (P().rec[k] || 0) > 0;
function indInfo() { // margen y recaudación de cada industria
  const E = S.eco, out = {}, fxk = Math.sqrt(100 / E.fx);
  for (const k in D.INDUSTRY) { const I = D.INDUSTRY[k]; let cost = 0; for (const r in I.inp) cost += I.inp[r] * S.mkt.com[r].p * (hasRes(r) ? .5 : 1.1) * (hasRes(r) ? 1 : 100 / E.fx);
    const val = I.out * fxk * (k === 'man' ? 1 + (E.tar - 1) * .07 : 1) * (S.eco.cri ? .85 : 1); out[k] = { lvl: E.ind[k], val, cost, margin: val - cost, rev: Math.max(0, (val - cost) * E.ind[k] * .35), build: I.cost * costLvl(S.player) * (1 + E.ind[k] * .04) }; }
  return out;
}
const ecoGrowth = () => { const E = S.eco; return [.15, 0, -.2][E.rate] + [-.12, 0, .15][E.fis] + Math.min(.3, (E.ind.man + E.ind.tec + E.ind.agr - S.ind0) * .012) - (E.cri ? .6 : 0) - (E.inf > 12 ? .2 : 0) - (debtRatio() > 1 ? .2 : 0); };
hook('new', () => { const i = S.eco.ind; S.ind0 = i.man + i.tec + i.agr; }); hook('load', () => { if (S.ind0 == null) { const i = S.eco.ind; S.ind0 = i.man + i.tec + i.agr; } });
hook('finance', f => {
  const E = S.eco, c = P(), I = indInfo(); let ind = 0; for (const k in I) ind += I[k].rev; f.inc.ind = ind;
  if (E.tar === 2) f.inc.ara = c.gdp * .0012; f.inc.com *= [1.1, 1, .8][E.tar]; f.exp.pub *= [.94, 1, 1.07][E.fis];
  f.exp.deu = E.debt * bondRate() / 100;
  const emb = S.sanc.filter(x => x.on === S.player && x.emb && ((S.c[x.by].rec.pet || 0) >= 3 || (S.c[x.by].rec.gas || 0) >= 3)).length;
  f.exp.imp *= (100 / E.fx) * (emb ? 1.5 : 1);
});
ACT.policy = a => {
  const E = S.eco, L = D.LEVERS[a.k], v = +a.v; if (!L || !(v >= 0 && v <= 2)) return fail('Palanca inválida'); if (E[a.k] === v) return fail('Ya está en esa posición');
  if (E.set[a.k] === S.turn) return fail('Ya la moviste este turno'); if (!useCP(1)) return fail('Necesitas 1 de capital político');
  E[a.k] = v; E.set[a.k] = S.turn;
  if (a.k === 'tar' && v === 2) relAll(-4, 'Subiste los aranceles', 'trade'); if (a.k === 'fis') why('Gasto público: ' + L.o[v].toLowerCase(), () => { if (v === 0) { secAdd('obr', -4); secAdd('jub', -4); secAdd('sin', -5); secAdd('emp', 3); } if (v === 2) { secAdd('obr', 3); secAdd('sin', 3); secAdd('emp', -2); } });
  news(`${P().n} fija ${L.n.toLowerCase()}: ${L.o[v].toLowerCase()}`, 'eco', S.player);
  return { msg: `${L.n}: ${L.o[v]}. ${L.d[v]}.` };
};
ACT.buildInd = a => {
  const I = indInfo()[a.k]; if (!I) return fail('Industria inválida'); if (!canPay(I.build)) return fail(`Necesitas ${money(I.build)}`);
  P().tr -= I.build; S.eco.ind[a.k]++; S.eco.unemp = Math.max(1, S.eco.unemp - .05); why('Nueva planta de ' + D.INDUSTRY[a.k].n.toLowerCase(), () => { secAdd('obr', 1); secAdd('sin', 1); if (a.k === 'tec') secAdd('tec', 2); if (a.k === 'agr') secAdd('rur', 1.5); });
  return { msg: `Nueva planta de ${D.INDUSTRY[a.k].n.toLowerCase()}: nivel ${S.eco.ind[a.k]}${I.margin <= 0 ? '. Ojo: hoy pierde dinero con estos precios' : ''}` };
};
ACT.bond = a => { // emitir (amt > 0) o amortizar (amt < 0) deuda
  const amt = +a.amt, E = S.eco; if (!amt) return fail('Importe inválido');
  if (amt > 0) { if ((E.debt + amt) / P().gdp > 1.5) return fail('Nadie te presta más: tu deuda superaría el 150% del PIB'); E.debt += amt; P().tr += amt * .98; return { msg: `Emites ${money(amt)} en bonos al ${bondRate().toFixed(2)}% por turno` }; }
  const pay = Math.min(-amt, E.debt); if (!canPay(pay) || P().tr < pay) return fail('No tienes caja para amortizar eso'); E.debt -= pay; P().tr -= pay; return { msg: `Amortizas ${money(pay)} de deuda` };
};
ACT.reserves = a => { const amt = +a.amt, E = S.eco; if (!amt) return fail('Importe inválido'); if (amt > 0) { if (P().tr < amt) return fail('No tienes esa caja'); P().tr -= amt; E.res += amt; return { msg: `Pasas ${money(amt)} a las reservas del banco central` }; } const w = Math.min(-amt, E.res); E.res -= w; P().tr += w; return { msg: `Retiras ${money(w)} de las reservas: la moneda queda menos protegida` }; };

hook('player', g => { // inflación, desempleo, tipo de cambio, crisis
  const E = S.eco, c = P(), oil = S.mkt.com.pet.p / D.COMMODITIES.pet.p - 1, net = S.fin ? S.fin.net : 0;
  E.inf = clamp(E.inf + (3 - E.inf) * .15 + [.6, 0, -.7][E.rate] + [-.2, 0, .3][E.fis] + (E.tar - 1) * .15 + oil * 1.5 + (net < 0 ? .3 : 0) + (100 - E.fx) * .02 + rr(-.2, .2), -3, 150);
  const uT = clamp(6.5 - g * 2.2 + [-.6, 0, .8][E.rate] + [.7, 0, -.6][E.fis] + (E.cri ? 2.5 : 0) + (S.pol.laws.salario_min != null ? .4 : 0), 2, 30); E.unemp += (uT - E.unemp) * .2;
  E.fx = clamp(E.fx + (100 - E.fx) * .05 + (E.rate - 1) * 1 - Math.max(0, E.inf - 4) * .3 - (debtRatio() > .9 ? .8 : debtRatio() > .6 ? .3 : 0) - (E.cri ? 2 : 0) + rr(-.5, .5), 20, 180);
  if (E.fx < 90 && E.res > 0) { const use = Math.min(E.res, c.gdp * .002); E.res -= use; E.fx += 1.5; } // el banco central defiende la moneda
  why(E.inf > 8 ? 'Inflación' : 'Desempleo', () => {
    if (E.inf > 8) { const d = -Math.min(2.5, (E.inf - 8) * .22); secAdd('obr', d); secAdd('med', d); secAdd('jub', d * 1.2); c.stab = clamp(c.stab - .3, 0, 100); }
    if (E.unemp > 10) why('Desempleo', () => { const d = -Math.min(2, (E.unemp - 10) * .25); secAdd('jov', d); secAdd('obr', d); secAdd('sin', d * .8); });
  });
  if (E.cri > 0 && --E.cri === 0) news(`${c.n} deja atrás la crisis financiera`, 'eco', S.player, 3);
});
hook('late', () => { const h = S.hist, E = S.eco; h.debt.push(Math.round(debtRatio() * 100)); h.inf.push(+E.inf.toFixed(1)); h.unemp.push(+E.unemp.toFixed(1)); });

/* ---- crisis financieras: nacen en una gran economía y se contagian por el comercio ---- */
function infect(iso, src) {
  const c = S.c[iso]; if (c.cri > 0 || (c.criCd || 0) > S.turn) return false; c.cri = src ? 3 : 4; c.criCd = S.turn + 14;
  if (isP(iso)) { S.eco.cri = 4; S.mkt.shocks.push({ k: 'home', m: .85 }); news(src ? `La crisis de ${nm(src)} alcanza a ${c.n}: se seca el crédito` : `Estalla una crisis financiera en ${c.n}`, 'eco', iso, 3); S.chain.push({ t: S.turn, id: 'contagio', T: src || iso }); }
  else news(src ? `La crisis financiera salta de ${nm(src)} a ${c.n}` : `Crisis financiera en ${c.n}: los mercados tiemblan`, 'eco', iso, !src || nb(S.player).includes(iso) || hasT('com', iso, S.player) ? 3 : 2);
  return true;
}
hook('world', () => {
  const E = S.eco, me = S.player, sick = alive().filter(z => S.c[z].cri > 0);
  if (!sick.length && S.turn >= E.wcd) { // ¿nace una crisis?
    const weak = alive().filter(z => S.c[z].gdp > 1200 && S.c[z].stab < 32)[0];
    if (weak || chance(.012 * (1 + (S.diff || 1) * .3))) { const src = weak || wpick(alive().filter(z => S.c[z].gdp > 500 && z !== me), z => S.c[z].gdp); if (src && infect(src)) { E.wcd = S.turn + 16; S.mkt.shocks.push({ k: 'all', m: .9 }, { k: 'fin', m: .85 }); S.mkt.sent -= .05; } }
  }
  for (const x of sick) {
    const c = S.c[x]; if (!isP(x)) { c.gdp *= .99; c.stab = clamp(c.stab - 1.5, 0, 100); }
    for (const y of alive()) { if (y === x || S.c[y].cri > 0 || !hasT('com', x, y)) continue; if (chance(.1 * clamp(c.gdp / S.c[y].gdp, .3, 1.5) * (S.c[y].stab < 50 ? 1.3 : 1) * (isP(y) ? (S.eco.res > P().gdp * .05 ? .5 : 1) : 1))) infect(y, x); }
    if (!isP(x)) c.cri--;
  }
  // sobresaltos de empresas: nadie tiene la bolsa asegurada
  for (const co of D.COMPANIES) if (chance(.03)) { const up = chance(.45), m = up ? rr(1.1, 1.3) : rr(.65, .9), q = S.mkt.co[co.id]; q.p = Math.max(co.p * .05, q.p * m); if (S.port[co.id]) news(up ? `${co.n} sube un ${Math.round((m - 1) * 100)}% tras un contrato récord` : `${co.n} se hunde un ${Math.round((1 - m) * 100)}% tras unos resultados desastrosos: tu cartera lo nota`, 'eco', '', 2); }
  for (const co of D.COMPANIES) { const h = ownerOf(co.home); if (S.c[h].cri > 0) S.mkt.co[co.id].p *= .96; }
});
/* resumen para la UI */
function ecoInfo() { const E = S.eco; return { inf: E.inf, unemp: E.unemp, debt: E.debt, ratio: debtRatio(), rate: bondRate(), fx: E.fx, res: E.res, cri: E.cri, levers: { rate: E.rate, tar: E.tar, fis: E.fis }, set: E.set, infected: alive().filter(z => S.c[z].cri > 0) }; }
