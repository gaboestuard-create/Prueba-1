/* =====================================================================
   SISTEMA · OCUPACIÓN Y RESTITUCIÓN + operaciones de guerra y gestos
   Lo que conquistas vive con miedo y rencor: insurgencia, coste y odio.
   Puedes devolver regiones (o la nación entera) por tratado: mejora la
   relación, pero los años de ocupación no se borran.
   ===================================================================== */
const occOf = iso => S.c[iso].terr.map((t, i) => [t, i]).filter(x => x[0].o === S.player);
const occList = () => ISOS.filter(z => z !== S.player && S.c[z].alive && occOf(z).length);
const annexedList = () => ISOS.filter(z => !S.c[z].alive && S.c[z].owner === S.player);
function setMod(a, b, label, v) { const L = S.mods[key(a, b)] || (S.mods[key(a, b)] = []), m = L.find(x => x.k === label); if (!v) { if (m) L.splice(L.indexOf(m), 1); return; } if (m) m.v = v; else L.push({ k: label, v, d: 0, g: 1 }); }
hook('new', () => { S.occ = {}; }); hook('load', () => { S.occ = S.occ || {}; });
hook('player', () => {
  const me = S.player, c = P();
  for (const z of occList()) {
    const n = occOf(z).length, pol = S.occ[z] || 'normal';
    setMod(me, z, 'Ocupas su territorio', -Math.min(45, (pol === 'blanda' ? 6 : 10) + n * (pol === 'dura' ? 5 : 4)));
    if (pol === 'blanda') c.tr -= c.gdp * .0003 * n; if (pol === 'dura') repAdd('dem', -.3);
    if (chance(Math.min(.5, .1 * n) * (pol === 'dura' ? .4 : pol === 'blanda' ? .6 : 1))) { const r = pick(occOf(z))[0]; casualties(me, .008); c.tr -= c.gdp * .0005; S.c[z].stab = clamp(S.c[z].stab - 1, 0, 100); news(`Insurgencia en ${r.n}: emboscada a tus tropas de ocupación en ${nm(z)}`, 'war', z, 2); why('Bajas en la ocupación', () => { secAdd('jov', -1); secAdd('mil', -.5); }); }
  }
  for (const z of ISOS) if (S.c[z].alive && z !== me && !occOf(z).length) setMod(me, z, 'Ocupas su territorio', 0);
  const an = annexedList(); if (an.length) { c.stab = clamp(c.stab - Math.min(.6, .15 * an.length), 0, 100); if (chance(Math.min(.35, .08 * an.length))) { const z = pick(an); news(`Disturbios nacionalistas en la antigua ${S.c[z].n}`, 'war', me, 2); casualties(me, .004); } }
});
/* devolver regiones por tratado: gesto (gratis), a cambio de no agresión o de una compensación */
ACT.returnTerr = a => {
  const iso = a.iso, me = S.player, v = S.c[iso]; if (!v || !v.alive) return fail('País inválido'); if (atWar(me, iso)) return fail('Primero firma la paz');
  const mine = occOf(iso), list = a.all ? mine : mine.filter(x => x[1] === +a.i); if (!list.length) return fail('No ocupas esa región');
  let val = 0; list.forEach(x => { val += (x[0].g || 0); restoreTerr(iso, x[1]); });
  const n = list.length, k = a.deal === 'pago' ? .5 : a.deal === 'pna' ? .8 : 1; let extra = '';
  if (a.deal === 'pna' && !hasExplicit('pna', me, iso)) { addTreaty('pna', me, iso); extra = ' a cambio de un pacto de no agresión'; }
  if (a.deal === 'pago') { const amt = Math.min(val * 1.5, Math.max(0, v.tr)); v.tr -= amt; P().tr += amt; extra = ` a cambio de ${money(amt)}`; }
  addMod(me, iso, 'Les devolviste su tierra', gain(Math.min(40, 10 * n) * k), .25); addMod(me, iso, 'Años de ocupación', -8, .2, 1);
  if (!occOf(iso).length) { setMod(me, iso, 'Ocupas su territorio', 0); delete S.occ[iso]; }
  repAdd('paz', 3 + n); repAdd('conf', 2); why(`Devolviste territorio a ${v.n}`, () => { secAdd('mil', -Math.min(10, 3 + n)); secAdd('rur', -2); secAdd('min', 2); secAdd('jov', 2); });
  news(`Tratado de restitución: ${P().n} devuelve ${n === 1 ? list[0][0].n : n + ' regiones'} a ${v.n}${extra}`, 'peace', iso, 3); Bus.emit('treaty', { t: 'terr', a: me, b: iso, name: 'Tratado de restitución' });
  return { msg: `Devuelves ${n} región${n > 1 ? 'es' : ''} a ${v.n}${extra}. Lo agradecen; no lo olvidan.` };
};
ACT.occPolicy = a => { if (!S.c[a.iso] || !occOf(a.iso).length || !['normal', 'dura', 'blanda'].includes(a.k)) return fail('Política inválida'); S.occ[a.iso] = a.k; return { msg: a.k === 'dura' ? 'Mano dura: menos insurgencia, más odio y peor imagen' : a.k === 'blanda' ? 'Reconstrucción: pagas por región, hay menos odio y menos insurgencia' : 'Ocupación sin política especial' }; };
/* resucitar una nación anexionada con su líder, partido y régimen de antes */
function revive(iso, ally) {
  const V = S.c[iso], t = V.owner, T = S.c[t], d = D.C[iso], g = Math.min(d.gdp * .6, T.gdp * .4); T.gdp -= g * .7; T.pop = Math.max(.01, T.pop - d.pop);
  Object.assign(V, { alive: true, owner: iso, gdp: g, pop: d.pop, stab: 42, stab0: d.stab, tr: g * .01, rec: Object.assign({}, d.rec), reg: d.reg, ideo: d.ideo, partido: d.partido, lider: { n: d.lider.n, verificado: d.lider.verificado, img: '' }, nextElec: d.reg === 'dem' || d.reg === 'hib' ? S.turn + ri(4, 12) : 0, cd: S.turn + 2 });
  const u = initUnits(d); for (const k in u) V.u[k] = Math.round(u[k] * .3); V.terr.forEach(x => { if (x.o === t) { x.o = iso; delete x.g; delete x.pp; delete x.k; } });
  addMod(t, iso, 'Años de ocupación', -40, .1, 1); if (ally && S.c[ally] && S.c[ally].alive) { addMod(ally, iso, 'Nos ayudaron a ser libres', 40, .1); addTreaty('ali', ally, iso); }
  S.res[iso] = 0; dirty(); Bus.emit('treaty', { t: 'terr', a: t, b: iso, name: `Independencia de ${V.n}` });
}
/* restaurar una nación anexionada por ti */
ACT.restore = a => {
  const iso = a.iso, me = S.player, V = S.c[iso]; if (!V || V.alive || V.owner !== me) return fail('Esa nación no está bajo tu dominio');
  revive(iso, a.ally ? me : null); addMod(me, iso, 'Les devolviste la independencia', gain(a.ally ? 25 : 38), .2);
  repAdd('paz', 10); repAdd('conf', 4); repAdd('gen', 5); why(`Restauraste ${V.n}`, () => { secAdd('mil', -8); secAdd('rur', -3); secAdd('jov', 4); secAdd('min', 4); });
  for (const z of alive()) if (z !== me && z !== iso && D.C[iso].bord.includes(z)) addMod(me, z, `Restauraste ${V.n}`, gain(6), .3);
  news(`${V.n} vuelve a existir: ${P().n} le devuelve la independencia${a.ally ? ' como aliado' : ''}`, 'peace', iso, 3);
  return { msg: `${V.n} renace${a.ally ? ' como aliado tuyo' : ''}. Agradecidos, con cicatrices.` };
};
/* ---- resistencia en las naciones anexionadas: crece sola, la financian los rivales del ocupante
   y, al llegar a 100, estalla un levantamiento que puede devolverles la independencia ---- */
hook('new', () => { S.res = {}; S.resF = {}; }); hook('load', () => { S.res = S.res || {}; S.resF = S.resF || {}; });
const annexedAll = () => ISOS.filter(z => !S.c[z].alive && S.c[z].owner !== z && S.c[z].owner !== S.player && S.c[S.c[z].owner] && S.c[S.c[z].owner].alive);
const resInfo = () => ISOS.filter(z => !S.c[z].alive && z !== S.player && S.c[S.c[z].owner] && S.c[S.c[z].owner].alive).map(z => ({ iso: z, owner: S.c[z].owner, res: Math.round(S.res[z] || 0), fund: (S.resF[z] || 0) > S.turn, sponsor: S.resF[z + ':by'] || null, known: !!S.resF[z + ':known'] }));
hook('late', () => {
  for (const r of resInfo()) { const z = r.iso, t = r.owner, T = S.c[t], old = S.res[z] || 0;
    let v = 1.5 + (T.stab < 40 ? 2 : 0) + (inWar(t) ? 2 : 0) + ((S.resF[z] || 0) > S.turn ? 4 : 0) - (isP(t) && (S.occ[z] === 'dura') ? 1.5 : 0) - (isP(t) && (S.occ[z] === 'blanda') ? .8 : 0);
    if (alive().some(y => y !== t && !isP(y) && S.c[y].gdp > 500 && rel(y, t) < -40)) v += 1; // un rival del ocupante la arma en secreto
    const now = Math.min(100, old + v * rr(.6, 1.4)); S.res[z] = now;
    if (old < 50 && now >= 50) news(`Crece la guerrilla en la antigua ${S.c[z].n}: atentados contra ${T.n}`, 'war', t, isP(t) || nb(S.player).includes(t) ? 2 : 1);
    if (isP(t) && now >= 50) { T.stab = clamp(T.stab - .5, 0, 100); casualties(t, .003); }
    if (now < 100) continue;
    const odds = clamp(.35 + (T.stab < 40 ? .2 : 0) + (inWar(t) ? .15 : 0) + ((S.resF[z] || 0) > S.turn ? .15 : 0), .15, .85), by = S.resF[z + ':by'];
    if (chance(odds)) { revive(z, by && S.c[by] && S.c[by].alive ? by : null); news(`¡${S.c[z].n} recupera su independencia! La resistencia expulsa a ${T.n}`, 'peace', z, 3);
      if (isP(t)) { repAdd('paz', -3); why(`Perdiste ${S.c[z].n}`, () => { secAdd('mil', -6); secAdd('all', -2); }); }
      if (isP(by)) { addMod(S.player, z, 'Financiaste nuestra libertad', gain(30), .1); repAdd('gen', 4); } }
    else { S.res[z] = 25; T.stab = clamp(T.stab - 3, 0, 100); news(`${T.n} aplasta un levantamiento en la antigua ${S.c[z].n}`, 'war', t, isP(t) ? 3 : 2); }
  }
});
/* la IA también arma guerrillas: contra ti y contra otros ocupantes */
hook('world', () => { const me = S.player;
  for (const r of resInfo()) { if (r.fund || r.owner === r.iso) continue; const z = r.iso, t = r.owner;
    const cand = alive().filter(y => y !== t && !isP(y) && S.c[y].gdp > 200 && rel(y, t) < -30 && !atWar(y, z)); if (!cand.length || !chance(isP(t) ? .18 : .1)) continue;
    const y = cand.sort((a, b) => rel(a, t) - rel(b, t) + (D.C[z].bord.includes(b) ? 25 : 0) - (D.C[z].bord.includes(a) ? 25 : 0))[0];
    S.resF[z] = S.turn + 6; S.resF[z + ':by'] = y; S.res[z] = Math.min(99, (S.res[z] || 0) + 10); delete S.resF[z + ':known'];
    if (!isP(t)) { if (S.c[t].gdp > 800 || nb(me).includes(t)) news(`Se acusa a ${nm(y)} de armar a la guerrilla de la antigua ${S.c[z].n}`, 'war', y, 1); continue; }
    if (chance(.3 + spyNet(y) * .2)) { S.resF[z + ':known'] = 1; addMod(me, y, 'Arma a la guerrilla en tu territorio', -10, .3, 1);
      pushPend({ k: 'offer', iso: y, t: `${nm(y)} arma a la guerrilla`, x: `Tu inteligencia confirma que ${S.c[y].lider.n} envía armas y dinero a la resistencia de la antigua ${S.c[z].n}. Si triunfa, nacerá un aliado suyo en tu territorio.`,
        opts: [{ t: 'Exigir que pare · 1 CP', req: { cp: 1 }, fx: [['cp', -1], ['do', 'stopFund', { iso: y, z }]] }, { t: 'Denunciarlo y sancionarlo', fx: [['do', 'mySanc', { iso: y }], ['rel', 'T', -10, 'Lo denunciaste por armar rebeldes'], ['rep', 'conf', 2]] }, { t: 'Redoblar la vigilancia', fx: [['$g', -.03], ['do', 'resCut', { z, v: 12 }]] }] }); }
    else news(`Llegan armas de origen desconocido a la guerrilla de la antigua ${S.c[z].n}`, 'war', me, 2); } });
OPS.stopFund = a => { if (power(S.player) > power(a.iso) * 1.2 || chance(.4)) { S.resF[a.z] = S.turn; news(`${nm(a.iso)} deja de armar a la guerrilla de la antigua ${nm(a.z)}`, 'dip', a.iso, 2); } else { addMod(S.player, a.iso, 'Les exigiste que pararan', -5, .5, 1); news(`${nm(a.iso)} niega todo y sigue armando a los rebeldes`, 'dip', a.iso, 2); } };
OPS.resCut = a => { S.res[a.z] = Math.max(0, (S.res[a.z] || 0) - a.v); };
ACT.fundRes = a => {
  const z = a.iso, V = S.c[z], me = S.player; if (!V || V.alive || V.owner === me || !S.c[V.owner] || !S.c[V.owner].alive) return fail('Esa nación no está ocupada por otro país');
  if ((S.resF[z] || 0) > S.turn) return fail('Ya financias esa resistencia'); const cost = Math.max(.3, D.C[z].gdp * .01); if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(1)) return fail('Necesitas 1 de capital político');
  P().tr -= cost; S.res[z] = Math.min(99, (S.res[z] || 0) + 15); S.resF[z] = S.turn + 6; S.resF[z + ':by'] = me;
  if (chance(.3)) { addMod(me, V.owner, 'Armas a los rebeldes', -20, .3, 1); news(`${nm(V.owner)} acusa a ${P().n} de armar a la guerrilla de ${V.n}`, 'dip', V.owner, 3); return { ok: false, msg: `Armas entregadas, pero ${nm(V.owner)} te ha descubierto` }; }
  return { msg: `Financias a la resistencia de ${V.n} durante 6 turnos` };
};
ACT.repress = a => { const z = a.iso, V = S.c[z]; if (!V || V.alive || V.owner !== S.player) return fail('No gobiernas esa nación'); if (!useCP(1)) return fail('Necesitas 1 de capital político'); const cost = Math.max(.3, D.C[z].gdp * .008); if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`);
  P().tr -= cost; S.res[z] = Math.max(0, (S.res[z] || 0) - 25); repAdd('dem', -3); repAdd('gen', -2); return { msg: `Redadas en la antigua ${V.n}: la resistencia retrocede` }; };
{ const c0 = condOk, t0 = pickTarget; condOk = q => c0(q) && (!q || !q.occupier || occList().length > 0); pickTarget = k => k === 'occupied' ? (occList().length ? pick(occList()) : null) : t0(k); }

/* ---- operaciones de guerra ---- */
ACT.warOp = a => {
  const w = warById(+a.w), me = S.player, O = D.WAROPS[a.k]; if (!w || !O || !(w.att.includes(me) || w.def.includes(me))) return fail('No participas en esa guerra');
  const att = w.att.includes(me), foe = att ? w.def[0] : w.att[0], F = S.c[foe], dir = att ? 1 : -1; w.ops = w.ops || {}; if (w.ops[a.k] === S.turn) return fail('Ya lo ordenaste este turno');
  if (a.k === 'bomb') { if (catPow(me, 'aire') < 10) return fail('No tienes aviación suficiente'); if (!useCP(O.cp)) return fail(`Necesitas ${O.cp} de capital político`); w.ops.bomb = S.turn; P().tr -= upkeep(me) * .4;
    for (const u in F.u) F.u[u] = Math.floor(F.u[u] * .95); F.stab = clamp(F.stab - 4, 0, 100); w.score = clamp(w.score + dir * 6, -100, 100); repAdd('paz', -3); repAdd('gen', -3); news(`${P().n} bombardea ${F.n}`, 'war', foe, 2); Bus.emit('battle', { a: me, d: foe }); return { msg: `Bombardeo sobre ${F.n}: pierde el 5% de sus fuerzas` }; }
  if (a.k === 'bloqueo') { if (D.C[foe].land) return fail(`${F.n} no tiene costa`); if (catPow(me, 'mar') <= catPow(foe, 'mar')) return fail('Su armada es igual o mayor que la tuya'); if (!useCP(O.cp)) return fail(`Necesitas ${O.cp} de capital político`); w.ops.bloqueo = S.turn;
    F.gdp *= .985; F.stab = clamp(F.stab - 2, 0, 100); w.score = clamp(w.score + dir * 3, -100, 100); if ((F.rec.pet || 0) >= 4) S.mkt.shocks.push({ k: 'pet', m: 1.08 }); news(`${P().n} bloquea los puertos de ${F.n}`, 'war', foe, 2); return { msg: `Bloqueo naval: la economía de ${F.n} se asfixia` }; }
  if (!useCP(O.cp)) return fail(`Necesitas ${O.cp} de capital político`); w.ops.ofensiva = S.turn; casualties(me, .03); warTurn(w); return { msg: 'Ofensiva general lanzada: mira el parte de guerra' };
};
/* ---- gestos diplomáticos ---- */
hook('player', () => { for (const z of ISOS) { const c = S.c[z]; if (c.cult && c.cult > S.turn && c.alive) addMod(S.player, z, 'Intercambio cultural', gain(1), .3); } });
ACT.gesture = a => {
  const iso = a.iso, me = S.player, e = dipCheck(iso), G = D.GESTURES[a.k]; if (e) return fail(e); if (!G) return fail('Gesto desconocido'); const c = C(iso);
  if (a.k === 'cultural') { if ((c.cult || 0) > S.turn) return fail('Ya hay un intercambio en marcha'); if (!canPay(.2)) return fail('Sin fondos'); P().tr -= .2; c.cult = S.turn + 6; addMod(me, iso, 'Intercambio cultural', gain(2), .3); return { msg: `Intercambio cultural con ${c.n}: +1 de relación por turno durante 6` }; }
  if ((c.ask.ges || 0) > S.turn) return fail(`Espera ${c.ask.ges - S.turn} turnos`); if (!useCP(G.cp)) return fail(`Necesitas ${G.cp} de capital político`); c.ask.ges = S.turn + 4;
  if (a.k === 'denuncia') { addMod(me, iso, 'Los denunciaste ante el mundo', -10, .4, 1); let n = 0; for (const z of alive()) if (z !== me && z !== iso && rel(z, iso) < -30) { addMod(me, z, 'Denunciaste a su rival', gain(4), .5); n++; } news(`${S.leader.n} denuncia a ${c.n} ante el mundo`, 'dip', iso, 2); return { msg: `Denuncia pública: ${n} de sus rivales lo aplauden` }; }
  const strong = canReach(me, iso) && power(me) > (power(iso) + .6 * sumPow(alliesOf(iso))) * 2;
  repAdd('paz', -6); for (const z of nb(me)) if (z !== iso) addMod(me, z, 'Tu ultimátum los inquieta', -3, .5);
  if (strong && c.per.agres < .65) { const amt = c.gdp * .008; c.tr -= amt; P().tr += amt; addMod(me, iso, 'Tributo bajo amenaza', -15, .3, 1); news(`${c.n} cede al ultimátum de ${P().n} y paga`, 'dip', iso, 3); return { msg: `${c.n} paga ${money(amt)}. Te odian un poco más.` }; }
  addMod(me, iso, 'Rechazaron tu ultimátum', -20, .3, 1); repAdd('conf', -3); news(`${c.n} desafía el ultimátum de ${P().n}`, 'dip', iso, 3); return { ok: false, msg: `${c.n} te desafía en público${strong ? '' : ': no te ven capaz de cumplir la amenaza'}` };
};
