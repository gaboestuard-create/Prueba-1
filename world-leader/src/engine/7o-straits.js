/* =====================================================================
   SISTEMA · RUTAS MARÍTIMAS: estrechos que se pueden cerrar
   Mientras un estrecho está cerrado, suben los precios de lo que pasa por
   él, cae el comercio de las regiones que dependen de él y sus economías se
   resienten. La IA cierra estrechos en guerra o bajo presión; hay piratería.
   Si controlas uno puedes cerrarlo; si no, puedes escoltar convoyes o
   presionar para que lo reabran. Datos en src/data-straits.js.
   ===================================================================== */
const SR = D.STR, STR = {}; D.STRAITS.forEach(x => STR[x.id] = x);
hook('new', () => { S.str = {}; S.strCd = {}; }); hook('load', () => { S.str = S.str || {}; S.strCd = S.strCd || {}; });
const strOpen = id => !S.str[id] || S.str[id].t <= S.turn;
const strDep = (iso, id) => (STR[id].users[D.C[iso].region] || 0);
function strClose(id, by, turns, why) { S.str[id] = { by, t: S.turn + turns, why }; news(`${STR[id].n} cerrado: ${why}`, 'eco', by || S.player, 3); wlog('eco', by || '', '', `${STR[id].n} cerrado`); Bus.emit('strait', { id, closed: 1 }); }
function strReopen(id, why) { if (!S.str[id]) return; delete S.str[id]; S.strCd[id] = S.turn + SR.calm; news(`${STR[id].n} vuelve a abrirse${why ? ': ' + why : ''}`, 'eco', S.player, 3); Bus.emit('strait', { id, closed: 0 }); }
/* efecto en el comercio del jugador */
{ const t0 = tradeIncome; tradeIncome = () => { const r = t0(); let k = 1; for (const s of D.STRAITS) if (!strOpen(s.id) && !(S.str[s.id].esc > S.turn) && S.str[s.id].by !== S.player) k -= strDep(S.player, s.id) * SR.tradeHit; r.v *= Math.max(.3, k); return r; }; }
hook('world', () => {
  for (const s of D.STRAITS) { const st = S.str[s.id];
    if (st && st.t <= S.turn) { strReopen(s.id, 'el tráfico se normaliza'); continue; }
    if (st) { for (const k in s.goods) S.mkt.shocks.push({ k, m: s.goods[k] }); for (const z of alive()) if (!isP(z)) { const d = strDep(z, s.id); if (d) S.c[z].gdp *= 1 - d * SR.gdpHit; } if (!isP(st.by)) P().gdp *= 1 - strDep(S.player, s.id) * SR.gdpHit; continue; }
    if ((S.strCd[s.id] || 0) > S.turn) continue;
    const c = s.ctrl.filter(z => S.c[z] && S.c[z].alive && !isP(z)), angry = c.find(z => inWar(z) || S.sanc.filter(x => x.on === z).length >= 3);
    if (angry && chance(SR.aiCloseP)) strClose(s.id, angry, ri(SR.minTurns, SR.maxTurns), `${S.c[angry].n} bloquea el paso de buques${inWar(angry) ? ' por la guerra' : ' en respuesta a las sanciones'}`);
    else if ((s.id === 'bab' || s.id === 'malaca') && chance(SR.piracyP)) strClose(s.id, '', ri(2, 4), 'ataques de piratas y milicias contra mercantes');
  }
});
/* acciones del jugador */
ACT.strait = a => {
  const s = STR[a.id], me = S.player; if (!s) return fail('Estrecho desconocido'); const st = S.str[a.id];
  if (a.k === 'close') { if (!s.ctrl.includes(me)) return fail('No controlas ese estrecho'); if (st) return fail('Ya está cerrado'); if (!useCP(SR.closeCp)) return fail(`Necesitas ${SR.closeCp} de capital político`);
    strClose(a.id, me, SR.maxTurns, `${P().n} cierra el paso`); repAdd('conf', SR.closeConf); relAll(SR.closeRel, 'Cerraste ' + s.n, 'big'); return { msg: `Has cerrado ${s.n}` }; }
  if (a.k === 'open') { if (!st || st.by !== me) return fail('No lo has cerrado tú'); strReopen(a.id, `${P().n} levanta el bloqueo`); repAdd('conf', 4); return { msg: `${s.n} reabierto` }; }
  if (a.k === 'escort') { if (!st) return fail('Está abierto'); if (catPow(me, 'mar') < SR.escortNavy) return fail(`Necesitas una armada de ${SR.escortNavy} de poder naval`); const cost = P().gdp * SR.escortCost; if (!canPay(cost)) return fail(`Necesitas ${money(cost)}`);
    P().tr -= cost; st.esc = S.turn + 3; st.t = Math.max(S.turn + 1, st.t - 2); repAdd('conf', 3); if (st.by && !isP(st.by)) addMod(me, st.by, 'Escoltaste convoyes por su estrecho', -6, .5); return { msg: 'Tu armada escolta a los mercantes: tu comercio pasa' }; }
  if (a.k === 'press') { if (!st || !st.by || isP(st.by)) return fail('Nadie a quien presionar'); if (!useCP(SR.pressCp)) return fail(`Necesitas ${SR.pressCp} de capital político`);
    const ok = chance(clamp(.2 + rel(me, st.by) / 150 + S.rep.conf / 300, .05, .8)); if (ok) { strReopen(a.id, `tras la presión de ${P().n}`); return { msg: `${nm(st.by)} cede y reabre ${s.n}` }; }
    addMod(me, st.by, 'Presión por el estrecho', -3, .5); return { ok: false, msg: `${nm(st.by)} se niega a reabrir` }; }
  return fail('Acción desconocida');
};
const strInfo = () => D.STRAITS.map(s => { const st = S.str[s.id]; return { s, open: strOpen(s.id), by: st && st.by, left: st ? st.t - S.turn : 0, esc: !!(st && st.esc > S.turn), dep: strDep(S.player, s.id), mine: s.ctrl.includes(S.player) }; });
