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
const SEPI = {}; D.SEPAR.forEach(([iso, rn, mov, base]) => { const i = D.C[iso] ? D.C[iso].terr.findIndex(t => t.n === rn) : -1; if (i >= 0) (SEPI[iso] = SEPI[iso] || {})[i] = { mov, base }; });
const sepOf = (iso, i) => (SEPI[iso] || {})[i] || null;
const ownRegs = () => P().terr.map((t, i) => i).filter(i => P().terr[i].o === S.player);
function rlOf(i) { const r = S.rl[i]; if (r) return r; const s = sepOf(S.player, i); return S.rl[i] = { m: 20, sep: s ? s.base : 0, inv: 0, dura: 0, aut: 0, cd: 0 }; }
function rlWhy(i) {
  const g = D.C[S.player].terr[i], c = P(), t = c.terr[i], n = c.terr.length, rich = (g.e || 0) / Math.max(.0001, g.w || 1 / n), r = rlOf(i), out = [];
  const add = (v, x) => { if (Math.abs(v) >= 1) out.push([Math.round(v), x]); return v; };
  let v = add((100 - c.stab) * .6, 'Inestabilidad del país');
  if ((g.w || 0) >= .003) v += add(clamp(1 - rich, 0, 1) * 32, 'Más pobre que la media'); // los territorios diminutos no tienen datos fiables
  if (t.p && t.p !== c.partido && t.p !== D.SUB_RULING[S.player]) v += add(12, 'Vota a la oposición');
  if (r.sep) v += add(r.sep * .3, 'Independentismo');
  if (r.inv > S.turn) v += add(-15, 'Inversión en curso'); if (r.dura > S.turn) v += add(-20, 'Mano dura');
  return { target: clamp(v, 0, 100), why: out };
}
const rlMod = (i, d) => { const r = rlOf(i); if (d.m) r.m = clamp(r.m + d.m, 0, 100); if (d.sep && sepOf(S.player, i)) r.sep = clamp(r.sep + d.sep, 0, 100); if (d.aut) r.aut = 1; };
OPS.rlMod = a => { if (P().terr[a.i]) rlMod(a.i, a); };
const regPend = (t, x, i, list) => pushPend({ k: 'event', id: 'region', t, x, iso: S.player, opts: list.map(o => ({ t: o.t, fx: o.fx.concat([['do', 'rlMod', { i, m: o.m || 0, sep: o.sep || 0, aut: o.aut || 0 }]]) })) });
hook('player', () => {
  const L = D.RL, c = P(); let protests = 0;
  for (const i of ownRegs()) { const r = rlOf(i), s = sepOf(S.player, i), w = rlWhy(i);
    r.m = clamp(r.m + (w.target - r.m) * L.drift + rr(-4, 4), 0, 100);
    if (s) r.sep = clamp(r.sep + (s.base * .8 + r.m * .4 + (r.dura > S.turn ? 15 : 0) - (r.aut ? 25 : 0) - (r.inv > S.turn ? 5 : 0) - r.sep) * L.sepDrift, 0, 100);
    const n = c.terr[i].n;
    if (r.m > L.protestAt && protests < 2 && chance(.25)) { protests++; c.stab = clamp(c.stab - L.protestStab, 0, 100); news(`Protestas en ${n}: miles de personas contra el gobierno`, 'pol', S.player, 2); Bus.emit('regfx', { iso: S.player, i, k: 'rev' }); }
    if (r.cd > S.turn || S.pend.length > 1) continue;
    if (s && r.sep >= L.crisisAt) { r.cd = S.turn + L.cooldown * 2; Bus.emit('regfx', { iso: S.player, i, k: 'rev' });
      regPend(`Crisis independentista en ${n}`, `${s.mov[0].toUpperCase() + s.mov.slice(1)} convoca un referéndum unilateral. Las calles de ${n} se llenan de banderas.`, i, D.RCRISIS); }
    else if (r.m >= L.riotAt) { r.cd = S.turn + L.cooldown; Bus.emit('regfx', { iso: S.player, i, k: 'rev' });
      regPend(`Disturbios en ${n}`, `Barricadas, comercios saqueados y enfrentamientos con la policía en ${n}. Los alcaldes piden una respuesta.`, i, D.RRIOT); }
  }
});
/* acciones regionales */
ACT.rlAct = a => {
  const i = +a.i, c = P(), A = D.RL.acts[a.k], r = c.terr[i] && c.terr[i].o === S.player ? rlOf(i) : null;
  if (!A) return fail('Acción desconocida'); if (!r) return fail('Esa región no está bajo tu control');
  if (A.sep_only && (!sepOf(S.player, i) || r.aut)) return fail('Esa región no tiene un movimiento al que conceder autonomía');
  if (r.cd2 > S.turn) return fail(`Ya actuaste en ${c.terr[i].n}: espera ${r.cd2 - S.turn} turno${r.cd2 - S.turn > 1 ? 's' : ''}`);
  const cost = A.gdp ? c.gdp * A.gdp : 0; if (cost && !canPay(cost)) return fail(`Necesitas ${money(cost)}`); if (!useCP(A.cp)) return fail(`Necesitas ${A.cp} de capital político`);
  c.tr -= cost; rlMod(i, A); if (a.k === 'inv') r.inv = S.turn + A.turns; if (a.k === 'dura') r.dura = S.turn + A.turns; if (a.k === 'aut') r.aut = 1;
  if (A.dem) repAdd('dem', A.dem); if (A.mil) secAdd('mil', A.mil); r.cd2 = S.turn + 2; Bus.emit('regfx', { iso: S.player, i, k: a.k === 'dura' ? 'humo' : 'ayuda' });
  return { msg: `${A.n}: ${c.terr[i].n}` };
};
function rlInfo(i) { const s = sepOf(S.player, i); if (!P().terr[i] || P().terr[i].o !== S.player) return null; const r = rlOf(i), w = rlWhy(i);
  return { m: r.m, sep: s ? r.sep : null, mov: s ? s.mov : null, inv: r.inv > S.turn ? r.inv - S.turn : 0, dura: r.dura > S.turn ? r.dura - S.turn : 0, aut: !!r.aut, cd: r.cd2 > S.turn ? r.cd2 - S.turn : 0, why: w.why }; }
const rlList = () => ownRegs().map(i => [i, rlOf(i).m]).sort((a, b) => b[1] - a[1]);

/* desastres localizados: en tu país (con decisión) y en el mundo (titular) */
function disasterAt(iso) {
  const g = D.C[iso].terr, idx = S.c[iso].terr.map((t, i) => i).filter(i => S.c[iso].terr[i].o === iso && g[i].la != null);
  const i = idx.length ? wpick(idx, j => (g[j].w || .01) + .02) : -1; if (i < 0) return null; const la = Math.abs(g[i].la);
  const ok = D.RDIS.filter(d => la >= d.lat[0] && la <= d.lat[1] && (!d.coast || !D.C[iso].land)); return ok.length ? { i, d: pick(ok) } : null;
}
hook('world', () => {
  if (!S.over && chance(.07) && S.pend.length < 2) { const x = disasterAt(S.player); if (x) { const n = P().terr[x.i].n, c = P();
    c.gdp *= 1 - rr(.002, .006); rlMod(x.i, { m: 20 }); news(`${x.d.n} golpea ${n}`, 'world', S.player, 3); Bus.emit('regfx', { iso: S.player, i: x.i, k: x.d.ic });
    regPend(`${x.d.n} en ${n}`, `${x.d.n} ha devastado ${n}. Hay víctimas, carreteras cortadas y miles de personas sin hogar. Todo el país mira cómo respondes.`, x.i, D.RDIS_OPTS); } }
  if (chance(.3)) { const z = pick(alive().filter(y => !isP(y) && S.c[y].terr.length > 2 && S.c[y].gdp > 80)), x = z && disasterAt(z);
    if (x) { const n = S.c[z].terr[x.i].n; S.c[z].stab = clamp(S.c[z].stab - 2, 0, 100); news(`${x.d.n} golpea ${n} (${S.c[z].n})`, 'world', z, 2); wlog('world', z, '', `${x.d.n} golpea ${n}`); Bus.emit('regfx', { iso: z, i: x.i, k: x.d.ic }); } }
  if (chance(.08)) { const L = D.SEPAR.filter(s => s[0] !== S.player && S.c[s[0]] && S.c[s[0]].alive && sepOf(s[0], D.C[s[0]].terr.findIndex(t => t.n === s[1]))), s = pick(L);
    if (s) { const i = D.C[s[0]].terr.findIndex(t => t.n === s[1]); news(`Miles de personas marchan en ${s[1]} (${S.c[s[0]].n}) convocadas por ${s[2]}`, 'pol', s[0], 2); wlog('pol', s[0], '', `Marcha independentista en ${s[1]}`); Bus.emit('regfx', { iso: s[0], i, k: 'rev' }); } }
});
