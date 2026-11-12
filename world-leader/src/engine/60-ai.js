/* =====================================================================
   SISTEMA · IA DE PAÍSES
   Cada país tiene personalidad (agres, expan, leal, coop, rencor), mide
   su amenaza, se rearma, forma bloques, ataca al débil, castiga
   traiciones y le propone cosas al jugador. Nada es puramente aleatorio:
   el azar solo decide el momento, no la lógica.
   ===================================================================== */
const RIVALS = {}; D.PAIRS.forEach(p => { if (p[2] <= -50) { (RIVALS[p[0]] = RIVALS[p[0]] || []).push(p[1]); (RIVALS[p[1]] = RIVALS[p[1]] || []).push(p[0]); } });
const UW = { inf: 4, tan: 3, art: 2, caz: 3, dro: 3, bom: 1, fra: 2, sub: 1, por: .3 };

function aiBuy(iso) {
  const c = C(iso), cl = costLvl(iso), coastal = !D.C[iso].land; let did = false;
  for (let n = 0; n < 6; n++) {
    const opts = Object.keys(D.UNITS).filter(k => D.UNITS[k].cost * cl <= c.tr && (D.UNITS[k].cat !== 'mar' || coastal) && (k !== 'por' || c.gdp > 1500) && (k !== 'sub' || c.gdp > 150));
    if (!opts.length) break;
    const k = wpick(opts, x => UW[x]), cost = D.UNITS[k].cost * cl, q = Math.max(1, Math.floor(c.tr * .25 / cost));
    c.u[k] = (c.u[k] || 0) + q; c.tr -= q * cost; did = true;
  }
  return did;
}
function coup(iso) {
  const c = C(iso), old = c.lider.n;
  c.lider = { n: genLeader(iso, true), verificado: false, img: '', gen: 1 }; c.reg = 'mil'; c.partido = 'Junta militar'; c.stab = 42; c.stab0 = 40; c.nextElec = 0;
  c.per.agres = clamp(c.per.agres + .1, 0, 1); dirty();
  for (const z of alliesOf(iso)) if (C(z).reg === 'dem') addMod(iso, z, 'Golpe de Estado', -10, .3);
  const near = nb(S.player).includes(iso) || alliesOf(S.player).includes(iso);
  news(`Golpe de Estado en ${c.n}: ${c.lider.n} derroca a ${old}`, 'coup', iso, near || c.gdp > 300 ? 3 : 2);
  Bus.emit('coup', { iso, near });
}
function aiElection(iso) {
  const c = C(iso); c.nextElec = S.turn + 16;
  const big = c.gdp > 500 || nb(S.player).includes(iso);
  if (!chance(clamp(.3 + (55 - c.stab) / 100 - (c.reg === 'hib' ? .25 : 0), .03, .8))) { if (big) news(`${c.lider.n} revalida su mandato en ${c.n}`, 'elec', iso); return; }
  c.ideo = c.ideo > 0 ? clamp(c.ideo - ri(1, 3), -2, 2) : c.ideo < 0 ? clamp(c.ideo + ri(1, 3), -2, 2) : pick([-1, 1]);
  c.lider = { n: genLeader(iso), verificado: false, img: '', gen: 1 }; c.partido = pick(D.GEN_PARTIES[c.ideo]); c.stab = clamp(c.stab + 4, 0, 100); dirty();
  news(`Vuelco electoral en ${c.n}: gana ${c.lider.n} (${c.partido})`, 'elec', iso, big ? 2 : 1);
}

/* bloque defensivo: busca un socio fuerte que comparta enemigo */
function seekPact(iso) {
  const c = C(iso), me = S.player; let rival = null, rv = -30;
  for (const r of nb(iso)) { const x = rel(iso, r); if (x < rv) { rv = x; rival = r; } }
  if (!rival) return;
  const mine = power(iso); let best = null, bs = 0;
  for (const k of alive()) {
    if (k === iso || k === rival || alliesOf(iso).includes(k)) continue;
    if (D.C[k].region !== D.C[iso].region && C(k).gdp < 1500) continue;
    const r = rel(iso, k); if (r <= 25) continue;
    if (!(rel(k, rival) < -10 || power(k) > mine * 2)) continue;
    const sc = r + Math.min(40, power(k) / 50); if (sc > bs) { bs = sc; best = k; }
  }
  if (!best) return;
  c.cd = S.turn + 4;
  if (best === me) {
    if (S.flags.offerT === S.turn || c.lastAsk + 8 > S.turn) return; S.flags.offerT = S.turn; c.lastAsk = S.turn;
    pushPend({ k: 'offer', t: `${c.n} busca tu protección`, iso, x: `${c.lider.n} se siente amenazado por ${nm(rival)} y te propone un pacto de defensa mutua. Si lo firmas y lo atacan, esperará tus tropas.`,
      opts: [{ t: 'Firmar la defensa mutua', fx: [['do', 'sign', { t: 'def', iso }], ['rel', rival, -10, `Tu pacto con ${c.n}`]] }, { t: 'Ofrecer solo un pacto de no agresión', fx: [['do', 'sign', { t: 'pna', iso }]] }, { t: 'Declinar', fx: [['rel', 'T', -4, 'Declinaste protegerlos']] }] });
  } else if (rel(iso, best) > 35) {
    addTreaty('def', iso, best);
    news(`${c.n} y ${nm(best)} firman un pacto de defensa frente a ${nm(rival)}`, 'dip', iso, C(best).gdp > 800 || nb(me).includes(iso) ? 2 : 1);
  }
}
/* oportunismo: ¿hay un vecino o rival débil al que valga la pena atacar? */
function considerWar(iso) {
  const c = C(iso), p = c.per; if (p.agres * (.5 + p.expan) < .32 || S.wars.length >= 4) return;
  const mine = power(iso) + .5 * sumPow(alliesOf(iso)); let best = null, bs = 0, far = false;
  const cand = new Set(nb(iso)); (RIVALS[iso] || []).forEach(r => { if (C(r).alive && canReach(iso, r)) cand.add(r); });
  for (const t of cand) {
    const T = C(t); if (!T.alive || alliesOf(iso).includes(t) || atWar(iso, t)) continue;
    if (isP(t) && S.turn < 4) continue;
    const r = rel(iso, t); if (r > (p.expan > .8 ? -5 : -20)) continue;
    if (T.nuke && !c.nuke) continue; if (hasExplicit('pna', iso, t) && p.agres < .85) continue;
    let def = power(t) * 1.25 + .6 * sumPow(alliesOf(t));
    for (const z of alive()) if (z !== iso && z !== t && C(z).gdp >= 800 && !alliesOf(t).includes(z) && rel(z, t) >= 40 && rel(z, iso) <= -25) def += .5 * power(z); // protectores
    let ratio = mine / (def + 1); if (T.stab < 35 || inWar(t)) ratio *= 1.3;
    const isFar = !nb(iso).includes(t), need = (p.agres > .8 ? 1.6 : 2) * (isFar ? 1.5 : 1);
    if (ratio > need && ratio * -r > bs) { bs = ratio * -r; best = t; far = isFar; }
  }
  if (best && chance((.1 + p.agres * .2) * (far ? .5 : 1))) { c.cd = S.turn + 8; S.aiWarCd = S.turn + 6; startWar(iso, best); }
}
OPS.sign = a => { addTreaty(a.t, S.player, a.iso); addMod(S.player, a.iso, 'Firma de tratado', gain(6), .5); news(`${P().n} y ${nm(a.iso)} firman: ${TNAME[a.t]}`, 'dip', a.iso, 2); Bus.emit('treaty', { t: a.t, a: S.player, b: a.iso, name: TNAME[a.t] }); };
OPS.armed = a => { for (const z of enemiesOf(a.iso)) addMod(S.player, z, 'Armaste a su enemigo', -15, .3, 1); };
OPS.ultimatum = a => {
  if (chance(.5) && canReach(a.iso, S.player) && C(a.iso).alive) startWar(a.iso, S.player);
  else if (addSanction(a.iso, S.player)) news(`${nm(a.iso)} responde a tu negativa con sanciones`, 'dip', a.iso, 3);
};
/* lo que la IA le propone, pide o exige al jugador (máx. una oferta por turno) */
function aiToPlayer(iso, th) {
  const c = C(iso), me = S.player, p = c.per; if (S.flags.offerT === S.turn || c.lastAsk + 8 > S.turn || atWar(iso, me)) return;
  const r = rel(iso, me); let ev = null;
  if (r > 35 && !hasT('com', iso, me) && !IX().sp[key(iso, me)] && chance(.1))
    ev = { t: `${c.n} propone comerciar`, x: `${c.lider.n} te ofrece un tratado comercial. Más ingresos para ambos, y un lazo que costará romper.`, opts: [{ t: 'Firmar', fx: [['do', 'sign', { t: 'com', iso }]] }, { t: 'Rechazar', fx: [['rel', 'T', -3, 'Rechazaste su oferta comercial']] }] };
  else if (r > 60 && !alliesOf(me).includes(iso) && th > .9 && chance(.15))
    ev = { t: `${c.n} quiere una alianza`, x: `${c.lider.n} propone una alianza formal. Te apoyará en tus guerras… y esperará lo mismo de ti.`, opts: [{ t: 'Sellar la alianza', fx: [['do', 'sign', { t: 'ali', iso }], ['rep', 'conf', 2]] }, { t: 'Rechazar con tacto', fx: [['rel', 'T', -4, 'Rechazaste su alianza']] }] };
  else if ((c.stab < 30 || (inWar(iso) && warScoreFor(iso) < -20)) && r > 25 && P().gdp > c.gdp * .3 && chance(.2)) {
    const amt = Math.min(c.gdp * .01, P().gdp * .004), war = inWar(iso);
    ev = { t: `${c.n} pide ayuda`, x: war ? `${c.lider.n} está perdiendo la guerra y te pide ayuda urgente.` : `${c.n} se hunde en el caos. ${c.lider.n} te pide un rescate de emergencia.`,
      opts: [{ t: `Enviar ${money(amt)}`, fx: [['$', -amt], ['rel', 'T', 18, 'Los ayudaste en su peor momento'], ['rep', 'gen', 4], ['do', 'boost', { iso, v: 6 }]] }]
        .concat(war ? [{ t: 'Enviar armas y tropas', fx: [['units', 'tierra', -5], ['rel', 'T', 24, 'Les enviaste armas'], ['do', 'armed', { iso }], ['do', 'boost', { iso, v: 3, arm: 1 }]] }] : [])
        .concat([{ t: 'Negarte', fx: [['rel', 'T', -8, 'Les negaste ayuda cuando la pidieron']] }]) };
  } else if (inWar(iso) && r > 45 && chance(.15)) {
    const w = warsOf(iso)[0], side = w.att.includes(iso) ? 'att' : 'def', foe = side === 'att' ? w.def[0] : w.att[0];
    if (!w.att.includes(me) && !w.def.includes(me) && rel(me, foe) < 0 && canReach(me, foe) && !alliesOf(me).includes(foe))
      ev = { t: `${c.n} te quiere en su guerra`, x: `${c.lider.n} te invita a entrar en la guerra contra ${nm(foe)}. Promete repartir el botín.`, opts: [{ t: 'Entrar en la guerra', fx: [['do', 'joinWar', { w: w.id, side }], ['rel', 'T', 15, 'Luchaste a su lado']] }, { t: 'Declinar', fx: [['rel', 'T', -6, 'No quisiste luchar a su lado']] }] };
  } else if (r < -55 && S.turn > 3 && p.agres > .5 && canReach(iso, me) && power(iso) > (power(me) + .5 * sumPow(alliesOf(me))) * 1.8 && chance(.12)) {
    const amt = P().gdp * .01;
    ev = { t: `Ultimátum de ${c.n}`, x: `${c.lider.n} exige un "tributo de buena voluntad" de ${money(amt)}. Sus tropas ya maniobran cerca de tu frontera.`,
      opts: [{ t: 'Pagar', fx: [['$', -amt], ['rel', 'T', 10, 'Pagaste lo que exigían'], ['sec', 'mil', -8], ['sec', 'all', -3]] }, { t: 'Negarte en público', fx: [['sec', 'mil', 5], ['sec', 'all', 2], ['do', 'ultimatum', { iso }]] }] };
  }
  if (!ev) return;
  S.flags.offerT = S.turn; c.lastAsk = S.turn; ev.k = 'offer'; ev.iso = iso; pushPend(ev);
}
OPS.boost = a => { const c = C(a.iso); c.stab = clamp(c.stab + a.v, 0, 100); if (a.arm) c.u.inf = (c.u.inf || 0) + Math.ceil((P().u.inf || 0) * .05); };

function aiTurn(iso) {
  const c = C(iso); if (!c.alive) return; const p = c.per, me = S.player;
  // economía y estabilidad
  c.gdp *= 1 + (growthOf(iso) + rr(-.3, .3)) / 100;
  c.tr = Math.min(c.gdp * .06, c.tr + c.gdp * .004 * (1 + p.agres));
  c.stab = clamp(c.stab + (c.stab0 - c.stab) * .05 + rr(-1.5, 1.5) - S.sanc.filter(x => x.on === iso).length * .15, 0, 100);
  // política interna
  if (S.turn > 1 && ((c.stab < 18 && chance(.12)) || ((c.reg === 'mil' || c.reg === 'hib') && c.stab < 38 && chance(.02)))) coup(iso);
  else if (c.nextElec && S.turn >= c.nextElec) aiElection(iso);
  const th = threat(iso), war = inWar(iso);
  // rearme ante la amenaza
  if ((war || th > .8) && c.tr > 0 && aiBuy(iso) && th > 1 && c.gdp > 300 && chance(.12)) news(`${c.n} acelera su rearme`, 'mil', iso);
  if (!war) {
    if (th > 1.1 && c.cd <= S.turn) seekPact(iso);
    if (S.turn > 2 && c.stab > 40 && c.cd <= S.turn && S.aiWarCd <= S.turn) considerWar(iso);
    // cooperación: tratados comerciales con países afines
    if (chance(.05 * (.5 + p.coop))) {
      const k = pick(nb(iso).concat(shuffle(alive()).slice(0, 5)));
      if (k && k !== iso && k !== me && C(k).alive && rel(iso, k) > 30 && !hasT('com', iso, k) && !IX().sp[key(iso, k)]) { addTreaty('com', iso, k); if (c.gdp > 800 && C(k).gdp > 800) news(`${c.n} y ${nm(k)} firman un tratado comercial`, 'dip', iso); }
    }
  }
  // memoria de agravios: castiga al jugador que lo traicionó
  if (grudge(iso, me) < -35 * (1.4 - p.rencor) && !sanctioned(iso, me) && !atWar(iso, me) && c.gdp > 100 && chance(.3)) { addSanction(iso, me); news(`${c.n} te impone sanciones: no olvida lo que hiciste`, 'dip', iso, 3); }
  aiToPlayer(iso, th);
}
