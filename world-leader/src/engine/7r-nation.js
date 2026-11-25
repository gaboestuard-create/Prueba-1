/* =====================================================================
   SISTEMA · ESTADO DE LA NACIÓN
   Nueve indicadores internos (0-100) que persiguen un objetivo: punto de
   partida del país + gasto por partidas + leyes + policía + ejército en
   las calles + cárteles. Pesan en crecimiento, estabilidad, sectores y
   elecciones. Cárteles con nombre en regiones concretas.
   Datos en src/data-nation.js. Solo el país del jugador.
   ===================================================================== */
const NT = D.NAT, NIX = Object.keys(D.NAT_IX), NC = NT.cart;
function natInit() {
  const c = P(), gpc = c.gdp / Math.max(.001, c.pop), k = clamp((Math.log10(Math.max(1, gpc)) - .3) / 1.5, 0, 1), dem = c.reg === 'dem' ? 4 : -4, ix = {};
  for (const x of NIX) { const [a, b] = NT.start[x]; ix[x] = clamp(a + (b - a) * k + rr(-5, 5) + (x === 'ins' || x === 'cor' ? (x === 'cor' ? -dem : dem) : 0), 5, 95); }
  if (NC.narco.includes(S.player)) ix.cri = clamp(ix.cri + 12, 0, 95);
  S.nat = { ix, h: Object.fromEntries(NIX.map(x => [x, [Math.round(ix[x])]])), bud: Object.fromEntries(Object.keys(NT.bud).map(b => [b, 1])), pay: 1, eq: 0, purgeT: 0, army: {}, cart: [], legal: 0, cid: 0 }; S.nat.base = Object.assign({}, ix);
  const n = NC.narco.includes(S.player) ? ri(2, 3) : ix.cri > NC.spawnCri ? 1 : 0; for (let i = 0; i < n; i++) cartNew(ri(30, 65));
}
hook('new', natInit); hook('load', () => { if (!S.nat) natInit(); const N = S.nat; N.base = N.base || Object.assign({}, N.ix); for (const x of NIX) if (N.ix[x] == null) { N.ix[x] = 50; N.h[x] = [50]; } for (const b in NT.bud) if (N.bud[b] == null) N.bud[b] = 1; });
const ownIdx = () => ownRegs();
function cartNew(str) { const N = S.nat, used = N.cart.map(x => x.n), regs = ownIdx(); if (!regs.length) return null;
  const n = pick(NC.names.filter(x => !used.includes(x))) || 'El Cártel'; const c = { id: ++N.cid, n, i: pick(regs), str, cash: str * .5, boss: genLeader(S.player), pact: 0 }; N.cart.push(c); return c; }
const cartIn = i => S.nat ? S.nat.cart.filter(c => c.i === i) : [];
const lawFx = x => { let v = 0; for (const id in S.pol.laws) v += ((NT.law[id] || {})[x] || 0); return v; };
/* objetivo de cada indicador con su desglose, para la interfaz */
function natWhy(x) { const N = S.nat, out = [], add = (v, t) => { if (Math.abs(v) >= .5) out.push([Math.round(v), t]); return v; };
  let v = N.base ? N.base[x] : 50;
  for (const b in NT.bud) v += add((N.bud[b] - 1) * (NT.bud[b].ix[x] || 0), 'Gasto en ' + NT.bud[b].n.toLowerCase());
  v += add(lawFx(x), 'Leyes vigentes');
  const Pp = NT.police; if (x === 'seg') v += add((N.pay - 1) * Pp.pay.seg + N.eq * Pp.eq.seg, 'Policía'); if (x === 'cor') v += add((N.pay - 1) * Pp.pay.cor, 'Sueldos policiales');
  const nA = Object.keys(N.army).length; if (x === 'seg') v += add(nA * NT.army.seg, 'Ejército en las calles');
  const cs = N.cart.reduce((s, c) => s + c.str, 0); if (x === 'cri') v += add(Math.min(30, cs * NC.criW) - 10, 'Cárteles activos'); if (x === 'seg') v += add(-Math.min(20, cs * .08), 'Violencia del narco');
  const pc = N.cart.filter(c => c.pact > S.turn).length; if (pc && x === 'seg') v += add(pc * NC.pactSeg, 'Pactos con el narco'); if (pc && x === 'cor') v += add(pc * NC.pactCor, 'Pactos con el narco');
  if (x === 'ins') v += add((50 - N.ix.cor) * .2, 'Corrupción'); if (x === 'coh') v += add((50 - N.ix.des) * .15, 'Desigualdad');
  if (x === 'des') v += add(((S.eco || {}).unemp || 6) * .6 - 4, 'Desempleo'); if (x === 'seg' && inWar(S.player)) v += add(-4, 'Guerra');
  if (x === 'cri' && N.legal) v += add(-8, 'Drogas legalizadas');
  return { target: clamp(v, 0, 100), why: out.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])) };
}
const natMod = d => { const N = S.nat; for (const x in d.ix || {}) N.ix[x] = clamp(N.ix[x] + d.ix[x], 0, 100); if (d.cart) { const c = N.cart.find(z => z.id === d.cart); if (c && d.str) c.str = clamp(c.str + d.str, 0, 100); } if (d.out != null) delete N.army[d.out]; };
OPS.natMod = a => { if (S.nat) natMod(a); };
const natPend = (k, sub, d) => { const E = D.NAT_EV[k], f = s => s.split('{R}').join(sub.R || '').split('{C}').join(sub.C || '');
  pushPend({ k: 'event', id: 'nation', t: f(E.t), x: f(E.x), iso: S.player, opts: E.opts.map(o => ({ t: o.t, fx: o.fx.concat([['do', 'natMod', Object.assign({}, o.nat, { cart: d.cart, out: o.nat.out ? d.i : undefined })]]) })) }); };
/* turno: los indicadores persiguen su objetivo y los cárteles viven */
hook('player', () => { const N = S.nat, c = P(); if (!N) return;
  for (const x of NIX) { const w = natWhy(x); N.ix[x] = clamp(N.ix[x] + (w.target - N.ix[x]) * (NT.slow[x] || NT.drift) + rr(-NT.noise, NT.noise), 0, 100); const h = N.h[x]; h.push(Math.round(N.ix[x])); if (h.length > 24) h.shift(); }
  const E = NT.eff, I = N.ix; let st = 0; for (const x in E.stab) st += (I[x] - 50) * E.stab[x]; c.stab = clamp(c.stab + st * .1, 0, 100);
  for (const s in E.sec) { const [x, w] = E.sec[s]; if (S.pol.sec[s]) secAdd(s, (I[x] - 50) * w * .3); }
  /* ejército en las calles */
  for (const i in N.army) { if (!c.terr[i] || c.terr[i].o !== S.player) { delete N.army[i]; continue; } secAdd('mil', NT.army.mil);
    for (const k of cartIn(+i)) k.str = clamp(k.str + NT.army.cart, 0, 100);
    if (S.pend.length < 2 && chance(NT.army.abuseP)) natPend('abuso', { R: c.terr[i].n }, { i }); }
  /* cárteles */
  for (const k of N.cart.slice()) { if (!c.terr[k.i] || c.terr[k.i].o !== S.player) { const r = ownIdx(); if (!r.length) continue; k.i = pick(r); }
    const gr = k.pact > S.turn ? .2 : ((I.cri - NC.criMid) * NC.grow + NC.drift) * (1 - k.str / NC.cap) - (I.seg - 50) * .04; /* crecen cada vez más despacio cerca del techo */
    k.str = clamp(k.str + gr + (N.legal ? NC.legal.str : 0) + rr(-1.5, 1.5), 0, 100); k.cash = clamp(k.cash + k.str * .05 - (N.legal ? 2 : 0), 0, 200);
    if (k.str <= NC.dieAt) { N.cart.splice(N.cart.indexOf(k), 1); secAdd('all', 3); news(`Cae ${k.n}: su jefe, ${k.boss}, es detenido`, 'pol', S.player, 3); Bus.emit('regfx', { iso: S.player, i: k.i, k: 'ayuda' }); continue; }
    if (k.pact > S.turn && chance(NC.exposeP)) { k.pact = 0; if (S.pend.length < 2) natPend('expuesto', { C: k.n, R: c.terr[k.i].n }, { cart: k.id }); continue; }
    if (S.pend.length < 2 && !(k.pact > S.turn) && chance(NC.eventP * k.str / 50)) { const ev = k.str > 45 && chance(.5) ? 'atentado' : 'soborno'; if (ev === 'atentado') { c.stab = clamp(c.stab - 2, 0, 100); Bus.emit('regfx', { iso: S.player, i: k.i, k: 'rev' }); } natPend(ev, { C: k.n, R: c.terr[k.i].n }, { cart: k.id }); } }
  if (N.cart.length < NC.maxN && I.cri > NC.spawnCri && chance(NC.spawnP)) { const k = cartNew(ri(20, 35)); if (k && S.pend.length < 2) natPend('nuevo', { C: k.n, R: c.terr[k.i].n }, { cart: k.id }); }
});
/* el gasto interno pasa por el presupuesto normal */
hook('finance', f => { const N = S.nat; if (!N) return; const g = P().gdp; let v = 0; for (const b in NT.bud) v += (N.bud[b] - 1) * NT.bud[b].cost * g; v += (N.pay - 1) * NT.police.pay.cost * g + Object.keys(N.army).length * NT.army.cost * g;
  if (v > 0) f.exp.nat = v; else if (v < 0) f.inc.natcut = -v; });
/* el país pesa: crecimiento y elecciones */
{ const m0 = mod; mod = k => { let v = m0(k); if (!S || !S.nat || (k !== 'growth' && k !== 'elect')) return v; const I = S.nat.ix, E = NT.eff;
  if (k === 'growth') { let g = 0; for (const x in E.grow) g += (I[x] - 50) * E.grow[x]; return v + clamp(g, -E.growCap, E.growCap); }
  let e = 0; for (const x in E.elect) e += (I[x] - 50) * E.elect[x]; return v + e; }; }
/* las regiones con ejército se calman; las de un cártel, se agitan */
{ const w0 = rlWhy; rlWhy = i => { const w = w0(i); if (!S.nat || S.player == null) return w; let d = 0;
  if (S.nat.army[i]) { d += NT.army.rl; w.why.push([NT.army.rl, 'Ejército desplegado']); } const cs = cartIn(i).reduce((s, c) => s + c.str, 0) * NC.rlW; if (cs >= 1) { d += cs; w.why.push([Math.round(cs), 'Presencia del narco']); }
  w.target = clamp(w.target + d, 0, 100); return w; }; }
/* ---- acciones ---- */
ACT.natBud = a => { const N = S.nat, b = NT.bud[a.k]; if (!b) return fail('Partida desconocida'); N.bud[a.k] = clamp(Math.round(+a.v * 4) / 4, 0, 2); return { msg: `${b.n}: ${Math.round(N.bud[a.k] * 100)}% de lo normal` }; };
ACT.natPay = a => { S.nat.pay = clamp(Math.round(+a.v * 4) / 4, .5, 2); return { msg: `Sueldos policiales al ${Math.round(S.nat.pay * 100)}%` }; };
ACT.natEquip = () => { const N = S.nat, E = NT.police.eq, g = P().gdp * E.gdp; if (N.eq >= E.max) return fail('La policía ya tiene el mejor equipo posible'); if (!canPay(g)) return fail(`Necesitas ${money(g)}`);
  P().tr -= g; N.eq++; return { msg: `Policía reequipada (nivel ${N.eq} de ${E.max})` }; };
ACT.natPurge = () => { const N = S.nat, U = NT.police.purge; if (N.purgeT > S.turn) return fail(`La última depuración fue hace poco: espera ${N.purgeT - S.turn} turnos`); if (!useCP(U.cp)) return fail(`Necesitas ${U.cp} de capital político`);
  natMod({ ix: { cor: U.cor, seg: U.seg } }); N.purgeT = S.turn + U.cd; news(`${S.leader.n} purga la policía: cientos de agentes destituidos por corrupción`, 'pol', S.player, 2); return { msg: 'Depuración en marcha: menos corrupción, menos agentes en la calle un tiempo' }; };
ACT.natArmy = a => { const N = S.nat, A = NT.army, i = +a.i, c = P(); if (!c.terr[i] || c.terr[i].o !== S.player) return fail('Esa región no está bajo tu control');
  if (N.army[i]) { delete N.army[i]; Bus.emit('regfx', { iso: S.player, i, k: 'ayuda' }); return { msg: `El ejército vuelve a los cuarteles: ${c.terr[i].n}` }; }
  if (Object.keys(N.army).length >= A.max) return fail(`Ya tienes tropas en ${A.max} regiones`); if (!useCP(A.cp)) return fail(`Necesitas ${A.cp} de capital político`);
  N.army[i] = S.turn; repAdd('dem', A.dem); natMod({ ix: { seg: 2 } }); Bus.emit('regfx', { iso: S.player, i, k: 'humo' }); news(`El ejército patrulla las calles de ${c.terr[i].n}`, 'pol', S.player, 2); return { msg: `Ejército desplegado en ${c.terr[i].n}` }; };
ACT.cartel = a => { const N = S.nat, k = N.cart.find(x => x.id === +a.id), A = NC.acts[a.how], c = P(); if (!k) return fail('Ese cártel ya no existe'); if (!A) return fail('Acción desconocida');
  if ((k.cd || 0) > S.turn) return fail(`Ya actuaste contra ${k.n}: espera ${k.cd - S.turn} turnos`); const g = (A.gdp || 0) * c.gdp; if (g && !canPay(g)) return fail(`Necesitas ${money(g)}`); if (!useCP(A.cp)) return fail(`Necesitas ${A.cp} de capital político`);
  c.tr -= g; k.cd = S.turn + 2; const R = c.terr[k.i].n;
  if (a.how === 'pacto') { k.pact = S.turn + NC.pactTurns; return { msg: `Tus enviados cierran un pacto discreto con ${k.n}` }; }
  k.pact = 0; k.str = clamp(k.str + A.str - (a.how === 'guerra' && N.army[k.i] ? 6 : 0) - (a.how === 'guerra' ? (N.ix.seg - 50) * .1 : 0), 0, 100); if (A.cash) k.cash *= A.cash; natMod({ ix: { seg: A.seg || 0, cor: A.cor || 0 } });
  Bus.emit('regfx', { iso: S.player, i: k.i, k: a.how === 'guerra' ? 'humo' : 'ayuda' }); news(`${A.n} contra ${k.n} en ${R}`, 'pol', S.player, 2);
  if (a.how === 'guerra' && chance(A.backP) && S.pend.length < 3) natPend('atentado', { C: k.n, R }, { cart: k.id }); return { msg: `${A.n}: ${k.n} queda con fuerza ${Math.round(k.str)}` }; };
ACT.natLegal = () => { const N = S.nat, L = NC.legal; if (N.legal) return fail('Las drogas ya están legalizadas'); if (!useCP(L.cp)) return fail(`Necesitas ${L.cp} de capital político`);
  N.legal = S.turn + 1; /* turno + 1: el turno 0 no debe contar como «no legalizado» */ for (const s in L.sec) secAdd(s, L.sec[s]); natMod({ ix: { sal: L.sal } }); if (S.c.US && S.c.US.alive && S.player !== 'US') addMod(S.player, 'US', 'Legalizaste las drogas', L.us, .3);
  news(`${P().n} legaliza y regula las drogas: el mundo mira el experimento`, 'pol', S.player, 3); return { msg: 'Drogas legalizadas: el negocio del narco irá secándose' }; };
Object.assign(FREE, { natBud: 1, natPay: 1 });
function natInfo() { const N = S.nat; if (!N) return null; const g = P().gdp;
  return { ix: Object.fromEntries(NIX.map(x => { const w = natWhy(x); return [x, { v: N.ix[x], t: w.target, why: w.why.slice(0, 3), h: N.h[x] }]; })), bud: Object.assign({}, N.bud), pay: N.pay, eq: N.eq, purge: Math.max(0, N.purgeT - S.turn),
    army: Object.keys(N.army).map(Number), legal: N.legal, cost: Object.fromEntries(Object.keys(NT.bud).map(b => [b, (N.bud[b] - 1) * NT.bud[b].cost * g])),
    cart: N.cart.map(k => ({ id: k.id, n: k.n, boss: k.boss, i: k.i, reg: P().terr[k.i] ? P().terr[k.i].n : '', str: k.str, cash: k.cash, pact: Math.max(0, k.pact - S.turn), cd: Math.max(0, (k.cd || 0) - S.turn) })) }; }
