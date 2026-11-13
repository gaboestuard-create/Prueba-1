/* =====================================================================
   SISTEMA · EVENTOS: intérprete de efectos (fx), eventos interactivos,
   titulares del mundo, consecuencias diferidas y Asamblea de la ONU.
   ===================================================================== */
const REPN = { paz: 'Reputación pacífica', conf: 'Confianza mundial', dem: 'Reputación democrática', gen: 'Reputación generosa' };
const RELF = { big: 'Relación con las potencias', rich: 'Relación con los países ricos', friends: 'Relación con tus amigos', trade: 'Relación con tus socios comerciales', enemiesOfT: 'Relación con sus enemigos', neighbors: 'Relación con tus vecinos' };

function applyFx(list, ctx) {
  const c = P(), T = ctx && ctx.T;
  for (const f of list || []) {
    const [k, a, b, d, e] = f;
    switch (k) {
      case '$': c.tr += a; break;
      case '$g': c.tr += c.gdp * a / 100; break;
      case 'stab': c.stab = clamp(c.stab + a, 0, 100); break;
      case 'cp': S.pol.cp = clamp(S.pol.cp + a, 0, 12); break;
      case 'sec': secAdd(a, b); break;
      case 'rep': repAdd(a, b); break;
      case 'rel': { const t = a === 'T' ? T : a; if (t && t !== S.player && S.c[t] && S.c[t].alive) addMod(S.player, t, d || 'Una decisión tuya', b > 0 ? gain(b) : b, .5, b < 0); break; }
      case 'relAll': relAll(a, b, d, T); break;
      case 'grow': S.gm.push({ v: a, t: b }); break;
      case 'price': case 'stock': S.mkt.shocks.push({ k: a, m: b }); break;
      case 'stockHome': S.mkt.shocks.push({ k: 'home', m: a }); break;
      case 'sent': S.mkt.sent += a; break;
      case 'prod': c.rec[a] = Math.min(5, (c.rec[a] || 0) + b); break;
      case 'units': for (const u in D.UNITS) if (D.UNITS[u].cat === a) c.u[u] = Math.max(0, Math.round((c.u[u] || 0) * (1 + b / 100))); break;
      case 'flag': S.flags[a] = 1; break;
      case 'camp': S.pol.camp += a; break;
      case 'sellRes': for (const r in c.stock) { c.tr += c.stock[r] * a * S.mkt.com[r].p; c.stock[r] *= 1 - a; } break;
      case 'later': S.later.push({ t: S.turn + a, p: b, fx: d, msg: e, T }); break;
      case 'chance': applyFx(chance(a) ? b : d, ctx); break;
      case 'chanceAppr': applyFx(chance(clamp(approval() / 100 + .1, .1, .9)) ? a : b, ctx); break;
      case 'over': over(a); break;
      case 'do': if (OPS[a]) OPS[a](ctx && ctx.x ? Object.assign({}, b, ctx.x) : b || {}); break;
      case 'party': partyRel(a, b); break;
      case 'inf': S.eco.inf = clamp(S.eco.inf + a, -5, 200); break;
      case 'unemp': S.eco.unemp = clamp(S.eco.unemp + a, 1, 45); break;
      case 'fxr': S.eco.fx = clamp(S.eco.fx + a, 20, 180); break;
      case 'debt': S.eco.debt = Math.max(0, S.eco.debt + c.gdp * a / 100); break;
      case 'chain': S.chain.push({ t: S.turn + a, id: b, T }); break;
      case 'arc': if (S.arc && S.arc[a]) S.arc[a].st += b; break;
      case 'ind': S.eco.ind[a] = Math.max(0, (S.eco.ind[a] || 0) + b); break;
    }
  }
}
/* texto de cada efecto para la UI: [texto, tono] con tono >0 bueno, <0 malo, 0 neutro */
function describeFx(list, T) {
  const out = [], sub = (l) => describeFx(l, T).forEach(x => out.push(['· ' + x[0], x[1]]));
  for (const f of list || []) {
    const [k, a, b, d] = f;
    if (k === '$') out.push([(a >= 0 ? '+' : '−') + money(Math.abs(a)), a]);
    else if (k === '$g') out.push([(a >= 0 ? '+' : '−') + money(Math.abs(P().gdp * a / 100)), a]);
    else if (k === 'stab') out.push(['Estabilidad ' + sg(a), a]);
    else if (k === 'cp') out.push(['Capital político ' + sg(a), a]);
    else if (k === 'sec') out.push([(a === 'all' ? 'Todos los sectores' : D.SECTORS[a].n) + ' ' + sg(b), b]);
    else if (k === 'rep') out.push([REPN[a] + ' ' + sg(b), b]);
    else if (k === 'rel') { const t = a === 'T' ? T : a; if (t && S.c[t]) out.push(['Relación con ' + nm(t) + ' ' + sg(b), b]); }
    else if (k === 'relAll') out.push([(RELF[d] || 'Relación con todos') + ' ' + sg(a), a]);
    else if (k === 'grow') out.push([`Crecimiento ${sg(a)} pp durante ${b} turnos`, a]);
    else if (k === 'prod') out.push([`Producción de ${D.COMMODITIES[a].n.toLowerCase()} +${b}`, 1]);
    else if (k === 'units') out.push([`Fuerzas de ${D.CATS[a].toLowerCase()} ${sg(b)}%`, b]);
    else if (k === 'price') out.push([`${D.COMMODITIES[a].n} ${b > 1 ? '▲' : '▼'}`, 0]);
    else if (k === 'stock') out.push([`Bolsa${D.STOCK_SECTORS[a] ? ' · ' + D.STOCK_SECTORS[a] : a === 'home' ? ' nacional' : ''} ${b > 1 ? '▲' : '▼'}`, b > 1 ? 1 : -1]);
    else if (k === 'camp') out.push([`Campaña +${a} pts`, 1]);
    else if (k === 'sellRes') out.push([`Vendes el ${Math.round(a * 100)}% de tus reservas`, -1]);
    else if (k === 'over') out.push(['Pierdes el poder', -1]);
    else if (k === 'ind') out.push([`Industria (${D.INDUSTRY[a].n.toLowerCase()}) ${sg(b)}`, b]);
    else if (k === 'inf') out.push(['Inflación ' + sg(a) + ' pts', -a]);
    else if (k === 'unemp') out.push(['Desempleo ' + sg(a) + ' pts', -a]);
    else if (k === 'fxr') out.push(['Moneda ' + sg(a), a]);
    else if (k === 'debt') out.push(['Deuda ' + (a >= 0 ? '+' : '−') + money(Math.abs(P().gdp * a / 100)), -a]);
    else if (k === 'party') out.push([(a === 'opp' ? 'Relación con la oposición ' : a === 'gov' ? 'Relación con tus socios ' : 'Relación con los partidos ') + sg(b), b]);
    else if (k === 'later') { out.push([`En ${a} turnos (${Math.round(b * 100)}%):`, 0]); sub(d); }
    else if (k === 'chance') { out.push([`${Math.round(a * 100)}% de probabilidad:`, 0]); sub(b); if (d && d.length) { out.push(['Si no:', 0]); sub(d); } }
    else if (k === 'chanceAppr') { out.push([`${Math.round(clamp(approval() / 100 + .1, .1, .9) * 100)}% de éxito (depende de tu aprobación):`, 0]); sub(a); out.push(['Si fracasa:', 0]); sub(b); }
  }
  return out;
}

/* ---- eventos interactivos ---- */
function pickTarget(kind) {
  const me = S.player, near = nb(me);
  if (kind === 'rival') { let best = null, bv = -15; for (const z of alive()) if (z !== me && (near.includes(z) || C(z).gdp > 700)) { const r = rel(me, z); if (r < bv) { bv = r; best = z; } } return best; }
  if (kind === 'troubledNeighbor') return near.filter(z => C(z).stab < 35 || inWar(z))[0] || null;
  if (kind === 'ally') { const a = alliesOf(me); return a.length ? pick(a) : null; }
  return pick(alive().filter(z => z !== me && C(z).gdp > 20 && !atWar(me, z)));
}
function condOk(q) {
  if (!q) return true; if (q.any) return q.any.some(condOk);
  if (q.turnGte && S.turn < q.turnGte) return false;
  if (q.stabLt && !(P().stab < q.stabLt)) return false;
  if (q.secLt && !(S.pol.sec[q.secLt[0]].a < q.secLt[1])) return false;
  if (q.debt && !(P().tr < -P().gdp * .12 || debtRatio() > .9)) return false;
  if (q.rival && !pickTarget('rival')) return false;
  if (q.ally && !alliesOf(S.player).length) return false;
  if (q.neighborTrouble && !pickTarget('troubledNeighbor')) return false;
  return true;
}
function eventOk(e) {
  const seen = S.evSeen[e.id], q = e.if || {};
  if (seen != null && (q.once || S.turn - seen < (q.cool || 8))) return false;
  return condOk(q);
}
function playerEvent() {
  if (S.over) return;
  const ok = D.EVENTS.filter(eventOk); if (!ok.length) return;
  const urgent = ok.filter(e => e.w >= 30);
  if (!urgent.length && !chance(.55)) return;
  const sc = Math.max(.3, 1 + mod('scandal') + lawSum('scandal'));
  const e = urgent.length ? pick(urgent) : wpick(ok, x => x.w * (x.scandal ? sc : 1));
  const T = e.tgt ? pickTarget(e.tgt) : null; if (e.tgt && !T) return;
  S.evSeen[e.id] = S.turn; if (e.pre) applyFx(e.pre, {});
  const sub = s => T ? s.split('{T}').join(nm(T)) : s;
  pushPend({ k: 'event', id: e.id, t: e.t, x: sub(e.x), iso: T || S.player, opts: e.opts.map(o => ({ t: sub(o.t), fx: o.fx || [], hid: o.hid || [] })) });
}
ACT.decide = a => {
  const p = S.pend[0], o = p && p.opts[+a.i]; if (!o) return fail('No hay decisión pendiente');
  if (o.req && o.req.cp && S.pol.cp < o.req.cp) return fail(`Necesitas ${o.req.cp} de capital político`);
  S.pend.shift();
  const shown = describeFx(o.fx, p.iso);
  why(p.t, () => { applyFx(o.fx, { T: p.iso, x: a.x }); applyFx(o.hid, { T: p.iso }); });
  if (p.k === 'event') news(`${p.t}: ${o.t.charAt(0).toLowerCase() + o.t.slice(1)}`, 'pol', S.player);
  Bus.emit('decided', { p, o, shown });
  return {};
};

/* ---- titulares del mundo ---- */
function worldEvents() {
  const n = (chance(.75) ? 1 : 0) + (chance(.25) ? 1 : 0), used = [];
  for (let i = 0; i < n; i++) {
    const e = wpick(D.WORLD_EVENTS.filter(x => !used.includes(x) && x.t !== S.flags.lastWE), x => x.w); if (!e) break; used.push(e); S.flags.lastWE = e.t;
    let X = null;
    if (e.x) { const pool = alive().filter(z => e.x === 'any' ? C(z).gdp > 30 : e.x === 'unstable' ? C(z).stab < 45 : (C(z).rec[e.x.slice(5)] || 0) >= 3); if (!pool.length) continue; X = pick(pool); }
    for (const f of e.fx) {
      if (f[0] === 'price' || f[0] === 'stock') S.mkt.shocks.push({ k: f[1], m: f[2] });
      else if (f[0] === 'sent') S.mkt.sent += f[1];
      else if (f[0] === 'cstab' && X) C(X).stab = clamp(C(X).stab + f[1], 0, 100);
      else if (f[0] === 'cgdp' && X) C(X).gdp *= 1 + f[1] / 100;
    }
    news(e.t.split('{X}').join(X ? nm(X) : ''), 'world', X, X === S.player ? 3 : 2);
  }
}
function laterTurn() {
  const due = S.later.filter(l => l.t <= S.turn); S.later = S.later.filter(l => l.t > S.turn);
  for (const l of due) if (chance(l.p)) { why(l.msg || 'Consecuencia diferida', () => applyFx(l.fx, { T: l.T })); if (l.msg) news(l.msg, 'pol', S.player, 3); Bus.emit('consequence', { msg: l.msg, shown: describeFx(l.fx, l.T) }); }
}

/* ---- Asamblea de la ONU: una resolución cada 4 turnos ---- */
const UNT = { condena: 'Condena', sanc: 'Sanciones internacionales', cese: 'Alto el fuego', clima: 'Pacto climático', ayuda: 'Ayuda humanitaria', comercio: 'Acuerdo de libre comercio' };
function unText(r) {
  const T = r.target && nm(r.target), w = r.war && warById(r.war);
  return r.type === 'condena' ? `Se vota una condena formal a ${T}.` : r.type === 'sanc' ? `Se votan sanciones internacionales contra ${T}. Si se aprueba, quienes voten a favor se las impondrán.`
    : r.type === 'cese' ? `Se vota exigir un alto el fuego inmediato entre ${w ? nm(w.att[0]) + ' y ' + nm(w.def[0]) : 'los beligerantes'}.`
    : r.type === 'clima' ? 'Se vota un pacto climático: cada firmante aporta el 0.2% de su PIB a un fondo común.'
    : r.type === 'ayuda' ? `Se vota un paquete de ayuda humanitaria para ${T}, financiado por los firmantes.` : 'Se vota un acuerdo global de libre comercio: más crecimiento, menos protección a la industria local.';
}
function genResolution() {
  const w = S.wars.filter(x => C(x.att[0]).alive && C(x.def[0]).alive);
  if (w.length && chance(.6)) { const x = pick(w); return chance(.5) ? { type: 'sanc', target: x.att[0] } : { type: 'cese', war: x.id, target: x.att[0] }; }
  const t = pick(['clima', 'ayuda', 'comercio', 'condena']);
  if (t === 'ayuda') return { type: t, target: alive().sort((a, b) => C(a).stab - C(b).stab)[0] };
  if (t === 'condena') return { type: t, target: alive().filter(z => C(z).reg !== 'dem').sort((a, b) => C(b).per.agres * power(b) - C(a).per.agres * power(a))[0] };
  return { type: t };
}
function unSession() {
  if (S.over) return;
  const r = S.un.queue || genResolution(); S.un.queue = null; if (!r) return;
  if (r.target && !C(r.target).alive) return; if (r.type === 'cese' && !warById(r.war)) return;
  S.un.cur = r;
  pushPend({ k: 'un', t: 'Asamblea de la ONU · ' + UNT[r.type], iso: r.target || S.player, x: unText(r) + (r.by === S.player ? ' La propuesta es tuya.' : ''),
    opts: [{ t: 'Votar a favor', fx: [['do', 'unVote', { v: 1 }]] }, { t: 'Votar en contra', fx: [['do', 'unVote', { v: -1 }]] }, { t: 'Abstenerte', fx: [['do', 'unVote', { v: 0 }]] },
    { t: 'A favor y cabildear a tus amigos (2 CP)', req: { cp: 2 }, fx: [['cp', -2], ['do', 'unVote', { v: 1, lobby: 1 }]] }, { t: 'En contra y cabildear a tus amigos (2 CP)', req: { cp: 2 }, fx: [['cp', -2], ['do', 'unVote', { v: -1, lobby: 1 }]] }] });
}
function unScore(z, r) {
  const c = C(z), p = c.per, X = r.target;
  if (r.type === 'condena' || r.type === 'sanc') return z === X ? -1 : -rel(z, X) / 70 + (c.reg === 'dem' ? .15 : -.05) - (alliesOf(z).includes(X) ? .8 : 0);
  if (r.type === 'cese') { const w = warById(r.war); if (!w) return 0; const inA = w.att.includes(z), inD = w.def.includes(z); return .3 + p.coop * .3 - ((inA && w.score > 20) || (inD && w.score < -20) ? .9 : 0); }
  if (r.type === 'clima') return p.coop * .6 - .15 - ((c.rec.pet || 0) >= 4 ? .35 : 0);
  if (r.type === 'ayuda') return z === X ? 1 : p.coop * .5 + (c.gdp / c.pop > 20 ? .1 : 0) - .1;
  return p.coop * .5 - (c.ideo < 0 ? .15 : 0) - .1;
}
OPS.unVote = a => {
  const r = S.un.cur; if (!r) return; S.un.cur = null;
  const me = S.player, X = r.target; let yes = 0, no = 0, abs = 0; const votes = {};
  for (const z of alive()) {
    let s;
    if (z === me) s = a.v;
    else { let sc = unScore(z, r); if (a.lobby && rel(z, me) > 25) sc += .35 * a.v; if (r.by === me) sc += rel(z, me) / 150; s = sc > .12 ? 1 : sc < -.12 ? -1 : 0; }
    votes[z] = s; if (s > 0) yes++; else if (s < 0) no++; else abs++;
  }
  const pass = yes > no, out = [];
  // tu voto se recuerda
  if ((r.type === 'condena' || r.type === 'sanc') && X !== me && a.v) {
    addMod(me, X, a.v > 0 ? 'Votaste contra ellos en la ONU' : 'Los defendiste en la ONU', a.v > 0 ? -12 : gain(8), .4, a.v > 0);
    for (const z of alive()) if (z !== me && z !== X && rel(z, X) < -40) addMod(me, z, a.v > 0 ? 'Votaste con ellos en la ONU' : 'Protegiste a su rival en la ONU', a.v > 0 ? gain(4) : -4, .5);
  }
  if (pass) {
    if (r.type === 'condena') { for (const z in votes) if (votes[z] > 0 && z !== X) addMod(z, X, 'Condena de la ONU', -4, .5); if (X === me) { repAdd('paz', -8); out.push(['Tu reputación sufre', -1]); } }
    else if (r.type === 'sanc') { let n = 0; for (const z in votes) if (votes[z] > 0 && z !== X && (z === me || C(z).gdp > 150) && addSanction(z, X)) n++; out.push([`${n} países sancionan a ${nm(X)}`, 0]); if (a.v > 0) repAdd('paz', 2); }
    else if (r.type === 'cese') {
      const w = warById(r.war);
      if (w) { if (w.att[0] === me || w.def[0] === me) pushPend({ k: 'peace', t: 'La ONU exige un alto el fuego', iso: w.att[0] === me ? w.def[0] : w.att[0], x: 'La Asamblea ha aprobado la resolución. Puedes acatarla y volver a las fronteras previas, o desafiar al mundo.', opts: [{ t: 'Acatar el alto el fuego', fx: [['do', 'peace', { w: w.id, kind: 'blanca' }], ['rep', 'paz', 10]] }, { t: 'Desafiar a la ONU', fx: [['rep', 'paz', -15], ['rep', 'conf', -5], ['relAll', -6, 'Desafiaste a la ONU']] }] });
        else if (chance(.6)) { endWar(w, 'blanca'); out.push(['Los beligerantes acatan el alto el fuego', 1]); } else out.push(['Los beligerantes ignoran la resolución', -1]); }
    }
    else if (r.type === 'clima') { if (a.v > 0) { applyFx([['$g', -.2], ['sec', 'jov', 4], ['sec', 'emp', -3], ['rep', 'gen', 5]]); out.push(['Aportas el 0.2% de tu PIB', -1]); } else { applyFx([['rep', 'gen', -4], ['sec', 'jov', -3]]); out.push(['Quedas fuera del pacto: tu imagen se resiente', -1]); } }
    else if (r.type === 'ayuda') { C(X).stab = clamp(C(X).stab + 8, 0, 100); if (a.v > 0) { applyFx([['$g', -.1], ['rep', 'gen', 4], ['rel', X, 6, 'Votaste por ayudarlos']]); out.push(['Contribuyes al paquete de ayuda', 0]); } }
    else if (r.type === 'comercio') { if (a.v > 0) { applyFx([['grow', .15, 6], ['sec', 'obr', -3], ['sec', 'emp', 4]]); out.push(['Tu economía se abre: +0.15 pp de crecimiento', 1]); } }
  }
  if (a.lobby) repAdd('conf', -1);
  if (r.by === me) { if (pass) { repAdd('conf', 3); secAdd('all', 1); } else S.pol.cp = Math.max(0, S.pol.cp - 1); }
  S.un.last = { r, yes, no, abs, pass, mine: a.v };
  news(`ONU · ${UNT[r.type]}${X ? ' (' + nm(X) + ')' : ''}: ${pass ? 'aprobada' : 'rechazada'} ${yes}–${no}`, 'un', X, 2);
  Bus.emit('un', { r, yes, no, abs, pass, votes, out, title: UNT[r.type] });
};
ACT.unPropose = a => {
  if (!UNT[a.type]) return fail('Resolución desconocida'); if (S.un.queue) return fail('Ya hay una resolución tuya en la agenda');
  const r = { type: a.type, by: S.player };
  if (['condena', 'sanc', 'ayuda'].includes(a.type)) { if (!S.c[a.target] || !S.c[a.target].alive || a.target === S.player) return fail('Elige un país'); r.target = a.target; }
  if (a.type === 'cese') { const w = warById(+a.war); if (!w) return fail('Elige una guerra en curso'); r.war = w.id; r.target = w.att[0]; }
  if (!useCP(3)) return fail('Necesitas 3 de capital político');
  S.un.queue = r; const left = 4 - S.turn % 4;
  return { msg: `Tu resolución entra en la agenda: se votará en ${left} turno${left > 1 ? 's' : ''}` };
};
