/* =====================================================================
   SISTEMA · FASE 3 · ECONOMÍA Y DIPLOMACIA DE GUERRA, OCUPACIÓN Y ESCALADA
   Alerta, políticas de guerra, cansancio, comercio de armas y embargos,
   integración o rebelión de lo ocupado, reparaciones, exilio, refugiados,
   reacciones del mundo, alto el fuego, crímenes de guerra, disuasión y
   construcciones con tiempo (bases y fortificaciones).
   ===================================================================== */
const W3DEF = () => ({ alert: 0, pol: {}, doct: {}, dcd: {}, crimes: 0, trial: 0, weary: 0, auto: {}, str: 0, blk: {}, bq: [], fq: [], emb: [], myEmb: [], ref: {} });
hook('new', () => { S.war3 = W3DEF(); }); hook('load', () => { S.war3 = Object.assign(W3DEF(), S.war3 || {}); });
const myWars = () => warsOf(S.player);

/* ---- nivel de alerta ---- */
ACT.setAlert = a => { const v = +a.v, W = S.war3; if (!(v >= 0 && v <= 3) || v % 1) return fail('Nivel inválido'); if (myWars().length && v < 2) return fail('En guerra no puedes bajar de Movilización');
  const old = W.alert; W.alert = v; if (v >= 2 && old < 2) { for (const z of nb(S.player)) if (rel(S.player, z) < 20) addMod(S.player, z, 'Tu movilización', -4, .3); news(`${P().n} moviliza a sus reservistas`, 'mil', S.player, 2); }
  return { msg: `Alerta: ${D.ALERT[v].n}. ${D.ALERT[v].d}` }; };
hook('player', () => { const W = S.war3, me = S.player, at = myWars().length;
  if (at && W.alert < 2) W.alert = 2; S.mil.ready = clamp(S.mil.ready + D.ALERT[W.alert].ready, 0, 100);
  if (!at) { W.pol.racion = W.pol.leva = 0; }
  if (W.pol.leva) { const n = Math.max(2, Math.round((P().u.inf || 0) * .03)); P().u.inf = (P().u.inf || 0) + n; why('Reclutamiento forzoso', () => { secAdd('jov', -1.5); secAdd('min', -.8); }); repAdd('dem', -.3); }
  if (W.pol.racion) { why('Racionamiento', () => { secAdd('obr', -.8); secAdd('med', -.8); }); P().stab = clamp(P().stab - .3, 0, 100); }
  if (W.pol.econ) why('Economía de guerra', () => { secAdd('emp', .3); secAdd('sin', -.4); });
  // cansancio de guerra: crece con cada turno y cada derrota; la victoria lo alivia
  const lost = S.blog.filter(b => b.t === S.turn - 1 && b.me && ((b.a === me) !== !!b.win)).length;
  W.weary = at ? clamp(W.weary + .7 * at + lost * 1.5 - (warScoreFor(me) > 30 ? .5 : 0), 0, 100) : Math.max(0, W.weary - 2);
  if (W.weary > 10) why('Cansancio de guerra', () => { secAdd('jov', -W.weary * .03); secAdd('med', -W.weary * .02); secAdd('obr', -W.weary * .02); });
  if (at) { const sc = warScoreFor(me); why('El frente', () => secAdd('mil', sc > 20 ? .6 : sc < -20 ? -.6 : 0)); if (S.eco) S.eco.inf = clamp(S.eco.inf + .2 * at, -5, 200); }
  if (W.str === 1) { repAdd('paz', -.4); } });
hook('finance', f => { const W = S.war3, me = S.player, cl = costLvl(me); if (!W) return; const A = D.ALERT[W.alert]; if (A.up > 1) f.exp.alerta = upkeep(me) * (A.up - 1);
  let ops = 0; for (const g of S.army) if (isP(g.o)) for (const k in g.u) ops += g.u[k] * D.UNITS[k].up * .5; if (ops) f.exp.frente = ops * cl;
  let ft = 0; for (const k of W.fq.filter(x => x.done)) { const st = rSt(k.k); if (st && st.o === me) ft += (st.fort || 0); } if (ft) f.exp.fort = ft * D.FORT.up * cl; });
{ const l0 = lawSum, m0 = mod;
  lawSum = k => { let v = l0(k); const W = S.war3; if (!W) return v; if (k === 'grow') v += D.ALERT[W.alert].grow + (W.pol.econ ? -.15 : 0); if (k === 'oilSave' && W.pol.racion) v += .15; return v; };
  mod = k => { let v = m0(k); const W = S.war3; if (!W) return v; if (k === 'unitCost') v += (W.pol.econ ? -.25 : 0) + (W.emb.length >= 3 ? .1 : 0); return v; }; }
hook('late', () => { if (S.war3.pol.econ) S.built = { tierra: -6, aire: -2, mar: -1 }; });
ACT.wpol = a => { const W = S.war3, P0 = D.WPOL[a.k]; if (!P0) return fail('Política desconocida'); const on = !!+a.on;
  if (on && (a.k === 'racion' || a.k === 'leva') && !myWars().length) return fail('Solo en tiempo de guerra'); if (on && a.k === 'econ' && W.alert < 2) return fail('Necesitas al menos Movilización');
  if (on && !W.pol[a.k] && !useCP(1)) return fail('Necesitas 1 de capital político'); W.pol[a.k] = on ? 1 : 0; return { msg: `${P0.n}: ${on ? 'en vigor' : 'suspendido'}` }; };
ACT.doctrine = a => { const W = S.war3, X = (D.DOCT[a.b] || {})[a.k]; if (!X) return fail('Doctrina desconocida'); if (W.doct[a.b] === a.k) return fail('Ya es tu doctrina');
  if ((W.dcd[a.b] || 0) > S.turn) return fail(`Tus generales aún aplican la anterior: espera ${W.dcd[a.b] - S.turn} turnos`); if (!useCP(2)) return fail('Necesitas 2 de capital político');
  W.doct[a.b] = a.k; W.dcd[a.b] = S.turn + 8; return { msg: `Nueva doctrina: ${X.n}` }; };

/* ---- grupos del jugador ---- */
const myGroup = id => S.army.find(g => g.id === +id && isP(g.o) && warById(g.w) && thSide(warById(g.w), g.o));
ACT.mkGroup = a => { const w = warById(+a.w); if (!w || !thSide(w, S.player)) return fail('No participas en esa guerra'); if (!D.GTYPE[a.t]) return fail('Tipo de grupo inválido');
  if (grpOf(S.player).length >= 8) return fail('Máximo 8 grupos: disuelve o refuerza uno'); const g = mkGroup(S.player, w, a.t, clamp(+a.f || .5, .1, 1)); if (!g) return fail(`No te quedan unidades libres de ${D.CATS[D.GTYPE[a.t].cat].toLowerCase()}`);
  S.war3.auto[w.id] = false; return { msg: `${g.n} formado con ${gsize(g)} unidades` }; };
ACT.grpOrder = a => { const g = myGroup(a.g); if (!g) return fail('Grupo inexistente'); const w = warById(g.w), O = D.ORDERS[a.ord]; if (!O || !O.t.includes(g.t)) return fail('Esa orden no sirve para este grupo');
  const side = thSide(w, S.player), foe = w[thOther(side)][0]; if (a.ord === 'blq' && D.C[foe].land) return fail(`${nm(foe)} no tiene costa`);
  let tgt = a.tgt; if (O.foe || a.ord === 'def') { const T = validTargets(w, g, a.ord); if (!T.length) return fail(a.ord === 'lnd' ? 'No hay costas enemigas a tu alcance' : 'No hay objetivos posibles'); if (!T.includes(tgt)) tgt = T[0]; }
  gOrder(g, a.ord, tgt); S.war3.auto[w.id] = false; return { msg: `${g.n}: ${O.n}${tgt && a.ord !== 'ret' && rSt(tgt) ? ' · ' + rSt(tgt).n : ''}` }; };
ACT.grpAdd = a => { const g = myGroup(a.g); if (!g) return fail('Grupo inexistente'); const f = clamp(+a.f || .5, .1, 1), cat = D.GTYPE[g.t].cat; let n = 0;
  for (const k in D.UNITS) if (D.UNITS[k].cat === cat && k !== 'abm') { const v = Math.floor(freeU(S.player, k) * f); if (v > 0) { g.u[k] = (g.u[k] || 0) + v; n += v; } }
  if (!n) return fail('No te quedan unidades libres de ese tipo'); g.mor = Math.max(30, g.mor - 3); return { msg: `${g.n} recibe ${n} unidades de refuerzo` }; };
ACT.grpDel = a => { const g = myGroup(a.g); if (!g) return fail('Grupo inexistente'); S.army.splice(S.army.indexOf(g), 1); return { msg: `${g.n} se disuelve: sus unidades vuelven a la reserva` }; };
ACT.warAuto = a => { const w = warById(+a.w); if (!w || !thSide(w, S.player)) return fail('No participas en esa guerra'); S.war3.auto[w.id] = !!+a.on; if (+a.on) thPlan(w, S.player); return { msg: +a.on ? 'Tu Estado Mayor dirige la campaña' : 'Tomas el mando directo' }; };

/* ---- construcción con tiempo: bases y fortificaciones ---- */
{ const b0 = ACT.buildBase; ACT.buildBase = a => { if (S.war3.bq.some(q => q.k === a.k)) return fail('Ya hay una obra de ese tipo en marcha'); const before = P().bases[a.k] || 0, r = b0(a);
  if (r && r.ok !== false && (P().bases[a.k] || 0) > before) { P().bases[a.k] = before; S.war3.bq.push({ k: a.k, r: S.turn + 2 }); r.msg = `${D.BASES[a.k].n}: obras en marcha, lista en 2 turnos`; } return r; }; }
const fortCost = k => D.FORT.cost * ((rSt(k).fort || 0) + 1) * Math.max(.4, costLvl(S.player)) * (1 + docM(S.player, 'fortC'));
ACT.fortify = a => { const st = rSt(a.k || ''); if (!st || st.o !== S.player) return fail('Solo puedes fortificar regiones que controlas'); if ((st.fort || 0) >= D.FORT.max) return fail('Nivel máximo');
  if (S.war3.fq.some(x => x.k === a.k && !x.done)) return fail('Ya se fortifica'); const c = fortCost(a.k); if (!canPay(c)) return fail(`Necesitas ${money(c)}`);
  P().tr -= c; const q = S.war3.fq.find(x => x.k === a.k); if (q) { q.r = S.turn + D.FORT.turns; q.done = 0; } else S.war3.fq.push({ k: a.k, r: S.turn + D.FORT.turns, done: 0 }); return { msg: `Fortificando ${st.n}: listo en ${D.FORT.turns} turnos` }; };
hook('late', () => { const W = S.war3;
  W.bq = W.bq.filter(q => { if (S.turn < q.r) return true; P().bases[q.k] = (P().bases[q.k] || 0) + 1; news(`${D.BASES[q.k].n} terminado: más capacidad de reclutamiento`, 'mil', S.player, 1); return false; });
  for (const q of W.fq) if (!q.done && S.turn >= q.r) { const st = rSt(q.k); q.done = 1; if (st && st.o === S.player) { st.fort = Math.min(D.FORT.max, (st.fort || 0) + 1); news(`${st.n}: fortificaciones de nivel ${st.fort}`, 'mil', S.player, 1); } }
  // la IA atacada fortifica lo que más teme perder
  for (const w of S.wars) for (const side of ['att', 'def']) { const lead = w[side][0]; if (isP(lead) || !chance(.2)) continue; const k = thFront(w, thOther(side), 2)[0]; if (k && rSt(k).o === lead) rSt(k).fort = Math.min(2, (rSt(k).fort || 0) + 1); }
  for (const w of S.wars.slice()) if (w.arm && w.cf && S.turn >= w.cf) endWar(w, 'actual');
  if (!myWars().length && W.emb.length && chance(.15)) { const z = W.emb.shift(); news(`${nm(z)} levanta su embargo de armas contra ti`, 'dip', z, 1); }
});

/* ---- comercio de armas y embargos ---- */
ACT.buyArms = a => { const me = S.player, z = a.iso, U = D.UNITS[a.k], n = Math.floor(+a.n); if (!S.c[z] || !S.c[z].alive || z === me || !U || !(n > 0)) return fail('Compra inválida');
  if (atWar(me, z)) return fail('Estás en guerra con ese país'); if (S.war3.emb.includes(z)) return fail(`${nm(z)} mantiene un embargo de armas contra ti`); if (rel(me, z) < 15) return fail(`${nm(z)} no te vende armas: la relación es demasiado baja`);
  if ((S.c[z].u[a.k] || 0) < n * 4) return fail(`${nm(z)} no tiene ${U.n.toLowerCase()} de sobra`); const cost = U.cost * Math.max(.4, costLvl(z)) * 1.3 * n; if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`);
  P().tr -= cost; S.c[z].tr += cost; S.c[z].u[a.k] -= n; P().u[a.k] = (P().u[a.k] || 0) + n; addMod(me, z, 'Compra de armas', gain(3), .5); wlog('mil', z, me, `${nm(z)} vende ${n} ${U.n.toLowerCase()} a ${P().n}`);
  return { msg: `Compras ${n} × ${U.n} a ${nm(z)} por ${money(cost)}` }; };
ACT.sellArms = a => { const me = S.player, z = a.iso, U = D.UNITS[a.k], n = Math.floor(+a.n); if (!S.c[z] || !S.c[z].alive || z === me || !U || !(n > 0)) return fail('Venta inválida');
  if (S.war3.myEmb.includes(z)) return fail('Tú mismo le impusiste un embargo'); if ((P().u[a.k] || 0) < n) return fail('No tienes tantas'); if (rel(me, z) < 0) return fail(`${nm(z)} no quiere tus armas`);
  const price = U.cost * Math.max(.4, costLvl(me)) * 1.2 * n; if (S.c[z].tr < price * .5) return fail(`${nm(z)} no puede pagarlo`);
  P().u[a.k] -= n; S.c[z].u[a.k] = (S.c[z].u[a.k] || 0) + n; P().tr += price; S.c[z].tr -= price; addMod(me, z, 'Te vendió armas', gain(4), .5);
  for (const y of enemiesOf(z)) if (!isP(y)) addMod(me, y, 'Armaste a su enemigo', -8, .3, 1); wlog('mil', me, z, `${P().n} vende ${n} ${U.n.toLowerCase()} a ${nm(z)}`);
  return { msg: `Vendes ${n} × ${U.n} a ${nm(z)} por ${money(price)}` }; };
ACT.armsEmb = a => { const z = a.iso, L = S.war3.myEmb; if (!S.c[z] || z === S.player) return fail('País inválido'); const i = L.indexOf(z);
  if (i >= 0) { L.splice(i, 1); return { msg: `Levantas el embargo de armas a ${nm(z)}` }; } L.push(z); addMod(S.player, z, 'Embargo de armas', -8, .3, 1); if (inWar(z) && warsOf(z).some(w => w.att[0] === z && !w.casus)) repAdd('paz', 2);
  news(`${P().n} decreta un embargo de armas contra ${nm(z)}`, 'dip', z, 2); return { msg: `Embargo de armas contra ${nm(z)}` }; };
// el Estado Mayor despliega en cuanto empieza la guerra; las democracias embargan armas al agresor sin motivo
{ const s0 = startWar; startWar = (a, d) => { const w = s0(a, d); if (w) { thPlan(w, a); thPlan(w, d); for (const x of w.att.concat(w.def)) if (isP(x) && x !== a && x !== d) thPlan(w, x); } if (w && isP(a) && !w.casus) { let n = 0; for (const z of alive()) if (z !== a && z !== d && S.c[z].reg === 'dem' && S.c[z].gdp > 500 && rel(z, a) < 25 && chance(.6) && !S.war3.emb.includes(z)) { S.war3.emb.push(z); n++; }
  if (n) news(`${n} países decretan un embargo de armas contra ${P().n}`, 'dip', a, 3); } return w; }; }

/* ---- ocupación: integración o rebelión región a región ---- */
hook('late', () => { const me = S.player;
  for (const z of occList()) { let integ = 0;
    for (const [t, i] of occOf(z)) { if (t.int == null) t.int = 0; if (t.int >= 100) { integ++; continue; }
      const pol = S.occ[z] || 'normal', same = D.C[z].region === D.C[me].region, wt = D.C[z].terr[i].w || .02;
      t.int = Math.min(100, t.int + Math.max(.5, 2 + (same ? 2 : 0) + (pol === 'blanda' ? 2 : pol === 'dura' ? -1 : 0) - Math.min(1.5, wt * 10)));
      if (t.int >= 100) { P().gdp += (t.g || 0) * (1 - (t.k || .7)); t.k = 1; integ++; news(`${t.n} se integra en ${P().n}: deja de resistir`, 'pol', z, 2); continue; }
      if (!atWar(me, z) && chance(.02 * (1 - t.int / 100) * (pol === 'dura' ? .5 : 1) * (S.c[z].exile ? 1.5 : 1))) { restoreTerr(z, i); news(`Rebelión en ${t.n}: la región expulsa a tus tropas y vuelve a ${nm(z)}`, 'war', z, 3); why(`Rebelión en ${t.n}`, () => secAdd('mil', -2)); } }
    setMod(me, z, 'Regiones integradas', integ * 4); } });

/* ---- al ganar: reparaciones y cesiones; gobiernos en el exilio y refugiados ---- */
OPS.reparations = a => { const w = warById(a.w), V = S.c[a.v]; if (!V) return; V.tr -= a.amt; P().tr += a.amt; if (w) endWar(w, a.keep ? 'actual' : 'blanca'); addMod(S.player, a.v, 'Reparaciones de guerra', -15, .3, 1); news(`${V.n} paga ${money(a.amt)} en reparaciones de guerra a ${P().n}`, 'peace', a.v, 3); };
OPS.cession = a => { const w = warById(a.w), V = S.c[a.v]; if (!V) return; const mine = V.terr.map((t, i) => [t, i]).filter(x => x[0].o === S.player).sort((x, y) => (x[1] === 0) - (y[1] === 0) || rDist(rk(a.v, y[1]), rk(S.player, 0)) - rDist(rk(a.v, x[1]), rk(S.player, 0)));
  const give = mine.filter(x => x[1] === 0).concat(mine.filter(x => x[1] !== 0).slice(0, Math.ceil(mine.length / 2))); give.forEach(x => restoreTerr(a.v, x[1])); if (w) endWar(w, 'actual');
  news(`Tratado de paz: ${V.n} cede ${mine.length - give.length} regiones a ${P().n}`, 'peace', a.v, 3); };
{ const c0 = capitulate; capitulate = (w, loser, winner) => { const n0 = S.pend.length; c0(w, loser, winner);
  if (isP(winner) && S.pend.length > n0) { const p = S.pend[S.pend.length - 1], amt = S.c[loser].gdp * .06;
    p.opts.splice(2, 0, { t: `Exigir reparaciones (${money(amt)}) y retirarte`, fx: [['do', 'reparations', { v: loser, w: w.id, amt }], ['rep', 'paz', 3]] }, { t: 'Paz con cesiones: devuelves la capital y la mitad', fx: [['do', 'cession', { v: loser, w: w.id }], ['rep', 'paz', 1]] }); } }; }
{ const pp0 = pushPend; pushPend = p => { if (p && p.k === 'peace' && / pide la paz$/.test(p.t || '')) { const f = ((p.opts[0] || {}).fx || []).find(x => x[0] === 'do' && x[1] === 'peace');
    if (f && S.c[p.iso]) { const amt = S.c[p.iso].gdp * .03; p.opts.splice(1, 0, { t: `Aceptar exigiendo ${money(amt)} en reparaciones`, fx: [['chance', .6, [['do', 'reparations', { w: f[2].w, v: p.iso, amt, keep: 1 }]], [['rel', 'T', -8, 'Exigiste demasiado']]]] }); } }
  return pp0(p); }; }
{ const a0 = annex; annex = (v, t) => { a0(v, t); const V = S.c[v]; if (V.alive || isP(v)) return; const host = alive().filter(z => z !== t && S.c[z].gdp > 200 && rel(z, t) < -10).sort((a, b) => rel(a, t) - rel(b, t))[0];
  if (host) { V.exile = host; news(`El gobierno de ${V.n} se exilia en ${nm(host)} y llama a resistir`, 'dip', host, 2); } }; }
hook('late', () => { for (const z of ISOS) { const V = S.c[z]; if (!V.exile) continue; if (V.alive) delete V.exile; else if (S.res) S.res[z] = Math.min(99, (S.res[z] || 0) + .8); } });
function onTaken(w, k, taker) { const [iso] = rpk(k), refu = (S.c[iso].pop || 0) * (rGeo(k).w || .02) * .15; S.war3.ref[iso] = (S.war3.ref[iso] || 0) + refu;
  if (refu > .2 && chance(.5)) { news(`Crisis humanitaria: ${Math.round(refu * 1000)} mil personas huyen de ${rSt(k).n}`, 'world', iso, isP(iso) || isP(taker) ? 2 : 1); for (const z of nb(iso)) S.c[z].stab = clamp(S.c[z].stab - .5, 0, 100); if (isP(taker) && w.att[0] === taker) repAdd('gen', -1); } }
function warCrime(w, k, what, by) {
  if (!isP(by)) { if (S.c[by].gdp > 300 && chance(.5)) { news(`Se acusa a ${nm(by)} de crímenes de guerra: ${what}`, 'dip', by, 2); for (const z of alive()) if (S.c[z].reg === 'dem' && S.c[z].gdp > 800 && z !== by) addMod(by, z, 'Crímenes de guerra', -5, .3, 1); }
    if (isP(rpk(k)[0])) why('Bombardeos sobre tus ciudades', () => secAdd('all', 2)); return; }
  const W = S.war3; W.crimes++; repAdd('gen', -3); relAll(-2, 'Crímenes de guerra', 'big'); news(`Denuncias de crímenes de guerra contra ${P().n}: ${what}`, 'dip', S.player, 3);
  if (W.crimes >= 3 && !W.trial) { W.trial = 1; pushPend({ k: 'event', t: 'Tribunal internacional', iso: S.player, x: `La Corte Penal Internacional abre un caso por ${W.crimes} denuncias contra tus fuerzas. El mundo espera tu respuesta.`,
    opts: [{ t: 'Cooperar y entregar a los responsables', fx: [['sec', 'mil', -10], ['rep', 'gen', 8], ['do', 'crimesReset', {}]] }, { t: 'Juzgarlos en tus tribunales · 1 CP', req: { cp: 1 }, fx: [['cp', -1], ['chance', .5, [['rep', 'gen', 3], ['do', 'crimesReset', {}]], [['rep', 'gen', -5]]]] },
      { t: 'Negar su jurisdicción', fx: [['rep', 'gen', -8], ['sec', 'mil', 4], ['do', 'demSanc', {}]] }] }); } }
OPS.crimesReset = () => { S.war3.crimes = 0; S.war3.trial = 0; };
OPS.demSanc = () => { let n = 0; for (const z of alive()) if (n < 3 && S.c[z].reg === 'dem' && S.c[z].gdp > 500 && rel(S.player, z) < 30 && addSanction(z, S.player)) n++; if (n) news(`${n} democracias sancionan a ${P().n} por desafiar al tribunal`, 'dip', S.player, 3); };

/* ---- reacciones del mundo durante la guerra y propuestas a tus guerras ---- */
OPS.cf = a => { const w = warById(a.w); if (!w) return; w.cf = S.turn + a.n; w.arm = a.arm ? 1 : 0; news(`${a.arm ? 'Armisticio' : 'Alto el fuego'} entre ${nm(w.att[0])} y ${nm(w.def[0])}`, 'peace', w.att[0], 3); };
OPS.crisis = a => globalCrisis(warById(a.w));
OPS.backDown = a => { const w = warById(a.w); if (w) { news(`${nm(a.iso)} retrocede y acepta la paz`, 'peace', a.iso, 3); endWar(w, 'actual'); } };
hook('world', () => { const me = S.player;
  for (const w of S.wars.slice()) { const a = w.att[0], d = w.def[0], dur = S.turn - w.s;
    if (dur >= 1 && chance(.15)) { const z = pick(alive().filter(z => !thSide(w, z) && !isP(z) && S.c[z].gdp > 500 && rel(z, d) > 45 && rel(z, a) < -10)); if (z) { const Z = S.c[z], T = S.c[d];
      for (const k of ['inf', 'tan', 'caz', 'aa']) { const n = Math.floor((Z.u[k] || 0) * .03); Z.u[k] -= n; T.u[k] = (T.u[k] || 0) + n; }
      news(`${nm(z)} envía armas y voluntarios a ${nm(d)}`, 'war', z, isP(a) || isP(d) ? 3 : 1); if (isP(a)) addMod(me, z, 'Arma a tu enemigo', -8, .3, 1); if (isP(d)) addMod(me, z, 'Te envió ayuda militar', gain(8), .3); } }
    if (!w.cond && dur >= 2 && !w.casus) { w.cond = 1; news(`La Asamblea de Naciones condena la invasión de ${nm(d)} por ${nm(a)}`, 'dip', a, isP(a) ? 3 : 2); if (isP(a)) { repAdd('gen', -6); repAdd('conf', -2); relAll(-3, 'Condena en la Asamblea', 'big'); } }
    for (const side of ['att', 'def']) { const sc = side === 'att' ? w.score : -w.score; if (sc > -35) continue;
      for (const z of w[side].slice(1)) if (!isP(z) && S.c[z].per.leal < .55 && chance(.12)) { w[side] = w[side].filter(x => x !== z); S.army = S.army.filter(g => !(g.o === z && g.w === w.id)); dirty();
        news(`${nm(z)} abandona la guerra: no quiere hundirse con ${nm(w[side][0])}`, 'war', z, isP(w[side][0]) ? 3 : 1); if (isP(w[side][0])) addMod(me, z, 'Te abandonó en la guerra', -15, .3, 1); } }
    if (!(a === me || d === me) || S.pend.some(p => p.wid === w.id)) continue;
    const foe = a === me ? d : a, fsc = foe === a ? w.score : -w.score;
    if (S.c[foe].nuke && !w.strat && dur >= 4 && fsc < -40 && chance(.15)) { w.strat = 1; pushPend({ k: 'war', wid: w.id, iso: foe, t: `${nm(foe)} eleva su alerta estratégica`, x: `${S.c[foe].lider.n} insinúa que usará "todos los medios" si sigues avanzando. Las bolsas se desploman. Nadie sabe si es un farol.`,
      opts: [{ t: 'Aceptar un alto el fuego de 4 turnos', fx: [['do', 'cf', { w: w.id, n: 4 }], ['sec', 'mil', -5], ['rep', 'paz', 4]] }, { t: 'Mantener la presión', fx: [['chance', .3, [['do', 'crisis', { w: w.id }]], [['do', 'backDown', { w: w.id, iso: foe }]]]] }]
        .concat(P().nuke ? [{ t: 'Responder con tu propia alerta estratégica', fx: [['rep', 'paz', -10], ['chance', .5, [['do', 'backDown', { w: w.id, iso: foe }]], [['do', 'crisis', { w: w.id }]]]] }] : []) }); continue; }
    if ((w.cfAsk || 0) > S.turn || (w.cf || 0) > S.turn) continue;
    if (dur >= 3 && fsc < -25 && chance(.25)) { w.cfAsk = S.turn + 4; pushPend({ k: 'peace', wid: w.id, iso: foe, t: `${nm(foe)} propone un alto el fuego`, x: `${S.c[foe].lider.n} reconoce que el frente le es adverso y ofrece detener los combates. Un armisticio congelaría las líneas y firmaría la paz con lo que cada uno ocupe.`,
      opts: [{ t: 'Alto el fuego de 3 turnos', fx: [['do', 'cf', { w: w.id, n: 3 }], ['rep', 'paz', 2]] }, { t: 'Armisticio: 8 turnos y paz con lo ocupado', fx: [['do', 'cf', { w: w.id, n: 8, arm: 1 }], ['rep', 'paz', 4]] }, { t: 'Rechazarlo y seguir', fx: [['sec', 'mil', 2], ['rep', 'paz', -2]] }] }); }
    else if (dur >= 5 && chance(.12)) { const z = pick(alive().filter(z => !thSide(w, z) && !isP(z) && S.c[z].gdp > 1000 && rel(z, me) > 15 && rel(z, foe) > 15)); if (z) { w.cfAsk = S.turn + 6;
      pushPend({ k: 'peace', wid: w.id, iso: z, t: `${nm(z)} ofrece mediar`, x: `${S.c[z].lider.n} propone un alto el fuego de 4 turnos para negociar con ${nm(foe)}.`, opts: [{ t: 'Aceptar la mediación', fx: [['do', 'cf', { w: w.id, n: 4 }], ['rel', 'T', 6, 'Aceptaste su mediación'], ['rep', 'paz', 3]] }, { t: 'Rechazarla', fx: [['rel', 'T', -4, 'Rechazaste su mediación']] }] }); } }
  }
  // disuasión: tu movilización enfría a los vecinos hostiles más débiles
  const W = S.war3; if (W.alert >= 2 || W.str) for (const z of nb(me)) { const e = S.c[z].esc || {}; if ((e[me] || 0) > 0 && power(me) > power(z) * (W.str ? .5 : 1.1) && chance(.25)) { e[me]--; news(`${nm(z)} rebaja la tensión ante tu ${W.str ? 'alerta estratégica' : 'movilización'}`, 'dip', z, 2); } }
  if (W.str) for (const z of alive()) { const e = S.c[z].esc || {}; if ((e[me] || 0) >= 2) e[me] = 1; }
});
ACT.ceasefire = a => { const w = warById(+a.w), me = S.player; if (!w || (w.att[0] !== me && w.def[0] !== me)) return fail('Solo quien lidera la guerra puede negociar'); if ((w.cf || 0) > S.turn) return fail('Ya hay un alto el fuego');
  const foe = w.att[0] === me ? w.def[0] : w.att[0], fsc = foe === w.att[0] ? w.score : -w.score; if (!useCP(1)) return fail('Necesitas 1 de capital político');
  let acc = clamp(.25 + -fsc / 120 + (60 - S.c[foe].stab) / 250 + S.rep.paz / 400, .05, .9); if (fsc > 30) acc *= .3; if (a.arm) acc *= .8;
  if (!chance(acc)) return { ok: false, msg: `${nm(foe)} rechaza el ${a.arm ? 'armisticio' : 'alto el fuego'}: cree que puede ganar` };
  OPS.cf({ w: w.id, n: a.arm ? 8 : 3, arm: a.arm }); return { msg: a.arm ? 'Armisticio firmado: en 8 turnos la paz será oficial con lo que cada uno ocupe' : 'Alto el fuego de 3 turnos' }; };
ACT.breakCf = a => { const w = warById(+a.w); if (!w || !((w.cf || 0) > S.turn)) return fail('No hay alto el fuego'); w.cf = 0; w.arm = 0; repAdd('conf', -12); relAll(-3, 'Rompiste un alto el fuego', 'big'); news(`${P().n} rompe el alto el fuego`, 'war', S.player, 3); return { msg: 'Rompes el alto el fuego: el mundo toma nota' }; };

/* ---- disuasión y escalada ---- */
ACT.showForce = a => { const me = S.player, z = a.iso, c = S.c[z]; if (!c || !c.alive || z === me) return fail('País inválido'); if (S.war3.alert < 1) return fail('Necesitas al menos alerta de Tensión'); if (atWar(me, z)) return fail('Ya estáis en guerra');
  const cost = upkeep(me) * .5 + .2; if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(1)) return fail('Necesitas 1 de capital político'); P().tr -= cost; S.mil.ready = clamp(S.mil.ready + 5, 0, 100);
  if (power(me) > power(z) * 1.3) { (c.esc = c.esc || {})[me] = 0; if (c.plan && c.plan.t === me) c.plan = { k: 'nada', n: S.turn }; addMod(me, z, 'Demostración de fuerza', -6, .5, 1); news(`${c.n} retrocede ante la demostración de fuerza de ${P().n}`, 'mil', z, 3); return { msg: `${c.n} toma nota y retrocede` }; }
  (c.esc = c.esc || {})[me] = Math.min(3, ((c.esc || {})[me] || 0) + 1); addMod(me, z, 'Demostración de fuerza', -10, .5, 1); news(`${c.n} responde a tu demostración de fuerza movilizando sus tropas`, 'mil', z, 3); return { ok: false, msg: `${c.n} no se deja intimidar: responde movilizando` }; };
ACT.strat = a => { if (!P().nuke) return fail('Tu país no tiene capacidad estratégica'); const v = +a.v ? 1 : 0; S.war3.str = v; if (v) { repAdd('paz', -5); relAll(-3, 'Alerta estratégica', 'big'); news(`${P().n} eleva su alerta estratégica`, 'mil', S.player, 3); }
  return { msg: v ? 'Alerta estratégica: nadie se atreverá a llevar la tensión contigo hasta la guerra, pero el mundo te mira con miedo' : 'Postura estratégica normal' }; };
ACT.stratThreat = a => { const w = warById(+a.w), me = S.player; if (!P().nuke) return fail('Tu país no tiene capacidad estratégica'); if (!w || (w.att[0] !== me && w.def[0] !== me)) return fail('Solo en una guerra que lideras'); if (w.thr) return fail('Ya lanzaste esa amenaza en esta guerra');
  w.thr = 1; const foe = w.att[0] === me ? w.def[0] : w.att[0]; repAdd('paz', -25); repAdd('conf', -10); relAll(-10, 'Amenaza estratégica', 'big'); S.mkt.sent -= .08; S.war3.crimes++;
  let n = 0; for (const z of alive()) if (n < 5 && S.c[z].reg === 'dem' && S.c[z].gdp > 400 && rel(me, z) < 40 && addSanction(z, me)) n++;
  if (!S.c[foe].nuke ? chance(.7) : chance(.4)) { news(`${nm(foe)} cede ante la amenaza de ${P().n} y acepta la paz`, 'peace', foe, 3); endWar(w, 'actual'); return { msg: `${nm(foe)} se rinde a la amenaza. El precio político es enorme.` }; }
  if (S.c[foe].nuke) { globalCrisis(w); return { ok: false, msg: 'Crisis estratégica mundial: la ONU impone un alto el fuego' }; }
  return { ok: false, msg: `${nm(foe)} no cede. Has pagado el precio sin obtener nada.` }; };
function globalCrisis(w) { for (const z of alive()) S.c[z].stab = clamp(S.c[z].stab - 5, 0, 100); S.mkt.sent -= .15; S.mkt.shocks.push({ k: 'all', m: .85 }); repAdd('paz', -10); if (w && S.wars.includes(w)) { w.cf = S.turn + 4; }
  news('Crisis estratégica mundial: las bolsas se hunden y la ONU impone un alto el fuego', 'war', S.player, 3); }

/* ---- editor: guerra a voluntad ---- */
ACT.edWar = a => { const w = a.w != null ? warById(+a.w) : null, g = a.g != null ? S.army.find(x => x.id === +a.g) : null;
  switch (a.op) {
    case 'war': if (!S.c[a.a] || !S.c[a.b] || a.a === a.b) return fail('Elige dos países distintos'); return startWar(a.a, a.b) ? { silent: 1 } : fail('No pueden entrar en guerra');
    case 'peace': if (!w) return fail('Guerra inexistente'); endWar(w, 'blanca'); return { silent: 1 };
    case 'cf': if (!w) return fail('Guerra inexistente'); OPS.cf({ w: w.id, n: 3 }); return { silent: 1 };
    case 'score': if (!w) return fail('Guerra inexistente'); w.score = clamp(w.score + (+a.v || 0), -100, 100); return { silent: 1 };
    case 'mk': { if (!w || !thSide(w, a.iso)) return fail('Ese país no participa'); return mkGroup(a.iso, w, a.t || 'ej', clamp(+a.f || .3, .05, 1)) ? { silent: 1 } : fail('Sin unidades libres'); }
    case 'add': if (!g) return fail('Grupo inexistente'); { const c = S.c[g.o], cat = D.GTYPE[g.t].cat; for (const k in D.UNITS) if (D.UNITS[k].cat === cat && k !== 'abm') { const n = Math.max(1, Math.round((g.u[k] || 0) * .25)); if (!g.u[k] && k !== (cat === 'tierra' ? 'inf' : cat === 'aire' ? 'caz' : 'fra')) continue; g.u[k] = (g.u[k] || 0) + n; c.u[k] = (c.u[k] || 0) + n; } } return { silent: 1 };
    case 'del': if (!g) return fail('Grupo inexistente'); S.army.splice(S.army.indexOf(g), 1); return { silent: 1 };
    case 'sup': if (!g) return fail('Grupo inexistente'); g.sup = clamp(+a.v, 5, 100); return { silent: 1 };
    case 'mor': if (!g) return fail('Grupo inexistente'); g.mor = clamp(+a.v, 5, 100); return { silent: 1 };
    case 'move': if (!g || !rSt(a.k || '')) return fail('Destino inválido'); g.at = g.tgt = a.k; return { silent: 1 };
  } return fail('Operación desconocida'); };
