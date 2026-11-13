/* =====================================================================
   CICLO DE TURNO: jugador → IA → resolución → eventos
   + editor "modo dios" + API pública (WL.Game)
   ===================================================================== */
function snapshot() { const c = P(); return { tr: c.tr, gdp: c.gdp, stab: c.stab, appr: approval(), pow: power(S.player), rep: Object.assign({}, S.rep), terr: ownCount(S.player) }; }
function decayMods() {
  for (const k in S.mods) {
    const L = S.mods[k];
    for (let i = L.length - 1; i >= 0; i--) { const m = L[i]; if (!m.d) continue; m.v = m.v > 0 ? Math.max(0, m.v - m.d) : Math.min(0, m.v + m.d); if (Math.abs(m.v) < .5) L.splice(i, 1); }
    if (!L.length) delete S.mods[k];
  }
}
ACT.endTurn = () => {
  const before = snapshot(), n0 = S.nid;
  // FASE 1 · cierre del jugador
  const c = P(), g = growthOf(S.player);
  S.fin = finance(false);
  c.gdp *= 1 + (g + rr(-.2, .2)) / 100;
  politicsTurn(g); techTurn(); run('player', g);
  S.gm = S.gm.filter(m => --m.t > 0); S.built = {};
  for (const k in S.rep) S.rep[k] *= .985;
  // FASE 2 · IA
  for (const iso of shuffle(alive())) if (!isP(iso)) aiTurn(iso);
  run('world');
  // FASE 3 · resolución
  for (const w of S.wars.slice()) warTurn(w);
  purgeWars(); marketTurn(); decayMods();
  S.turn++; S.q = (S.q + 1) % 4; if (!S.q) S.year++;
  laterTurn(); electionTurn(); run('late');
  if (S.turn % 4 === 0) unSession();
  // FASE 4 · eventos
  worldEvents(); playerEvent();
  if (!S.over && c.stab <= 3) { news(`La revolución derroca a ${S.leader.n}`, 'coup', S.player, 3); over('revolucion'); }
  if (S.over) S.pend = [];
  const h = S.hist; h.tr.push(Math.round(c.tr * 10) / 10); h.appr.push(Math.round(approval())); h.gdp.push(Math.round(c.gdp)); for (const k in h) if (h[k].length > 40) h[k].shift();
  S.fin = S.over ? S.fin : Object.assign(finance(true), { last: S.fin });
  const fresh = S.news.filter(n => n.id > n0);
  Bus.emit('turn', { date: dateStr(), news: fresh, before, after: snapshot(), growth: g });
  return {};
};

/* ---- EDITOR (modo dios): cambia cualquier dato al instante ---- */
ACT.edit = a => {
  const c = S.c[a.iso]; if (!c) return fail('País inválido');
  const k = a.k, v = a.v, num = +v, me = S.player, [k0, k1] = k.split('.');
  if (['tr', 'gdp', 'pop', 'stab', 'ideo'].includes(k)) { if (isNaN(num)) return fail('Valor inválido'); c[k] = k === 'stab' ? clamp(num, 0, 100) : k === 'ideo' ? clamp(Math.round(num), -2, 2) : k === 'tr' ? num : Math.max(.001, num); if (k === 'stab') c.stab0 = c.stab; }
  else if (k === 'lider') { c.lider.n = String(v).slice(0, 60); if (isP(a.iso)) S.leader.n = c.lider.n; }
  else if (k === 'verificado') c.lider.verificado = !!v;
  else if (k === 'img') { c.lider.img = String(v).slice(0, 500); if (isP(a.iso)) S.leader.img = c.lider.img; }
  else if (k === 'partido') { c.partido = String(v).slice(0, 60); if (isP(a.iso) && S.pol.seats[0]) S.pol.seats[0].n = c.partido; }
  else if (k === 'n') c.n = String(v).slice(0, 40) || c.n;
  else if (k === 'reg') { if (!D.REGIMES[v]) return fail('Régimen inválido'); c.reg = v; if (isP(a.iso)) S.pol.nextElec = isDem() ? Math.max(S.pol.nextElec, S.turn + 4) : 0; }
  else if (k0 === 'u') { if (!D.UNITS[k1] || isNaN(num)) return fail('Unidad inválida'); c.u[k1] = Math.max(0, Math.round(num)); }
  else if (k0 === 'cat') { if (!D.CATS[k1] || isNaN(num)) return fail('Categoría inválida'); for (const u in D.UNITS) if (D.UNITS[u].cat === k1) c.u[u] = Math.max(0, Math.round((c.u[u] || 0) * num)); }
  else if (k0 === 'rec') { if (!D.COMMODITIES[k1]) return fail('Recurso inválido'); c.rec[k1] = clamp(Math.round(num), 0, 5); }
  else if (k0 === 'stock') { if (!D.COMMODITIES[k1] || !isP(a.iso)) return fail('Solo tu país tiene reservas'); c.stock[k1] = Math.max(0, num); }
  else if (k0 === 'rep') { if (!(k1 in S.rep)) return fail('Eje inválido'); S.rep[k1] = clamp(num, -100, 100); }
  else if (k0 === 'sec') { if (!S.pol.sec[k1]) return fail('Sector inválido'); S.pol.sec[k1].a = clamp(num, 0, 100); }
  else if (k === 'cp') S.pol.cp = clamp(num, 0, 12);
  else if (k === 'rel') { // fija la relación con el jugador mediante un modificador permanente
    if (isP(a.iso)) return fail('Elige otro país'); const L = S.mods[key(me, a.iso)]; if (L) { const i = L.findIndex(m => m.k === 'Editor'); if (i >= 0) L.splice(i, 1); }
    const d = clamp(num, -100, 100) - rel(me, a.iso); if (d) (S.mods[key(me, a.iso)] = S.mods[key(me, a.iso)] || []).push({ k: 'Editor', v: d, d: 0, g: 0 });
  }
  else if (k === 'ally') { const o = a.o || me; if (o === a.iso || !S.c[o]) return fail('Elige otro país'); if (hasExplicit('ali', a.iso, o)) endTreaties(a.iso, o, ['ali', 'def']); else { for (const w of S.wars.slice()) if ((w.att[0] === o && w.def[0] === a.iso) || (w.att[0] === a.iso && w.def[0] === o)) endWar(w, 'blanca'); addTreaty('ali', a.iso, o); } }
  else if (k === 'enemy') { const o = a.o || me; if (o === a.iso || !S.c[o]) return fail('Elige otro país'); const L = S.mods[key(o, a.iso)] || (S.mods[key(o, a.iso)] = []), i = L.findIndex(m => m.k === 'Enemistad (editor)'); if (i >= 0) L.splice(i, 1); else { endTreaties(a.iso, o); L.push({ k: 'Enemistad (editor)', v: -90, d: 0, g: 1 }); } }
  else if (k0 === 'terr') { // regiones: terr.<índice>.<g|p|v|o|n>
    const t = c.terr[+k1], f = k.split('.')[2]; if (!t) return fail('Región inválida');
    if (f === 'o') { if (!S.c[v] || !S.c[v].alive) return fail('País inválido'); if (t.o !== v) { if (t.o !== a.iso) restoreTerr(a.iso, +k1); if (v !== a.iso) moveTerr(a.iso, +k1, v, 1); } }
    else if (f === 'v') t.v = !!v; else if (f === 'gob' || f === 'p' || f === 'n') t[f] = String(v).slice(0, 60); else return fail('Campo inválido');
  }
  else if (k === 'peace') { for (const w of S.wars.slice()) if (w.att.includes(a.iso) || w.def.includes(a.iso)) endWar(w, 'blanca'); }
  else return fail('Campo no editable: ' + k);
  dirty(); if (!S.over) S.fin = Object.assign(finance(true), { last: S.fin && S.fin.last });
  return { silent: 1 };
};

/* ---- API pública: lo único que ve la capa de render/UI ---- */
WL.Game = {
  get S() { return S; },
  newGame, save, load, act,
  q: { // consultas de solo lectura
    rel, relBreakdown, power, catPow, troops, upkeep, costLvl, canReach, nb, ownerOf, ownCount, alliesOf, enemiesOf, warsOf, atWar, inWar, hasT, hasExplicit, sanctioned, threat,
    approval, lawForecast, invLaw, lawPop, bribeCost, secBase, localCtl, isDem, mod, lawSum, taxRate,
    finance: () => finance(true), resFlow, tradeIncome, portValue, growthOf, fee,
    arcInfo, alerts, paper, memOf, exportData, GOALS, DIFF, EV: () => EV,
    intelList, planText, diffK, unBrief, ecoInfo, debtRatio, indInfo, blocCheck,
    regionInfo, regionProd, rulingTag, secWhy, govSeats, axDist, lawAx, campaignPlan, msgFits,
    researchRate, techOpen, fundCost, spyNet, spyCost, spyOdds, intel,
    treatyEval, unitCost, baseCost, capacity, warScoreFor, warById, repTitle, describeFx, dateStr, money, canPay,
    blocAllies: iso => C(iso).blocs.filter(b => D.BLOCS[b].def), TNAME, TCP, UNT, REPN
  }
};
