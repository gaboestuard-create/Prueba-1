/* =====================================================================
   SISTEMA · MUNDO EN VIVO: registro de lo que hace cada país, actividad
   entre países (visitas, inversiones, préstamos, armas, protestas…),
   guerrillas en ciudades ocupadas y fábricas de materias primas.
   ===================================================================== */
hook('new', () => { S.wlog = []; S.rarm = []; S.fac = {}; }); hook('load', () => { S.wlog = S.wlog || []; S.rarm = S.rarm || []; S.fac = S.fac || {}; });
const tick = () => S.flags.tick != null ? S.flags.tick : S.turn; // lo que se resuelve al terminar el turno cuenta en ese trimestre
{ const e0 = ACT.endTurn; ACT.endTurn = a => { S.flags.tick = S.turn; try { return e0(a); } finally { delete S.flags.tick; } }; const n0 = news; news = (x, k, iso, p) => { n0(x, k, iso, p); S.news[S.news.length - 1].tk = tick(); }; }
function wlog(k, a, b, x) { S.wlog.push({ t: tick(), k, a, b: b || '', x }); if (S.wlog.length > 700) S.wlog.splice(0, S.wlog.length - 700); }
/* lo que antes pasaba en silencio también queda registrado */
{ const t0 = addTreaty; addTreaty = (t, a, b) => { const had = hasExplicit(t, a, b); t0(t, a, b); if (!had && !isP(a) && !isP(b) && S.c[a] && S.c[b]) wlog('dip', a, b, `${S.c[a].n} y ${S.c[b].n} firman: ${TNAME[t] || t}`); };
  const s0 = addSanction; addSanction = (by, on) => { const r = s0(by, on); if (r && !isP(by) && !isP(on)) wlog('dip', by, on, `${S.c[by].n} sanciona a ${S.c[on].n}`); return r; };
  const b0 = aiBuy; aiBuy = iso => { const r = b0(iso); if (r && chance(.25)) wlog('mil', iso, '', `${S.c[iso].n} compra armamento y amplía su ejército`); return r; };
  const e0 = aiElection; aiElection = iso => { const L = S.c[iso].lider.n; e0(iso); if (S.c[iso].lider.n === L) wlog('pol', iso, '', `${S.c[iso].n} celebra elecciones: ${L} sigue en el poder`); }; }
/* actividad entre países: 8–12 gestos reales por turno */
const WACT = [
  ['visita', 5, (a, b) => rel(a, b) > -15, (a, b) => { addMod(a, b, 'Visita de Estado', 5, .5); Bus.emit('aiTrip', { a, b, t: 'visit' }); return ['dip', `${S.c[a].lider.n} (${S.c[a].n}) visita ${S.c[b].n}`]; }],
  ['inversion', 4, (a, b) => S.c[a].gdp > 400 && rel(a, b) > 10 && S.c[a].tr > 0, (a, b) => { const m = Math.min(S.c[a].gdp * .002, S.c[b].gdp * .02); S.c[a].tr -= m; S.c[b].gdp += m * .5; return ['eco', `${S.c[a].n} invierte ${money(m)} en ${pick(['infraestructura', 'energía', 'puertos', 'tecnología', 'minería', 'agricultura', 'vivienda'])} de ${S.c[b].n}`]; }],
  ['prestamo', 2, (a, b) => S.c[a].gdp > 800 && (S.c[b].stab < 45 || S.c[b].tr < 0) && rel(a, b) > 0, (a, b) => { const m = Math.min(S.c[a].gdp * .001, S.c[b].gdp * .03); S.c[a].tr -= m; S.c[b].tr += m; addMod(a, b, 'Préstamo', 6, .3); return ['eco', `${S.c[a].n} presta ${money(m)} a ${S.c[b].n}`]; }],
  ['armas', 3, (a, b) => S.c[a].gdp > 1000 && rel(a, b) > 20 && !atWar(a, b), (a, b) => { const k = pick(['tan', 'caz', 'dro', 'art']), n = k === 'caz' ? 2 : 6, m = D.UNITS[k].cost * n; S.c[b].u[k] = (S.c[b].u[k] || 0) + n; S.c[b].tr -= m; S.c[a].tr += m; return ['mil', `${S.c[a].n} vende ${n} ${D.UNITS[k].n.toLowerCase()} a ${S.c[b].n}`]; }],
  ['maniobras', 2, (a, b) => alliesOf(a).includes(b), (a, b) => { addMod(a, b, 'Maniobras conjuntas', 3, .3); return ['mil', `${S.c[a].n} y ${S.c[b].n} realizan maniobras militares conjuntas`]; }],
  ['ayuda', 2, (a, b) => S.c[a].gdp > 500 && S.c[b].stab < 40 && rel(a, b) > -10, (a, b) => { S.c[b].stab = clamp(S.c[b].stab + 2, 0, 100); addMod(a, b, 'Ayuda humanitaria', 6, .3); return ['peace', `${S.c[a].n} envía ayuda humanitaria a ${S.c[b].n}`]; }],
  ['energia', 2, (a, b) => (S.c[a].rec.pet || S.c[a].rec.gas || 0) >= 3 && rel(a, b) > 10, (a, b) => { S.c[a].tr += S.c[b].gdp * .0005; return ['eco', `${S.c[a].n} firma un acuerdo de suministro de ${S.c[a].rec.pet >= 3 ? 'petróleo' : 'gas'} con ${S.c[b].n}`]; }],
  ['cumbre', 2, (a, b) => S.c[a].gdp > 1000 && S.c[b].gdp > 1000, (a, b) => { addMod(a, b, 'Cumbre bilateral', rel(a, b) > 0 ? 4 : -2, .4); Bus.emit('aiTrip', { a, b, t: 'visit' }); return ['dip', `Cumbre en ${D.C[b].cap}: ${S.c[a].lider.n} y ${S.c[b].lider.n} ${rel(a, b) > 0 ? 'estrechan lazos' : 'terminan sin acuerdo'}`]; }],
  ['protesta', 3, (a, b) => rel(a, b) < -30, (a, b) => { addMod(a, b, 'Protesta diplomática', -4, .4); return ['dip', `${S.c[a].n} ${pick(['convoca al embajador de', 'expulsa a diplomáticos de', 'presenta una protesta formal contra'])} ${S.c[b].n}`]; }],
  ['frontera', 2, (a, b) => nb(a).includes(b) && rel(a, b) < -40 && !atWar(a, b), (a, b) => { S.c[b].stab = clamp(S.c[b].stab - 1, 0, 100); addMod(a, b, 'Escaramuza fronteriza', -5, .4); return ['war', `Escaramuza en la frontera entre ${S.c[a].n} y ${S.c[b].n}`]; }],
  ['ciencia', 2, (a, b) => S.c[a].gdp > 600 && S.c[b].gdp > 300 && rel(a, b) > 25, (a, b) => { if (S.c[a].dt) pushProg(a, S.c[a].dt, 3); return ['tec', `${S.c[a].n} y ${S.c[b].n} firman un acuerdo de cooperación científica`]; }]
];
hook('world', () => {
  const me = S.player, al = alive().filter(z => !isP(z)), top = al.slice().sort((x, y) => S.c[y].gdp - S.c[x].gdp).slice(0, 70), tw = WACT.reduce((s, w) => s + w[1], 0);
  for (let n = ri(8, 12), tries = 0; n > 0 && tries < 60; tries++) {
    const a = chance(.75) ? pick(top) : pick(al); let r = rr(0, tw), A = WACT[0]; for (const w of WACT) if ((r -= w[1]) <= 0) { A = w; break; }
    const pool = nb(a).concat(alliesOf(a), shuffle(top).slice(0, 6)).filter(b => b !== a && !isP(b) && S.c[b] && S.c[b].alive), b = pool.find(b => A[2](a, b)); if (!b) continue;
    const [k, x] = A[3](a, b); wlog(k, a, b, x); n--; }
});
/* ---- armar guerrillas en ciudades ocupadas por otros ---- */
const occCells = () => { const me = S.player, out = []; for (const z of alive()) if (z !== me) S.c[z].terr.forEach((x, i) => { if (x.o !== z && x.o !== me && S.c[x.o] && S.c[x.o].alive) out.push({ iso: z, i, n: x.n, by: x.o, armed: S.rarm.some(r => r.iso === z && r.i === i) }); }); return out; };
ACT.armCell = a => {
  const c = S.c[a.iso], x = c && c.terr[+a.i], me = S.player; if (!x || !c.alive || x.o === a.iso || x.o === me) return fail('Esa ciudad no está ocupada por otro país');
  if (S.rarm.some(r => r.iso === a.iso && r.i === +a.i)) return fail('Ya armas a la guerrilla de esa ciudad'); const cost = Math.max(.3, D.C[a.iso].gdp * .004);
  if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(1)) return fail('Necesitas 1 de capital político'); P().tr -= cost;
  S.rarm.push({ iso: a.iso, i: +a.i, occ: x.o, t: S.turn + ri(2, 4) }); addMod(me, a.iso, 'Armas para liberar nuestra tierra', gain(6), .3);
  if (chance(.25)) { addMod(me, x.o, 'Armas a los rebeldes', -12, .3, 1); news(`${nm(x.o)} descubre armas de ${P().n} en manos de la guerrilla de ${x.n}`, 'dip', x.o, 2); return { ok: false, msg: `Armas entregadas, pero ${nm(x.o)} te ha descubierto` }; }
  return { msg: `Armas en camino a la guerrilla de ${x.n}: el levantamiento llegará en unos turnos` };
};
hook('late', () => { S.rarm = S.rarm.filter(r => { if (S.turn < r.t) return true; const c = S.c[r.iso], x = c && c.terr[r.i]; if (!c || !c.alive || !x || x.o !== r.occ) return false; const O = S.c[r.occ];
  if (chance(clamp(.45 + (O.stab < 40 ? .15 : 0) + (inWar(r.occ) ? .15 : 0), .2, .85))) { restoreTerr(r.iso, r.i); addMod(S.player, r.iso, 'Liberaste una de nuestras ciudades', gain(12), .2); news(`La guerrilla expulsa a ${O.n} de ${x.n}: la ciudad vuelve a ${c.n}`, 'peace', r.iso, 2); wlog('war', r.iso, r.occ, `Levantamiento en ${x.n}: ${c.n} recupera la ciudad`); }
  else news(`${O.n} sofoca un levantamiento en ${x.n}`, 'war', r.occ, 2); return false; }); });
/* ---- fábricas: producen la materia prima tú mismo ---- */
const facLvl = k => (S.fac[k] || {}).l || 0, facOut = k => facLvl(k) * D.FACT[k].out * ((P().rec[k] || 0) ? 1 : .5);
const facCost = k => D.FACT[k].cost * (1 + facLvl(k) * .8) * Math.max(.4, costLvl(S.player)) * ((P().rec[k] || 0) ? 1 : 1.6);
const facUp = () => Object.keys(S.fac).reduce((s, k) => s + facLvl(k) * D.FACT[k].cost * .025 * Math.max(.4, costLvl(S.player)), 0);
{ const r0 = regionProd; regionProd = k => r0(k) + (S.fac && D.FACT[k] ? facOut(k) : 0); }
hook('finance', f => { const u = facUp(); if (u) f.exp.fab = u; });
ACT.buildFac = a => { const k = a.k, F = D.FACT[k]; if (!F) return fail('Fábrica desconocida'); const f = S.fac[k] || (S.fac[k] = { l: 0, r: 0 });
  if (f.r > S.turn) return fail(`Ya hay obras en marcha: terminan en ${f.r - S.turn} t`); if (f.l >= 5) return fail('Nivel máximo'); const c = facCost(k); if (!canPay(c)) return fail(`Necesitas ${money(c)}`);
  P().tr -= c; f.r = S.turn + 2; f.q = 1; return { msg: `Obras de ${F.n} (nivel ${f.l + 1}): listas en 2 turnos` }; };
hook('late', () => { for (const k in S.fac) { const f = S.fac[k]; if (f.q && S.turn >= f.r) { f.l++; f.q = 0; news(`Inaugurada: ${D.FACT[k].n} nivel ${f.l} (+${facOut(k).toFixed(1)} u/turno de ${D.COMMODITIES[k].n.toLowerCase()})`, 'eco', S.player, 2); } } });
const worldFeed = () => S.wlog.concat(S.news.map(n => ({ t: n.tk != null ? n.tk : n.t, k: n.k, a: n.i, b: '', x: n.x, n: 1 })));
