/* =====================================================================
   SISTEMA · MUNDO VIVO (pulido)
   Los países tienen vida propia aunque no los mires: aprueban leyes,
   entran en recesión o crecen, sus líderes hablan de ti, firman y viajan
   (se ve en el globo) y te buscan con propuestas nuevas.
   ===================================================================== */
const AIQ = ['Huelga general en {X}', 'Masivas protestas contra el gobierno de {X}', 'Dimite el ministro de Economía de {X}', '{X} sufre un apagón nacional', 'Escándalo de corrupción sacude al gobierno de {X}'];
hook('world', () => {
  const me = S.player, al = alive().filter(z => z !== me), big = al.filter(z => S.c[z].gdp > 150), noisy = z => z && (nb(me).includes(z) || S.c[z].gdp > 900 || rel(me, z) < -40 || rel(me, z) > 50);
  // 1) leyes en otros países, coherentes con su ideología (pequeños efectos reales)
  for (let i = 0; i < 2; i++) { const z = pick(big); if (!z) break; const c = S.c[z], l = pick(D.LAWS.filter(x => !x.build && Math.sign(x.eco || 0) === Math.sign(c.ideo || 0) && (c.reg === 'dem' || (x.auth || 0) >= 0))); if (!l) continue;
    c.laws = c.laws || []; if (c.laws.includes(l.id)) continue; c.laws.push(l.id); if (c.laws.length > 8) c.laws.shift();
    c.gdp *= 1 + ((l.per || {}).grow || 0) / 100; c.stab = clamp(c.stab + ((l.per || {}).stab || 0) * .5 - (l.auth > 0 && c.reg === 'dem' ? 2 : 0), 0, 100);
    news(`${c.n} aprueba: ${l.n}`, 'pol', z, noisy(z) ? 2 : 1); }
  // 2) economía de los demás: recesiones y milagros que se notan
  for (const z of big) { const c = S.c[z], g = c.g0 ? (c.gdp / c.g0 - 1) * 100 : 0; c.g0 = c.gdp; if (!noisy(z)) continue;
    if (g < -1.2 && chance(.5)) news(`${c.n} entra en recesión (${g.toFixed(1)}% en el trimestre)`, 'eco', z, 2); else if (g > 2.2 && chance(.4)) news(`${c.n} crece un ${g.toFixed(1)}% en un trimestre`, 'eco', z); }
  // 3) inestabilidad interna visible
  const shaky = al.filter(z => S.c[z].stab < 38 && S.c[z].gdp > 20); if (shaky.length && chance(.6)) { const z = pick(shaky); news(pick(AIQ).replace('{X}', S.c[z].n), 'world', z, noisy(z) ? 2 : 1); S.c[z].stab = clamp(S.c[z].stab - 2, 0, 100); }
  // 4) los líderes hablan de ti
  if (chance(.5)) { const fans = al.filter(z => S.c[z].gdp > 60 && Math.abs(rel(me, z)) > 45); const z = pick(fans); if (z) { const r = rel(me, z), L = S.c[z].lider.n;
    news(r > 0 ? `${L} (${S.c[z].n}) elogia a ${S.leader.n}: «Un socio con el que se puede contar»` : `${L} (${S.c[z].n}) arremete contra ${S.leader.n}: «Un peligro para la región»`, 'dip', z, 2); } }
});
/* las firmas entre IAs se ven en el globo como viajes diplomáticos */
{ const at0 = addTreaty; addTreaty = (t, a, b) => { const had = hasExplicit(t, a, b); at0(t, a, b); if (!had && !isP(a) && !isP(b) && (S.c[a].gdp > 400 || S.c[b].gdp > 400 || nb(S.player).includes(a) || nb(S.player).includes(b))) Bus.emit('aiTrip', { a, b, t }); }; }
/* propuestas nuevas de otros países (como mucho una por turno, compartiendo cupo con las de la IA) */
hook('world', () => {
  const me = S.player; if (S.flags.offerT === S.turn || S.over || !chance(.45)) return;
  const al = alive().filter(z => z !== me && S.c[z].lastAsk + 8 <= S.turn && !atWar(me, z)), roll = ri(0, 3);
  if (roll === 0) { // mediar en una guerra ajena
    const w = S.wars.find(x => !x.att.includes(me) && !x.def.includes(me) && rel(me, x.att[0]) > 0 && rel(me, x.def[0]) > 0 && S.turn - x.s > 2); if (!w) return; const z = w.def[0];
    S.c[z].lastAsk = S.turn; S.flags.offerT = S.turn;
    pushPend({ k: 'offer', t: `${nm(z)} te pide que medies`, iso: z, x: `${S.c[z].lider.n} propone que seas tú quien siente a ${nm(w.att[0])} y ${nm(z)} a negociar. Si sale bien, el mundo lo recordará.`,
      opts: [{ t: 'Mediar (2 CP)', req: { cp: 2 }, fx: [['cp', -2], ['do', 'mediate', { w: w.id }]] }, { t: 'Declinar', fx: [['rel', 'T', -4, 'No quisiste mediar']] }] });
  } else if (roll === 1) { // compra de materias primas a buen precio
    const f = resFlow(), k = Object.keys(f).filter(x => f[x].net >= 2).sort((a, b) => f[b].net - f[a].net)[0]; if (!k) return; const z = pick(al.filter(x => rel(me, x) > 0 && (S.c[x].rec[k] || 0) < 2 && S.c[x].gdp > 100)); if (!z) return;
    S.c[z].lastAsk = S.turn; S.flags.offerT = S.turn; const q = Math.max(1, Math.floor(f[k].net / 2));
    pushPend({ k: 'offer', t: `${nm(z)} quiere tu ${D.COMMODITIES[k].n.toLowerCase()}`, iso: z, x: `${S.c[z].lider.n} ofrece un contrato de ${q} u/turno durante 8 trimestres a un 20% sobre el precio de mercado.`,
      opts: [{ t: 'Firmar el contrato', fx: [['do', 'offerContract', { iso: z, k, q }]] }, { t: 'Rechazar', fx: [['rel', 'T', -3, 'Rechazaste su compra']] }] });
  } else if (roll === 2) { // maniobras conjuntas o base
    const z = pick(al.filter(x => alliesOf(me).includes(x) && rel(me, x) > 40)); if (!z) return; S.c[z].lastAsk = S.turn; S.flags.offerT = S.turn;
    pushPend({ k: 'offer', t: `${nm(z)} propone maniobras conjuntas`, iso: z, x: `${S.c[z].lider.n} quiere ejercicios militares con tus fuerzas durante los próximos trimestres. Es una señal para sus rivales… y los tuyos.`,
      opts: [{ t: 'Aceptar', fx: [['do', 'jointEx', { iso: z }]] }, { t: 'Aplazarlo', fx: [['rel', 'T', -2, 'Aplazaste las maniobras']] }] });
  } else { // inversión extranjera con condiciones
    const z = pick(al.filter(x => S.c[x].gdp > P().gdp * .8 && rel(me, x) > -10)); if (!z) return; S.c[z].lastAsk = S.turn; S.flags.offerT = S.turn; const amt = Math.max(.5, P().gdp * .006);
    pushPend({ k: 'offer', t: `Inversión de ${nm(z)}`, iso: z, x: `Empresas de ${nm(z)} quieren invertir ${money(amt)} en tu país. Piden a cambio rebajas fiscales y que no les toques los contratos.`,
      opts: [{ t: 'Aceptar con sus condiciones', fx: [['$', amt * .3], ['grow', .12, 6], ['rel', 'T', 8, 'Aceptaste su inversión'], ['sec', 'emp', 4], ['sec', 'sin', -4]] }, { t: 'Aceptar sin rebajas', fx: [['chance', .5, [['grow', .1, 6], ['rel', 'T', 4, 'Invirtieron sin rebajas']], [['rel', 'T', -4, 'Rechazaste sus condiciones']]]] }, { t: 'Rechazar', fx: [['sec', 'sin', 2], ['rel', 'T', -3, 'Rechazaste su inversión']] }] });
  }
});
OPS.mediate = a => { const w = warById(a.w); if (!w) return; const ok = chance(.45 + S.rep.paz / 300 + S.rep.conf / 400); Bus.emit('trip', { a: S.player, b: w.att[0] });
  if (ok) { endWar(w, 'blanca'); repAdd('paz', 8); repAdd('conf', 3); for (const z of [w.att[0], w.def[0]]) addMod(S.player, z, 'Mediaste la paz', gain(10), .3); news(`${S.leader.n} logra la paz entre ${nm(w.att[0])} y ${nm(w.def[0])}`, 'peace', S.player, 3); }
  else { repAdd('paz', 2); addMod(S.player, w.att[0], 'Tu mediación', -4, .5); news(`Fracasa la mediación de ${S.leader.n} entre ${nm(w.att[0])} y ${nm(w.def[0])}`, 'dip', S.player, 2); } };
OPS.offerContract = a => { S.contracts.push({ to: a.iso, com: a.k, q: a.q, p: +(S.mkt.com[a.k].p * 1.2).toFixed(3), left: 8 }); addMod(S.player, a.iso, 'Contrato de suministro', gain(5), .5); Bus.emit('route', { a: S.player, b: a.iso }); news(`${P().n} venderá ${D.COMMODITIES[a.k].n.toLowerCase()} a ${nm(a.iso)}`, 'eco', a.iso, 2); };
OPS.jointEx = a => { if (S.mil.miss.length < 3) S.mil.miss.push({ k: 'ejercicio', t: a.iso, s: S.turn }); else S.mil.ready = clamp(S.mil.ready + 8, 0, 100); addMod(S.player, a.iso, 'Maniobras conjuntas', gain(6), .3); };
