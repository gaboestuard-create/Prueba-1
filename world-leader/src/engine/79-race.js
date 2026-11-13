/* =====================================================================
   SISTEMA · CARRERA TECNOLÓGICA MUNDIAL
   Todas las economías relevantes investigan los mismos descubrimientos.
   El primero cobra licencias a los que llegan después, gana prestigio y
   puede mover los mercados del mundo; los demás pagan la mitad de puntos
   (ya se sabe que es posible). La IA aplica crecimiento, estabilidad y
   fuerza militar de lo que domina.
   ===================================================================== */
const foesOf = z => alive().filter(y => y !== z && y !== S.player && rel(z, y) < -40);
const DS = {}; D.DISC.forEach(x => DS[x.id] = x);
const hasD = (iso, id) => !!S.disc && (S.disc.own[id] || []).includes(iso);
const discCost = id => Math.round(DS[id].cost * ((S.disc.own[id] || []).length ? .55 : 1));
const discOpen = (iso, id) => !hasD(iso, id) && (!DS[id].req || hasD(iso, DS[id].req));
function rdBase(iso) { const c = C(iso), gpc = c.gdp / Math.max(.001, c.pop); return .045 * Math.sqrt(Math.max(0, c.gdp)) * clamp(.4 + gpc / 60, .4, 1.5) * (c.reg === 'com' || c.reg === 'aut' ? 1.5 : 1); }
const rdPts = iso => isP(iso) ? rdBase(iso) * (1 + .8 * S.disc.rd) + researchRate() * .3 : rdBase(iso) * (1 + .5 * clamp(C(iso).gdp / Math.max(.001, C(iso).pop) / 30, .3, 2));
hook('new', () => { S.disc = { own: {}, prog: {}, cur: null, rd: .5, b: {} }; });
hook('load', () => { S.disc = S.disc || { own: {}, prog: {}, cur: null, rd: .5, b: {} }; });
/* bonos de lo que domina cada país: el jugador por mod/lawSum, la IA por fuerza y crecimiento */
{ const m0 = mod, l0 = lawSum;
  mod = k => { let v = m0(k); if (S.disc) for (const id in S.disc.own) if (S.disc.own[id].includes(S.player)) v += (DS[id].m || {})[k] || 0; return v; };
  lawSum = k => { let v = l0(k); if (S.disc) for (const id in S.disc.own) if (S.disc.own[id].includes(S.player)) v += (DS[id].per || {})[k] || 0; return v; };
  const p0 = power; power = iso => p0(iso) * (isP(iso) || !S.disc ? 1 : 1 + ((S.disc.b[iso] || {}).mil || 0));
  const g0 = growthOf; growthOf = iso => g0(iso) + (isP(iso) || !S.disc ? 0 : (S.disc.b[iso] || {}).grow || 0);
  const r0 = canReach; canReach = (a, b) => r0(a, b) || (hasD(a, 'satelites') && hasD(a, 'hiper'));
}
function acquire(iso, id, how) {
  const X = DS[id], L = S.disc.own[id] || (S.disc.own[id] = []); if (L.includes(iso)) return; const first = !L.length, c = C(iso); L.push(iso); delete (S.disc.prog[iso] || {})[id];
  const per = X.per || {}, b = S.disc.b[iso] || (S.disc.b[iso] = {}); b.mil = (b.mil || 0) + (per.mil || 0); b.grow = (b.grow || 0) + (per.grow || 0); if (!isP(iso)) c.stab0 = clamp(c.stab0 + (per.stab || 0), 0, 100);
  if (first) { (X.first && X.first.world || []).forEach(w => w[0] === 'sent' ? S.mkt.sent += w[1] : S.mkt.shocks.push({ k: w[1], m: w[2] }));
    news(`${c.n} logra antes que nadie: ${X.n}`, 'eco', iso, isP(iso) || c.gdp > 1500 || nb(S.player).includes(iso) ? 3 : 2);
    if (isP(iso)) for (const k in (X.first && X.first.rep) || {}) repAdd(k, X.first.rep[k]);
    else if (X.f === 'mil' && rel(S.player, iso) < 0) why(`${c.n} gana la carrera militar`, () => secAdd('mil', -3)); }
  else { const fst = L[0], fee = Math.min(c.gdp * .0012, 25); if (!how && C(fst).alive && fst !== iso) { c.tr -= fee; C(fst).tr += fee; if (isP(fst)) news(`${c.n} te paga ${money(fee)} en licencias por ${X.n}`, 'eco', iso, 2); else if (isP(iso)) news(`Pagas ${money(fee)} de licencias a ${C(fst).n} por ${X.n}`, 'eco', fst, 2); } }
  if (isP(iso)) { if (S.disc.cur === id) S.disc.cur = null; why(X.n, () => { for (const k in X.sec || {}) secAdd(k, X.sec[k]); }); Bus.emit('tech', { id, n: X.n + (L[0] === iso ? ' · primero en el mundo' : '') }); }
}
ACT.discover = a => { if (!DS[a.id]) return fail('Descubrimiento desconocido'); if (hasD(S.player, a.id)) return fail('Ya lo dominas'); if (!discOpen(S.player, a.id)) return fail(`Primero necesitas: ${DS[DS[a.id].req].n}`); S.disc.cur = a.id; return { msg: `Tu programa nacional de I+D se vuelca en: ${DS[a.id].n}` }; };
ACT.rdBudget = a => { const v = +a.v; if (![0, .5, 1, 2, 3].includes(v)) return fail('Presupuesto inválido'); S.disc.rd = v; return { msg: `I+D: ${v}% del PIB al año` }; };
hook('finance', f => { f.exp.ide = P().gdp * S.disc.rd / 400; let r = 0; for (const b of S.bases) if (b.in === S.player && b.rent) r += b.rent; if (r) f.inc.alq = r; });
const progOf = (iso, id) => (S.disc.prog[iso] || {})[id] || 0;
function pushProg(iso, id, v) { const P0 = S.disc.prog[iso] || (S.disc.prog[iso] = {}); P0[id] = (P0[id] || 0) + v; if (P0[id] >= discCost(id)) acquire(iso, id); }
hook('player', () => { const id = S.disc.cur; if (id && discOpen(S.player, id)) pushProg(S.player, id, rdPts(S.player)); });
const DW = { mil: 'agres', sal: 'coop', amb: 'coop' };
hook('world', () => {
  for (const iso of alive()) { if (isP(iso)) continue; const c = S.c[iso]; if (c.gdp < 150) continue;
    if (!c.dt || hasD(iso, c.dt) || !discOpen(iso, c.dt)) { const o = D.DISC.filter(x => discOpen(iso, x.id)); if (!o.length) { c.dt = null; continue; }
      const w = o.map(x => (DW[x.f] ? .4 + (c.per[DW[x.f]] || .5) * 1.4 : 1) * ((S.disc.own[x.id] || []).length ? 1.6 : 1)); let r = rr(0, w.reduce((s, v) => s + v, 0)); c.dt = o[o.length - 1].id; for (let i = 0; i < o.length; i++) if ((r -= w[i]) <= 0) { c.dt = o[i].id; break; } }
    pushProg(iso, c.dt, rdPts(iso) * rr(.7, 1.3)); }
});
/* robar tecnología también sirve para tu proyecto si ellos ya lo dominan */
{ const s0 = ACT.spy; ACT.spy = a => { const r = s0(a), id = S.disc.cur; if (a.op === 'tec' && r && r.ok !== false && id && hasD(a.iso, id)) { pushProg(S.player, id, discCost(id) * .35); r.msg += ` · y planos de ${DS[id].n} (+35%)`; } return r; }; }
const raceInfo = () => D.DISC.map(x => { const own = S.disc.own[x.id] || [], lead = alive().filter(z => !isP(z) && progOf(z, x.id) > 0 && !own.includes(z)).sort((a, b) => progOf(b, x.id) - progOf(a, x.id)).slice(0, 2);
  return { id: x.id, own, cost: discCost(x.id), mine: progOf(S.player, x.id), open: discOpen(S.player, x.id), lead: lead.map(z => ({ iso: z, p: progOf(z, x.id) / discCost(x.id) })) }; });
const sciRank = () => alive().filter(z => S.c[z].gdp > 100 || isP(z)).map(z => ({ iso: z, pts: rdPts(z), n: D.DISC.filter(x => hasD(z, x.id)).length, first: D.DISC.filter(x => (S.disc.own[x.id] || [])[0] === z).length, t: isP(z) ? S.disc.cur : spyNet(z) >= 1 ? S.c[z].dt : '?' })).sort((a, b) => b.pts - a.pts).slice(0, 15);

/* ---- licencias, proyectos conjuntos y presión sobre tu programa ---- */
OPS.discGet = a => acquire(S.player, a.id, 'lic');
OPS.discSell = a => acquire(a.iso, a.id, 'lic');
OPS.discJoint = a => { const id = S.disc.cur; if (id) pushProg(S.player, id, discCost(id) * .3); pushProg(a.iso, a.id || id, discCost(a.id || id) * .3); };
OPS.discHalt = () => { if (S.disc.cur) delete (S.disc.prog[S.player] || {})[S.disc.cur]; S.disc.cur = null; };
function techOffer() {
  const me = S.player, al = alive().filter(z => z !== me && S.c[z].lastAsk + 6 <= S.turn && !atWar(me, z) && S.c[z].gdp > 150), cur = S.disc.cur, out = [];
  const sellers = []; for (const x of D.DISC) if (!hasD(me, x.id) && discOpen(me, x.id)) for (const z of S.disc.own[x.id] || []) if (al.includes(z) && rel(me, z) > 15 && (x.f !== 'mil' || alliesOf(me).includes(z))) sellers.push([z, x]);
  if (sellers.length) { const [z, x] = pick(sellers), price = Math.max(.5, P().gdp * .003 * x.cost / 100); out.push([z, `${nm(z)} te ofrece una licencia`, `${S.c[z].lider.n} está dispuesto a venderte la tecnología de ${x.n} por ${money(price)}. Ahorrarías años de laboratorio.`, [{ t: `Comprar · ${money(price)}`, fx: [['$', -price], ['do', 'discGet', { id: x.id }], ['rel', 'T', 5, 'Les compraste tecnología']] }, { t: 'Lo desarrollaremos nosotros', fx: [] }]]); }
  const buyers = []; for (const x of D.DISC) if (hasD(me, x.id)) for (const z of al) if (!hasD(z, x.id) && rel(me, z) > 0 && (x.f !== 'mil' || rel(me, z) > 40)) buyers.push([z, x]);
  if (buyers.length) { const [z, x] = pick(buyers), price = Math.max(.5, S.c[z].gdp * .003 * x.cost / 100), riv = foesOf(z).filter(y => alliesOf(me).includes(y));
    out.push([z, `${nm(z)} quiere tu tecnología`, `${S.c[z].lider.n} ofrece ${money(price)} por la licencia de ${x.n}.${riv.length ? ` Tu aliado ${nm(riv[0])} no lo verá con buenos ojos.` : ''} Vender te da dinero hoy; tu ventaja se reduce.`, [{ t: `Vender · ${money(price)}`, fx: [['$', price], ['do', 'discSell', { iso: z, id: x.id }], ['rel', 'T', 8, 'Les vendiste tecnología']].concat(riv.length ? [['rel', riv[0], -10, 'Vendiste tecnología a su enemigo']] : []) }, { t: 'No se vende', fx: [['rel', 'T', -4, 'No quisiste venderles tecnología']] }]]); }
  if (cur) { const z = pick(al.filter(z => rel(me, z) > 30 && S.c[z].dt === cur)); if (z) out.push([z, `Proyecto conjunto con ${nm(z)}`, `${nm(z)} también persigue ${DS[cur].n}. ${S.c[z].lider.n} propone juntar laboratorios: los dos avanzaríais un 30%, aunque también ellos llegarían antes.`, [{ t: `Unir esfuerzos · ${money(P().gdp * .001)}`, fx: [['$', -P().gdp * .001], ['do', 'discJoint', { iso: z, id: cur }], ['rel', 'T', 8, 'Investigamos juntos']] }, { t: 'Preferimos ir solos', fx: [['rel', 'T', -2, 'No quisiste investigar con ellos']] }]]); }
  if (cur && DS[cur].f === 'mil' && progOf(me, cur) > discCost(cur) * .4) { const z = pick(al.filter(z => S.c[z].gdp > P().gdp && rel(me, z) < 10)); if (z) out.push([z, `${nm(z)} exige que detengas tu programa`, `${S.c[z].lider.n} sabe que estás cerca de dominar ${DS[cur].n} y exige que lo abandones «por la estabilidad regional». Si sigues, habrá consecuencias.`, [{ t: 'Detener el programa', fx: [['do', 'discHalt', {}], ['rel', 'T', 12, 'Detuviste tu programa militar'], ['sec', 'mil', -6]] }, { t: 'Seguir adelante', fx: [['rel', 'T', -12, 'Desafiaste su exigencia'], ['sec', 'mil', 4], ['chance', .35, [['do', 'aiSanc', { iso: z }]], []]] }, { t: 'Negar que exista', fx: [['rep', 'conf', -3], ['chance', .5, [], [['rel', 'T', -8, 'Les mentiste sobre tu programa']]]] }]]); }
  return out;
}
