/* =====================================================================
   SISTEMA · GUERRA: declaración con reacciones en cadena, batallas por
   turno, conquista territorio a territorio, paz, anexión y títeres.
   war = { id, att:[líder,...], def:[líder,...], s:turno, score:-100..100 (a favor del atacante), casus }
   ===================================================================== */
const warById = id => S.wars.find(w => w.id === id);
function warScoreFor(iso) { let s = 0; for (const w of warsOf(iso)) s += w.att.includes(iso) ? w.score : -w.score; return s; }

function joinWar(w, iso, side, quiet) {
  if (w.att.includes(iso) || w.def.includes(iso) || !C(iso).alive) return;
  const foes = side === 'att' ? w.def : w.att; if (foes.some(f => alliesOf(iso).includes(f) && hasExplicit('def', iso, f))) return;
  w[side].push(iso); for (const f of foes) endTreaties(iso, f); dirty();
  addMod(iso, foes[0], 'Guerra entre ambos', -30, .25, 1);
  if (quiet) { quiet.push(iso); return; }
  news(`${nm(iso)} entra en la guerra del lado de ${nm(w[side][0])}`, 'war', iso, isP(iso) || isP(w.att[0]) || isP(w.def[0]) ? 3 : 2);
}
function callToArms(w, ally, foe, side) {
  return {
    k: 'war', t: side === 'def' ? `${nm(ally)} ha sido atacado` : `${nm(ally)} va a la guerra`, iso: ally,
    x: side === 'def' ? `${nm(foe)} ha declarado la guerra a ${nm(ally)}, tu aliado. ${C(ally).lider.n} invoca el pacto y espera tu respuesta.` : `Tu aliado ${nm(ally)} ha atacado a ${nm(foe)} y te pide que te sumes a la ofensiva.`,
    opts: [{ t: side === 'def' ? 'Honrar el pacto: entrar en guerra' : 'Sumarte a la ofensiva', fx: [['do', 'joinWar', { w: w.id, side }], ['rep', 'conf', 8], ['rel', 'T', 15, 'Acudiste a su llamada']] },
    { t: 'Enviar solo dinero y armas', fx: [['$g', -.4], ['rel', 'T', 4, 'Los apoyaste sin combatir'], ['rep', 'conf', -3]] },
    { t: 'Mantenerte al margen', fx: [['do', 'abandon', { ally }], ['rep', 'conf', side === 'def' ? -18 : -5], ['rel', 'T', side === 'def' ? -30 : -10, 'No acudiste cuando te llamaron']] }]
  };
}
OPS.joinWar = a => { const w = warById(a.w); if (w) { joinWar(w, S.player, a.side); S.stats.wars++; repAdd('paz', -6); } };
OPS.abandon = a => { if (endTreaties(S.player, a.ally, ['ali', 'def'])) news(`${P().n} abandona a ${nm(a.ally)} y rompe su alianza`, 'dip', a.ally, 2); };

function startWar(a, d) {
  if (a === d || atWar(a, d) || !C(a).alive || !C(d).alive) return null;
  const casus = rel(a, d) < -40 || sanctioned(d, a) || alliesOf(a).some(x => atWar(x, d));
  const pact = hasExplicit('pna', a, d) || alliesOf(a).includes(d);
  const dAllies = alliesOf(d), aAllies = alliesOf(a); // se calculan antes de romper tratados
  endTreaties(a, d);
  const w = { id: ++S.wid, att: [a], def: [d], s: S.turn, score: 0, casus: casus ? 1 : 0 }; S.wars.push(w); dirty();
  addMod(a, d, 'Guerra entre ambos', -40, .25, 1);
  const big = isP(a) || isP(d) || C(a).gdp > 800 || C(d).gdp > 800 ? 3 : 2;
  news(`${nm(a)} declara la guerra a ${nm(d)}`, 'war', a, big);
  if (pact) { // traición: todo el mundo toma nota
    const k = isP(a) ? 1 + mod('betray') : 1;
    for (const z of alive()) if (z !== a && z !== d && C(z).per.rencor > .35) addMod(a, z, 'Rompió un pacto para atacar', -12 * k, .3, 1);
    if (isP(a)) repAdd('conf', -30 * k);
  }
  if (isP(a)) { repAdd('paz', casus ? -10 : -22); S.stats.wars++; }
  const ja = [], jd = [], sumUp = (l, lead) => { if (l.length) news(`${l.length === 1 ? nm(l[0]) + ' entra' : l.length + ' países entran'} en la guerra del lado de ${nm(lead)}${l.length > 1 ? ': ' + l.slice(0, 5).map(nm).join(', ') + (l.length > 5 ? '…' : '') : ''}`, 'war', l[0], big); };
  // 1) los aliados del agredido deciden si intervienen
  for (const x of dAllies) {
    if (x === a || !C(x).alive || atWar(x, a) || aAllies.includes(x)) continue;
    if (isP(x)) { pushPend(callToArms(w, d, a, 'def')); continue; }
    const p = C(x).per, sc = (hasT('def', x, d) ? .45 : .25) + p.leal * .5 + rel(x, d) / 250 - rel(x, a) / 250 - (C(a).nuke && !C(x).nuke ? .15 : 0);
    if (sc > .62) joinWar(w, x, 'def', jd);
    else if (sc < .42 && endTreaties(x, d, ['ali', 'def'])) { addMod(x, d, 'No acudió en su defensa', -30, .4, 1); news(`${nm(x)} abandona a ${nm(d)} y rompe su alianza`, 'dip', x, 2); }
  }
  // 2) los aliados del agresor: lo apoyan, se abstienen o lo abandonan
  for (const y of aAllies) {
    if (y === d || !C(y).alive || w.def.includes(y) || dAllies.includes(y)) continue;
    if (isP(y)) { pushPend(callToArms(w, a, d, 'att')); continue; }
    const p = C(y).per, sc = p.leal * .45 + rel(y, a) / 220 - rel(y, d) / 220 + (casus ? .15 : -.15) - (C(y).reg === 'dem' && !casus ? .2 : 0) + p.agres * .2 - (hasExplicit('ali', y, a) ? 0 : .3);
    if (sc > .6) joinWar(w, y, 'att', ja);
    else if (!casus && sc < .3 && endTreaties(y, a, ['ali', 'def'])) { addMod(y, a, 'Rechazó una guerra de agresión', -20, .4, 1); news(`${nm(y)} rompe su alianza con ${nm(a)} por la invasión`, 'dip', y, 2); }
    else addMod(y, a, 'No se sumó a la guerra', -4, 1);
  }
  sumUp(jd, d); sumUp(ja, a);
  // 3) terceros: sanciones al agresor
  let ns = 0;
  for (const z of alive()) {
    if (z === a || z === d || isP(z) || inWar(z) && (w.att.includes(z) || w.def.includes(z))) continue; const c = C(z);
    if ((c.gdp > 400 || rel(z, d) > 50) && rel(z, d) - rel(z, a) > (casus ? 55 : 35) && c.per.coop > .35 && addSanction(z, a)) ns++;
    if (!casus && c.reg === 'dem') addMod(a, z, 'Guerra de agresión', -8, .3, 1);
  }
  // potencias protectoras: sin tratado, pero no piensan dejar caer a su amigo
  for (const z of alive()) {
    if (z === a || z === d || isP(z) || w.att.includes(z) || w.def.includes(z) || C(z).gdp < 800) continue;
    if (rel(z, d) >= 40 && rel(z, a) <= -25 && power(z) > power(a) * .5 && chance(.35 + C(z).per.agres * .3)) joinWar(w, z, 'def');
  }
  if (ns) news(`${ns} países imponen sanciones a ${nm(a)} por la invasión`, 'dip', a, big);
  // 4) mercados
  S.mkt.shocks.push({ k: 'def', m: 1.06 }); S.mkt.sent -= .02;
  for (const x of [a, d]) { if ((C(x).rec.pet || 0) >= 4) S.mkt.shocks.push({ k: 'pet', m: 1.15 }); if ((C(x).rec.gas || 0) >= 4) S.mkt.shocks.push({ k: 'gas', m: 1.15 }); if ((C(x).rec.tri || 0) >= 4) S.mkt.shocks.push({ k: 'tri', m: 1.12 }); }
  Bus.emit('war', { a, d, id: w.id });
  return w;
}
ACT.declareWar = a => {
  const iso = a.iso, me = S.player; if (!S.c[iso] || !S.c[iso].alive || iso === me) return fail('País inválido');
  if (atWar(me, iso)) return fail('Ya estás en guerra con ese país');
  if (!canReach(me, iso)) return fail(`${nm(iso)} está fuera de tu alcance: necesitas frontera, una armada mayor o una base en su región`);
  if (!useCP(4)) return fail('Necesitas 4 de capital político');
  startWar(me, iso);
  return { msg: `Has declarado la guerra a ${nm(iso)}` };
};

const gdist = (t, c) => { const r = Math.PI / 180, dl = (t.lo - c.lon) * r; return Math.acos(clamp(Math.sin(t.la * r) * Math.sin(c.lat * r) + Math.cos(t.la * r) * Math.cos(c.lat * r) * Math.cos(dl), -1, 1)); };
function casualties(iso, frac) {
  const c = C(iso), k = isP(iso) ? Math.max(.3, 1 + mod('casual')) : 1;
  for (const u in D.UNITS) if (c.u[u]) c.u[u] = Math.max(0, c.u[u] - Math.floor(c.u[u] * frac * k + rnd()));
}
/* el vencedor de la batalla avanza: primero libera lo suyo, luego conquista (la capital cae al final) */
function capture(taker, victim, n) {
  const names = [], tk = C(taker), v = C(victim);
  // orden: primero lo más cercano al atacante; la capital (índice 0) siempre al final
  const near = (owner, from) => { const g = D.C[owner].terr, A = D.C[from]; return C(owner).terr.map((t, i) => i).filter(i => C(owner).terr[i].o === victim).sort((a, b) => (a === 0) - (b === 0) || gdist(g[a], A) - gdist(g[b], A)); };
  for (const i of near(taker, victim)) { if (n <= 0) break; restoreTerr(taker, i); names.push(tk.terr[i].n + ' (liberado)'); n--; }
  for (const i of near(victim, taker)) { if (n <= 0) break; if (i === 0 && v.nuke) continue; moveTerr(victim, i, taker, .7); names.push(v.terr[i].n); n--; }
  return names;
}
function returnOccupied(w) { // paz blanca: cada bando devuelve lo ocupado
  const all = w.att.concat(w.def);
  for (const x of all) { const c = C(x); c.terr.forEach((t, i) => { if (t.o !== x && all.includes(t.o) && w.att.includes(x) !== w.att.includes(t.o)) restoreTerr(x, i); }); }
}
function endWar(w, kind) {
  const i = S.wars.indexOf(w); if (i < 0) return; const a = w.att[0], d = w.def[0];
  if (kind === 'blanca') returnOccupied(w);
  S.wars.splice(i, 1); dirty();
  if (kind !== 'fin' && C(a).alive && C(d).alive) { addMod(a, d, 'Acuerdo de paz', 15, 1); news(kind === 'blanca' ? `${nm(a)} y ${nm(d)} firman la paz y vuelven a sus fronteras` : `${nm(a)} y ${nm(d)} firman la paz: cada uno conserva lo que ocupa`, 'peace', a, isP(a) || isP(d) ? 3 : 2); Bus.emit('peace', { a, d }); }
}
function purgeWars() { for (const w of S.wars.slice()) { w.att = w.att.filter(x => C(x).alive || x === w.att[0]); w.def = w.def.filter(x => C(x).alive || x === w.def[0]); if (!C(w.att[0]).alive || !C(w.def[0]).alive) { S.wars.splice(S.wars.indexOf(w), 1); dirty(); } } }

function annex(v, t) {
  const V = C(v), Tk = C(t);
  for (const iso of ISOS) { const c = S.c[iso]; if (iso !== v && c.owner === v) c.owner = t; if (iso !== v) c.terr.forEach((x, i) => { if (x.o === v) { if (iso === t) restoreTerr(t, i); else x.o = t; } }); }
  V.terr.forEach(x => { x.o = t; }); Tk.gdp += V.gdp * .7; Tk.pop += V.pop; V.gdp = Math.max(.01, V.gdp * .01); V.pop = Math.max(.001, V.pop * .01);
  for (const k in V.rec) Tk.rec[k] = Math.min(5, Math.max(Tk.rec[k] || 0, V.rec[k]) + ((Tk.rec[k] || 0) >= 2 && V.rec[k] >= 2 ? 1 : 0));
  V.alive = false; V.owner = t; for (const k in V.u) V.u[k] = 0;
  S.tr = S.tr.filter(x => x.a !== v && x.b !== v); S.sanc = S.sanc.filter(x => x.by !== v && x.on !== v); S.bases = S.bases.filter(x => x.by !== v && x.in !== v);
  S.contracts = S.contracts.filter(x => x.to !== v); dirty(); purgeWars();
  for (const z of alive()) if (z !== t && (D.C[v].bord.includes(z) || C(z).gdp > 800)) addMod(t, z, `Anexión de ${V.n}`, -10, .2, 1);
  if (isP(t)) { repAdd('paz', -15); S.stats.annexed++; }
  news(`${Tk.n} anexa ${V.n}`, 'war', t, 3); Bus.emit('annex', { v, t });
  if (isP(v)) over('conquista');
}
function puppet(v, t) {
  const V = C(v); V.terr.forEach((x, i) => { if (x.o !== v) restoreTerr(v, i); });
  V.reg = C(t).reg === 'dem' ? 'hib' : C(t).reg; V.lider = { n: genLeader(v), verificado: false, img: '', gen: 1 }; V.partido = `Gobierno afín a ${nm(t)}`; V.stab = 40;
  delete S.mods[key(v, t)]; addMod(v, t, 'Gobierno instalado', 60, .2); addTreaty('ali', v, t); dirty();
  if (isP(t)) repAdd('dem', -8);
  news(`${nm(t)} instala un gobierno títere en ${V.n}`, 'war', t, 3); Bus.emit('coup', { iso: v });
}
OPS.annex = a => { const w = warById(a.w); annex(a.v, S.player); if (w) endWar(w, 'fin'); };
OPS.puppet = a => { const w = warById(a.w); puppet(a.v, S.player); if (w) endWar(w, 'fin'); };
OPS.liberate = a => { const w = warById(a.w); if (w) endWar(w, 'blanca'); addMod(S.player, a.v, 'Se retiró tras vencer', 20, .3); };
function capitulate(w, loser, winner) {
  news(`${nm(loser)} capitula ante ${nm(winner)}`, 'war', winner, 3);
  if (isP(loser)) { annex(loser, winner); return; }
  if (isP(winner)) {
    pushPend({ k: 'war', t: `${nm(loser)} ha capitulado`, iso: loser, x: `Tus tropas controlan todo ${nm(loser)}. ${C(loser).lider.n} ha huido. El mundo espera a ver qué haces con el país.`,
      opts: [{ t: 'Anexarlo', fx: [['do', 'annex', { v: loser, w: w.id }]] }, { t: 'Instalar un gobierno afín', fx: [['do', 'puppet', { v: loser, w: w.id }]] },
      { t: 'Retirarte y devolver el país', fx: [['do', 'liberate', { v: loser, w: w.id }], ['rep', 'paz', 8], ['rep', 'conf', 5], ['sec', 'mil', -6]] }] });
    return;
  }
  if (C(winner).per.expan > .5) annex(loser, winner); else puppet(loser, winner);
  if (S.wars.includes(w)) endWar(w, 'fin');
}

function warTurn(w) {
  if (!S.wars.includes(w)) return;
  const la = w.att[0], ld = w.def[0];
  if (S.pend.some(p => p.k === 'war' && p.opts.some(o => (o.fx || []).some(f => f[0] === 'do' && f[2] && f[2].w === w.id && f[1] !== 'joinWar')))) return; // espera la decisión del jugador
  const A = w.att.filter(x => C(x).alive), Dn = w.def.filter(x => C(x).alive);
  if (!C(la).alive || !C(ld).alive) return endWar(w, 'fin');
  theatreTurn(w); if (!S.wars.includes(w)) return; // Fase 3: batallas región a región (7a-theatre.js)
  A.concat(Dn).forEach(x => { const c = C(x), lead = x === la || x === ld; c.stab = clamp(c.stab - (lead ? 1.2 : .4), 0, 100); if (!isP(x)) c.gdp *= lead ? .996 : .999; });
  if (ownCount(ld) === 0) return capitulate(w, ld, la);
  if (ownCount(la) === 0) return capitulate(w, la, ld);
  // --- búsqueda de la paz
  const dur = S.turn - w.s; if (dur < 3) return;
  const loser = w.score < -30 ? la : w.score > 30 ? ld : null, winner = loser === la ? ld : la;
  if (loser && !isP(loser)) {
    if (isP(winner)) { if ((w.ask || 0) <= S.turn) { w.ask = S.turn + 4; pushPend({ k: 'peace', t: `${nm(loser)} pide la paz`, iso: loser, x: `${C(loser).lider.n} ofrece un alto el fuego: conservarías lo que ya ocupas. Su ejército está exhausto.`, opts: [{ t: 'Aceptar la paz', fx: [['do', 'peace', { w: w.id, kind: 'actual' }], ['rep', 'paz', 6]] }, { t: 'Seguir hasta la capitulación', fx: [['rep', 'paz', -5]] }] }); } }
    else if (dur > 5 && chance(.4)) return endWar(w, 'actual');
  } else if (loser && isP(loser) && (w.ask || 0) <= S.turn) {
    w.ask = S.turn + 4; const rep = P().gdp * .015;
    pushPend({ k: 'peace', t: `${nm(winner)} dicta sus condiciones`, iso: winner, x: `${C(winner).lider.n} ofrece detener la ofensiva si aceptas la pérdida de los territorios ocupados y pagas ${money(rep)} en reparaciones.`, opts: [{ t: 'Aceptar las condiciones', fx: [['$', -rep], ['do', 'peace', { w: w.id, kind: 'actual' }], ['sec', 'mil', -10], ['sec', 'all', -4]] }, { t: 'Seguir luchando', fx: [['sec', 'mil', 4]] }] });
  } else if (!isP(la) && !isP(ld) && (dur > 20 || (Math.abs(w.score) < 15 && dur > 8 && chance(.2)))) return endWar(w, 'blanca');
}
OPS.peace = a => { const w = warById(a.w); if (w) endWar(w, a.kind); };
/* el jugador propone la paz: blanca (todo vuelve), actual (cada uno conserva lo ocupado) o rendición */
ACT.peace = a => {
  const w = warById(a.w), me = S.player; if (!w) return fail('Esa guerra ya terminó');
  const mineAtt = w.att[0] === me, mineDef = w.def[0] === me;
  if (!mineAtt && !mineDef) { // participante secundario: puede retirarse
    w.att = w.att.filter(x => x !== me); w.def = w.def.filter(x => x !== me); dirty(); repAdd('conf', -8);
    news(`${P().n} se retira de la guerra`, 'peace', me, 2); return { msg: 'Retiras a tus tropas. Tus aliados no lo olvidarán.' };
  }
  if (!useCP(1)) return fail('Necesitas 1 de capital político');
  const foe = mineAtt ? w.def[0] : w.att[0], sc = mineAtt ? -w.score : w.score, dur = S.turn - w.s; // sc: marcador desde el enemigo
  if (a.kind === 'rendicion') { const rep = P().gdp * .02; P().tr -= rep; C(foe).tr += rep; secAdd('mil', -12); secAdd('all', -5); endWar(w, 'actual'); return { msg: `Te rindes ante ${nm(foe)} y pagas ${money(rep)} en reparaciones` }; }
  const ok = a.kind === 'blanca' ? (sc < 10 && dur >= 2) || C(foe).stab < 30 : sc <= 35;
  if (!ok) return { ok: false, msg: `${nm(foe)} rechaza la paz: cree que va ganando` };
  endWar(w, a.kind === 'blanca' ? 'blanca' : 'actual'); repAdd('paz', 5);
  return { msg: `Paz firmada con ${nm(foe)}` };
};

/* ---- construcción militar del jugador ---- */
const unitCost = k => D.UNITS[k].cost * costLvl(S.player) * Math.max(.3, 1 + mod('unitCost'));
const capacity = cat => { const b = Object.keys(D.BASES).find(k => D.BASES[k].cat === cat); return Math.round((P().bases[b] || 0) * D.BASES[b].cap * (cat === 'tierra' ? 1 + lawSum('cap') : 1)) - (S.built[cat] || 0); };
ACT.recruit = a => {
  const u = D.UNITS[a.k], n = Math.floor(+a.n); if (!u || !(n > 0)) return fail('Orden inválida');
  if (n > capacity(u.cat)) return fail(`Tus bases solo pueden formar ${Math.max(0, capacity(u.cat))} unidades más de ${D.CATS[u.cat].toLowerCase()} este turno: construye más bases`);
  const cost = unitCost(a.k) * n; if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`);
  for (const r in u.res) if ((P().stock[r] || 0) < u.res[r] * n) return fail(`Te falta ${D.COMMODITIES[r].n.toLowerCase()}: necesitas ${u.res[r] * n} u`);
  for (const r in u.res) P().stock[r] -= u.res[r] * n;
  P().tr -= cost; P().u[a.k] = (P().u[a.k] || 0) + n; S.built[u.cat] = (S.built[u.cat] || 0) + n;
  if (n * u.pow > power(S.player) * .05) for (const z of nb(S.player)) if (rel(S.player, z) < 0) addMod(S.player, z, 'Tu rearme los inquieta', -3, 1);
  return { msg: `${n} × ${u.n} se incorporan a tus fuerzas (${money(cost)})` };
};
ACT.disband = a => {
  const u = D.UNITS[a.k], n = Math.min(Math.floor(+a.n), P().u[a.k] || 0); if (!u || !(n > 0)) return fail('Orden inválida');
  P().u[a.k] -= n; secAdd('mil', -Math.min(6, n * u.pow / (power(S.player) + 1) * 40));
  return { msg: `Desmovilizas ${n} × ${u.n}` };
};
ACT.buildBase = a => {
  const b = D.BASES[a.k]; if (!b) return fail('Base desconocida');
  if (a.k === 'naval' && D.C[S.player].land) return fail('Tu país no tiene salida al mar');
  const cost = b.cost * costLvl(S.player) * (1 + (P().bases[a.k] || 0) * .1); if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`);
  P().tr -= cost; P().bases[a.k] = (P().bases[a.k] || 0) + 1; secAdd('mil', 2);
  return { msg: `${b.n} construida: +${b.cap} unidades de ${D.CATS[b.cat].toLowerCase()} por turno` };
};
const baseCost = k => D.BASES[k].cost * costLvl(S.player) * (1 + (P().bases[k] || 0) * .1);
