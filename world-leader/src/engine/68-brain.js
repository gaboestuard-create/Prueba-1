/* =====================================================================
   SISTEMA · CEREBRO ESTRATÉGICO DE LA IA (Fase 2)
   Objetivos de largo plazo, ambición y tolerancia al riesgo, escalada
   (sanción → embargo → guerra), ruptura de bloques, ayuda entre IAs,
   paz por agotamiento, dificultad, y el parte de inteligencia del
   jugador: una estimación con ruido de lo que planea cada país.
   ===================================================================== */
const DIFF = { n: ['Relajado', 'Normal', 'Realista', 'Despiadado'], need: [1.5, 1, .85, .7], inc: [1.12, 1, .96, .92], ai: [.8, 1, 1.1, 1.25], spy: [.1, 0, -.05, -.1] };
const diffK = k => DIFF[k][S.diff == null ? 1 : S.diff];
const GOALS = { expansion: 'Expandir su territorio', hegemonia: 'Dominar su región', seguridad: 'Garantizar su seguridad', riqueza: 'Enriquecerse con el comercio', estabilidad: 'Sobrevivir en el poder' };

function initBrain() {
  if (S.diff == null) S.diff = 1; S.intel = S.intel || {};
  const rank = alive().sort((a, b) => power(b) - power(a));
  for (const iso of ISOS) {
    const c = S.c[iso], p = c.per; if (p.amb != null && c.goal) continue;
    p.amb = clamp(p.expan * .6 + p.agres * .4 + rr(-.1, .1), 0, 1); p.risk = clamp(p.agres * .5 + rr(.05, .45), 0, 1); p.eng = clamp(1 - p.leal + p.agres * .3 + rr(-.1, .1), 0, 1); // eng = propensión a mentir
    c.goal = p.expan > .6 && p.agres > .5 ? 'expansion' : rank.indexOf(iso) < 10 && p.amb > .3 ? 'hegemonia' : c.stab < 40 ? 'estabilidad' : p.coop > .6 ? 'riqueza' : 'seguridad'; c.esc = c.esc || {};
  }
}
hook('new', initBrain); hook('load', initBrain);

function embargo(by, on) { let s = S.sanc.find(x => x.by === by && x.on === on); if (!s) { addSanction(by, on); s = S.sanc.find(x => x.by === by && x.on === on); } if (s) s.emb = 1; dirty(); }
/* escalera: sanción → embargo → guerra. Cada peldaño da tiempo a reaccionar */
function escalate(iso, t) {
  const c = C(iso), e = c.esc || (c.esc = {}), lv = e[t] || 0, big = isP(t) || nb(S.player).includes(iso) || C(iso).gdp > 800 ? 2 : 1; c.cd = S.turn + 2;
  if (lv === 0) { e[t] = 1; if (addSanction(iso, t)) news(`${c.n} impone sanciones a ${nm(t)}`, 'dip', iso, isP(t) ? 3 : big); addMod(iso, t, 'Presión económica', -10, .3, 1); return; }
  if (lv === 1) { e[t] = 2; embargo(iso, t); news(`${c.n} decreta un embargo total contra ${nm(t)} y moviliza tropas`, 'mil', iso, isP(t) ? 3 : big); addMod(iso, t, 'Embargo', -10, .3, 1); return; }
  delete e[t]; c.cd = S.turn + 10; S.aiWarCd = S.turn + 8; startWar(iso, t);
}
ACT.embargo = a => {
  const iso = a.iso, me = S.player; if (!S.c[iso] || !S.c[iso].alive || iso === me) return fail('País inválido');
  const s = S.sanc.find(x => x.by === me && x.on === iso); if (!s) return fail('Primero impón sanciones: el embargo es el siguiente peldaño'); if (s.emb) return fail('El embargo ya está en vigor');
  if (!useCP(2)) return fail('Necesitas 2 de capital político');
  embargo(me, iso); addMod(me, iso, 'Les impusiste un embargo', -15, .3, 1); repAdd('paz', -3);
  for (const k of ['pet', 'gas', 'tri']) if ((C(iso).rec[k] || 0) >= 4) S.mkt.shocks.push({ k, m: 1.1 });
  news(`${P().n} decreta un embargo total contra ${nm(iso)}`, 'dip', iso, 2);
  return { msg: `Embargo contra ${nm(iso)}: su economía sufre el doble, y si es un gran productor los precios subirán para todos` };
};

hook('world', () => {
  const me = S.player;
  // 1) desescalada: si la relación mejora, se levanta la presión
  for (const iso of alive()) { const e = S.c[iso].esc; if (!e) continue; for (const t in e) if (!S.c[t].alive || rel(iso, t) > -10) { delete e[t]; if (liftSanction(iso, t) && (isP(t) || S.c[iso].gdp > 800)) news(`${nm(iso)} levanta las sanciones a ${nm(t)}`, 'dip', iso, isP(t) ? 3 : 1); } }
  // 2) los bloques se rompen: alianzas entre países que ya no se soportan, o con un agresor
  for (const t of S.tr.slice()) {
    if (t.t !== 'ali' && t.t !== 'def') continue; const a = t.a, b = t.b, r = rel(a, b); if (S.turn - t.s < 4) continue;
    const ai = isP(a) ? b : a, other = ai === a ? b : a, aggr = S.wars.some(w => w.att[0] === other && !w.casus && S.turn - w.s < 3);
    if (r < 5 || (aggr && C(ai).reg === 'dem' && C(ai).per.agres < .3 && chance(.5))) {
      endTreaties(a, b, ['ali', 'def']); addMod(a, b, 'Alianza rota', -12, .4, 1);
      news(`${nm(ai)} rompe su alianza con ${nm(other)}${aggr ? ' por su guerra de agresión' : ''}`, 'dip', ai, isP(a) || isP(b) ? 3 : C(a).gdp > 500 || C(b).gdp > 500 ? 2 : 1);
    }
  }
  // 3) guerras: quien pierde pide ayuda a sus amigos; el atacante agotado busca la paz
  for (const w of S.wars.slice()) {
    const la = w.att[0], ld = w.def[0], dur = S.turn - w.s; if (!C(la).alive || !C(ld).alive) continue;
    const loser = w.score > 25 ? ld : w.score < -25 ? la : null;
    if (loser && !isP(loser) && dur % 3 === 1) {
      const foe = loser === la ? ld : la, fr = alive().filter(z => z !== loser && z !== me && !inWar(z) && rel(z, loser) >= 45 && rel(z, foe) < 20 && C(z).gdp > C(loser).gdp * .5).sort((x, y) => rel(y, loser) - rel(x, loser))[0];
      if (fr) { const L = C(loser); L.tr += C(fr).gdp * .003; for (const u of ['inf', 'tan', 'art', 'dro']) L.u[u] = Math.ceil((L.u[u] || 0) * 1.05); addMod(loser, fr, 'Ayuda en la guerra', 10, .3); addMod(fr, foe, 'Armó a su enemigo', -8, .4, 1); news(`${nm(fr)} envía armas y dinero a ${nm(loser)}`, 'mil', fr, nb(me).includes(loser) || isP(foe) ? 2 : 1); }
    }
    if (!isP(la) && !isP(ld) && dur > 4 && (C(la).stab < 32 || (dur > 10 && w.score < 10)) && chance(.3)) endWar(w, C(la).terr.some(t => t.o === ld) || C(ld).terr.some(t => t.o === la) ? 'actual' : 'blanca');
  }
  // 4) favores: quien te debe una y te aprecia acude si te atacan
  for (const w of warsOf(me)) if (w.def[0] === me && S.turn - w.s === 1) for (const z of alive()) {
    if (z === me || w.att.includes(z) || w.def.includes(z)) continue; const fav = (S.mods[key(me, z)] || []).reduce((a, m) => a + (m.v > 0 && /Ayuda|Acogiste|ayudaste|favor/i.test(m.k) ? m.v : 0), 0);
    if (fav >= 12 && rel(me, z) >= 40) { const amt = Math.min(C(z).gdp * .004, P().gdp * .02); P().tr += amt; news(`${nm(z)} no olvida tu ayuda: te envía ${money(amt)} para la guerra`, 'dip', z, 3); }
  }
  intelTurn();
});

/* ---- parte de inteligencia: lo que dicen, lo que creemos y con qué certeza ---- */
const PLAN = { nada: 'Sin planes hostiles', rearme: 'Rearme acelerado', alianza: 'Busca un pacto con', presion: 'Presión económica sobre', guerra: 'Prepara la guerra contra' };
const planText = p => !p || !PLAN[p.k] ? PLAN.nada : PLAN[p.k] + (p.t && S.c[p.t] ? ' ' + nm(p.t) : '');
function intelTurn() {
  const me = S.player, top = alive().sort((a, b) => power(b) - power(a)).slice(0, 12), near = nb(me), I = S.intel = {};
  const watch = new Set(near.concat(top, Object.keys(S.spy.net).filter(k => S.spy.net[k] > 0), alive().filter(z => z !== me && rel(me, z) < -30))); watch.delete(me);
  for (const iso of watch) {
    const c = S.c[iso]; if (!c.alive) continue; const real = c.plan && c.plan.n >= S.turn - 2 ? { k: c.plan.k, t: c.plan.t } : { k: 'nada' };
    const hostile = real.k === 'guerra' || real.k === 'presion', lies = hostile && c.per.eng > .5;
    const acc = clamp(.42 + .15 * spyNet(iso) + mod('spyOp') + mod('spy') * .1 + diffK('spy') - (lies ? .08 : 0), .15, .95);
    let est = real; if (!chance(acc)) { const pool = near.filter(z => z !== iso).concat(me); est = pick([{ k: 'nada' }, { k: 'rearme' }, { k: 'presion', t: pick(pool) }, { k: 'alianza', t: pick(top.filter(z => z !== iso)) }]); }
    I[iso] = { says: lies ? { k: 'nada' } : real.k === 'guerra' ? { k: 'rearme' } : real, est, conf: clamp(acc + rr(-.12, .12), .1, .97), goal: spyNet(iso) >= 2 ? c.goal : null };
  }
}
/* lista para la UI, ordenada por peligro estimado para el jugador */
function intelList() {
  const me = S.player, w = e => (e.est.k === 'guerra' ? 4 : e.est.k === 'presion' ? 3 : e.est.k === 'rearme' ? 2 : e.est.k === 'alianza' ? 1 : 0) + (e.est.t === me ? 3 : 0);
  return Object.keys(S.intel || {}).filter(i => S.c[i].alive).map(i => Object.assign({ iso: i, net: spyNet(i), danger: w(S.intel[i]), goalText: S.intel[i].goal ? GOALS[S.intel[i].goal] : null }, S.intel[i])).sort((a, b) => b.danger - a.danger || b.conf - a.conf);
}
