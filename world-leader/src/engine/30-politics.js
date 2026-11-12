/* =====================================================================
   SISTEMA · POLÍTICA INTERNA: congreso, leyes, sectores, elecciones
   ===================================================================== */
const isDem = () => P().reg === 'dem' || P().reg === 'hib';

function initPolitics() {
  const iso = S.player, c = P(), pol = S.pol;
  let seats;
  if (D.PARTIES[iso] && !c.custom) seats = D.PARTIES[iso].map(p => ({ n: p[0], ideo: p[1], s: p[2], g: p[3] ? 1 : 0 }));
  else if (!isDem()) seats = [{ n: c.partido, ideo: c.ideo, s: 88, g: 1 }, { n: 'Disidencia tolerada', ideo: c.ideo > 0 ? -1 : 1, s: 12, g: 0 }];
  else {
    const r = c.reg === 'hib' ? 56 : 46, o = c.ideo >= 0 ? -1 : 1;
    seats = [{ n: c.partido, ideo: c.ideo, s: r, g: 1 }, { n: 'Aliados de gobierno', ideo: clamp(c.ideo - o, -2, 2) / 2, s: 7, g: 1 },
    { n: D.GEN_PARTIES[o][0], ideo: o * 1.5, s: 100 - r - 7 - 13, g: 0 }, { n: D.GEN_PARTIES[0][0], ideo: 0, s: 13, g: 0 }];
  }
  if (c.custom || !D.PARTIES[iso]) seats[0].n = c.partido;
  const tot = seats.reduce((s, p) => s + p.s, 0); seats.forEach(p => p.s = p.s / tot * 100);
  pol.seats = seats;
  // sectores: el peso electoral depende del tipo de país
  const gpc = c.gdp / c.pop, w = {}; let sum = 0;
  for (const k in D.SECTORS) { let x = D.SECTORS[k].w; if (k === 'rur' && gpc < 8) x += .08; if (k === 'med' && gpc > 25) x += .06; if (k === 'rel' && (c.reg === 'teo' || D.C[iso].region === 'MOR')) x += .06; w[k] = x; sum += x; }
  for (const k in w) pol.sec[k] = { a: 50, w: w[k] / sum };
  pol.nextElec = isDem() ? 8 : 0;
}
const approval = () => Object.keys(S.pol.sec).reduce((s, k) => s + S.pol.sec[k].a * S.pol.sec[k].w, 0);
function secAdd(id, v) {
  if (v > 0) v *= Math.max(.2, 1 + mod('secGain'));
  const one = k => { S.pol.sec[k].a = clamp(S.pol.sec[k].a + v, 0, 100); };
  if (id === 'all') Object.keys(S.pol.sec).forEach(one); else if (S.pol.sec[id]) one(id);
}
function secBase(k) { let v = 50; for (const id in S.pol.laws) v += (LAW[id].sec || {})[k] || 0; for (const t of S.leader.traits) v += ((TR[t].start || {}).sec || {})[k] || 0; return clamp(v, 10, 90); }
/* control territorial: fracción de mis regiones gobernadas por mi partido (solo países con subdivisiones) */
const rulingTag = () => P().custom ? P().partido : D.SUB_RULING[S.player] || D.C[S.player].partido;
function localCtl() { const r = rulingTag(), mine = P().terr.filter(t => t.o === S.player && t.p); return mine.length > 1 ? mine.filter(t => t.p === r).length / mine.length : null; }

/* ---- votación de leyes ---- */
const lawPop = l => Object.keys(l.sec || {}).reduce((s, k) => s + S.pol.sec[k].w * l.sec[k], 0);
function lawForecast(l, extra) {
  const ap = approval(), pop = lawPop(l), lc = localCtl(), by = []; let yes = 0;
  for (const p of S.pol.seats) {
    const dist = Math.abs((l.eco || 0) - p.ideo);
    let x = (p.g ? .75 : -.1) - .22 * dist * (p.g ? .5 : 1) + (ap - 50) / 80 + pop / 30 + mod('lawVote') + (extra || 0) + (lc == null ? 0 : (lc - .5) * .1);
    if (!p.g && (l.auth || 0) > 0 && isDem()) x -= .2 * l.auth;
    const f = clamp(.5 + x, .03, .97); by.push({ n: p.n, s: p.s, f, g: p.g, ideo: p.ideo }); yes += p.s * f;
  }
  return { yes, by, need: (l.maj || .5) * 100, pop };
}
const invLaw = l => { const sec = {}; for (const k in l.sec || {}) sec[k] = -l.sec[k]; return { n: l.n, eco: -(l.eco || 0), auth: -(l.auth || 0), sec, maj: l.maj }; };
const bribeCost = () => P().gdp * .002 * Math.max(.2, 1 - mod('bribe'));
function runVote(l, extra, title) {
  const f = lawForecast(l, extra); let yes = 0;
  const by = f.by.map(p => { const y = Math.round(p.s * clamp(p.f + rr(-.12, .12), 0, 1)); yes += y; return { n: p.n, s: Math.round(p.s), yes: y, g: p.g, ideo: p.ideo }; });
  const res = { title, by, yes, need: f.need, pass: yes > f.need };
  Bus.emit('vote', res); return res;
}
function enactLaw(l) {
  for (const id in S.pol.laws) if (l.grp && LAW[id].grp === l.grp) { delete S.pol.laws[id]; news(`Queda derogada: ${LAW[id].n}`, 'pol'); }
  S.pol.laws[l.id] = S.turn; S.stats.laws++;
  for (const k in l.sec || {}) secAdd(k, l.sec[k]);
  for (const k in l.rep || {}) repAdd(k, l.rep[k]);
  if (l.once) applyFx(l.once, {});
}
ACT.proposeLaw = a => {
  const l = LAW[a.id], pol = S.pol, mode = a.mode || 'normal'; if (!l) return fail('Ley desconocida');
  if (pol.laws[l.id] != null) return fail('Esa ley ya está vigente');
  if ((pol.cool[l.id] || 0) > S.turn) return fail(`El congreso no la volverá a discutir hasta dentro de ${pol.cool[l.id] - S.turn} turnos`);
  if (mode === 'decree') {
    if (!mod('decree') && isDem()) return fail('Solo un líder de Mano de hierro puede gobernar por decreto en democracia');
    if (!useCP(3)) return fail('Necesitas 3 de capital político');
    enactLaw(l); repAdd('dem', -8); P().stab = clamp(P().stab - 3, 0, 100); secAdd('all', -2);
    news(`Por decreto: ${l.n}`, 'pol', S.player, 2);
    return { msg: `Impones por decreto: ${l.n}. El mundo toma nota.` };
  }
  let extra = 0, cp = 2;
  if (mode === 'lobby') { cp = 3; extra = .12; }
  if (pol.cp < cp) return fail(`Necesitas ${cp} de capital político`);
  if (mode === 'bribe') { const cost = bribeCost(); if (!canPay(cost)) return fail('No tienes fondos para comprar votos'); P().tr -= cost; extra = .2; }
  useCP(cp);
  if (mode === 'bribe' && chance(.25 * (1 + mod('scandal')))) S.later.push({ t: S.turn + ri(1, 3), p: 1, fx: [['sec', 'all', -7], ['rep', 'conf', -5], ['flag', 'scandal']], msg: `Se destapa la compra de votos para aprobar "${l.n}"` });
  const res = runVote(l, extra, l.n);
  if (res.pass) { enactLaw(l); news(`El congreso aprueba: ${l.n} (${res.yes}–${100 - res.yes})`, 'pol', S.player, 2); return { vote: res, msg: `Aprobada: ${l.n}` }; }
  pol.cool[l.id] = S.turn + 4; secAdd('all', -1);
  news(`El congreso tumba tu propuesta: ${l.n} (${res.yes}–${100 - res.yes})`, 'pol', S.player, 2);
  return { vote: res, ok: false, msg: `Rechazada: ${l.n}. No podrás reintentarlo en 4 turnos.` };
};
ACT.repealLaw = a => {
  const l = LAW[a.id]; if (!l || S.pol.laws[l.id] == null) return fail('Esa ley no está vigente');
  if (!useCP(2)) return fail('Necesitas 2 de capital político');
  const res = runVote(invLaw(l), 0, 'Derogar: ' + l.n);
  if (!res.pass) { secAdd('all', -1); return { vote: res, ok: false, msg: `El congreso mantiene la ley: ${l.n}` }; }
  delete S.pol.laws[l.id]; for (const k in l.sec || {}) secAdd(k, -l.sec[k] * .6);
  news(`Derogada: ${l.n}`, 'pol', S.player, 2);
  return { vote: res, msg: `Derogada: ${l.n}` };
};

/* ---- evolución por turno: sectores, estabilidad, capital político ---- */
function politicsTurn(g) {
  const pol = S.pol, c = P(), war = inWar(S.player);
  for (const k in pol.sec) {
    const s = pol.sec[k]; let d = (secBase(k) - s.a) * .08;
    if (g > .7 && (k === 'emp' || k === 'med' || k === 'obr')) d += .5; if (g < 0) d -= .6;
    if (c.tr < -c.gdp * .1) d -= .5;
    if (war) { const sc = warScoreFor(S.player); d += k === 'jov' ? -1.2 : k === 'mil' ? (sc >= 0 ? 1 : -1.5) : -.25; }
    s.a = clamp(s.a + d, 0, 100);
  }
  const ap = approval();
  const lcS = localCtl();
  const target = 32 + ap * .5 + (lcS == null ? 0 : (lcS - .5) * 4) + lawSum('stab') + (g > 0 ? 3 : -4) - (war ? 6 : 0) - (c.tr < -c.gdp * .2 ? 8 : 0);
  c.stab = clamp(c.stab + (target - c.stab) * .12 + mod('stabT') + rr(-1, 1), 0, 100);
  pol.cp = clamp(pol.cp + 3 + mod('cp') + (ap > 60 ? 1 : 0) - (ap < 35 ? 1 : 0), 0, 12);
  if (mod('repPazT') && !war) repAdd('paz', mod('repPazT'));
}

/* ---- elecciones ---- */
function electionTurn() {
  if (!isDem() || S.over) return;
  const left = S.pol.nextElec - S.turn;
  if (left === 2) {
    const opts = [
      { t: 'Campaña millonaria', fx: [['$g', -.6], ['camp', 5]] },
      { t: 'Prometerlo todo', fx: [['camp', 6]], hid: [['later', 4, .8, [['sec', 'all', -6]], 'Las promesas de campaña incumplidas te pasan factura']] },
      { t: 'Campaña limpia y austera', fx: [['camp', 1], ['rep', 'dem', 3]] }];
    if (P().reg === 'hib' || mod('graft') || mod('decree')) opts.push({ t: 'Preparar el fraude', fx: [['camp', 12], ['rep', 'dem', -15]], hid: [['chance', .4, [['later', 3, 1, [['stab', -20], ['sec', 'all', -10], ['rep', 'conf', -10]], 'Pruebas del fraude electoral sacan al país a la calle']], []]] });
    pushPend({ k: 'elec', t: 'Arranca la campaña electoral', x: `Faltan dos trimestres para las elecciones. Tu aprobación está en ${Math.round(approval())}%. ¿Cómo vas a pelear la reelección?`, iso: S.player, opts });
  }
  if (left <= 0) {
    const lc = localCtl();
    const share = clamp(50 + (approval() - 50) * .9 + mod('elect') + lawSum('elect') + S.pol.camp + 2 + (P().reg === 'hib' ? 5 : 0) + (lc == null ? 0 : (lc - .5) * 4) - (S.flags.scandal ? 4 : 0) + rr(-4, 4), 5, 95);
    const win = share >= 50; S.pol.camp = 0; delete S.flags.scandal;
    Bus.emit('election', { share, win });
    if (!win) { news(`${S.leader.n} pierde las elecciones con el ${share.toFixed(1)}% de los votos`, 'elec', S.player, 3); return over('eleccion'); }
    S.pol.nextElec = S.turn + 16; S.stats.elections++;
    // el congreso y los gobiernos locales se recomponen según el resultado
    const d = (share - 50) * .5, gov = S.pol.seats[0], opp = S.pol.seats.filter(p => !p.g).sort((a, b) => b.s - a.s)[0];
    if (opp) { const x = clamp(d, -gov.s + 5, opp.s - 3); gov.s += x; opp.s -= x; }
    const rul = rulingTag();
    if (rul) for (const t of P().terr) if (t.o === S.player && t.p) { if (t.p !== rul && chance((share - 50) / 40)) t.p = rul; else if (t.p === rul && chance((54 - share) / 30)) t.p = 'Oposición'; }
    secAdd('all', 2);
    news(`${S.leader.n} gana la reelección con el ${share.toFixed(1)}% de los votos`, 'elec', S.player, 3);
  }
}
