/* =====================================================================
   SISTEMA · REGIONES CON VIDA PROPIA
   Cada región de tu país tiene malestar (0-100) y, si allí hay un
   movimiento real, independentismo. El malestar sube con la pobreza
   relativa, la inestabilidad nacional y si la región vota a la oposición.
   Provoca protestas, disturbios y crisis independentistas. Puedes invertir,
   visitar, aplicar mano dura o conceder autonomía. Además, desastres que
   caen sobre una región concreta. Datos en src/data-regions2.js.
   ===================================================================== */
hook('new', () => { S.rl = {}; }); hook('load', () => { S.rl = S.rl || {}; });
const RL = D.RL, SEPI = {}; D.SEPAR.forEach(([iso, rn, mov, base]) => { const i = D.C[iso] ? D.C[iso].terr.findIndex(t => t.n === rn) : -1; if (i >= 0) (SEPI[iso] = SEPI[iso] || {})[i] = { mov, base }; });
const sepOf = (iso, i) => (SEPI[iso] || {})[i] || null;
const ownRegs = () => P().terr.map((t, i) => i).filter(i => P().terr[i].o === S.player);
const rlNew = i => { const s = sepOf(S.player, i); return { m: RL.start, sep: s ? s.base : 0, inv: 0, dura: 0, aut: 0, cd: 0, cd2: 0 }; };
const rlPeek = i => S.rl[i] || rlNew(i); /* solo lectura, para consultas de la interfaz */
const rlOf = i => S.rl[i] || (S.rl[i] = rlNew(i));
function rlWhy(i) {
  const g = D.C[S.player].terr[i], c = P(), t = c.terr[i], n = c.terr.length, rich = (g.e || 0) / Math.max(.0001, g.w || 1 / n), r = rlPeek(i), W = RL.w, out = [];
  const add = (v, x) => { if (Math.abs(v) >= 1) out.push([Math.round(v), x]); return v; };
  let v = add((100 - c.stab) * W.instab, 'Inestabilidad del país');
  if ((g.w || 0) >= RL.tinyW) v += add(clamp(1 - rich, 0, 1) * W.poor, 'Más pobre que la media'); /* los territorios diminutos no tienen datos fiables */
  if (t.p && t.p !== c.partido && t.p !== D.SUB_RULING[S.player]) v += add(W.opp, 'Vota a la oposición');
  if (r.sep) v += add(r.sep * W.sep, 'Independentismo');
  if (r.inv > S.turn) v += add(W.inv, 'Inversión en curso'); if (r.dura > S.turn) v += add(W.dura, 'Mano dura');
  return { target: clamp(v, 0, 100), why: out };
}
const rlMod = (i, d) => { const r = rlOf(i); if (d.m) r.m = clamp(r.m + d.m, 0, 100); if (d.sep && sepOf(S.player, i)) r.sep = clamp(r.sep + d.sep, 0, 100); if (d.aut) r.aut = 1; };
OPS.rlMod = a => { if (P().terr[a.i]) rlMod(a.i, a); };
const regPend = (t, x, i, list) => pushPend({ k: 'event', id: 'region', t, x, iso: S.player, opts: list.map(o => ({ t: o.t, req: o.req, fx: o.fx.concat([['do', 'rlMod', { i, m: o.m || 0, sep: o.sep || 0, aut: o.aut || 0 }]]) })) });
hook('player', () => {
  const c = P(), SW = RL.sepW; let protests = 0;
  for (const i of ownRegs()) { const r = rlOf(i), s = sepOf(S.player, i), w = rlWhy(i);
    r.m = clamp(r.m + (w.target - r.m) * RL.drift + rr(-4, 4), 0, 100);
    if (s) r.sep = clamp(r.sep + (s.base * SW.base + r.m * SW.m + (r.dura > S.turn ? SW.dura : 0) - (r.aut ? SW.aut : 0) - (r.inv > S.turn ? SW.inv : 0) - r.sep) * RL.sepDrift, 0, 100);
    const n = c.terr[i].n;
    if (r.m > RL.protestAt && protests < RL.protestMax && chance(RL.protestP)) { protests++; c.stab = clamp(c.stab - RL.protestStab, 0, 100); news(`Protestas en ${n}: miles de personas contra el gobierno`, 'pol', S.player, 2); Bus.emit('regfx', { iso: S.player, i, k: 'rev' }); }
    if (r.cd > S.turn || S.pend.length > 1) continue;
    if (s && r.sep >= RL.crisisAt) { r.cd = S.turn + RL.cooldown * 2; Bus.emit('regfx', { iso: S.player, i, k: 'rev' });
      regPend(`Crisis independentista en ${n}`, `${s.mov[0].toUpperCase() + s.mov.slice(1)} convoca un referéndum unilateral. Las calles de ${n} se llenan de banderas.`, i, D.RCRISIS); }
    else if (r.m >= RL.riotAt) { r.cd = S.turn + RL.cooldown; Bus.emit('regfx', { iso: S.player, i, k: 'rev' });
      regPend(`Disturbios en ${n}`, `Barricadas, comercios saqueados y enfrentamientos con la policía en ${n}. Los alcaldes piden una respuesta.`, i, D.RRIOT); }
  }
});
/* acciones regionales */
ACT.rlAct = a => {
  const i = +a.i, c = P(), A = RL.acts[a.k], r = c.terr[i] && c.terr[i].o === S.player ? rlOf(i) : null;
  if (!A) return fail('Acción desconocida'); if (!r) return fail('Esa región no está bajo tu control');
  if (A.sep_only && (!sepOf(S.player, i) || r.aut)) return fail('Esa región no tiene un movimiento al que conceder autonomía');
  if (r.cd2 > S.turn) return fail(`Ya actuaste en ${c.terr[i].n}: espera ${r.cd2 - S.turn} turno${r.cd2 - S.turn > 1 ? 's' : ''}`);
  const cost = A.gdp ? c.gdp * A.gdp : 0; if (cost && !canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(A.cp)) return fail(`Necesitas ${A.cp} de capital político`);
  c.tr -= cost; rlMod(i, A); if (a.k === 'inv') r.inv = S.turn + A.turns; if (a.k === 'dura') r.dura = S.turn + A.turns; if (a.k === 'aut') r.aut = 1;
  if (A.dem) repAdd('dem', A.dem); if (A.mil) secAdd('mil', A.mil); r.cd2 = S.turn + RL.actCd; Bus.emit('regfx', { iso: S.player, i, k: a.k === 'dura' ? 'humo' : 'ayuda' });
  return { msg: `${A.n}: ${c.terr[i].n}` };
};
function rlInfo(i) { const s = sepOf(S.player, i); if (!P().terr[i] || P().terr[i].o !== S.player) return null; const r = rlPeek(i), w = rlWhy(i);
  return { m: r.m, sep: s ? r.sep : null, mov: s ? s.mov : null, inv: r.inv > S.turn ? r.inv - S.turn : 0, dura: r.dura > S.turn ? r.dura - S.turn : 0, aut: !!r.aut, cd: r.cd2 > S.turn ? r.cd2 - S.turn : 0, why: w.why }; }
const rlList = () => ownRegs().map(i => [i, rlPeek(i).m]).sort((a, b) => b[1] - a[1]);

/* desastres localizados: en tu país (con decisión) y en el mundo (titular) */
function disasterAt(iso) {
  const g = D.C[iso].terr, idx = S.c[iso].terr.map((t, i) => i).filter(i => S.c[iso].terr[i].o === iso && g[i].la != null);
  const i = idx.length ? wpick(idx, j => (g[j].w || .01) + .02) : -1; if (i < 0) return null; const la = Math.abs(g[i].la);
  const ok = D.RDIS.filter(d => la >= d.lat[0] && la <= d.lat[1] && (!d.coast || !D.C[iso].land)); return ok.length ? { i, d: pick(ok) } : null;
}
hook('world', () => {
  const X = RL.dis;
  if (!S.over && chance(X.player) && S.pend.length < 2) { const x = disasterAt(S.player); if (x) { const n = P().terr[x.i].n, c = P();
    c.gdp *= 1 - rr(X.gdpHit[0], X.gdpHit[1]); rlMod(x.i, { m: X.unrest }); news(`${x.d.n} golpea ${n}`, 'world', S.player, 3); Bus.emit('regfx', { iso: S.player, i: x.i, k: x.d.ic });
    regPend(`${x.d.n} en ${n}`, `${x.d.n} ha devastado ${n}. Hay víctimas, carreteras cortadas y miles de personas sin hogar. Todo el país mira cómo respondes.`, x.i, D.RDIS_OPTS); } }
  if (chance(X.world)) { const z = pick(alive().filter(y => !isP(y) && S.c[y].terr.length > 2 && S.c[y].gdp > 80)), x = z && disasterAt(z);
    if (x) { const n = S.c[z].terr[x.i].n; S.c[z].stab = clamp(S.c[z].stab - X.worldStab, 0, 100); news(`${x.d.n} golpea ${n} (${S.c[z].n})`, 'world', z, 2); wlog('world', z, '', `${x.d.n} golpea ${n}`); Bus.emit('regfx', { iso: z, i: x.i, k: x.d.ic }); } }
  if (chance(X.march)) { const L = []; for (const iso in SEPI) if (!isP(iso) && S.c[iso] && S.c[iso].alive) for (const i in SEPI[iso]) if (S.c[iso].terr[i].o === iso) L.push([iso, +i]);
    const m = pick(L); if (m) { const [iso, i] = m, rn = S.c[iso].terr[i].n; news(`Miles de personas marchan en ${rn} (${S.c[iso].n}) convocadas por ${SEPI[iso][i].mov}`, 'pol', iso, 2); wlog('pol', iso, '', `Marcha independentista en ${rn}`); Bus.emit('regfx', { iso, i, k: 'rev' }); } }
});
