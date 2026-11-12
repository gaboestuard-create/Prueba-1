/* =====================================================================
   SISTEMA · ASAMBLEA Y FOROS (Fase 2)
   Amplía la ONU existente: resoluciones propuestas por IAs, debate,
   cabildeo país por país, veto del consejo, misiones de paz; y añade
   cumbres bilaterales e ingreso o salida de bloques.
   ===================================================================== */
UNT.mision = 'Misión de paz';
const BINDING = { sanc: 1, mision: 1 };
{ // se envuelven las funciones de la ONU de la Fase 1 en lugar de reescribirlas
  const sc0 = unScore, tx0 = unText, gr0 = genResolution, us0 = unSession, uv0 = OPS.unVote, up0 = ACT.unPropose;
  unScore = (z, r) => (r.type === 'mision' ? sc0(z, Object.assign({}, r, { type: 'cese' })) + .1 : sc0(z, r)) + ((r.buy || {})[z] || 0);
  unText = r => r.type === 'mision' ? `Se vota enviar una misión de paz a la guerra entre ${warById(r.war) ? nm(warById(r.war).att[0]) + ' y ' + nm(warById(r.war).def[0]) : 'los beligerantes'}. Es vinculante: si se aprueba, las tropas vuelven a sus fronteras.` : tx0(r);
  genResolution = () => { const r = gr0(); if (r && r.type === 'cese' && chance(.5)) r.type = 'mision'; return r; };
  unSession = () => {
    const n = S.pend.length; us0(); const p = S.pend[n], r = S.un.cur; if (!p || p.k !== 'un' || !r) return;
    r.buy = {}; if (!r.by) r.by = unProposer(r);
    p.x = unText(r) + (r.by === S.player ? ' La propuesta es tuya.' : ` La propone ${nm(r.by)}.`);
    if (D.P5.includes(S.player) && BINDING[r.type]) p.opts.push({ t: 'Vetar la resolución', fx: [['do', 'unVote', { v: -1, veto: 1 }]] });
  };
  OPS.unVote = a => {
    const r = S.un.cur; if (!r) return; const me = S.player;
    let vetoBy = a.veto && D.P5.includes(me) ? me : null;
    if (!vetoBy && BINDING[r.type]) vetoBy = D.P5.filter(z => z !== me && S.c[z].alive).sort((x, y) => unScore(x, r) - unScore(y, r)).find(z => unScore(z, r) < -.45) || null;
    if (!vetoBy) return uv0(a);
    S.un.cur = null; const votes = {}; let yes = 0, no = 0, abs = 0;
    for (const z of alive()) { const sc = z === me ? a.v : unScore(z, r), v = sc > .12 ? 1 : sc < -.12 ? -1 : 0; votes[z] = v; if (v > 0) yes++; else if (v < 0) no++; else abs++; }
    if (vetoBy === me) { repAdd('conf', -4); repAdd('paz', r.type === 'mision' ? -8 : -3); if (r.target && r.target !== me) addMod(me, r.target, 'Vetaste una resolución contra ellos', gain(15), .4); for (const z in votes) if (votes[z] > 0 && z !== me && S.c[z].gdp > 300) addMod(me, z, 'Tu veto en el consejo', -3, .5); }
    S.un.last = { r, yes, no, abs, pass: false, mine: a.v, veto: vetoBy };
    news(`ONU · ${UNT[r.type]}${r.target ? ' (' + nm(r.target) + ')' : ''}: vetada por ${nm(vetoBy)} pese a ${yes} votos a favor`, 'un', r.target, 3);
    Bus.emit('un', { r, yes, no, abs, pass: false, votes, out: [[`Veto de ${nm(vetoBy)} en el consejo`, -1]], title: UNT[r.type], veto: vetoBy });
  };
  ACT.unPropose = a => { if (a.type !== 'mision') return up0(a); const r = up0(Object.assign({}, a, { type: 'cese' })); if (r.ok !== false && S.un.queue) S.un.queue.type = 'mision'; return r; };
}
Bus.on('un', u => { // la misión de paz es vinculante
  if (u.r.type !== 'mision' || !u.pass) return; const w = warById(u.r.war); if (!w) return;
  const mine = w.att[0] === S.player || w.def[0] === S.player; endWar(w, 'blanca'); u.out.push(['Cascos azules: las tropas vuelven a sus fronteras', 1]);
  if (mine) { repAdd('paz', 4); secAdd('mil', -4); }
});
function unProposer(r) {
  const big = alive().filter(z => z !== S.player && S.c[z].gdp > 250 && z !== r.target), X = r.target;
  if ((r.type === 'sanc' || r.type === 'condena') && X) return big.sort((a, b) => rel(a, X) - rel(b, X))[0] || big[0];
  return big.sort((a, b) => S.c[b].per.coop - S.c[a].per.coop)[ri(0, Math.min(5, big.length - 1))] || ISOS[0];
}
const QUOTE = { 1: ['Es hora de que esta asamblea actúe.', 'Votaremos a favor sin reservas.', 'El mundo no puede mirar hacia otro lado.'], '-1': ['Esto es una injerencia inaceptable.', 'No apoyaremos un texto escrito contra nosotros.', 'Votaremos en contra.'], 0: ['Aún estudiamos el texto.', 'Mi delegación se reserva su posición.', 'Pedimos más tiempo y menos prisa.'] };
/* resumen de la sesión para la UI: previsión, debate, indecisos y posibles vetos */
function unBrief() {
  const r = S.un.cur; if (!r) return null; const me = S.player; let yes = 0, no = 0, abs = 0; const swing = [], all = [];
  for (const z of alive()) { if (z === me) continue; const sc = unScore(z, r), v = sc > .12 ? 1 : sc < -.12 ? -1 : 0; if (v > 0) yes++; else if (v < 0) no++; else abs++; all.push([z, sc]);
    if (Math.abs(sc - (r.buy[z] || 0)) < .5 && S.c[z].gdp > 40) swing.push({ iso: z, sc, bought: r.buy[z] || 0, rel: rel(me, z) }); }
  const speak = D.P5.filter(z => z !== me && S.c[z].alive).concat(all.filter(x => !D.P5.includes(x[0])).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(x => x[0]));
  const debate = speak.map(z => { const sc = unScore(z, r), v = sc > .12 ? 1 : sc < -.12 ? -1 : 0; return { iso: z, v, q: QUOTE[v][(z.charCodeAt(0) + z.charCodeAt(1) + S.turn) % 3] }; });
  const veto = BINDING[r.type] ? D.P5.filter(z => z !== me && S.c[z].alive && unScore(z, r) < -.45) : [];
  return { r, title: UNT[r.type], yes, no, abs, debate, veto, binding: !!BINDING[r.type], swing: swing.sort((a, b) => Math.abs(a.sc) - Math.abs(b.sc)).slice(0, 10), buys: Object.keys(r.buy).length };
}
/* cabildeo: un favor (te costará relación más adelante) o ayuda en efectivo a cambio de un voto */
ACT.unLobby = a => {
  const r = S.un.cur, z = a.iso, me = S.player, dir = a.dir > 0 ? 1 : -1; if (!r || !S.c[z] || !S.c[z].alive || z === me) return fail('No hay votación abierta');
  if (Object.keys(r.buy).length >= 6) return fail('Ya no te quedan favores que repartir en esta sesión'); if (r.buy[z]) return fail('Ya negociaste con ese país');
  if (z === r.target) return fail('No puedes comprar el voto del propio afectado');
  if (a.how === 'aid') { const amt = Math.max(.2, S.c[z].gdp * .004); if (!canPay(amt)) return fail(`Necesitas ${money(amt)}`); P().tr -= amt; S.c[z].tr += amt; r.buy[z] = .7 * dir; addMod(me, z, 'Ayuda a cambio de su voto', gain(5), .5); return { msg: `${nm(z)} acepta ${money(amt)} y alinea su voto contigo` }; }
  if (rel(me, z) < 0) return fail(`${nm(z)} no te debe nada ni quiere deberte`); if (!useCP(1)) return fail('Necesitas 1 de capital político');
  r.buy[z] = .5 * dir; addMod(me, z, 'Les debes un voto', -6, .5); return { msg: `${nm(z)} votará contigo. Ahora les debes un favor.` };
};

/* ---- cumbre bilateral: comercio, seguridad o reconciliación ---- */
ACT.summit = a => {
  const iso = a.iso, me = S.player, e = dipCheck(iso); if (e) return fail(e); const c = C(iso);
  if ((c.ask.sum || 0) > S.turn) return fail(`Ya hubo cumbre con ${c.n}: espera ${c.ask.sum - S.turn} turnos`);
  if (!canPay(.5)) return fail('No hay fondos para organizar la cumbre'); if (!useCP(2)) return fail('Necesitas 2 de capital político');
  P().tr -= .5; c.ask.sum = S.turn + 6; Bus.emit('trip', { a: me, b: iso });
  if (rel(me, iso) < -50 && chance(.3)) { addMod(me, iso, 'Cumbre fallida', -6, .5); return { ok: false, msg: `La cumbre con ${c.n} acaba sin comunicado conjunto: peor que antes` }; }
  let extra = '';
  if (a.agenda === 'com') { addMod(me, iso, 'Cumbre económica', gain(8), .5); if (!hasT('com', me, iso) && !IX().sp[key(me, iso)] && treatyEval('com', iso).score + 15 >= TNEED.com) { addTreaty('com', me, iso); Bus.emit('treaty', { t: 'com', a: me, b: iso, name: TNAME.com }); extra = ' y firmáis un tratado comercial'; } else S.gm.push({ v: .08, t: 4 }); }
  else if (a.agenda === 'seg') { addMod(me, iso, 'Cumbre de seguridad', gain(6), .5); if (c.esc && c.esc[me]) { delete c.esc[me]; liftSanction(iso, me); extra = ': retiran su presión sobre ti'; } else if (!hasT('pna', me, iso) && treatyEval('pna', iso).score + 15 >= TNEED.pna) { addTreaty('pna', me, iso); Bus.emit('treaty', { t: 'pna', a: me, b: iso, name: TNAME.pna }); extra = ' y firmáis un pacto de no agresión'; } }
  else { let n = 0; for (const m of S.mods[key(me, iso)] || []) if (m.v < 0 && m.g) { n += m.v * .5; m.v *= .5; } addMod(me, iso, 'Cumbre de reconciliación', gain(5), .5); extra = n ? `: pasáis página de ${Math.round(-n)} puntos de agravios` : ''; }
  repAdd('paz', 1); news(`Cumbre bilateral entre ${P().n} y ${c.n}`, 'dip', iso, 2);
  return { msg: `Cumbre con ${c.n}${extra}` };
};
/* ---- bloques: pedir el ingreso o marcharse ---- */
function blocCheck(b) { // requisitos para entrar, con explicación
  const me = S.player, B = D.BLOCS[b], mem = alive().filter(z => z !== me && S.c[z].blocs.includes(b)), reg = D.BLOC_JOIN[b] || [], why = [];
  const avg = mem.length ? mem.reduce((a, z) => a + rel(me, z), 0) / mem.length : 0, worst = mem.length ? Math.min(...mem.map(z => rel(me, z))) : 0;
  if (reg.length && !reg.includes(D.C[me].region)) why.push('tu país no está en su región'); if (b === 'G7' && P().gdp < 1500) why.push('tu economía es demasiado pequeña');
  if (avg < 30) why.push(`la relación media con sus miembros es ${Math.round(avg)} (piden 30)`); if (worst < -20) why.push('al menos un miembro te vetaría'); if (mem.some(z => atWar(me, z))) why.push('estás en guerra con un miembro');
  return { n: B.n, members: mem.length, avg, ok: !why.length, why, inside: P().blocs.includes(b) };
}
ACT.bloc = a => {
  const b = a.b, me = S.player; if (!D.BLOCS[b]) return fail('Bloque desconocido'); const k = blocCheck(b);
  if (a.leave) { if (!k.inside) return fail('No perteneces a ese bloque'); if (!useCP(2)) return fail('Necesitas 2 de capital político'); P().blocs = P().blocs.filter(x => x !== b); dirty(); repAdd('conf', -5); for (const z of alive()) if (z !== me && S.c[z].blocs.includes(b)) addMod(me, z, `Abandonaste ${k.n}`, -8, .3, 1); news(`${P().n} abandona ${k.n}`, 'dip', me, 3); return { msg: `Sales de ${k.n}. Sus miembros lo recordarán.` }; }
  if (k.inside) return fail('Ya eres miembro'); if (!k.ok) return fail(`${k.n} rechaza tu candidatura: ${k.why.join('; ')}`); if (!useCP(4)) return fail('Necesitas 4 de capital político');
  P().blocs.push(b); dirty(); news(`${P().n} ingresa en ${k.n}`, 'dip', me, 3); Bus.emit('treaty', { t: 'bloc', a: me, b: me, name: 'Ingreso en ' + k.n });
  return { msg: `Ingresas en ${k.n}${D.BLOCS[b].def ? ': sus miembros te defenderán, y tú a ellos' : D.BLOCS[b].com ? ': libre comercio con todos sus miembros' : ''}` };
};
