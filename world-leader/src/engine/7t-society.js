/* =====================================================================
   SISTEMA · SOCIEDAD
   Debates: la opinión pública (-100..100) se mueve sola (la educación la
   empuja) y puedes liderarla. Si tus leyes van contra una mayoría clara,
   o la mayoría pide una reforma que no haces, crece un movimiento que
   acaba en protestas: dialogar, prometer (y cumplir) o reprimir.
   Educación a largo plazo: su media de muchos años sube tu investigación.
   Datos en src/data-society.js.
   ===================================================================== */
const SO = D.SOC, DBK = Object.keys(D.DEBATES), MVK = Object.keys(D.MOVES);
function socInit() { const c = P(), gpc = c.gdp / Math.max(.001, c.pop), k = clamp((Math.log10(Math.max(1, gpc)) - .3) / 1.5, 0, 1) + (c.reg === 'dem' ? .15 : -.15), op = {}, mv = {};
  for (const d of DBK) { op[d] = Math.round(clamp(D.DEBATES[d].prog * (k * 100 - 50) * .9 + rr(-20, 20), -95, 95)); mv[d] = 0; } for (const m of MVK) mv[m] = 0;
  S.soc = { op, mv, cd: {}, prom: {}, eduL: S.nat ? S.nat.ix.edu : 50 }; }
hook('new', socInit); hook('load', () => { if (!S.soc) socInit(); for (const d of DBK) if (S.soc.op[d] == null) { S.soc.op[d] = 0; S.soc.mv[d] = 0; } for (const m of MVK) S.soc.mv[m] = S.soc.mv[m] || 0; });
/* tu postura: +1 a favor, -1 en contra, 0 sin ley */
const debPos = d => { const B = D.DEBATES[d], L = S.pol.laws; if (B.pro.some(id => L[id] != null) || (B.natLegal && S.nat && S.nat.legal)) return 1; if (B.con.some(id => L[id] != null)) return -1; return 0; };
/* cuánto choca tu postura con la opinión: lo que alimenta el movimiento */
const debGap = d => { const o = S.soc.op[d], p = debPos(d); return p ? (p * o < 0 ? Math.abs(o) : 0) : Math.max(0, o - 30) * 1.2; }; /* sin ley, solo protesta la mayoría que pide la reforma */
const moveCause = m => { const N = S.nat; if (!N) return 0; if (m === 'huelga') return Math.max(0, N.ix.des - 55) * 1.5 + Math.max(0, 1 - N.bud.soc) * 40; return Math.max(0, 1 - N.bud.edu) * 70; };
OPS.socMod = a => { const s = S.soc; s.mv[a.k] = clamp(s.mv[a.k] + (a.mv || 0), 0, 100); if (a.promise) s.prom[a.k] = S.turn + SO.promiseTurns; if (S.nat && a.ix) natMod({ ix: a.ix });
  if (a.back && chance(SO.backP)) { s.mv[a.k] = clamp(s.mv[a.k] + 40, 0, 100); news('La represión enciende todavía más las calles', 'pol', S.player, 2); } };
const promiseKept = k => D.DEBATES[k] ? debGap(k) < SO.gapAt : moveCause(k) < 10;
hook('player', () => { const s = S.soc, c = P(); if (!s) return; const edu = S.nat ? S.nat.ix.edu : 50;
  s.eduL += (edu - s.eduL) * SO.eduK;
  for (const d of DBK) s.op[d] = clamp(s.op[d] + D.DEBATES[d].prog * (edu - 50) * SO.opDrift + rr(-SO.opNoise, SO.opNoise), -100, 100);
  let fired = false;
  for (const k of DBK.concat(MVK)) { const gap = D.DEBATES[k] ? debGap(k) : moveCause(k);
    s.mv[k] = clamp(s.mv[k] + (gap - SO.gapAt) * SO.mvK - SO.mvDecay * (gap < SO.gapAt ? 1 : 0), 0, 100);
    if (s.prom[k] && s.prom[k] <= S.turn) { delete s.prom[k]; if (!promiseKept(k)) { s.mv[k] = clamp(s.mv[k] + 40, 0, 100); if (S.nat) natMod({ ix: { ins: -4 } }); news(`Promesa incumplida: ${(D.DEBATES[k] || D.MOVES[k]).n.toLowerCase()} vuelve a la calle`, 'pol', S.player, 2); } }
    if (s.mv[k] > SO.stabAt) c.stab = clamp(c.stab - (s.mv[k] - SO.stabAt) * SO.stabK, 0, 100);
    if (!fired && s.mv[k] > SO.protestAt && !(s.prom[k] > S.turn) && S.pend.length < 2 && chance(SO.protestP)) { fired = true; socPend(k); } } });
function socPend(k) { const B = D.DEBATES[k], M = D.MOVES[k], o = B ? S.soc.op[k] : 0, side = o > 0 ? 'a favor de' : 'en contra de';
  const t = B ? `Marchas ${side} ${B.q}` : M.t, x = B ? `Cientos de miles salen a la calle ${side} ${B.q}. La opinión pública está ${Math.abs(Math.round(o))} puntos inclinada de su lado y te acusan de no escuchar.` : M.x;
  pushPend({ k: 'event', id: 'protest', t: t.replace(/ de el /g, ' del '), x: x.replace(/ de el /g, ' del '), iso: S.player, opts: SO.opts.map(([n, f, a]) => ({ t: n, fx: D.fx(f).concat([['do', 'socMod', Object.assign({ k }, a)]]) })) }); }
ACT.socLead = a => { const s = S.soc, d = a.k, dir = Math.sign(+a.dir); if (!D.DEBATES[d] || !dir) return fail('Debate inválido'); if ((s.cd[d] || 0) > S.turn) return fail(`Ya hiciste campaña sobre esto: espera ${s.cd[d] - S.turn} turnos`);
  if (!useCP(SO.lead.cp)) return fail(`Necesitas ${SO.lead.cp} de capital político`); s.op[d] = clamp(s.op[d] + dir * SO.lead.op, -100, 100); s.cd[d] = S.turn + SO.lead.cd;
  if (dir > 0 === D.DEBATES[d].prog > 0) secAdd('jov', 1); else secAdd('rel', 1); return { msg: `Campaña ${dir > 0 ? 'a favor de' : 'en contra de'} ${D.DEBATES[d].q}: la opinión se mueve`.replace(/ de el /g, ' del ') }; };
/* la educación de muchos años es la que hace ciencia */
{ const m0 = mod; mod = k => { const v = m0(k); return k === 'rp' && S && S.soc ? v + (S.soc.eduL - 50) * SO.eduRp : v; }; }
function socInfo() { const s = S.soc; if (!s) return null; const c = P(), e = S.eco || {};
  return { eduL: s.eduL, rp: (s.eduL - 50) * SO.eduRp,
    deb: DBK.map(d => ({ k: d, op: s.op[d], pos: debPos(d), gap: debGap(d), mv: s.mv[d], cd: Math.max(0, (s.cd[d] || 0) - S.turn), prom: Math.max(0, (s.prom[d] || 0) - S.turn) })),
    mov: MVK.map(m => ({ k: m, mv: s.mv[m], cause: moveCause(m), prom: Math.max(0, (s.prom[m] || 0) - S.turn) })),
    eco: { grow: growthOf(S.player), unemp: e.unemp, inf: e.inf, debt: debtRatio(), trade: tradeIncome(), tar: e.tar, sancOn: S.sanc.filter(x => x.on === S.player).length, strClosed: Object.keys(S.str || {}).filter(id => !strOpen(id)).length, gdp: c.gdp } }; }
