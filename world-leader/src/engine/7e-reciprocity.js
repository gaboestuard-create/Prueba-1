/* =====================================================================
   SISTEMA · RECIPROCIDAD DIPLOMÁTICA
   Antes, una sanción de la IA era eterna: nadie la revisaba. Ahora cada
   país revisa sus sanciones cada turno y las levanta cuando la relación
   mejora, cuando tú levantas las tuyas, cuando el motivo desaparece o
   cuando ya le cuestan demasiado. Al sancionar, el otro puede responder;
   y puedes pedir que levanten las que pesan sobre ti.
   ===================================================================== */
hook('new', () => { S.recip = {}; }); hook('load', () => { S.recip = S.recip || {}; });
/* tras levantar una sanción, el país no la reimpone por rencor durante un tiempo (las guerras y escaladas sí pueden) */
const sancCd = (by, on, n) => { const c = S.c[by]; (c.scd = c.scd || {})[on] = S.turn + n; };
{ const a0 = addSanction; addSanction = (by, on) => { const c = S.c[by]; if (c && !isP(by) && (c.scd || {})[on] > S.turn && !atWar(by, on) && !((c.esc || {})[on] >= 1)) return false; return a0(by, on); }; }
function aiLift(by, on, why) {
  const s = S.sanc.find(x => x.by === by && x.on === on); if (!s) return false; const c = S.c[by];
  if (s.emb) { s.emb = 0; dirty(); if (isP(on) || c.gdp > 800) news(`${c.n} rebaja su embargo contra ${nm(on)} a sanciones${why ? ': ' + why : ''}`, 'dip', by, isP(on) ? 3 : 1); return true; }
  liftSanction(by, on); if (c.esc) delete c.esc[on]; sancCd(by, on, 10);
  if (isP(on)) { addMod(on, by, 'Levantó sus sanciones', gain(5), .4); news(`${c.n} levanta sus sanciones contra ${P().n}${why ? ': ' + why : ''}`, 'dip', by, 3); }
  else if (c.gdp > 800 || S.c[on].gdp > 800 || nb(S.player).includes(by)) news(`${c.n} levanta sus sanciones a ${nm(on)}`, 'dip', by, 1);
  wlog('dip', by, on, `${c.n} levanta sus sanciones a ${nm(on)}`); return true;
}
/* revisión de sanciones: cada país decide si siguen teniendo sentido */
hook('world', () => {
  for (const s of S.sanc.slice()) { const by = s.by, on = s.on, c = S.c[by]; if (isP(by) || !c || !c.alive || !S.c[on] || !S.c[on].alive || atWar(by, on)) continue;
    const r = rel(by, on), dur = S.turn - (s.s || 0), esc = (c.esc || {})[on] || 0, plan = c.plan && c.plan.t === on && (c.plan.k === 'presion' || c.plan.k === 'guerra') && c.plan.n >= S.turn - 2;
    if (plan && r < 0) continue; // la presión sigue mientras dure su plan contra ese país
    const rw = S.recip[by + '>' + on]; // reciprocidad: el otro levantó primero
    let p = 0, why = '';
    if (rw && rw > S.turn) { p = clamp(.25 + r / 200 + c.per.coop * .25, .1, .7); why = 'corresponde a tu gesto'; }
    else if (r > -5 && grudge(by, on) > -40) { p = .3 + Math.max(0, r) / 200; why = 'las relaciones han mejorado'; }
    else if (dur >= 16 && r > -35) { p = .08 + (1 - c.per.rencor) * .08; why = 'las sanciones también le cuestan'; }
    if (!p) { const ag = S.wars.find(w => w.att[0] === on && !w.casus); if (!ag && dur >= 4 && !esc && r > -40 && S.sanc.filter(x => x.on === on).length > 2 && chance(.12)) { p = 1; why = 'la guerra que las motivó terminó'; } }
    if (p && chance(p)) { aiLift(by, on, why); if (rw) delete S.recip[by + '>' + on]; }
  }
  for (const k in S.recip) if (S.recip[k] <= S.turn) delete S.recip[k];
});
/* levantar tus sanciones: el otro puede corresponder al momento o en los próximos turnos */
{ const l0 = ACT.lift; ACT.lift = a => { const r = l0(a), me = S.player, z = a.iso; if (!r || r.ok === false || !sanctioned(z, me)) return r; const c = S.c[z];
  if (chance(clamp(.3 + rel(z, me) / 150 + c.per.coop * .3 - c.per.rencor * .2, .1, .85)) && aiLift(z, me, 'corresponde a tu gesto')) r.msg += `. ${c.n} corresponde y levanta las suyas.`;
  else { S.recip[z + '>' + me] = S.turn + 5; r.msg += `. ${c.n} toma nota: puede corresponder en los próximos turnos.`; } return r; }; }
/* sancionar tiene respuesta: represalia, alianza de represalias o protesta */
{ const s0 = ACT.sanction; ACT.sanction = a => { const r = s0(a), me = S.player, z = a.iso; if (!r || r.ok === false) return r; const c = S.c[z];
  const pr = clamp(.3 + c.per.rencor * .4 + c.per.agres * .2 + (power(z) > power(me) * .6 ? .15 : 0) - (c.gdp < P().gdp * .1 ? .3 : 0), .05, .9);
  if (!sanctioned(z, me) && chance(pr) && addSanction(z, me)) { news(`${c.n} responde con sanciones contra ${P().n}`, 'dip', z, 3); r.msg += `. ${c.n} responde con sanciones.`;
    for (const y of alliesOf(z)) if (!isP(y) && rel(y, z) > 60 && rel(y, me) < 20 && chance(.35) && addSanction(y, me)) news(`${nm(y)} se suma a las represalias de ${c.n}`, 'dip', y, 2); }
  else { news(`${c.n} protesta formalmente y pide diálogo a ${P().n}`, 'dip', z, 2); r.msg += `. ${c.n} protesta y pide diálogo.`; } return r; }; }
{ const e0 = ACT.embargo; ACT.embargo = a => { const r = e0(a), me = S.player, z = a.iso; if (!r || r.ok === false) return r; const c = S.c[z];
  if (sanctioned(z, me) && !S.sanc.find(x => x.by === z && x.on === me).emb && chance(clamp(.25 + c.per.rencor * .5, .1, .8))) { embargo(z, me); news(`${c.n} responde con un embargo total contra ${P().n}`, 'dip', z, 3); r.msg += `. ${c.n} responde con su propio embargo.`; } return r; }; }
/* levantar un embargo de armas también puede ser correspondido */
{ const m0 = ACT.armsEmb; ACT.armsEmb = a => { const was = S.war3.myEmb.includes(a.iso), r = m0(a), z = a.iso, i = S.war3.emb.indexOf(z);
  if (was && r && r.ok !== false && i >= 0 && chance(clamp(.35 + rel(z, S.player) / 150, .1, .8))) { S.war3.emb.splice(i, 1); news(`${nm(z)} corresponde y levanta su embargo de armas contra ti`, 'dip', z, 2); r.msg += `. ${nm(z)} levanta también el suyo.`; } return r; }; }
/* pedir que levanten sus sanciones contra ti */
ACT.askLift = a => { const me = S.player, z = a.iso, c = S.c[z]; if (!c || !c.alive || !sanctioned(z, me)) return fail('Ese país no te sanciona'); if (atWar(z, me)) return fail('Estáis en guerra: primero, la paz');
  if ((c.ask.lift || 0) > S.turn) return fail(`Acaban de rechazarlo: espera ${c.ask.lift - S.turn} turnos`); if (!useCP(1)) return fail('Necesitas 1 de capital político');
  const pay = a.offer === 'pago' ? Math.max(.3, c.gdp * .005) : 0; if (pay && !canPay(pay)) return fail(`Necesitas ${money(pay)}`);
  const plan = c.plan && c.plan.t === me && (c.plan.k === 'presion' || c.plan.k === 'guerra') && c.plan.n >= S.turn - 2;
  const p = clamp(.15 + rel(z, me) / 120 + (pay ? .25 : 0) + (a.offer === 'concesion' ? .15 : 0) + S.rep.conf / 300 - c.per.rencor * .2 + (S.sanc.some(x => x.by === me && x.on === z) ? -.25 : .05) - (plan ? .3 : 0), .05, .9);
  if (pay) { P().tr -= pay; c.tr += pay; } if (a.offer === 'concesion') { secAdd('mil', -3); secAdd('rur', -2); repAdd('conf', 1); }
  if (chance(p)) { const s = S.sanc.find(x => x.by === z && x.on === me); if (s) s.emb = 0; aiLift(z, me, 'tras negociar contigo'); return { msg: `${c.n} acepta y levanta sus sanciones` }; }
  c.ask.lift = S.turn + 4; addMod(me, z, 'Insististe en las sanciones', -2, .5);
  const why = S.sanc.some(x => x.by === me && x.on === z) ? 'tú también lo sancionas: levanta primero las tuyas' : plan ? 'están presionándote a propósito' : rel(z, me) < -30 ? 'la relación es demasiado mala' : 'no ven motivo suficiente';
  return { ok: false, msg: `${c.n} se niega: ${why}` }; };
