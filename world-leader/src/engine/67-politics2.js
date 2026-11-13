/* =====================================================================
   SISTEMA · POLÍTICA AMPLIADA (Fase 2): ejes de partidos, relación con
   cada partido, coaliciones, censura/juicio político, causas de cada
   cambio de afinidad y campaña electoral.
   ===================================================================== */
/* ---- por qué se mueve cada sector ---- */
let WHY = null;
function why(t, fn) { const o = WHY; WHY = t; try { return fn(); } finally { WHY = o; } }
function logSec(k, v, w) {
  if (!v || !S.pol.slog) return; const L = S.pol.slog[k] || (S.pol.slog[k] = []), t = w || WHY || 'Decisiones de gobierno';
  const e = L.find(x => x.t === S.turn && x.w === t); if (e) e.v += v; else L.push({ t: S.turn, v, w: t }); if (L.length > 14) L.shift();
}
const secWhy = k => (S.pol.slog[k] || []).filter(x => S.turn - x.t <= 6 && Math.abs(x.v) >= .4).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 5);

/* ---- ejes ---- */
const partyAx = (iso, p) => D.PARTY_AX[iso + ':' + p.n] || D.PARTY_AX[p.n] || [p.ideo, p.ideo, Math.abs(p.ideo) >= 2 ? (p.ideo > 0 ? 2 : 0) : p.ideo * .5, -p.ideo];
const lawAx = l => { const x = D.LAW_AX[l.id] || [], e = l.eco || 0; return l.ax || [e, x[0] != null ? x[0] : (l.auth || 0) * .5, x[1] || 0, x[2] != null ? x[2] : -e]; };
function axDist(l, p) { const a = lawAx(l), b = p.ax || [p.ideo, p.ideo, 0, -p.ideo]; return (Math.abs(a[0] - b[0]) + .7 * Math.abs(a[1] - b[1]) + .6 * Math.abs(a[2] - b[2]) + .5 * Math.abs(a[3] - b[3])) / 1.4; }
function initPol2() { // completa el estado político (partida nueva o partida antigua)
  const pol = S.pol; pol.slog = pol.slog || {}; pol.shist = pol.shist || {}; pol.pledge = pol.pledge || {}; pol.woo = pol.woo || {}; if (pol.censCd == null) pol.censCd = 6;
  pol.seats.forEach(p => { if (!p.ax) p.ax = partyAx(S.player, p).slice(); if (p.rel == null) p.rel = p.g ? 68 : 45; if (p.v == null) p.v = false; });
  let added = 0; for (const k in D.SECTORS) if (!pol.sec[k]) { pol.sec[k] = { a: 50, w: D.SECTORS[k].w }; added = 1; }
  if (added) { const tw = Object.keys(pol.sec).reduce((a, k) => a + pol.sec[k].w, 0); for (const k in pol.sec) pol.sec[k].w /= tw; } // solo al migrar: renormalizar siempre rompería el determinismo
}
hook('new', initPol2); hook('load', initPol2);
const govSeats = () => S.pol.seats.reduce((a, p) => a + (p.g ? p.s : 0), 0);
function partyRel(who, v) { S.pol.seats.forEach((p, i) => { if (who === 'all' || (who === 'opp' && !p.g) || (who === 'gov' && p.g && i) || who === i) p.rel = clamp(p.rel + v, 0, 100); }); }

/* tras cada votación los partidos toman nota: les gustó o no lo que impulsaste */
Bus.on('vote', v => { if (!v.law) return; S.pol.seats.forEach((p, i) => { if (!i) return; const d = axDist(v.law, p); p.rel = clamp(p.rel + (v.pass ? (d < 1.2 ? 3 : d > 2.4 ? -4 : 0) : (d > 2.4 ? 1 : 0)), 0, 100); if (S.pol.pledge[p.n] === v.law.id) delete S.pol.pledge[p.n]; }); });

ACT.partyTalk = a => {
  const pol = S.pol, i = +a.i, p = pol.seats[i]; if (!p || !i) return fail('Partido inválido');
  if (!isDem()) return fail('En este régimen los partidos no negocian: obedecen');
  if (a.k === 'woo') {
    if (pol.woo[p.n] === S.turn) return fail('Ya te reuniste con ellos este turno'); const cost = P().gdp * .0005;
    if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(1)) return fail('Necesitas 1 de capital político');
    P().tr -= cost; pol.woo[p.n] = S.turn; p.rel = clamp(p.rel + 8, 0, 100); return { msg: `Partidas presupuestarias para las prioridades de ${p.n}: relación +8` };
  }
  if (a.k === 'pledge') {
    const l = LAW[a.law]; if (!l) return fail('Elige una ley'); if (p.g) return fail('Ya está en tu coalición');
    if (p.rel < 30) return fail(`${p.n} ni siquiera te coge el teléfono (relación ${Math.round(p.rel)})`); if (!useCP(1)) return fail('Necesitas 1 de capital político');
    pol.pledge[p.n] = l.id; p.rel = clamp(p.rel - 2, 0, 100); return { msg: `${p.n} se compromete a apoyar "${l.n}" en la próxima votación` };
  }
  if (a.k === 'pact') {
    if (p.g) return fail('Ya forma parte del gobierno'); const d = axDist({ ax: pol.seats[0].ax }, p);
    if (p.rel < 55) return fail(`${p.n} no entra en tu gobierno con una relación de ${Math.round(p.rel)} (necesitas 55)`); if (d > 2.6) return fail(`${p.n} está demasiado lejos de tu partido para gobernar juntos`);
    if (!useCP(2)) return fail('Necesitas 2 de capital político'); p.g = 1; p.rel = clamp(p.rel + 5, 0, 100);
    news(`${p.n} entra en el gobierno de coalición`, 'pol', S.player, 2); return { msg: `${p.n} entra en tu coalición: ${Math.round(govSeats())} escaños` };
  }
  if (a.k === 'expel') { if (!p.g) return fail('No está en tu coalición'); p.g = 0; p.rel = clamp(p.rel - 20, 0, 100); news(`${p.n} sale del gobierno`, 'pol', S.player, 2); return { msg: `Rompes con ${p.n}: te quedan ${Math.round(govSeats())} escaños` }; }
  return fail('Acción desconocida');
};

/* ---- actos de política exterior que mueven sectores ---- */
const secActs = (key, label) => why(label, () => { const m = D.SEC_ACTS[key] || {}; for (const k in m) secAdd(k, m[k]); });
Bus.on('treaty', t => { if (t.a === S.player || t.b === S.player) secActs(t.t, `${t.name} con ${nm(t.a === S.player ? t.b : t.a)}`); });
Bus.on('war', w => { if (w.a === S.player) secActs('warAtt', `Declaraste la guerra a ${nm(w.d)}`); else if (w.d === S.player) secActs('warDef', `${nm(w.a)} te declaró la guerra`); });
{ const f = ACT.sanction; ACT.sanction = a => { const r = f(a); if (r.ok !== false) secActs('sanction', `Sanciones a ${nm(a.iso)}`); return r; }; }

/* ---- gobernabilidad: socios que se van, crisis, moción de censura o juicio político ---- */
hook('player', () => {
  const pol = S.pol; for (const k in pol.sec) { const h = pol.shist[k] || (pol.shist[k] = []); h.push(Math.round(pol.sec[k].a)); if (h.length > 16) h.shift(); }
  if (!isDem()) return;
  pol.seats.forEach((p, i) => { p.rel += ((p.g ? 62 : 46) - p.rel) * .05; if (i && p.g && p.rel < 35) { p.g = 0; news(`${p.n} abandona tu coalición`, 'pol', S.player, 3); } });
  if (govSeats() < 50) { P().stab = clamp(P().stab - .6, 0, 100); pol.cp = Math.max(0, pol.cp - 1); S.flags.minority = 1; } else delete S.flags.minority;
});
hook('late', () => {
  const pol = S.pol; if (S.over || !isDem() || S.turn < pol.censCd) return;
  const parl = D.PARLIAMENTARY.includes(S.player), ap = approval();
  if (!((govSeats() < 50 && ap < 44) || (S.flags.scandal && ap < 40)) || !chance(.4)) return;
  pol.censCd = S.turn + 7; const hinge = pol.seats.map((p, i) => [p, i]).filter(x => !x[0].g).sort((a, b) => b[0].rel - a[0].rel)[0];
  pushPend({ k: 'elec', t: parl ? 'Moción de censura' : 'Juicio político', iso: S.player,
    x: parl ? 'La oposición ha registrado una moción de censura. Si reúne los votos, tu gobierno cae hoy mismo.' : 'El congreso abre un juicio político contra ti. Si prospera, serás destituido.',
    opts: [{ t: hinge ? `Pactar con ${hinge[0].n}` : 'Buscar apoyos', req: { cp: 3 }, fx: [['cp', -3], ['do', 'censure', { help: hinge ? hinge[1] : -1 }]] },
    { t: 'Repartir cargos y presupuesto', fx: [['$g', -.5], ['do', 'censure', { bonus: .18 }]], hid: [['chance', .35, [['later', 3, 1, [['sec', 'all', -6], ['rep', 'conf', -5], ['flag', 'scandal']], 'Sale a la luz el reparto de cargos que te salvó de la censura']], []]] },
    { t: 'Afrontar la votación', fx: [['do', 'censure', {}]] }] });
});
OPS.censure = a => {
  const parl = D.PARLIAMENTARY.includes(S.player), need = parl ? 50 : 60, ap = approval(); let yes = 0;
  const by = S.pol.seats.map((p, i) => { const f = p.g || i === a.help ? .04 : clamp(.92 - (p.rel - 45) / 70 - (a.bonus || 0) - (ap - 40) / 120 + rr(-.08, .08), .05, 1), y = Math.round(p.s * f); yes += y; return { n: p.n, s: Math.round(p.s), yes: y, g: p.g, ideo: p.ideo }; });
  const pass = yes > need, title = parl ? 'Moción de censura contra tu gobierno' : 'Juicio político: destitución';
  Bus.emit('vote', { title, by, yes, need, pass, against: 1 });
  if (pass) { news(`${S.leader.n} cae: prospera ${parl ? 'la moción de censura' : 'el juicio político'} (${yes} votos)`, 'pol', S.player, 3); over('censura'); }
  else { news(`${S.leader.n} sobrevive a ${parl ? 'la moción de censura' : 'el juicio político'} (${yes} de ${need + 1} necesarios)`, 'pol', S.player, 3); P().stab = clamp(P().stab + 3, 0, 100); delete S.flags.scandal; }
};

/* ---- campaña electoral: mensaje, sectores objetivo, gasto y aliado; después debate ---- */
hook('campaign', () => { });
function msgFits(k) { const c = P(), s = S.pol.sec; return k === 'eco' ? growthOf(S.player) > .45 : k === 'seg' ? c.stab < 55 || inWar(S.player) : k === 'cam' ? (s.jov.a + s.min.a) / 2 > 50 : S.rep.paz < 5 || power(S.player) > 400; }
function campaignPlan(a) { // previsión de puntos (la UI la muestra antes de confirmar)
  const m = D.CAMPAIGN[a.msg] || D.CAMPAIGN.eco, sp = D.SPEND[clamp(+a.spend || 0, 0, 2)], ally = S.pol.seats[+a.ally], out = [];
  out.push([`Mensaje "${m.n}"`, msgFits(a.msg) ? 3 : -1]); out.push([`Gasto ${sp[0].toLowerCase()}`, sp[2]]);
  const tg = (a.tg || []).slice(0, 2); if (tg.length) out.push(['Sectores objetivo', tg.reduce((x, k) => x + (S.pol.sec[k] ? S.pol.sec[k].w * 10 : 0), 0)]);
  if (ally && +a.ally > 0) out.push([`Aval de ${ally.n}`, ally.rel >= 55 ? ally.s * .08 : -1]);
  return { list: out, total: out.reduce((x, y) => x + y[1], 0), cost: P().gdp * sp[1] / 100 };
}
OPS.campaign = a => {
  const pl = campaignPlan(a), m = D.CAMPAIGN[a.msg] || D.CAMPAIGN.eco, ally = S.pol.seats[+a.ally];
  P().tr -= pl.cost; S.pol.camp += pl.total;
  why('Campaña electoral', () => { m.sec.forEach(k => secAdd(k, msgFits(a.msg) ? 3 : 1)); (a.tg || []).slice(0, 2).forEach(k => secAdd(k, 6)); });
  if (ally && +a.ally > 0 && ally.rel < 55) ally.rel = clamp(ally.rel - 5, 0, 100);
  news(`Arranca la campaña de ${S.leader.n}: "${m.n}"`, 'elec', S.player, 2);
};
hook('late', () => {
  if (S.over || !isDem()) return; const left = S.pol.nextElec - S.turn;
  if (left === 2) pushPend({ k: 'camp', t: 'Diseña tu campaña', iso: S.player, x: `Faltan dos trimestres para las elecciones y tu aprobación es del ${Math.round(approval())}%. Elige mensaje, a quién le hablas, cuánto gastas y quién te avala.`, opts: [{ t: 'Lanzar la campaña', fx: [['do', 'campaign', { msg: 'eco', tg: [], spend: 1, ally: 0 }]] }] });
  if (left === 1) pushPend({ k: 'elec', t: 'El gran debate', iso: S.player, x: 'Última semana. Todo el país mira el debate televisado. Tu rival viene preparado.',
    opts: [{ t: 'Atacar su historial', fx: [['chanceAppr', [['camp', 4]], [['camp', -3], ['sec', 'pre', -3]]]] }, { t: 'Datos y propuestas', fx: [['camp', mod('rp') ? 3 : 1.5], ['sec', 'med', 2]] },
    { t: 'Hablarle al corazón', fx: [['chance', mod('secGain') > 0 ? .7 : .45, [['camp', 5]], [['camp', -2]]]] }, ...(P().reg === 'hib' || mod('graft') || mod('decree') ? [{ t: 'Preparar el fraude', fx: [['camp', 12], ['rep', 'dem', -15]], hid: [['chance', .4, [['later', 3, 1, [['stab', -20], ['sec', 'all', -10], ['rep', 'conf', -10]], 'Pruebas del fraude electoral sacan al país a la calle']], []]] }] : [])] });
});
/* resultado región por región para la noche electoral */
function electionRegs(share) { const r = rulingTag(); return P().terr.map((t, i) => t.o === S.player ? { n: t.n, v: clamp(share + (t.p === r ? 6 : -5) + rr(-6, 6), 3, 97), w: D.C[S.player].terr[i].w } : null).filter(Boolean).sort((a, b) => b.w - a.w).slice(0, 14); }
/* balance: una guerra que se gana da réditos en casa; una que se pierde, no */
hook('player', () => { if (!inWar(S.player)) return; const sc = warScoreFor(S.player); if (sc > 15) why('Victorias en el frente', () => { secAdd('mil', .8); secAdd('rur', .6); secAdd('jub', .6); secAdd('obr', .5); secAdd('med', .4); secAdd('jov', .7); }); });
Bus.on('annex', a => { if (a.t === S.player) { S.pol.camp += 2.5; S.flags.glory = S.turn; } if (a.t === S.player) why(`Anexión de ${D.C[a.v].n}`, () => { secAdd('all', 4); secAdd('mil', 6); secAdd('min', -5); secAdd('pre', -3); }); });
