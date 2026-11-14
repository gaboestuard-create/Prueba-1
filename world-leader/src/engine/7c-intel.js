/* =====================================================================
   SISTEMA · FASE 3 · AGENCIA DE INTELIGENCIA
   Presupuesto → nivel de la agencia (sube despacio). El nivel mejora el
   éxito de las operaciones, la certeza del panel de Inteligencia, el
   contraespionaje y quita la niebla de guerra sobre los ejércitos enemigos.
   ===================================================================== */
hook('new', () => { Object.assign(S.spy, { bud: 0, lvl: 0, seen: {} }); });
hook('load', () => { S.spy.bud = S.spy.bud || 0; S.spy.lvl = S.spy.lvl || 0; S.spy.seen = S.spy.seen || {}; });
ACT.agency = a => { const v = +a.v; if (![0, 1, 2, 3].includes(v)) return fail('Presupuesto inválido'); S.spy.bud = v; return { msg: `${D.AGENCY.n[v]}: ${money(P().gdp * D.AGENCY.cost[v])} por turno` }; };
hook('finance', f => { const c = D.AGENCY.cost[S.spy.bud || 0]; if (c) f.exp.spy = P().gdp * c; });
hook('player', () => { S.spy.lvl += ((S.spy.bud || 0) * 1.6 - S.spy.lvl) * .15; });
{ const m0 = mod; mod = k => m0(k) + (k === 'spy' && S.spy ? (S.spy.lvl || 0) * .3 : 0); }
/* contraespionaje: cuanto mejor tu agencia, más redes enemigas caen */
hook('world', () => { const L = S.spy.lvl || 0; if (L < .5 || !chance(L * .05)) return; const z = pick(alive().filter(z => z !== S.player && rel(S.player, z) < 0 && S.c[z].gdp > 100)); if (!z) return;
  addMod(S.player, z, 'Red de espionaje desarticulada', -5, .5, 1); repAdd('conf', 1); P().stab = clamp(P().stab + 1, 0, 100); news(`Tu contraespionaje desarticula una red de ${nm(z)}`, 'dip', z, 2); });
/* niebla de guerra: sin buenos espías, las cifras enemigas llegan con error */
const knows = iso => isP(iso) || spyNet(iso) >= 2 || (S.spy.seen[iso] || 0) > S.turn || (S.spy.lvl || 0) >= 4.2;
const fogK = (iso, salt) => knows(iso) ? 1 : 1 + (thHash(iso + ':' + S.turn + ':' + salt) - .5) * 2 * Math.max(.08, .45 - .1 * spyNet(iso) - .06 * (S.spy.lvl || 0));
/* operaciones nuevas (las antiguas siguen en 65-tech-spy.js) */
const NEWOPS = {
  mil: (iso, c) => { S.spy.seen[iso] = S.turn + 8; return `Ves las fuerzas de ${c.n} sin niebla de guerra durante 8 turnos`; },
  eco: (iso, c) => { S.tech.pts += 8; techCheck(); let x = ''; if (S.disc && S.disc.cur && hasD(iso, S.disc.cur)) { pushProg(S.player, S.disc.cur, discCost(S.disc.cur) * .2); x = ` y +20% en ${DS[S.disc.cur].n}`; } return `Planes de ${c.n}: +8 puntos de investigación${x}. Su caja: ${money(c.tr)}`; },
  cib: (iso, c) => { for (const g of S.army) if (g.o === iso) g.sup = Math.max(5, g.sup - 25); c.gdp *= .99; if (!inWar(iso)) c.stab = clamp(c.stab - 2, 0, 100); news(`Un ciberataque paraliza redes de ${c.n}`, 'world', iso, 2); return `Ciberataque en ${c.n}: su suministro y su economía caen`; },
  fil: (iso, c) => { c.stab = clamp(c.stab - 6, 0, 100); for (const z of alliesOf(iso)) if (!isP(z)) addMod(iso, z, 'Filtración', -8, .3); news(`Una filtración sacude al gobierno de ${c.n}`, 'pol', iso, 2); return `La filtración sacude a ${c.n}: −6 de estabilidad y socios molestos`; },
  opo: (iso, c) => { if (c.reg === 'dem' || c.reg === 'hib') { c.nextElec = S.turn + 1; c.stab = clamp(c.stab - 4, 0, 100); return `${c.n} adelanta sus elecciones: tu dinero ya trabaja para la oposición`; }
    c.stab = clamp(c.stab - 8, 0, 100); news(`Protestas masivas contra el gobierno de ${c.n}`, 'pol', iso, 2); return `Protestas contra el gobierno de ${c.n}: −8 de estabilidad`; }
};
{ const s0 = ACT.spy; ACT.spy = a => {
  if (!NEWOPS[a.op]) return s0(a); const iso = a.iso, op = D.SPYOPS[a.op], me = S.player; if (!op || !S.c[iso] || !S.c[iso].alive || iso === me) return fail('Operación inválida');
  const c = C(iso), cost = spyCost(iso, a.op); if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(op.cp)) return fail(`Necesitas ${op.cp} de capital político`); P().tr -= cost;
  if (chance(spyOdds(iso, a.op))) return { msg: NEWOPS[a.op](iso, c) };
  if (chance(op.risk * (1 - (S.spy.lvl || 0) * .06))) { S.spy.net[iso] = 0; addMod(me, iso, 'Operación encubierta descubierta', -25, .3, 1); repAdd('conf', -6);
    for (const z of alliesOf(iso)) if (z !== me) addMod(me, z, 'Espiaste a su aliado', -5, .5, 1); news(`${c.n} desmantela una red de espionaje de ${P().n}`, 'dip', iso, 3); return { ok: false, msg: `Descubiertos: ${c.n} desmantela tu red y lo hace público` }; }
  return { ok: false, msg: `La operación en ${c.n} fracasa, pero nadie la relaciona contigo` }; }; }
/* alertas de guerra en el panel de alertas y en el resumen del turno */
{ const a0 = alerts; alerts = () => { const out = a0(), add = (p, t, panel, tab) => out.push({ p, t, panel, tab }), me = S.player;
  for (const g of grpOf(me)) { if (g.sup < 30) add(4, `${g.n}: suministro crítico (${Math.round(g.sup)}%)`, 'mil', 'tea'); else if (g.mor < 30) add(3, `${g.n}: moral por los suelos (${Math.round(g.mor)})`, 'mil', 'tea'); }
  for (const w of warsOf(me)) { if ((w.cf || 0) > S.turn && w.cf - S.turn <= 1) add(3, 'El alto el fuego termina el próximo turno', 'mil', 'tea');
    const s = thSide(w, me), th = thFront(w, thOther(s), 4), inc = S.army.filter(g => g.w === w.id && !isP(g.o) && thSide(w, g.o) !== s && th.includes(g.tgt) && ['atk', 'adv', 'lnd'].includes(g.ord) && (knows(g.o) || thHash(g.id + 'a' + S.turn) < .5));
    if (inc.length) add(4, `Inteligencia: ${nm(inc[0].o)} prepara un ataque sobre ${rSt(inc[0].tgt).n}`, 'mil', 'tea'); }
  if (warsOf(me).length) { const n = warNeeds(grpOf(me)); for (const r of ['pet', 'hie', 'tri']) if (n[r] > .05 && (P().stock[r] || 0) < n[r] * 2) add(3, `Reservas de ${D.COMMODITIES[r].n.toLowerCase()} para el frente: menos de 2 turnos (se importan si hay dinero y no hay bloqueo)`, 'mil', 'log'); }
  if (S.war3.crimes) add(2, `${S.war3.crimes} denuncia${S.war3.crimes > 1 ? 's' : ''} de crímenes de guerra contra tus fuerzas`, 'mil', 'est');
  return out.sort((x, y) => y.p - x.p); }; }
