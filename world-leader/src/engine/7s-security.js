/* =====================================================================
   SISTEMA · SEGURIDAD NACIONAL
   1) Inteligencia interna: vigilancia (0-2), director con lealtad,
      operaciones dentro del país (cárteles, espías, corrupción).
   2) Ramas militares (Ejército, Armada, Fuerza Aérea): jefe, lealtad,
      moral y modernización. La moral y la modernización cambian tu poder;
      la lealtad baja trae ruido de sables.
   3) Interior resumido de cada país de la IA (seguridad, corrupción,
      cohesión): pesa en su crecimiento y en sus decisiones de guerra,
      tratados y ayudas.
   Datos en src/data-security.js.
   ===================================================================== */
const SI = D.SECINT, BRK = Object.keys(D.BRANCH), BR = D.BR, AI5 = D.AINT;
const mkChief = (k, r) => ({ n: D.BRANCH[k].chief + ' ' + genLeader(S.player), pseed: ri(0, 96), loy: ri(...(r || BR.loy)) });
const mkDir = () => ({ n: genLeader(S.player), pseed: ri(0, 96), loy: ri(...SI.dir.loy), comp: ri(...SI.dir.comp) });
function secInit() { S.sint = { surv: 0, dir: mkDir(), cd: 0 }; S.mb = {}; for (const k of BRK) S.mb[k] = Object.assign(mkChief(k), { mor: ri(...BR.start), mod: 0, modT: 0 }); }
/* interior de la IA: punto de partida por renta y régimen */
function aiNiNew(z) { const c = S.c[z], gpc = c.gdp / Math.max(.001, c.pop), k = clamp((Math.log10(Math.max(1, gpc)) - .3) / 1.5, 0, 1), dem = c.reg === 'dem' ? 6 : 0;
  return { seg: Math.round(38 + 34 * k + (D.NAT.cart.narco.includes(z) ? -10 : 0)), cor: Math.round(62 - 40 * k - dem), coh: Math.round(48 + 14 * k) }; }
const aiNiAll = () => { for (const z of ISOS) if (S.c[z] && !isP(z)) S.c[z].ni = S.c[z].ni || aiNiNew(z); };
hook('new', () => { secInit(); aiNiAll(); });
hook('load', () => { if (!S.sint) S.sint = { surv: 0, dir: mkDir(), cd: 0 }; if (!S.mb) { S.mb = {}; } for (const k of BRK) if (!S.mb[k]) S.mb[k] = Object.assign(mkChief(k), { mor: 60, mod: 0, modT: 0 }); aiNiAll(); });
/* ---- inteligencia interna ---- */
{ const w0 = natWhy; natWhy = x => { const w = w0(x), v = S.sint ? (SI.surv.ix[x] || 0) * S.sint.surv : 0; if (v) { w.target = clamp(w.target + v, 0, 100); w.why.push([v, 'Vigilancia interna']); } return w; }; }
hook('finance', f => { if (S.sint && S.sint.surv) f.exp.vig = P().gdp * SI.surv.cost * S.sint.surv; });
const secPend = (k, sub) => { const E = D.SEC_EV[k], f = s => s.split('{N}').join(sub.N || ''); pushPend({ k: 'event', id: 'security', t: f(E.t), x: f(E.x), iso: S.player, opts: E.opts.map(o => ({ t: o.t, fx: o.fx.concat([['do', 'secMod', Object.assign({ br: sub.br }, o.sx)]]) })) }); };
OPS.secMod = a => { const I = S.sint; if (a.surv != null) I.surv = a.surv; if (a.dir) I.dir = mkDir(); if (a.loy && !a.br) I.dir.loy = clamp(I.dir.loy + a.loy, 0, 100);
  if (S.nat) natMod({ ix: { ins: a.ins || 0, cor: a.cor || 0 } });
  for (const k of BRK) { const b = S.mb[k]; if (a.purge) Object.assign(b, mkChief(k, [60, 85]), { mor: clamp(b.mor - 10, 0, 100) }); else if (a.br) { b.loy = clamp(b.loy + (a.loy || 0), 0, 100); b.mor = clamp(b.mor + (a.mor || 0), 0, 100); } } };
ACT.secSurv = a => { const v = +a.v; if (![0, 1, 2].includes(v)) return fail('Nivel inválido'); S.sint.surv = v; return { msg: SI.surv.n[v] }; };
ACT.secDir = () => { if (!useCP(SI.dir.replaceCp)) return fail(`Necesitas ${SI.dir.replaceCp} de capital político`); S.sint.dir = mkDir(); return { msg: `Nuevo director de inteligencia: ${S.sint.dir.n}` }; };
ACT.secOp = a => { const O = SI.ops[a.k], I = S.sint; if (!O) return fail('Operación desconocida'); if (I.cd > S.turn) return fail(`La agencia está ocupada: espera ${I.cd - S.turn} turnos`);
  const k = a.k === 'inf' ? S.nat.cart.find(x => x.id === +a.id) : null; if (a.k === 'inf' && !k) return fail('Elige un cártel'); if (!useCP(O.cp)) return fail(`Necesitas ${O.cp} de capital político`);
  I.cd = S.turn + SI.opCd; const p = O.p + O.pLvl * (S.spy.lvl || 0) + (I.dir.comp - 50) / 250, ok = chance(clamp(p, .05, .9));
  if (a.k === 'inf') { if (ok) { k.str = clamp(k.str + O.str, 0, 100); k.cash *= O.cash; news(`Golpe de inteligencia: agentes infiltrados desmantelan la cúpula de ${k.n}`, 'pol', S.player, 3); return { msg: `Infiltración con éxito: ${k.n} queda con fuerza ${Math.round(k.str)}` }; }
    natMod({ ix: { seg: -2 } }); news(`${k.n} descubre y ejecuta a agentes encubiertos`, 'pol', S.player, 2); return { ok: false, msg: 'La infiltración fracasa: perdiste a tus agentes' }; }
  if (a.k === 'caza') { if (ok) { const z = pick(alive().filter(z => z !== S.player && rel(S.player, z) < 0 && S.c[z].gdp > 80)); repAdd('conf', 2); natMod({ ix: { ins: 3 } }); if (z) addMod(S.player, z, 'Expulsaste a sus espías', -4, .5, 1); news(`La agencia desarticula una red de espionaje${z ? ' de ' + nm(z) : ''}`, 'dip', z || S.player, 2); return { msg: 'Red de espías desarticulada' }; }
    return { ok: false, msg: 'No encontraron nada esta vez' }; }
  if (ok) { natMod({ ix: { cor: O.cor, ins: 2 } }); if (chance(.3)) { secAdd('all', -2); news('La investigación anticorrupción salpica a cargos de tu partido', 'pol', S.player, 2); return { msg: 'Corrupción destapada… incluso en tu partido' }; } return { msg: 'Expedientes abiertos: baja la corrupción' }; }
  return { ok: false, msg: 'La investigación no prospera' }; };
/* ---- ramas militares ---- */
const brTarget = k => { const b = S.mb[k]; let v = 50 + (S.pol.sec.mil.a - 50) * .5; for (const id in S.pol.laws) v += BR.law[id] || 0;
  if (k === 'tierra' && S.nat) v += Object.keys(S.nat.army).length * BR.streets; if (inWar(S.player)) v += BR.atWar; return clamp(v + (b.loy - 50) * .1, 0, 100); };
ACT.brMod = a => { const b = S.mb[a.k], c = P(); if (!b) return fail('Rama desconocida'); if (b.modT > S.turn) return fail('Ya está en plena modernización'); if (b.mod >= BR.modMax) return fail('Ya está al máximo');
  const g = c.gdp * BR.modGdp; if (!canPay(g)) return fail(`Necesitas ${money(g)}`); c.tr -= g; b.modT = S.turn + BR.modTurns; return { msg: `${D.BRANCH[a.k].n}: modernización en marcha (${BR.modTurns} turnos)` }; };
ACT.brChief = a => { const b = S.mb[a.k]; if (!b) return fail('Rama desconocida'); if (!useCP(BR.chiefCp)) return fail(`Necesitas ${BR.chiefCp} de capital político`);
  Object.assign(b, mkChief(a.k), { mor: clamp(b.mor - 5, 0, 100) }); return { msg: `Nuevo jefe de ${D.BRANCH[a.k].n}: ${b.n}` }; };
const brFactor = k => { const b = S.mb[k]; return 1 - BR.k + b.mor / 100 * 2 * BR.k + b.mod * BR.mod; };
{ const p0 = power; power = iso => { const v = p0(iso); if (!S || !S.mb || iso !== S.player) return v; let raw = 0, f = 0; for (const k of BRK) { const x = catPow(iso, k); raw += x; f += x * brFactor(k); } return raw ? v * f / raw : v; }; }
{ const e0 = endWar; endWar = (w, kind) => { const me = S.player, mine = S.mb && (w.att.includes(me) || w.def.includes(me)), sc = mine ? (w.att.includes(me) ? w.score : -w.score) : 0, r = e0(w, kind);
  if (mine) for (const k of BRK) S.mb[k].mor = clamp(S.mb[k].mor + (sc >= 25 ? BR.warWin : sc <= -25 ? BR.warLose : 0), 0, 100); return r; }; }
hook('player', () => { const I = S.sint, c = P(); if (!I || !S.mb) return;
  for (const k of BRK) { const b = S.mb[k]; b.mor = clamp(b.mor + (brTarget(k) - b.mor) * BR.drift, 0, 100); b.loy = clamp(b.loy + (S.pol.sec.mil.a - b.loy) * .03 + rr(-1, 1), 0, 100);
    if (b.modT && b.modT <= S.turn) { b.mod++; b.modT = 0; news(`${D.BRANCH[k].n} completa su modernización (nivel ${b.mod})`, 'mil', S.player, 2); } }
  I.dir.loy = clamp(I.dir.loy + (approval() - 50) * .02 + rr(-1, 1), 0, 100);
  if (S.pend.length > 1) return;
  if (I.surv && chance(SI.surv.scandalP * I.surv)) return secPend('espionaje', {});
  if (I.surv && I.dir.loy < SI.dir.blackmailAt && chance(SI.dir.blackmailP)) return secPend('chantaje', { N: I.dir.n });
  const low = BRK.map(k => S.mb[k]).sort((a, b) => a.loy - b.loy)[0]; if (low.loy < BR.coupAt && c.stab < BR.coupStab && chance(BR.coupP)) secPend('sables', { N: low.n, br: 1 }); });
/* ---- interior de la IA ---- */
hook('world', () => { if (S.turn % AI5.every) return; const sancOn = {}; for (const s of S.sanc) sancOn[s.on] = (sancOn[s.on] || 0) + 1;
  for (const z of alive()) { if (isP(z)) continue; const c = S.c[z], n = c.ni || (c.ni = aiNiNew(z)), b = aiNiNew(z), war = inWar(z) ? 1 : 0, sn = Math.min(3, sancOn[z] || 0);
    const t = { seg: b.seg + (c.stab - 50) * .3 + war * AI5.war.seg, cor: b.cor, coh: b.coh + (c.stab - 50) * .4 + war * AI5.war.coh + sn * AI5.sanc.coh };
    for (const x in t) n[x] = Math.round(clamp(n[x] + (t[x] - n[x]) * AI5.k + rr(-2, 2), 0, 100));
    c.stab = clamp(c.stab + ((n.coh - 50) + (n.seg - 50)) * AI5.effStab, 0, 100); } });
{ const g0 = growthOf; growthOf = iso => { const g = g0(iso), n = S.c[iso] && S.c[iso].ni; if (!n || isP(iso)) return g; return g + clamp(((50 - n.cor) + (n.seg - 50)) * AI5.effGrow, -AI5.growCap, AI5.growCap); }; }
const aiWeak = z => { const n = S.c[z].ni; return !!n && (n.coh < AI5.weakCoh || n.seg < AI5.weakSeg); };
/* un gobierno con el país roto por dentro casi nunca abre un frente exterior */
{ const c0 = considerWar; considerWar = iso => { if (aiWeak(iso) && chance(AI5.warSkip)) return; return c0(iso); }; }
{ const t0 = treatyEval; treatyEval = (type, iso) => { const r = t0(type, iso), n = S.c[iso] && S.c[iso].ni; if (!n) return r; const T = AI5.treaty, add = (v, t) => { r.score += v; r.odds += v; r.reasons.push([t, v]); };
  if (n.cor > T.cor[0]) add(T.cor[1], T.cor[2]); if ((type === 'ali' || type === 'def') && n.coh < T.coh[0]) add(T.coh[1], T.coh[2]); if ((type === 'ali' || type === 'def') && n.seg < T.seg[0]) add(T.seg[1], T.seg[2]); return r; }; }
{ const a0 = ACT.giveAid; ACT.giveAid = a => { const r = a0(a); if (r && r.ok !== false && S.c[a.iso] && aiWeak(a.iso)) { addMod(S.player, a.iso, 'Los ayudaste en plena crisis interna', AI5.aidBonus, .5); r.msg += ' (en plena crisis interna: lo agradecen más)'; } return r; }; }
{ const a0 = ACT.askAid; ACT.askAid = a => { const c = S.c[a.iso]; if (c && c.ni && a.kind !== 'mat' && c.ni.coh < AI5.askCoh) return fail(`${c.n} no puede: su propia crisis interna se lo impide`); return a0(a); }; }
Object.assign(FREE, { secSurv: 1 });
const aiNi = z => S.c[z] && S.c[z].ni ? Object.assign({}, S.c[z].ni) : null;
function secInfo() { const I = S.sint; if (!I) return null; return { surv: I.surv, dir: Object.assign({}, I.dir), cd: Math.max(0, I.cd - S.turn), lvl: S.spy.lvl || 0,
  br: Object.fromEntries(BRK.map(k => { const b = S.mb[k]; return [k, Object.assign({}, b, { pow: catPow(S.player, k), f: brFactor(k), t: brTarget(k), modIn: b.modT > S.turn ? b.modT - S.turn : 0 })]; })) }; }
