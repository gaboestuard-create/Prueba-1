/* =====================================================================
   SISTEMA · DIPLOMACIA: tratados, visitas, ayuda, sanciones, bases,
   territorio por tratado y asilo. Cada país recuerda (S.mods).
   ===================================================================== */
const TNEED = { com: 5, pna: 15, ali: 45, def: 60 }, TCP = { com: 1, pna: 1, ali: 2, def: 3 };
const TNAME = { com: 'Tratado comercial', pna: 'Pacto de no agresión', ali: 'Alianza', def: 'Pacto de defensa mutua' };
const gain = v => v * Math.max(.2, 1 + mod('relGain'));

function addTreaty(t, a, b) { if (hasExplicit(t, a, b)) return; S.tr.push({ t, a, b, s: S.turn }); dirty(); }
function endTreaties(a, b, types) { const n = S.tr.length; S.tr = S.tr.filter(t => !(((t.a === a && t.b === b) || (t.a === b && t.b === a)) && (!types || types.includes(t.t)))); if (S.tr.length !== n) dirty(); return n - S.tr.length; }
function addSanction(by, on) { if (sanctioned(by, on) || by === on) return false; S.sanc.push({ by, on, s: S.turn }); endTreaties(by, on, ['com']); dirty(); return true; }
function liftSanction(by, on) { const n = S.sanc.length; S.sanc = S.sanc.filter(s => !(s.by === by && s.on === on)); dirty(); return n !== S.sanc.length; }
const sumPow = list => list.reduce((s, x) => s + power(x), 0);
/* amenaza percibida: el vecino hostil más fuerte frente a mi fuerza y la de mis aliados */
function threat(iso) {
  const mine = power(iso) + .5 * sumPow(alliesOf(iso)) + 1; let worst = inWar(iso) ? 1.2 : 0;
  for (const r of nb(iso)) if (rel(iso, r) < -30) worst = Math.max(worst, (power(r) + .3 * sumPow(alliesOf(r))) / mine);
  return worst;
}
function relAll(v, label, filter, T) {
  const me = S.player;
  for (const z of alive()) {
    if (z === me) continue; const c = S.c[z];
    const ok = filter === 'big' ? c.gdp > 500 : filter === 'rich' ? c.gdp / c.pop > 20 : filter === 'friends' ? rel(me, z) > 30 : filter === 'trade' ? hasT('com', me, z)
      : filter === 'enemiesOfT' ? T && z !== T && rel(z, T) < -30 : filter === 'neighbors' ? nb(me).includes(z) : true;
    if (ok) addMod(me, z, label || 'Tus decisiones', v > 0 ? gain(v) : v, .5, v < 0);
  }
}

/* evaluación de un tratado: la UI la muestra antes de proponer */
function treatyEval(type, iso) {
  const me = S.player, r = rel(me, iso), R = [['Relación actual', r]]; let s = r;
  const add = (t, v) => { v = Math.round(v); if (v) { R.push([t, v]); s += v; } };
  add('Tus rasgos', mod('treatyAcc')); add('Tu fama de confiable', S.rep.conf * .15);
  if (type === 'ali' || type === 'def') {
    const strong = power(me) > power(iso); add(strong ? 'Les conviene tu ejército' : 'Eres más débil que ellos', strong ? 8 : -5);
    if (threat(iso) > 1) add('Se sienten amenazados', 12);
    if (inWar(me)) add('No quieren heredar tu guerra', -15);
    add('Eres aliado de sus rivales', -12 * Math.min(2, alliesOf(me).filter(a => a !== iso && rel(iso, a) < -40).length));
  }
  if (type === 'com') add('Interés económico', Math.min(10, P().gdp / C(iso).gdp * 3));
  add('Agravios que no olvidan', grudge(iso, me) * .5);
  return { score: Math.round(s), need: TNEED[type], reasons: R, odds: s - TNEED[type] };
}
function dipCheck(iso) {
  if (!S.c[iso] || iso === S.player) return 'País inválido';
  if (!S.c[iso].alive) return `${nm(iso)} ya no existe como Estado`;
  if (atWar(S.player, iso)) return `Estás en guerra con ${nm(iso)}`;
  return null;
}
ACT.propose = a => {
  const iso = a.iso, t = a.t, me = S.player, e = dipCheck(iso); if (e) return fail(e);
  if (!TNEED[t]) return fail('Tratado desconocido');
  if (hasT(t, me, iso)) return fail(`Ya tienes ese acuerdo con ${nm(iso)}`);
  if (t === 'com' && IX().sp[key(me, iso)]) return fail('Hay sanciones entre ambos: levántalas primero');
  const c = C(iso); if ((c.ask[t] || 0) > S.turn) return fail(`${nm(iso)} no quiere volver a discutirlo todavía (${c.ask[t] - S.turn} turnos)`);
  if (!useCP(TCP[t])) return fail(`Necesitas ${TCP[t]} de capital político`);
  const ev = treatyEval(t, iso);
  if (ev.score + rr(-6, 6) < ev.need) { c.ask[t] = S.turn + 3; addMod(me, iso, 'Propuesta rechazada', -3, 1); return { ok: false, msg: `${nm(iso)} rechaza tu ${TNAME[t].toLowerCase()}` }; }
  addTreaty(t, me, iso); addMod(me, iso, 'Firma de tratado', gain(6), .5);
  if (t !== 'com') repAdd('conf', 2); if (t === 'pna') repAdd('paz', 2);
  news(`${P().n} y ${nm(iso)} firman: ${TNAME[t]}`, 'dip', iso, 2);
  Bus.emit('treaty', { t, a: me, b: iso, name: TNAME[t] }); if (t === 'com') Bus.emit('route', { a: me, b: iso });
  return { msg: `${nm(iso)} firma: ${TNAME[t]}` };
};
ACT.breakTreaty = a => {
  const iso = a.iso, t = a.t, me = S.player; if (!hasExplicit(t, me, iso)) return fail('No existe ese tratado (los de bloque no se rompen uno a uno)');
  endTreaties(me, iso, [t]); const k = 1 + mod('betray');
  addMod(me, iso, 'Rompiste un tratado', -(t === 'com' ? 15 : t === 'pna' ? 25 : 40) * k, .3, 1);
  repAdd('conf', -(t === 'com' ? 5 : t === 'pna' ? 10 : 18) * k);
  for (const z of alliesOf(iso)) if (z !== me) addMod(me, z, 'No cumples tu palabra', -6 * k, .4, 1);
  news(`${P().n} rompe su ${TNAME[t].toLowerCase()} con ${nm(iso)}`, 'dip', iso, 2);
  return { msg: `Rompes el tratado. ${nm(iso)} y sus aliados lo recordarán.` };
};
ACT.visit = a => {
  const iso = a.iso, me = S.player, e = dipCheck(iso); if (e) return fail(e);
  const c = C(iso); if ((c.ask.visit || 0) > S.turn) return fail(`Acabas de reunirte con ${nm(iso)}: espera ${c.ask.visit - S.turn} turnos`);
  if (!canPay(.3)) return fail('No hay fondos para el viaje'); if (!useCP(1)) return fail('Necesitas 1 de capital político');
  P().tr -= .3; c.ask.visit = S.turn + 3; Bus.emit('trip', { a: me, b: iso });
  if (rel(me, iso) < -40 && chance(.35)) { addMod(me, iso, 'Desaire en visita oficial', -5, .5); return { ok: false, msg: `${c.lider.n} te recibe con frialdad: la visita empeora las cosas` }; }
  const g = gain(ri(5, 10)); addMod(me, iso, 'Visita de Estado', g, .5);
  return { msg: `Visita a ${nm(iso)}: relación +${Math.round(g)}` };
};
ACT.invite = a => {
  const iso = a.iso, me = S.player, e = dipCheck(iso); if (e) return fail(e);
  const c = C(iso); if ((c.ask.visit || 0) > S.turn) return fail(`Acabas de reunirte con ${nm(iso)}: espera ${c.ask.visit - S.turn} turnos`);
  if (!canPay(.5)) return fail('No hay fondos para la recepción'); if (!useCP(1)) return fail('Necesitas 1 de capital político');
  c.ask.visit = S.turn + 3;
  if (rel(me, iso) <= -20) { addMod(me, iso, 'Invitación rechazada', -2, 1); return { ok: false, msg: `${c.lider.n} rechaza tu invitación` }; }
  P().tr -= .5; Bus.emit('trip', { a: iso, b: me });
  const g = gain(ri(4, 8)); addMod(me, iso, 'Recepción oficial', g, .5); secAdd('all', 1);
  return { msg: `${c.lider.n} visita tu capital: relación +${Math.round(g)} y algo de prestigio en casa` };
};
/* regalar ayuda económica (eco), material (mat: materia prima) o militar (mil: % de una categoría) */
ACT.giveAid = a => {
  const iso = a.iso, me = S.player, e = dipCheck(iso); if (e) return fail(e);
  const c = C(iso), p = P(); let val = 0, what = '';
  if (a.kind === 'eco') { val = +a.v; if (!(val > 0) || !canPay(val)) return fail('No tienes esos fondos'); p.tr -= val; c.tr += val; what = money(val); }
  else if (a.kind === 'mat') { const q = Math.min(+a.v, p.stock[a.k] || 0); if (!(q > 0)) return fail('No tienes existencias de ese recurso'); p.stock[a.k] -= q; val = q * S.mkt.com[a.k].p; what = `${Math.round(q)} u de ${D.COMMODITIES[a.k].n.toLowerCase()}`; }
  else if (a.kind === 'mil') {
    const cl = costLvl(me); let n = 0;
    for (const k in D.UNITS) if (D.UNITS[k].cat === a.k) { const x = Math.floor((p.u[k] || 0) * clamp(+a.v, .05, .5)); p.u[k] -= x; c.u[k] = (c.u[k] || 0) + x; n += x; val += x * D.UNITS[k].cost * cl; }
    if (!n) return fail('No tienes unidades suficientes para enviar'); what = `${n} unidades de ${D.CATS[a.k].toLowerCase()}`;
    secAdd('mil', -3); for (const z of enemiesOf(iso)) addMod(me, z, 'Armaste a su enemigo', -15, .3, 1);
  } else return fail('Tipo de ayuda desconocido');
  const g = gain(clamp(30 * val / (c.gdp * .01 + .01), 2, a.kind === 'mil' ? 35 : 30));
  addMod(me, iso, a.kind === 'mil' ? 'Ayuda militar' : 'Ayuda recibida', g, .5); c.stab = clamp(c.stab + 2, 0, 100);
  repAdd('gen', clamp(val / (p.gdp * .002), 1, 6));
  if (a.kind !== 'mil') for (const z of enemiesOf(iso)) addMod(me, z, 'Financiaste a su enemigo', -8, .5, 1);
  news(`${p.n} envía ayuda a ${c.n}: ${what}`, 'dip', iso);
  Bus.emit('trip', { a: me, b: iso, cargo: 1 });
  return { msg: `${c.n} agradece la ayuda: relación +${Math.round(g)}` };
};
ACT.askAid = a => {
  const iso = a.iso, me = S.player, e = dipCheck(iso); if (e) return fail(e);
  const c = C(iso), p = P(); if ((c.ask.aid || 0) > S.turn) return fail(`Ya le pediste ayuda hace poco (${c.ask.aid - S.turn} turnos)`);
  if (!useCP(1)) return fail('Necesitas 1 de capital político');
  c.ask.aid = S.turn + 6; const r = rel(me, iso) + mod('aid');
  const need = a.kind === 'mil' ? 55 : 40;
  if (r < need || (a.kind === 'mil' && !alliesOf(me).includes(iso)) || (a.kind === 'mat' && (c.rec[a.k] || 0) < 3)) { addMod(me, iso, 'Pediste ayuda sin éxito', -2, 1); return { ok: false, msg: `${c.n} se niega a ayudarte${a.kind === 'mil' ? ': solo arma a sus aliados cercanos' : ''}` }; }
  let what;
  if (a.kind === 'eco') { const v = Math.min(c.gdp * .003, p.gdp * .02); p.tr += v; c.tr -= v; what = money(v); }
  else if (a.kind === 'mat') { p.stock[a.k] = (p.stock[a.k] || 0) + 6; what = `6 u de ${D.COMMODITIES[a.k].n.toLowerCase()}`; }
  else { let n = 0; for (const k of ['inf', 'tan', 'art']) { const x = Math.floor((c.u[k] || 0) * .05); c.u[k] -= x; p.u[k] = (p.u[k] || 0) + x; n += x; } what = `${n} unidades terrestres`; }
  addMod(me, iso, 'Les debes un favor', -8, .5); repAdd('gen', -2);
  news(`${c.n} envía ayuda a ${p.n}: ${what}`, 'dip', iso); Bus.emit('trip', { a: iso, b: me, cargo: 1 });
  return { msg: `${c.n} te envía ${what}. Ahora les debes un favor.` };
};
ACT.sanction = a => {
  const iso = a.iso, me = S.player; if (!S.c[iso] || !S.c[iso].alive || iso === me) return fail('País inválido');
  if (sanctioned(me, iso)) return fail('Ya lo tienes sancionado'); if (!useCP(2)) return fail('Necesitas 2 de capital político');
  const aggr = S.wars.some(w => w.att[0] === iso && !w.casus);
  addSanction(me, iso); addMod(me, iso, 'Les impusiste sanciones', -15, .3, 1); repAdd('paz', aggr ? 3 : -2);
  for (const z of alive()) { if (z === me || z === iso) continue; if (alliesOf(iso).includes(z)) addMod(me, z, 'Sancionaste a su aliado', -6, .5, 1); else if (rel(z, iso) < -40) addMod(me, z, 'Sancionaste a su rival', gain(6), .5); }
  news(`${P().n} impone sanciones a ${nm(iso)}`, 'dip', iso, 2);
  return { msg: `Sanciones contra ${nm(iso)}: su economía crecerá menos y el comercio entre ambos se corta` };
};
ACT.lift = a => {
  if (!liftSanction(S.player, a.iso)) return fail('No tienes sanciones contra ese país');
  addMod(S.player, a.iso, 'Levantaste las sanciones', gain(8), .5); news(`${P().n} levanta las sanciones a ${nm(a.iso)}`, 'dip', a.iso);
  return { msg: `Levantas las sanciones a ${nm(a.iso)}` };
};
/* base estratégica en suelo extranjero: da alcance militar sobre su región */
ACT.base = a => {
  const iso = a.iso, me = S.player, e = dipCheck(iso); if (e) return fail(e);
  if (S.bases.some(b => b.by === me && b.in === iso)) return fail('Ya tienes una base allí');
  const cost = 5 * costLvl(iso) + 2; if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (S.pol.cp < 2) return fail('Necesitas 2 de capital político');
  const sc = rel(me, iso) + (threat(iso) > 1 ? 15 : 0) + mod('treatyAcc');
  if (!alliesOf(me).includes(iso) && sc < 70) { useCP(1); addMod(me, iso, 'Pediste instalar una base', -3, 1); return { ok: false, msg: `${nm(iso)} no acepta tropas extranjeras en su suelo (necesitas alianza o relación de 70)` }; }
  useCP(2); P().tr -= cost; S.bases.push({ by: me, in: iso, s: S.turn }); dirty();
  for (const z of alive()) if (z !== me && z !== iso && (rel(z, iso) < -40 || (D.C[iso].bord.includes(z) && rel(me, z) < 0))) addMod(me, z, `Tu base militar en ${nm(iso)}`, -12, .3, 1);
  news(`${P().n} abre una base militar en ${nm(iso)}`, 'mil', iso, 2);
  return { msg: `Base establecida en ${nm(iso)}: ahora tienes alcance militar en ${D.REGIONS[D.C[iso].region]}` };
};

/* ---- territorio ---- */
function moveTerr(victim, i, taker, k) { // k = fracción del PIB que sobrevive al cambio de manos
  const v = C(victim), t = v.terr[i], own = ownCount(victim); if (!t || t.o !== victim || !own) return false;
  const g = v.gdp / own, pp = v.pop / own; v.gdp -= g; v.pop -= pp; t.o = taker; t.g = g; t.pp = pp; t.k = k;
  C(taker).gdp += g * k; C(taker).pop += pp; dirty(); return true;
}
function restoreTerr(victim, i) {
  const v = C(victim), t = v.terr[i]; if (!t || t.o === victim) return false;
  const tk = C(t.o); if (tk.alive) { tk.gdp = Math.max(tk.gdp * .2, tk.gdp - (t.g || 0) * (t.k || 1)); tk.pop = Math.max(.01, tk.pop - (t.pp || 0)); }
  v.gdp += t.g || 0; v.pop += t.pp || 0; t.o = victim; delete t.g; delete t.pp; delete t.k; dirty(); return true;
}
ACT.buyTerr = a => {
  const iso = a.iso, me = S.player, e = dipCheck(iso); if (e) return fail(e);
  const v = C(iso), i = +a.i, t = v.terr[i]; if (!t || t.o !== iso) return fail('Ese territorio no está disponible');
  if (i === 0) return fail('Ningún país vende su capital'); if (ownCount(iso) <= 2) return fail('No le queda territorio que ceder');
  if (!nb(me).includes(iso)) return fail('Solo puedes negociar territorio con países vecinos');
  const price = v.gdp / ownCount(iso) * 6; if (!canPay(price)) return fail(`Piden ${money(price)}`); if (S.pol.cp < 3) return fail('Necesitas 3 de capital político');
  if (rel(me, iso) < 55 - (v.stab < 35 ? 15 : 0)) { useCP(1); addMod(me, iso, 'Quisiste comprar su territorio', -6, .5, 1); return { ok: false, msg: `${nm(iso)} se ofende: su territorio no está en venta (necesitas relación de 55)` }; }
  useCP(3); P().tr -= price; v.tr += price; moveTerr(iso, i, me, 1);
  news(`${nm(iso)} cede ${t.n} a ${P().n} por tratado`, 'dip', iso, 3); Bus.emit('treaty', { t: 'terr', a: me, b: iso, name: 'Cesión de ' + t.n });
  return { msg: `${t.n} pasa a tu soberanía por ${money(price)}` };
};
ACT.cedeTerr = a => {
  const iso = a.iso, me = S.player, e = dipCheck(iso); if (e) return fail(e);
  const i = +a.i, t = P().terr[i]; if (!t || t.o !== me || i === 0) return fail('No puedes ceder ese territorio');
  if (ownCount(me) <= 2) return fail('No te queda territorio que ceder'); if (!nb(me).includes(iso)) return fail('Solo puedes ceder territorio a un vecino');
  moveTerr(me, i, iso, 1); addMod(me, iso, 'Les cediste territorio', gain(35), .2); secAdd('mil', -10); secAdd('all', -4); repAdd('gen', 3); repAdd('paz', 4);
  news(`${P().n} cede ${t.n} a ${nm(iso)} por tratado`, 'dip', iso, 3); Bus.emit('treaty', { t: 'terr', a: me, b: iso, name: 'Cesión de ' + t.n });
  return { msg: `Cedes ${t.n} a ${nm(iso)}. En casa no lo celebran.` };
};
/* asilo: abdicar hacia un país amigo, o buscar refugio tras caer */
ACT.asylum = a => {
  const iso = a.iso, me = S.player; if (!S.c[iso] || !S.c[iso].alive || iso === me) return fail('País inválido');
  if (S.over && S.over.asylum !== undefined) return fail('Ya pediste asilo');
  const ok = !atWar(me, iso) && rel(me, iso) >= 30;
  if (!S.over) { if (!ok) { addMod(me, iso, 'Pediste asilo', -2, 1); return fail(`${nm(iso)} no te daría asilo (necesitas relación de 30)`); } over('exilio'); }
  S.over.asylum = ok ? iso : null; S.over.asked = iso;
  return { ok, msg: ok ? `${nm(iso)} te concede asilo` : `${nm(iso)} te cierra la puerta` };
};
