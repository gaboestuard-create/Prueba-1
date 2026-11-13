/* =====================================================================
   SISTEMA · GOBIERNO A LARGO PLAZO (pulido)
   - Capital político escaso: base 2/turno y cada ley vigente pesa (carga legislativa).
   - Las leyes viven: grandes obras que tardan en rendir, leyes con caducidad,
     revisiones periódicas en el congreso y volantazos con coste.
   - Agenda viva: los sectores exigen leyes con plazo y la oposición presenta las suyas.
   - Elecciones regionales escalonadas y nuevas formas de gastar capital.
   ===================================================================== */
const lawBuilding = id => { const l = LAW[id]; return !!(l && l.build && S.pol.laws[id] != null && S.turn - S.pol.laws[id] < l.build); };
const lawLoad = () => Math.max(0, Object.keys(S.pol.laws).length - D.GOV.lawLoad);
function cpRegen() { // desglose del capital político por turno (la UI lo muestra)
  const ap = approval(), parts = [['Base', D.GOV.cpBase], ['Tus rasgos', mod('cp')], ['Aprobación', ap > 60 ? 1 : ap < 35 ? -1 : 0], ['Carga legislativa', -Math.floor(lawLoad() / 3)], ['Gobierno en minoría', S.flags.minority ? -1 : 0]];
  S.cpParts = parts.filter(x => x[1]); return Math.max(0, parts.reduce((a, x) => a + x[1], 0));
}
function initGov() {
  const pol = S.pol; pol.lx = pol.lx || {}; pol.grpLock = pol.grpLock || {}; pol.dem = pol.dem || []; pol.comm = pol.comm || {}; if (pol.oppT == null) pol.oppT = S.turn + 3; if (pol.demT == null) pol.demT = S.turn + 2; if (pol.cab == null) pol.cab = -9;
  for (const id in pol.laws) if (!pol.lx[id]) pol.lx[id] = {}; if (!pol.rev) pol.rev = {};
  // calendario electoral regional escalonado
  P().terr.forEach((t, i) => { if (t.el == null && i > 0) t.el = S.turn + 3 + ((i * 7) % D.GOV.regionEvery); });
}
hook('new', initGov); hook('load', initGov);

/* ---- revisiones, caducidades y obras terminadas ---- */
hook('late', () => {
  if (S.over) return; const pol = S.pol;
  for (const id in pol.laws) {
    const l = LAW[id], age = S.turn - pol.laws[id], x = pol.lx[id] || (pol.lx[id] = {});
    if (l.build && age === l.build) { news(`Inaugurada: ${l.n}`, 'eco', S.player, 3); why('Inauguración: ' + l.n, () => secAdd('all', 2)); Bus.emit('treaty', { t: 'obra', a: S.player, b: S.player, name: 'Inaugurada: ' + l.n }); }
    if (x.exp && S.turn >= x.exp && !S.pend.some(p => p.law === id)) pushPend({ k: 'event', law: id, t: 'Caduca una ley', iso: S.player, x: `"${l.n}" se aprobó con fecha de caducidad y vence este trimestre. Puedes pedir al congreso que la prorrogue o dejarla morir.`,
      opts: [{ t: 'Pedir la prórroga (votación · 1 CP)', req: { cp: 1 }, fx: [['cp', -1], ['do', 'renew', { id }]] }, { t: 'Dejarla caducar', fx: [['do', 'lapse', { id }]] }] });
  }
  // revisión: cada ley se vuelve a examinar cada ~4 años; si el congreso actual la tumbaría, la oposición fuerza el debate
  if (isDem() && !S.pend.some(p => p.k === 'review')) {
    const due = Object.keys(pol.laws).filter(id => !lawBuilding(id) && S.turn - (pol.rev[id] || pol.laws[id]) >= D.GOV.review).sort((a, b) => (pol.rev[a] || pol.laws[a]) - (pol.rev[b] || pol.laws[b]))[0];
    if (due) { pol.rev[due] = S.turn; const l = LAW[due], f = lawForecast(invLaw(l));
      if (f.yes > f.need) pushPend({ k: 'review', law: due, t: 'La oposición quiere derogar una ley', iso: S.player, x: `Cumple años "${l.n}" y el congreso de hoy ya no es el que la aprobó: hay ${Math.round(f.yes)} votos para derogarla (hacen falta ${Math.round(f.need) + 1}).`,
        opts: [{ t: 'Defenderla en el pleno (2 CP)', req: { cp: 2 }, fx: [['cp', -2], ['do', 'defend', { id: due }]] }, { t: 'Reformarla para salvarla', fx: [['$g', -.3], ['do', 'defend', { id: due, soft: 1 }]] }, { t: 'Dejar que la deroguen', fx: [['do', 'lapse', { id: due, by: 'el congreso' }]] }] });
      else news(`El congreso ratifica: ${l.n}`, 'pol', S.player); }
  }
});
OPS.renew = a => { const l = LAW[a.id]; if (!l) return; const r = runVote(l, .05, 'Prórroga: ' + l.n); if (r.pass) { S.pol.lx[a.id] = { exp: S.turn + D.GOV.sunset }; news(`Prorrogada: ${l.n}`, 'pol', S.player, 2); } else OPS.lapse({ id: a.id, by: 'el congreso' }); };
OPS.lapse = a => { const l = LAW[a.id]; if (!l || S.pol.laws[a.id] == null) return; delete S.pol.laws[a.id]; delete S.pol.lx[a.id]; why('Fin de: ' + l.n, () => { for (const k in l.sec || {}) secAdd(k, -l.sec[k] * .5); }); news(a.by ? `${a.by.charAt(0).toUpperCase() + a.by.slice(1)} deroga: ${l.n}` : `Caduca: ${l.n}`, 'pol', S.player, 2); };
OPS.defend = a => { const l = LAW[a.id], r = runVote(invLaw(l), a.soft ? -.1 : -.18, 'Derogar: ' + l.n); if (r.pass) OPS.lapse({ id: a.id, by: 'el congreso' }); else { news(`Sobrevive a la revisión: ${l.n}`, 'pol', S.player, 2); if (a.soft) for (const k in l.sec || {}) if (l.sec[k] > 0) secAdd(k, -1); } };

/* ---- agenda: lo que te exigen los sectores, con plazo ---- */
hook('late', () => {
  const pol = S.pol; if (S.over) return;
  for (const d of pol.dem.slice()) {
    if (pol.laws[d.law] != null) { pol.dem.splice(pol.dem.indexOf(d), 1); why(`Cumpliste con ${D.SECTORS[d.k].n.toLowerCase()}`, () => { secAdd(d.k, 8); secAdd('all', 1); }); news(`${D.SECTORS[d.k].n}: «Ha cumplido». Se aprueba lo que exigían`, 'pol', S.player, 2); continue; }
    if (S.turn >= d.until) { pol.dem.splice(pol.dem.indexOf(d), 1); why(`Ignoraste a ${D.SECTORS[d.k].n.toLowerCase()}`, () => secAdd(d.k, -9)); news(`${D.SECTORS[d.k].n} se sienten traicionados: no aprobaste ${LAW[d.law].n.toLowerCase()}`, 'pol', S.player, 2); }
  }
  if (S.turn < pol.demT || pol.dem.length >= 2) return; pol.demT = S.turn + D.GOV.demandEvery;
  const ks = Object.keys(pol.sec).filter(k => !pol.dem.some(d => d.k === k)).sort((a, b) => pol.sec[a].a - pol.sec[b].a);
  for (const k of ks.slice(0, 4)) {
    const cand = D.LAWS.filter(l => pol.laws[l.id] == null && (l.sec || {})[k] >= 5 && !(l.grp && Object.keys(pol.laws).some(id => LAW[id].grp === l.grp && (LAW[id].sec || {})[k] > 0))).sort((a, b) => b.sec[k] - a.sec[k]);
    if (!cand.length) continue; const l = cand[Math.min(cand.length - 1, ri(0, 2))];
    pol.dem.push({ k, law: l.id, until: S.turn + 5 }); news(`${D.SECTORS[k].n} exigen: ${l.n} (plazo: 5 trimestres)`, 'pol', S.player, 2); break;
  }
});
/* ---- iniciativas de la oposición: también legislan, y a veces te imponen sus leyes ---- */
hook('late', () => {
  const pol = S.pol; if (S.over || !isDem() || S.turn < pol.oppT || S.pend.some(p => p.k === 'oppbill')) return; pol.oppT = S.turn + D.GOV.oppEvery + ri(0, 2);
  const opp = pol.seats.map((p, i) => [p, i]).filter(x => !x[0].g).sort((a, b) => b[0].s - a[0].s)[0]; if (!opp) return;
  const l = D.LAWS.filter(x => pol.laws[x.id] == null && !x.build && !x.maj && !(x.grp && (pol.grpLock[x.grp] || 0) > S.turn)).map(x => [x, axDist(x, opp[0])]).sort((a, b) => a[1] - b[1])[ri(0, 2)];
  if (!l) return; const f = oppForecast(l[0]);
  pushPend({ k: 'oppbill', law: l[0].id, t: `${opp[0].n} presenta una ley`, iso: S.player, x: `${opp[0].n} lleva al pleno "${l[0].n}". ${l[0].d} Previsión: ${Math.round(f)} votos a favor de 100${f > 50 ? '. Podría salir adelante aunque te opongas.' : '.'}`,
    opts: [{ t: 'Apoyarla', fx: [['do', 'oppbill', { id: l[0].id, i: opp[1], how: 'si' }], ['party', opp[1], 10], ['party', 'gov', -4]] },
    { t: 'Votar en contra', fx: [['do', 'oppbill', { id: l[0].id, i: opp[1], how: 'no' }]] },
    { t: 'Negociar que la retiren (2 CP)', req: { cp: 2 }, fx: [['cp', -2], ['party', opp[1], 4]] }] });
});
function oppForecast(l) { return S.pol.seats.reduce((a, p) => a + p.s * clamp(.5 + (p.g ? -.3 : .2) - .22 * axDist(l, p) + (p.g ? 0 : (50 - approval()) / 150), .03, .97), 0); }
OPS.oppbill = a => {
  const l = LAW[a.id], pol = S.pol, opp = pol.seats[a.i]; if (!l || pol.laws[l.id] != null) return;
  let yes = 0; const by = pol.seats.map(p => { const f = a.how === 'si' ? clamp(.5 + .3 - .15 * axDist(l, p), .1, .97) : clamp(.5 + (p.g ? -.3 : .2) - .22 * axDist(l, p) + rr(-.08, .08), .03, .97), y = Math.round(p.s * f); yes += y; return { n: p.n, s: Math.round(p.s), yes: y, g: p.g, ideo: p.ideo }; });
  const pass = yes > 50; Bus.emit('vote', { title: `${l.n} (iniciativa de ${opp ? opp.n : 'la oposición'})`, by, yes, need: 50, pass });
  if (pass) { enactLaw(l); news(`${a.how === 'no' ? 'Derrota en el congreso: la oposición aprueba' : 'Aprobada con apoyo de todos'}: ${l.n}`, 'pol', S.player, a.how === 'no' ? 3 : 2); if (a.how === 'no') { pol.cp = Math.max(0, pol.cp - 1); S.flags.defeat = S.turn; } }
  else news(`El congreso tumba la iniciativa de ${opp ? opp.n : 'la oposición'}: ${l.n}`, 'pol', S.player, 2);
};

/* ---- elecciones regionales escalonadas ---- */
hook('late', () => {
  if (S.over || !isDem()) return; const rul = rulingTag(), opp = (S.pol.seats.filter(p => !p.g).sort((a, b) => b.s - a.s)[0] || { n: 'Oposición' }).n;
  const due = P().terr.map((t, i) => [t, i]).filter(x => x[1] > 0 && x[0].o === S.player && x[0].el != null && x[0].el <= S.turn);
  const won = [], lost = [];
  for (const [t, i] of due) {
    const mine = t.p === rul, share = approval() + (mine ? 4 : -4) + (t.camp || 0) + (S.flags.scandal ? -4 : 0) + rr(-9, 9);
    t.el = S.turn + D.GOV.regionEvery; t.camp = 0;
    if (mine && share < 47) { t.p = opp; t.gob = genLeader(S.player); t.v = false; lost.push(t.n); } else if (!mine && share > 54) { t.p = rul; t.gob = genLeader(S.player); t.v = false; won.push(t.n); }
  }
  if (won.length || lost.length) { news(`Elecciones regionales: ${won.length ? 'tu partido gana ' + won.slice(0, 3).join(', ') + (won.length > 3 ? ' y ' + (won.length - 3) + ' más' : '') : ''}${won.length && lost.length ? '; ' : ''}${lost.length ? 'pierdes ' + lost.slice(0, 3).join(', ') + (lost.length > 3 ? ' y ' + (lost.length - 3) + ' más' : '') : ''}`, 'elec', S.player, 3); }
  else if (due.length) news(`Elecciones regionales en ${due.map(x => x[0].n).slice(0, 3).join(', ')}: sin cambios`, 'elec', S.player);
});
ACT.regCampaign = a => {
  const t = P().terr[+a.i]; if (!t || t.o !== S.player || !+a.i) return fail('Región inválida'); if (t.el == null || t.el - S.turn > 3) return fail('Allí no hay elecciones en los próximos 3 trimestres');
  if (t.camp) return fail('Ya hiciste campaña allí'); const cost = P().gdp * .0008 * (D.C[S.player].terr[+a.i].w * 10 + .5); if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(1)) return fail('Necesitas 1 de capital político');
  P().tr -= cost; t.camp = 7; return { msg: `Tu partido vuelca la campaña en ${t.n}: +7 puntos para las elecciones de dentro de ${t.el - S.turn} trimestres` };
};

/* ---- más usos del capital político ---- */
ACT.commSector = a => { // campaña de comunicación dirigida a un sector
  const k = a.k, pol = S.pol; if (!pol.sec[k]) return fail('Sector inválido'); if ((pol.comm[k] || 0) > S.turn) return fail(`Ya les hablaste hace poco: espera ${pol.comm[k] - S.turn} turnos`);
  const cost = P().gdp * .0004; if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(1)) return fail('Necesitas 1 de capital político');
  P().tr -= cost; pol.comm[k] = S.turn + 3; why('Campaña de comunicación', () => secAdd(k, 4)); return { msg: `Campaña dirigida a ${D.SECTORS[k].n.toLowerCase()}: +4` };
};
ACT.cabinet = () => { // remodelación del gabinete: aire fresco, pero solo cada 8 turnos
  const pol = S.pol; if (S.turn - pol.cab < 8) return fail(`Remodelaste el gabinete hace poco: espera ${8 - (S.turn - pol.cab)} turnos`); if (!useCP(3)) return fail('Necesitas 3 de capital político');
  pol.cab = S.turn; P().stab = clamp(P().stab + 3, 0, 100); why('Remodelación del gabinete', () => secAdd('all', 3)); partyRel('gov', 5); delete S.flags.scandal;
  news(`${S.leader.n} remodela su gabinete`, 'pol', S.player, 2); return { msg: 'Nuevo gabinete: +3 a todos los sectores, +3 de estabilidad y el escándalo queda atrás' };
};
const govInfo = () => ({ regen: cpRegen(), parts: S.cpParts || [], load: lawLoad(), laws: Object.keys(S.pol.laws).length, dem: S.pol.dem, lx: S.pol.lx, lock: S.pol.grpLock, cab: S.pol.cab, comm: S.pol.comm });
