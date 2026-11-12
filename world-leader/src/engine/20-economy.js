/* =====================================================================
   SISTEMA · ECONOMÍA: presupuesto, materias primas, comercio y bolsa
   Dinero en miles de millones de $ (mM). 1 turno = 1 trimestre.
   ===================================================================== */

/* flujo de materias primas del jugador por turno */
function resFlow() {
  const c = P(), out = {};
  for (const k in D.COMMODITIES) {
    const prod = regionProd(k) * (1 + lawSum('prodMul'));
    const cons = k === 'pet' ? c.gdp / 400 * (1 - lawSum('oilSave')) : k === 'gas' ? c.gdp / 800 : k === 'tri' ? Math.sqrt(c.pop * c.gdp) / 150 : 0;
    const exp = S.contracts.filter(x => x.com === k).reduce((s, x) => s + x.q, 0);
    out[k] = { prod, cons, exp, net: prod - cons - exp, stock: (c.stock && c.stock[k]) || 0, reserve: cons * 4 + 5 };
  }
  return out;
}
function tradeIncome() {
  const me = S.player, g = P().gdp; let v = 0, n = 0;
  for (const b of ISOS) if (b !== me && S.c[b].alive && hasT('com', me, b) && !IX().sp[key(me, b)] && !atWar(me, b)) { v += .0015 * Math.sqrt(g * S.c[b].gdp); n++; }
  return { v: v * Math.max(.2, 1 + mod('tradeInc') + lawSum('trade')), n };
}
const portValue = () => Object.keys(S.port).reduce((s, id) => s + S.port[id].q * S.mkt.co[id].p, 0);
const taxRate = () => clamp(S.pol.tax + lawSum('tax') / 100, .08, .45);

/* Presupuesto del turno. dry=true solo calcula (para la UI); dry=false lo aplica. */
function finance(dry) {
  const c = P(), inc = {}, exp = {}, war = inWar(S.player);
  inc.imp = c.gdp * taxRate() / 4 * (.8 + c.stab / 500) * (1 + mod('income'));
  inc.com = tradeIncome().v;
  inc.div = Object.keys(S.port).reduce((s, id) => s + S.port[id].q * S.mkt.co[id].p * CO[id].y / 400, 0) * (1 + mod('divid'));
  if (mod('graft')) inc.res = c.gdp * .0012;
  exp.pub = c.gdp * S.pol.spend / 4;
  exp.ley = c.gdp * lawSum('cost') / 400;
  exp.mil = upkeep(S.player) * (war ? 1.5 : 1);
  exp.int = c.tr < 0 ? -c.tr * .03 : 0;
  // materias primas: contratos, importación automática del déficit y venta del excedente
  const f = resFlow(); let imp = 0, mat = 0, con = 0, short = 0;
  for (const k in f) {
    let st = f[k].stock + f[k].prod - f[k].cons; const m = S.mkt.com[k];
    for (const x of S.contracts) if (x.com === k) {
      const q = Math.min(x.q, Math.max(0, st)); st -= q; con += q * x.p;
      if (!dry) { x.left--; if (q < x.q) addMod(S.player, x.to, 'Incumpliste un contrato de suministro', -6, .5, 1); }
    }
    if (st < 0) { if (canPay(imp - st * m.p * 1.08)) imp += -st * m.p * 1.08; else if (k === 'pet') short = 1; st = 0; }
    else if (S.auto && st > f[k].reserve) { mat += (st - f[k].reserve) * m.p * .95; st = f[k].reserve; }
    if (!dry) c.stock[k] = st;
  }
  inc.mat = mat; inc.con = con; exp.imp = imp;
  let ti = 0, te = 0; for (const k in inc) ti += inc[k]; for (const k in exp) te += exp[k];
  const fin = { inc, exp, ti, te, net: ti - te };
  if (!dry) {
    c.tr += fin.net; S.flags.oilShort = short;
    S.contracts = S.contracts.filter(x => { if (x.left > 0) return true; news(`Termina tu contrato de ${D.COMMODITIES[x.com].n.toLowerCase()} con ${nm(x.to)}`, 'eco', x.to); return false; });
  }
  return fin;
}

/* crecimiento del PIB (pp por turno) */
function growthOf(iso) {
  const c = C(iso), gpc = c.gdp / Math.max(.001, c.pop);
  let g = gpc < 5 ? 1 : gpc < 15 ? .8 : gpc < 35 ? .5 : .35;
  let s = 0; for (const x of S.sanc) if (x.on === iso && S.c[x.by].alive) s += .25 * clamp(S.c[x.by].gdp / c.gdp, .05, 1.5);
  g -= Math.min(1.2, s);
  if (inWar(iso)) g -= .6; if (c.stab < 30) g -= .4;
  if (isP(iso)) {
    g += mod('growth') + lawSum('grow') + Math.min(.3, tradeIncome().n * .03) - (S.flags.oilShort ? .3 : 0) - (c.tr < -c.gdp * .2 ? .2 : 0);
    for (const m of S.gm) g += m.v;
  }
  return g;
}

/* ---- bolsa y materias primas ---- */
function marketTurn() {
  const M = S.mkt; M.sent = M.sent * .6 + rr(-.015, .015);
  for (const k in M.com) {
    const m = M.com[k], d = D.COMMODITIES[k]; let f = 1 + .1 * (d.p - m.p) / d.p + rr(-d.vol, d.vol);
    for (const s of M.shocks) if (s.k === k) f *= s.m;
    m.p = clamp(m.p * f, d.p * .3, d.p * 4); m.h.push(+m.p.toFixed(3)); if (m.h.length > 24) m.h.shift();
  }
  for (const id in M.co) {
    const m = M.co[id], d = CO[id], home = ownerOf(d.home), h = S.c[home];
    let f = 1.008 + M.sent + rr(-.06, .06) + (h.stab - 55) / 2500;
    if (inWar(home)) f += d.sec === 'def' ? .03 : -.04;
    f -= Math.min(.05, S.sanc.filter(x => x.on === home).length * .01);
    for (const s of M.shocks) if (s.k === d.sec || s.k === 'all' || (s.k === 'home' && home === S.player)) f *= s.m;
    m.p = Math.max(d.p * .05, m.p * f); m.h.push(+m.p.toFixed(2)); if (m.h.length > 24) m.h.shift();
  }
  M.shocks = [];
}

const fee = () => mod('fee') ? 0 : .01;
ACT.buyStock = a => {
  const m = S.mkt.co[a.id], amt = +a.amt; if (!m || !(amt > 0)) return fail('Orden inválida');
  if (!canPay(amt)) return fail('No tienes fondos suficientes');
  if (IX().sp[key(S.player, ownerOf(CO[a.id].home))]) return fail('Las sanciones bloquean esa inversión');
  P().tr -= amt; const p = S.port[a.id] || (S.port[a.id] = { q: 0, c: 0 }); p.q += amt * (1 - fee()) / m.p; p.c += amt;
  return { msg: `Inviertes ${money(amt)} en ${CO[a.id].n}` };
};
ACT.sellStock = a => {
  const p = S.port[a.id], m = S.mkt.co[a.id]; if (!p || !m) return fail('No tienes esa posición');
  const fr = clamp(+a.frac || 1, .01, 1), v = p.q * fr * m.p * (1 - fee()), gain = v - p.c * fr;
  P().tr += v; p.q *= 1 - fr; p.c *= 1 - fr; if (p.q < 1e-6) delete S.port[a.id];
  return { msg: `Vendes ${CO[a.id].n} por ${money(v)} (${gain >= 0 ? 'ganancia' : 'pérdida'} ${money(Math.abs(gain))})` };
};
ACT.buyCom = a => {
  const m = S.mkt.com[a.k], q = +a.q; if (!m || !(q > 0)) return fail('Orden inválida');
  const cost = q * m.p * 1.03; if (!canPay(cost)) return fail('No tienes fondos suficientes');
  P().tr -= cost; P().stock[a.k] = (P().stock[a.k] || 0) + q; m.p *= 1 + q * .002;
  return { msg: `Compras ${q} u de ${D.COMMODITIES[a.k].n.toLowerCase()} por ${money(cost)}` };
};
ACT.sellCom = a => {
  const m = S.mkt.com[a.k], q = Math.min(+a.q, P().stock[a.k] || 0); if (!m || !(q > 0)) return fail('No tienes existencias');
  const v = q * m.p * .97; P().tr += v; P().stock[a.k] -= q; m.p *= Math.max(.7, 1 - q * .002);
  return { msg: `Vendes ${Math.round(q)} u de ${D.COMMODITIES[a.k].n.toLowerCase()} por ${money(v)}` };
};
ACT.setAuto = a => { S.auto = !!a.on; return { msg: S.auto ? 'El excedente se exportará automáticamente' : 'Acumularás el excedente en reservas' }; };
/* contrato de exportación: precio fijo +10% durante 8 turnos, mejora la relación; incumplirlo la daña */
ACT.contract = a => {
  const k = a.k, q = +a.q, to = a.iso, me = S.player;
  if (!D.COMMODITIES[k] || !(q > 0) || !S.c[to] || !S.c[to].alive || to === me) return fail('Contrato inválido');
  if (rel(me, to) < 0) return fail(`${nm(to)} no firma contratos contigo: la relación es negativa`);
  if (IX().sp[key(me, to)]) return fail('Hay sanciones entre ambos países');
  if ((S.c[to].rec[k] || 0) >= 3) return fail(`${nm(to)} ya produce de sobra ese recurso`);
  if (resFlow()[k].net < q) return fail('No produces excedente suficiente para garantizar el suministro');
  if (S.contracts.length >= 8) return fail('Ya tienes el máximo de contratos');
  S.contracts.push({ to, com: k, q, p: +(S.mkt.com[k].p * 1.1).toFixed(3), left: 8 });
  addMod(me, to, 'Contrato de suministro', 5 * (1 + mod('relGain')), .5);
  Bus.emit('route', { a: me, b: to });
  return { msg: `Contrato firmado: ${q} u/turno de ${D.COMMODITIES[k].n.toLowerCase()} a ${nm(to)} durante 8 turnos` };
};
ACT.cancelContract = a => {
  const x = S.contracts[a.i]; if (!x) return fail('Contrato inexistente');
  S.contracts.splice(a.i, 1); addMod(S.player, x.to, 'Cancelaste un contrato', -8, .5, 1); repAdd('conf', -2);
  return { msg: `Cancelas el contrato con ${nm(x.to)}: lo recordarán` };
};
