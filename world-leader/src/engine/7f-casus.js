/* =====================================================================
   SISTEMA · MOTIVOS PARA LA GUERRA (agravios y justificación)
   Cada provocación de un país contra ti queda registrada como agravio
   con su peso (espías, sabotajes, disparos en la frontera, sanciones,
   ultimátums…) y se olvida poco a poco. La suma da tu justificación:
   ninguna, débil, sólida o indiscutible. Con justificación sólida, tu
   guerra cuenta como provocada para el mundo; con indiscutible, casi
   nadie te castiga. Antes de la guerra puedes exigir disculpas y
   reparaciones: si las niegan, el agravio crece.
   ===================================================================== */
hook('new', () => { S.cb = {}; }); hook('load', () => { S.cb = S.cb || {}; });
const JLV = [[0, 'Ninguna'], [15, 'Débil'], [40, 'Sólida'], [80, 'Indiscutible']];
function grieve(iso, k, v, x) { if (!iso || isP(iso) || !S.c[iso] || !S.cb) return; const L = S.cb[iso] || (S.cb[iso] = []); L.push({ t: S.turn, k, v, x }); if (L.length > 20) L.shift(); }
/* los agravios pierden un 4% de su peso por turno: lo de hace años ya no justifica nada */
const gw = g => g.v * Math.pow(.96, S.turn - g.t);
function justInfo(iso) { const me = S.player, L = (S.cb[iso] || []).map(g => ({ x: g.x, k: g.k, ago: S.turn - g.t, v: Math.round(gw(g)) })).filter(g => g.v >= 1);
  const extra = []; if (rel(me, iso) < -40) extra.push({ x: 'Hostilidad abierta entre ambos países', v: 20, ago: 0 }); if (sanctioned(iso, me) && !sanctioned(me, iso)) extra.push({ x: 'Te mantiene bajo sanciones', v: 20, ago: 0 });
  if (alliesOf(me).some(x => atWar(x, iso))) extra.push({ x: 'Está en guerra con un aliado tuyo', v: 45, ago: 0 }); if (atWar(iso, me)) extra.push({ x: 'Ya está en guerra contigo', v: 100, ago: 0 });
  const list = extra.concat(L.sort((a, b) => b.v - a.v)), score = Math.min(150, list.reduce((s, g) => s + g.v, 0)); let lvl = 0; JLV.forEach((j, i) => { if (score >= j[0]) lvl = i; });
  return { score: Math.round(score), lvl, name: JLV[lvl][1], list }; }
const justLvl = iso => justInfo(iso).lvl;
/* las provocaciones que ya existían se convierten en agravios */
const PROV = [[/^Espías de /, 'espias', 15, 'Te espiaba: red descubierta en tus ministerios'], [/^Sabotaje en tus fuerzas armadas/, 'sabotaje', 25, 'Sabotaje contra tus fuerzas armadas'], [/^Disparos en la frontera/, 'frontera', 30, 'Disparó contra tus tropas en la frontera'],
  [/amenaza con sancionarte$/, 'amenaza', 12, 'Te amenazó con sanciones'], [/te denuncia en la Asamblea$/, 'denuncia', 10, 'Te denunció ante la Asamblea'], [/^Ultimátum de /, 'ultimatum', 30, 'Te lanzó un ultimátum'], [/arma a la guerrilla$/, 'guerrilla', 25, 'Arma a la guerrilla en tu territorio'],
  [/exige que rompas con /, 'exigencia', 8, 'Te exigió romper con un socio'], [/exige que detengas tu programa$/, 'exigencia', 8, 'Te exigió detener tu programa'], [/eleva su alerta estratégica$/, 'nuclear', 40, 'Te amenazó con su capacidad estratégica']];
{ const pp0 = pushPend; pushPend = p => { if (p && p.iso && p.t) for (const [re, k, v, x] of PROV) if (re.test(p.t)) { grieve(p.iso, k, v, x); break; } return pp0(p); }; }
const NPROV = [[/^Tu contraespionaje desarticula una red de /, 'espias', 10, 'Su red de espionaje en tu país fue desarticulada'], [/^Campaña de desinformación en tus redes/, 'desinfo', 10, 'Campaña de desinformación contra tu país'], [/^Ciberataque contra tus laboratorios/, 'ciber', 15, 'Ciberataque contra tus laboratorios']];
{ const n0 = news; news = (x, k, iso, p) => { n0(x, k, iso, p); if (iso && S.cb) for (const [re, kk, v, t] of NPROV) if (re.test(x)) { grieve(iso, kk, v, t); break; } }; }
{ const a0 = addSanction; addSanction = (by, on) => { const r = a0(by, on); if (r && isP(on) && !sanctioned(on, by)) grieve(by, 'sancion', 20, 'Te impuso sanciones'); // una represalia a tus sanciones no es provocación return r; }; }
{ const e0 = embargo; embargo = (by, on) => { const was = (S.sanc.find(x => x.by === by && x.on === on) || {}).emb; e0(by, on); if (!was && isP(on)) grieve(by, 'embargo', 25, 'Te impuso un embargo total'); }; }
{ const s0 = startWar; startWar = (a, d) => { const j = isP(a) ? justInfo(d) : null, n0 = S.sanc.length, w = s0(a, d); if (!w || !j) return w; w.just = j.lvl;
  if (j.lvl === 1) repAdd('paz', 5); // débil: el mundo duda, pero algo entiende
  if (j.lvl >= 3) { repAdd('paz', 6); for (const s of S.sanc.slice(n0)) if (s.on === a && !alliesOf(d).includes(s.by) && rel(s.by, d) < 60) liftSanction(s.by, a); news(`El mundo reconoce que ${P().n} fue provocado por ${nm(d)}`, 'dip', a, 2); }
  return w; }; }
{ const a0 = OPS.annex; OPS.annex = a => { const w = warById(a.w), j = w ? w.just || 0 : 0; a0(a); if (j >= 2) { repAdd('paz', j >= 3 ? 9 : 6); news(`La anexión de ${nm(a.v)} se ve como el final de una guerra que ${nm(a.v)} provocó`, 'dip', a.v, 2); } }; }
/* exigir disculpas y reparaciones: el peldaño antes de la guerra */
ACT.demandApology = a => { const me = S.player, z = a.iso, c = S.c[z]; if (!c || !c.alive || z === me) return fail('País inválido'); if (atWar(me, z)) return fail('Ya estáis en guerra');
  const J = justInfo(z); if (J.score < 15) return fail(`No tienes agravios suficientes contra ${nm(z)}`); if ((c.ask.apo || 0) > S.turn) return fail(`Esperan tu siguiente paso: vuelve a exigir en ${c.ask.apo - S.turn} turnos`);
  if (!useCP(1)) return fail('Necesitas 1 de capital político'); c.ask.apo = S.turn + 4;
  const pr = clamp(.15 + (power(me) / (power(z) + 1) - 1) * .25 + rel(z, me) / 150 + (1 - c.per.agres) * .25 - c.per.rencor * .2, .05, .85);
  if (chance(pr)) { const amt = Math.min(c.gdp * .002 * J.score / 20, c.tr > 0 ? c.tr * .5 : c.gdp * .003); c.tr -= amt; P().tr += amt; S.cb[z] = []; addMod(me, z, 'Se disculpó y pagó reparaciones', gain(10), .3);
    news(`${c.n} se disculpa públicamente ante ${P().n} y paga ${money(amt)} en reparaciones`, 'dip', z, 3); return { msg: `${c.n} se disculpa y paga ${money(amt)}. Los agravios quedan saldados.` }; }
  S.cb[z] = (S.cb[z] || []).filter(g => g.k !== 'rechazo'); grieve(z, 'rechazo', 20, 'Se negó a disculparse y a reparar'); // solo cuenta la última negativa addMod(me, z, 'Exigiste disculpas', -4, .5, 1); news(`${c.n} se niega a disculparse ante ${P().n}`, 'dip', z, 3);
  return { ok: false, msg: `${c.n} se niega. Tu justificación para actuar crece.` }; };
