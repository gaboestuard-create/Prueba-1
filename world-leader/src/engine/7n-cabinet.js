/* =====================================================================
   SISTEMA · GABINETE Y SUCESIÓN
   Cuatro ministros (Economía, Exteriores, Defensa, Interior) con competencia,
   lealtad y un rasgo. Sus efectos entran en mod(). Pueden tener escándalos,
   dimitir o traicionarte. El líder envejece, puede enfermar y morir: si has
   nombrado heredero, la partida sigue con él. Datos en src/data-cabinet.js.
   ===================================================================== */
const CB = D.CAB, AG = D.AGE, MK = Object.keys(D.MIN), MTK = Object.keys(D.MTRAIT);
function mkMinister() { const tr = pick(MTK), T = D.MTRAIT[tr]; return { n: genLeader(S.player), tr, comp: clamp(ri(1, 4) + (T.comp || 0), 1, 5), loy: clamp(ri(45, 75) + (T.loy || 0), 0, 100), pseed: ri(0, 96), since: S.turn }; }
function cabInit() { S.cab = { m: {}, cand: {}, heir: null, candT: S.turn }; for (const k of MK) { S.cab.m[k] = mkMinister(); S.cab.cand[k] = []; }
  S.leader.age = S.leader.age || ri(AG.start[0], AG.start[1]); S.leader.health = 100; }
hook('new', cabInit); hook('load', () => { if (!S.cab) cabInit(); for (const k of MK) if (!S.cab.m[k]) { S.cab.m[k] = mkMinister(); S.cab.cand[k] = []; } }); /* ministerios añadidos después */
{ const m0 = mod; mod = k => { let v = m0(k); if (!S || !S.cab) return v; for (const key of MK) { const m = S.cab.m[key]; if (!m) continue; v += ((D.MIN[key].per || {})[k] || 0) * m.comp; if (k === 'elect' && D.MTRAIT[m.tr].elect) v += D.MTRAIT[m.tr].elect; } return v; }; }
const refreshCand = () => { for (const k of MK) S.cab.cand[k] = Array.from({ length: CB.candidates }, mkMinister); S.cab.candT = S.turn; };
ACT.minHire = a => { const C = S.cab, x = (C.cand[a.k] || [])[+a.i]; if (!x) return fail('Candidato inválido'); if (!useCP(CB.hireCp)) return fail(`Necesitas ${CB.hireCp} de capital político`);
  const old = C.m[a.k]; C.m[a.k] = Object.assign(x, { since: S.turn }); C.cand[a.k].splice(+a.i, 1); if (C.heir === a.k) C.heir = null;
  for (const k of MK) if (k !== a.k) C.m[k].loy = clamp(C.m[k].loy + CB.fireLoy, 0, 100);
  news(`${old.n} sale del gobierno; ${x.n} asume el Ministerio de ${D.MIN[a.k].n}`, 'pol', S.player, 2); return { msg: `${x.n}, nuevo ministro de ${D.MIN[a.k].n}` }; };
ACT.minHeir = a => { if (!S.cab.m[a.k]) return fail('Ministerio inválido'); S.cab.heir = S.cab.heir === a.k ? null : a.k; return { msg: S.cab.heir ? `${S.cab.m[a.k].n} es tu heredero político` : 'Sin heredero designado' }; };
ACT.minRefresh = () => { if (S.turn - S.cab.candT < 2 && S.cab.cand.eco.length) return fail('Acabas de recibir candidatos'); refreshCand(); return { msg: 'Nuevos candidatos sobre la mesa' }; };
/* cada turno: lealtades, escándalos, traiciones, edad y salud */
OPS.minGo = a => { const C = S.cab, m = C.m[a.k]; if (!m) return; if (!C.cand[a.k].length) refreshCand(); const nx = C.cand[a.k].shift(); C.m[a.k] = Object.assign(nx, { since: S.turn }); if (C.heir === a.k) C.heir = null; news(`${m.n} deja el Ministerio de ${D.MIN[a.k].n}`, 'pol', S.player, 2); };
hook('player', () => {
  const C = S.cab, ap = approval(); if (S.turn - C.candT >= CB.refresh) refreshCand();
  for (const k of MK) { const m = C.m[k], T = D.MTRAIT[m.tr]; m.loy = clamp(m.loy + (ap - 50) * .04 + (T.tr === 'leal' ? 1 : 0) + rr(-1.5, 1.5) + (m.tr === 'leal' ? .5 : 0), 0, 100);
    if (T.scandal && (m.scd || 0) <= S.turn && chance(T.scandal) && S.pend.length < 2) { m.scd = S.turn + CB.scandalCd;
      pushPend({ k: 'event', id: 'cabinet', t: `Escándalo: ${m.n}`, x: `La prensa publica que ${m.n}, ministro de ${D.MIN[k].n}, cobró comisiones por contratos públicos.`, iso: S.player,
        opts: [{ t: 'Destituirlo', fx: [['do', 'minGo', { k }], ['rep', 'dem', 3]] }, { t: 'Defenderlo', fx: [['stab', -2], ['rep', 'dem', -4], ['sec', 'all', -2]] }] }); }
    else if (T.ambition && m.loy < CB.betrayLoy && ap < CB.betrayAppr && chance(CB.betrayP) && S.pend.length < 2) {
      pushPend({ k: 'event', id: 'cabinet', t: `${m.n} conspira contra ti`, x: `Tu ministro de ${D.MIN[k].n} se reúne en secreto con la oposición y con mandos militares. Quiere tu sillón.`, iso: S.player,
        opts: [{ t: 'Cesarlo de inmediato', fx: [['do', 'minGo', { k }], ['stab', -3]] }, { t: 'Comprar su lealtad (2 CP)', req: { cp: 2 }, fx: [['cp', -2], ['do', 'minLoy', { k, v: 35 }]] }, { t: 'Dejarlo estar', fx: [['chance', .5, [['stab', -8], ['sec', 'mil', -6]], []]] }] }); }
  }
  /* edad y salud del líder */
  const L = S.leader; if (S.turn % 4 === 0) L.age++;
  if (L.age >= AG.sickFrom && L.health > 0 && chance(AG.sickP + (L.age - AG.sickFrom) * AG.sickPerYear) && S.pend.length < 2) {
    const hit = ri(15, 35); L.health = clamp(L.health - hit, 0, 100); news(`${L.n} es hospitalizado`, 'pol', S.player, 3);
    if (L.health > 0) pushPend({ k: 'event', id: 'salud', t: 'Tu salud', x: `Los médicos te recomiendan reposo (salud ${Math.round(L.health)} de 100). La prensa pregunta.`, iso: S.player,
      opts: [{ t: 'Transparencia total', fx: [['rep', 'dem', 3], ['sec', 'all', -1]] }, { t: 'Ocultarlo y seguir trabajando', fx: [['chance', .4, [['rep', 'dem', -6], ['stab', -3]], []]] }, { t: 'Reposo: delegar unos meses (−2 CP)', fx: [['cp', -2], ['do', 'heal', { v: 20 }]] }] }); }
  else if (L.health < 100 && L.health > 0) L.health = Math.min(100, L.health + AG.recover);
  if (L.health <= AG.deathHealth && !S.over) succession();
});
OPS.minLoy = a => { const m = S.cab.m[a.k]; if (m) m.loy = clamp(m.loy + a.v, 0, 100); };
OPS.heal = a => { S.leader.health = clamp(S.leader.health + a.v, 0, 100); };
/* sucesión: el heredero toma el relevo; sin heredero, el partido elige a alguien y el país se agita */
function succession() {
  const L = S.leader, C = S.cab, hk = C.heir, h = hk && C.m[hk], old = L.n;
  if (h) { L.n = h.n; L.pseed = h.pseed; L.img = ''; L.age = ri(45, 62); L.health = 100; L.traits = L.traits.slice(0, 2); C.m[hk] = mkMinister(); C.heir = null; P().stab = clamp(P().stab - 3, 0, 100); }
  else { L.n = genLeader(S.player); L.pseed = ri(0, 96); L.img = ''; L.age = ri(50, 68); L.health = 100; L.traits = L.traits.slice(0, 1); P().stab = clamp(P().stab - 10, 0, 100); S.pol.cp = Math.max(0, S.pol.cp - 4); }
  P().lider = { n: L.n, verificado: true, img: '' };
  news(`Muere ${old}. ${L.n} asume el poder${h ? ' como heredero designado' : ' tras una dura pugna en el partido'}`, 'pol', S.player, 3);
  if (S.p5) S.p5.tl.push({ t: S.turn, x: `Muere ${old}; le sucede ${L.n}` }); Bus.emit('succession', { old, n: L.n, heir: !!h });
}
const cabInfo = () => S.cab;
