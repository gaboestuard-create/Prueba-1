/* =====================================================================
   SISTEMA · FASE 3 · TEATRO DE OPERACIONES
   Cada guerra se libra región a región. Los países despliegan grupos
   (ejércitos, escuadrones, flotas) con órdenes; las batallas dependen de
   fuerza, tipo de unidad, terreno, clima, moral, experiencia, suministro
   y dominio del aire y del mar. La IA planea campañas con la misma regla.
   S.army = [{ id, o: país, w: guerra, t: 'ej'|'es'|'fl', n, u:{unidad:nº}, ord, tgt, at, mor, exp, sup }]
   Región = 'ISO:índice' dentro del país al que pertenece originalmente.
   ===================================================================== */
Object.assign(UW, { aa: 2, esp: 1, abm: .15, tra: .5, des: 1, anf: .4 });
{ const iu0 = initUnits; initUnits = d => { const u = iu0(d); u.aa = Math.round(u.inf * .05); u.esp = Math.round(u.inf * .03); u.abm = d.nuke ? 2 : 0; u.tra = Math.round(u.caz * .1); u.des = Math.round(u.fra * .4); u.anf = Math.round(u.fra * .2); return u; }; }
hook('new', () => { S.army = []; S.gid = 0; S.blog = []; });
hook('load', () => { S.army = S.army || []; S.gid = S.gid || 0; S.blog = S.blog || []; });

const rk = (iso, i) => iso + ':' + i, rpk = k => { const j = k.lastIndexOf(':'); return [k.slice(0, j), +k.slice(j + 1)]; };
const rGeo = k => { const [iso, i] = rpk(k); return D.C[iso].terr[i]; }, rSt = k => { const [iso, i] = rpk(k); return S.c[iso].terr[i]; };
const thHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) % 1000 / 1000; };
function rDist(a, b) { const A = rGeo(a), B = rGeo(b), r = Math.PI / 180; return Math.acos(clamp(Math.sin(A.la * r) * Math.sin(B.la * r) + Math.cos(A.la * r) * Math.cos(B.la * r) * Math.cos((A.lo - B.lo) * r), -1, 1)); }
/* terreno: el editor puede fijarlo (terr.i.ter); si no, se deduce de forma estable de la geografía */
function terOf(k) {
  const st = rSt(k); if (st.ter && D.TER[st.ter]) return st.ter; const [iso, i] = rpk(k), o = (D.TER_OVR[iso] || {})[i]; if (o) return o;
  const g = rGeo(k), lat = Math.abs(g.la), h = thHash(k);
  if (i === 0 || ((g.e || 0) > .2 && D.C[iso].terr.length > 6)) return 'ciu'; if (lat < 15 && h < .55) return 'sel'; const rg = D.C[iso].region, dry = rg === 'MOR' || rg === 'OCE' || (rg === 'AFR' && lat > 12) || (rg === 'AMN' && lat > 24) || (rg === 'ASI' && g.lo < 75); if (dry && lat > 15 && lat < 36 && h < .45) return 'des'; // desiertos: Sahara, Arabia, Irán, Australia, norte de México
  if (h > .82) return 'mon'; if (!D.C[iso].land && h > .58) return 'cos'; return 'lla';
}
const coastal = k => { const [iso] = rpk(k); return !D.C[iso].land && (terOf(k) === 'cos' || thHash(k + 'c') < .5 || rpk(k)[1] === 0); };
function wxOf(k) { const g = rGeo(k), n = g.la >= 0, a = Math.abs(g.la), q = S.q;
  if (a < 23) return (n ? q === 2 : q === 0) ? 'llu' : 'norm'; if (a > 38 && q === (n ? 0 : 2)) return 'inv'; if (terOf(k) === 'des' && q === (n ? 2 : 0)) return 'cal'; return 'norm'; }

/* ---- bandos ---- */
const thSide = (w, iso) => w.att.includes(iso) ? 'att' : w.def.includes(iso) ? 'def' : null, thOther = s => s === 'att' ? 'def' : 'att';
const thRegs = w => { const out = []; for (const iso of [w.att[0], w.def[0]]) S.c[iso].terr.forEach((t, i) => out.push(rk(iso, i))); return out; };
const ctlSide = (w, k) => thSide(w, rSt(k).o);
function thContact(w, side) { const a = w[side][0], b = w[thOther(side)][0]; return nb(a).includes(b) || thRegs(w).some(k => { const s = ctlSide(w, k); return s && s !== thSide(w, rpk(k)[0]); }); }
/* frente: regiones enemigas más cercanas a lo que controlas (las capitales caen al final) */
function thFront(w, side, n) {
  const R = thRegs(w), mine = R.filter(k => ctlSide(w, k) === side), foe = R.filter(k => ctlSide(w, k) === thOther(side)); if (!foe.length) return [];
  let L = foe.map(k => [k, mine.length ? Math.min(...mine.map(m => rDist(k, m))) : 0]);
  if (!thContact(w, side)) { const c = L.filter(x => coastal(x[0])); L = c.length ? c : L; }
  L.sort((a, b) => a[1] - b[1]); const caps = L.length > 1 ? L.filter(x => rpk(x[0])[1] === 0) : [];
  return L.filter(x => !caps.includes(x)).concat(caps).slice(0, n || 5).map(x => x[0]);
}
function homeReg(w, iso) { const s = thSide(w, iso), th = thFront(w, thOther(s), 3).filter(k => rSt(k).o === iso); if (th.length) return th[0];
  const own = S.c[iso].terr.findIndex(t => t.o === iso); return own >= 0 ? rk(iso, own) : rk(iso, 0); }
const distOwn = (w, side, k) => { const mine = thRegs(w).filter(x => ctlSide(w, x) === side); return mine.length ? Math.min(...mine.map(m => rDist(k, m))) : 1; };

/* ---- grupos ---- */
const gsize = g => Object.values(g.u).reduce((s, v) => s + v, 0);
const assignedU = (iso, k) => S.army.reduce((s, g) => s + (g.o === iso ? g.u[k] || 0 : 0), 0);
const freeU = (iso, k) => Math.max(0, (S.c[iso].u[k] || 0) - assignedU(iso, k));
const grpOf = (iso, wid) => S.army.filter(g => g.o === iso && (wid == null || g.w === wid));
function normGroups() {
  for (const iso of new Set(S.army.map(g => g.o))) for (const k in D.UNITS) { let over = assignedU(iso, k) - (S.c[iso].u[k] || 0); if (over <= 0) continue;
    for (const g of S.army) if (g.o === iso && g.u[k]) { const d = Math.min(over, g.u[k]); g.u[k] -= d; over -= d; if (!over) break; } }
  S.army = S.army.filter(g => { const w = warById(g.w); return w && S.c[g.o].alive && thSide(w, g.o) && gsize(g) > 0; });
}
function mkGroup(iso, w, t, frac, name) {
  const cat = D.GTYPE[t].cat, u = {}; let tot = 0;
  for (const k in D.UNITS) if (D.UNITS[k].cat === cat && k !== 'abm') { const v = Math.floor(freeU(iso, k) * frac); if (v > 0) { u[k] = v; tot += v; } }
  if (!tot) return null; const home = homeReg(w, iso), nth = grpOf(iso).filter(g => g.t === t).length + 1;
  const g = { id: ++S.gid, o: iso, w: w.id, t, n: name || `${D.GTYPE[t].n} ${nth}`, u, ord: t === 'ej' ? 'def' : 'pat', tgt: home, at: home, mor: 70, exp: 0, sup: 100 };
  S.army.push(g); return g;
}

/* ---- fuerza en combate ---- */
const W3 = () => S.war3 || {};
const docOf = iso => isP(iso) ? W3().doct || {} : S.c[iso].doct || {};
function docM(iso, key) { const d = docOf(iso); let v = 0; for (const b in D.DOCT) { const x = D.DOCT[b][d[b]]; if (x && x.m[key]) v += x.m[key]; } return v; }
const wmod = (iso, key) => isP(iso) ? mod(key) : 0;
const TECHK = { arm: 'w_arm', inf: 'w_inf', sf: 'w_sf', art: 'w_art', fig: 'w_air', bmb: 'w_air', dro: 'w_air', tra: 'w_air', esc: 'w_nav', sub: 'w_nav', car: 'w_nav', anf: 'w_nav' };
function uRoles(u) { const R = {}; let t = 0; for (const k in u) { const r = D.ROLE[k] || 'inf', p = (u[k] || 0) * D.UNITS[k].pow; R[r] = (R[r] || 0) + p; t += p; } for (const r in R) R[r] /= t || 1; return R; }
function upow(iso, k, x) {
  const r = D.ROLE[k] || 'inf'; let v = D.UNITS[k].pow * ((D.TER[x.ter] || {})[r] || 1) * ((D.WX[x.wx] || {})[r] || 1);
  let c = 1; const beats = D.BEATS[r] || []; for (const f in x.foe || {}) { if (beats.includes(f)) c += .35 * x.foe[f]; if ((D.BEATS[f] || []).includes(r)) c -= .25 * x.foe[f]; } v *= Math.max(.4, c);
  if (TECHK[r]) v *= 1 + wmod(iso, TECHK[r]);
  if (r === 'arm' && x.atk) v *= 1 + docM(iso, 'armAtk'); if (r === 'fig' || r === 'dro') v *= 1 + docM(iso, 'air'); if (r === 'bmb') v *= 1 + docM(iso, 'bmb');
  if (r === 'esc' || r === 'car') v *= 1 + docM(iso, 'nav'); if (r === 'sub') v *= 1 + docM(iso, 'sub');
  return v;
}
function gpow(iso, u, x) {
  let v = 0; for (const k in u) if (u[k] > 0 && D.UNITS[k]) v += u[k] * upow(iso, k, x);
  v *= (.4 + .6 * (x.mor == null ? 70 : x.mor) / 100) * (1 + .3 * (x.exp || 0)) * (.45 + .55 * (x.sup == null ? 100 : x.sup) / 100) * (1 + .25 * (x.air || 0));
  if (x.def) v *= ((D.TER[x.ter] || {}).def || 1) * (1 + .15 * (x.fort || 0)) * (1 + docM(iso, 'defB') + wmod(iso, 'w_def'));
  if (x.atk) v *= 1 + docM(iso, 'atk');
  if (isP(iso)) v *= readyMult() * (S.flags.oilShort ? .75 : 1) * Math.max(.3, 1 + mod('atk') + lawSum('mil'));
  else v *= D.DIFFW[S.diff == null ? 1 : S.diff] * (1 + ((((S.disc && S.disc.b[iso]) || {}).mil) || 0));
  return v;
}
function airP(w, side) { let v = 0;
  for (const g of S.army) if (g.w === w.id && w[side].includes(g.o) && g.ord !== 'ret') { if (g.t === 'es') for (const k in g.u) { const r = D.ROLE[k]; if (r === 'fig' || r === 'dro') v += g.u[k] * D.UNITS[k].pow * (1 + wmod(g.o, 'w_air') + docM(g.o, 'air')) * (.5 + .5 * g.sup / 100); } else if (g.t === 'ej') v += (g.u.aa || 0) * 1.2; }
  for (const iso of w[side].slice(1)) if (!grpOf(iso, w.id).length) v += catPow(iso, 'aire') * (canReach(iso, w[thOther(side)][0]) ? .3 : .1);
  return v; }
function navP(w, side) { let v = 0;
  for (const g of S.army) if (g.w === w.id && w[side].includes(g.o) && g.t === 'fl' && g.ord !== 'ret') v += gpow(g.o, g.u, { ter: 'cos', wx: 'norm', foe: {}, sup: g.sup, mor: g.mor, exp: g.exp });
  for (const iso of w[side].slice(1)) if (!grpOf(iso, w.id).length) v += catPow(iso, 'mar') * .3;
  return v; }
const supOf = (a, b) => (a + b) ? (a - b) / (a + b) : 0;
const airSup = (w, side) => supOf(airP(w, side), airP(w, thOther(side))), navSup = (w, side) => supOf(navP(w, side), navP(w, thOther(side)));
function allyMult(w, side) { const lead = w[side][0], foe = w[thOther(side)][0]; let a = 0;
  for (const iso of w[side].slice(1)) if (!grpOf(iso, w.id).length && S.c[iso].alive) a += power(iso) * (canReach(iso, foe) ? .25 : .08);
  return 1 + clamp(a / (power(lead) + 1), 0, .6); }
function garrison(iso, k) { const u = {}, f = rpk(k)[1] === 0 ? .2 : .12; for (const x in D.UNITS) if (D.UNITS[x].cat === 'tierra' && x !== 'abm') { const v = Math.floor(freeU(iso, x) * f); if (v > 0) u[x] = v; } return u; }
const militia = k => 2 + 60 * (rGeo(k).w || .02);
const mergeU = L => { const u = {}; for (const g of L) for (const k in g.u) u[k] = (u[k] || 0) + g.u[k]; return u; };
function gHit(g, f, acc) { const c = S.c[g.o], m = isP(g.o) ? Math.max(.3, 1 + mod('casual')) : 1;
  for (const k in g.u) { const d = Math.min(g.u[k], Math.floor(g.u[k] * f * m + rnd())); if (!d) continue; g.u[k] -= d; c.u[k] = Math.max(0, (c.u[k] || 0) - d); acc[k] = (acc[k] || 0) + d; } }
function natHit(iso, u, f, acc) { const c = S.c[iso]; for (const k in u) { const d = Math.min(c.u[k] || 0, Math.floor(u[k] * f + rnd())); if (!d) continue; c.u[k] -= d; acc[k] = (acc[k] || 0) + d; } }
/* tomar una región: si era tuya, la liberas; si es del enemigo, la ocupas (una capital nuclear no cae) */
function takeRegion(w, k, taker) {
  const [iso, i] = rpk(k), st = rSt(k), mySide = thSide(w, taker);
  if (thSide(w, iso) === mySide) { if (st.o !== iso) { restoreTerr(iso, i); return true; } return false; }
  if (st.o !== iso) return false; if (i === 0 && S.c[iso].nuke) return false;
  moveTerr(iso, i, taker, .7); onTaken(w, k, taker); return true;
}
{ const e0 = endWar; endWar = (w, kind) => { e0(w, kind); if (S.army) S.army = S.army.filter(g => g.w !== w.id); }; } // al firmar la paz, los grupos vuelven a la reserva
function blog(e) { S.blog.push(Object.assign({ t: S.turn }, e)); if (S.blog.length > 80) S.blog.splice(0, S.blog.length - 80); }

/* ---- batalla terrestre por una región ---- */
function thBattle(w, k, attG, side, took) {
  const dside = thOther(side), st = rSt(k), ctl = st.o, ter = terOf(k), wx = wxOf(k), fort = st.fort || 0, as = airSup(w, side);
  const defG = S.army.filter(g => g.w === w.id && w[dside].includes(g.o) && g.t === 'ej' && g.at === k && g.ord !== 'ret');
  const gar = defG.length ? null : garrison(ctl, k), aU = mergeU(attG), dU = defG.length ? mergeU(defG) : gar, aR = uRoles(aU), dR = uRoles(dU);
  let Pa = 0; for (const g of attG) Pa += gpow(g.o, g.u, { ter, wx, foe: dR, atk: 1, sup: g.sup, mor: g.mor, exp: g.exp, air: g.t === 'ej' ? as : 0 }) * (g.ord === 'adv' ? 1.1 : 1) * (g.ord === 'lnd' ? .7 : 1) * (g.t === 'es' ? .6 : 1);
  let Pd = 0; if (defG.length) for (const g of defG) Pd += gpow(g.o, g.u, { ter, wx, foe: aR, def: 1, fort, sup: g.sup, mor: g.mor, exp: g.exp, air: -as }) * (g.ord === 'def' ? 1.2 : 1);
  else Pd = gpow(ctl, gar, { ter, wx, foe: aR, def: 1, fort, sup: 80, mor: 65, exp: .1, air: -as });
  Pd += militia(k) * (1 + .15 * fort);
  Pa *= allyMult(w, side) * rr(.85, 1.15); Pd *= allyMult(w, dside) * rr(.85, 1.15);
  const ratio = Pa / (Pa + Pd + .001), la = {}, ld = {};
  attG.forEach(g => gHit(g, (.03 + .12 * (1 - ratio)) * (g.t === 'es' ? .5 : 1), la));
  if (defG.length) defG.forEach(g => gHit(g, .03 + .12 * ratio, ld)); else natHit(ctl, gar, .03 + .12 * ratio, ld);
  const land = attG.filter(g => g.t === 'ej'), win = ratio > (attG.some(g => g.ord === 'adv') ? .53 : .55) && land.length;
  const taker = (land.slice().sort((a, b) => gsize(b) - gsize(a))[0] || attG[0]).o; let got = false;
  if (win) { got = takeRegion(w, k, taker); if (got) { land.forEach(g => { g.at = k; }); defG.forEach(g => { g.at = homeReg(w, g.o); g.mor = Math.max(10, g.mor - 6); }); took.push([side, rSt(k).n, taker, k]); } }
  attG.forEach(g => { g.mor = clamp(g.mor + (win ? 6 : -8), 5, 100); g.exp = Math.min(1, g.exp + .06); if (g.ord === 'lnd' && win) g.ord = 'atk'; });
  defG.forEach(g => { g.mor = clamp(g.mor + (win ? -7 : 5), 5, 100); g.exp = Math.min(1, g.exp + .06); });
  w.score = clamp(w.score + (side === 'att' ? 1 : -1) * ((ratio - .5) * 16 + (got ? 5 : 0)), -100, 100);
  const lead = w[side][0], dlead = w[dside][0];
  blog({ w: w.id, k, n: st.n, ter, wx, a: taker, d: ctl, pa: Math.round(Pa), pd: Math.round(Pd), ratio: +ratio.toFixed(3), win: win ? 1 : 0, took: got ? 1 : 0, la, ld, as: +as.toFixed(2), kind: 'tierra', me: [lead, dlead, taker, ctl].includes(S.player) || attG.concat(defG).some(g => isP(g.o)) ? 1 : 0 });
  return { ratio, win, got };
}
/* bombardeo aéreo o naval de una región */
function thBomb(w, g, side) {
  const k = g.tgt, st = rSt(k); if (!st || ctlSide(w, k) !== thOther(side)) return; if (g.t === 'fl' && !coastal(k)) return;
  const ctl = st.o, ter = terOf(k), wx = wxOf(k), as = g.t === 'es' ? airSup(w, side) : navSup(w, side);
  const strike = {}; for (const x in g.u) { const r = D.ROLE[x]; if (g.t === 'fl' || r === 'bmb' || r === 'dro' || r === 'fig') strike[x] = g.u[x]; }
  const eff = gpow(g.o, strike, { ter, wx, foe: {}, sup: g.sup, mor: g.mor, exp: g.exp, air: as }) * (1 + (g.t === 'es' ? docM(g.o, 'bmb') : 0));
  const defG = S.army.filter(x => x.w === w.id && x.at === k && x.t === 'ej' && w[thOther(side)].includes(x.o)), aa = defG.reduce((s, x) => s + (x.u.aa || 0), 0) * 1.5 + (S.c[ctl].u.abm || 0) * 2 + (S.c[ctl].u.aa || 0) * .15;
  const ratio = eff / (eff + aa * 3 + militia(k)), lo = {}, ld = {};
  defG.forEach(x => { gHit(x, .05 * ratio, ld); x.sup = Math.max(5, x.sup - 25 * ratio); }); if (!defG.length) natHit(ctl, garrison(ctl, k), .03 * ratio, ld);
  gHit(g, .015 + .06 * (1 - ratio), lo); if (st.fort && chance(.35 * ratio)) st.fort--;
  w.score = clamp(w.score + (side === 'att' ? 1 : -1) * 3 * ratio, -100, 100);
  if (ter === 'ciu' && chance((isP(g.o) ? .45 : .3) + docM(g.o, 'civ') * .5)) warCrime(w, k, `bombardeo de ${st.n}`, g.o);
  blog({ w: w.id, k, n: st.n, ter, wx, a: g.o, d: ctl, pa: Math.round(eff), pd: Math.round(aa * 3), ratio: +ratio.toFixed(3), win: ratio > .5 ? 1 : 0, took: 0, la: lo, ld, as: +as.toFixed(2), kind: g.t === 'es' ? 'aire' : 'mar', me: isP(g.o) || isP(ctl) ? 1 : 0 });
}
/* combate naval: las flotas que no se retiran chocan una vez por turno */
function thNaval(w) {
  const A = S.army.filter(g => g.w === w.id && g.t === 'fl' && g.ord !== 'ret' && w.att.includes(g.o)), B = S.army.filter(g => g.w === w.id && g.t === 'fl' && g.ord !== 'ret' && w.def.includes(g.o)); if (!A.length || !B.length) return;
  const aR = uRoles(mergeU(A)), bR = uRoles(mergeU(B)), P = (L, foe) => L.reduce((s, g) => s + gpow(g.o, g.u, { ter: 'cos', wx: 'norm', foe, sup: g.sup, mor: g.mor, exp: g.exp }), 0) * rr(.85, 1.15);
  const pa = P(A, bR), pb = P(B, aR), ratio = pa / (pa + pb + .001), la = {}, ld = {};
  A.forEach(g => gHit(g, .02 + .1 * (1 - ratio), la)); B.forEach(g => gHit(g, .02 + .1 * ratio, ld));
  A.concat(B).forEach(g => { g.exp = Math.min(1, g.exp + .05); }); w.score = clamp(w.score + (ratio - .5) * 10, -100, 100);
  blog({ w: w.id, k: rk(w.def[0], 0), n: 'Batalla naval', ter: 'cos', wx: 'norm', a: w.att[0], d: w.def[0], pa: Math.round(pa), pd: Math.round(pb), ratio: +ratio.toFixed(3), win: ratio > .5 ? 1 : 0, took: 0, la, ld, as: 0, kind: 'mar', me: A.concat(B).some(g => isP(g.o)) ? 1 : 0 });
}

/* ---- logística: suministro, consumo y moral ---- */
function warNeeds(groups) { const n = { pet: 0, hie: 0, tie: 0, tri: 0 };
  for (const g of groups) for (const k in g.u) { const r = D.ROLE[k], q = g.u[k]; if (['arm', 'fig', 'bmb', 'dro', 'tra', 'esc', 'sub', 'car', 'anf'].includes(r)) n.pet += q * .02 * (1 + docM(g.o, 'fuel')); n.hie += q * .006; if (D.UNITS[k].cat !== 'tierra') n.tie += q * .005; n.tri += q * D.UNITS[k].men / 1e6 * .4; }
  const r = (W3().pol || {}).racion ? .6 : 1; n.pet *= r; n.tri *= r; return n; }
function thSupply(w) {
  const me = S.player, mine = S.army.filter(g => g.w === w.id && isP(g.o)); let short = [];
  if (mine.length) { const need = warNeeds(mine), c = P(), blk = (W3().blk || {})[w.id];
    for (const r in need) { const q = need[r], have = c.stock[r] || 0; if (have >= q) { c.stock[r] = have - q; continue; }
      const cost = (q - have) * S.mkt.com[r].p * 1.15; if (!blk && canPay(cost)) { c.tr -= cost; c.stock[r] = 0; } else { c.stock[r] = 0; short.push(r); } } }
  for (const g of S.army) { if (g.w !== w.id) continue; const side = thSide(w, g.o), own = ctlSide(w, g.at) === side;
    let d = own ? 18 : -(5 + 30 * distOwn(w, side, g.at)) * (navSup(w, side) > .1 ? .6 : 1);
    if (g.t !== 'ej') g.at = homeReg(w, g.o); if (g.t === 'fl') d = navSup(w, side) < -.3 ? -6 : 10; if (g.t === 'es') d = 12 - (airSup(w, side) < -.4 ? 15 : 0);
    if (g.t === 'ej' && (W3().blk || {})[w.id + ':' + side]) d -= 10; if (isP(g.o) && short.length) d -= 15 * short.length;
    d *= d < 0 ? 1 / (1 + wmod(g.o, 'w_sup')) : 1 + wmod(g.o, 'w_sup');
    g.sup = clamp(g.sup + d, 5, 100);
    const cap = 90 - (isP(g.o) ? (W3().weary || 0) * .4 : 0), homeland = rpk(g.at)[0] === g.o; // defender tu propia tierra levanta la moral
    if (own) g.mor = Math.min(cap, g.mor + (homeland ? 7 : 4)); if (g.ord === 'adv') g.mor = Math.max(5, g.mor - 3); if (g.sup < 30) g.mor = Math.max(5, g.mor - 5); }
  if (short.length && mine.length) news(`Tu frente se queda sin ${short.map(r => D.COMMODITIES[r].n.toLowerCase()).join(', ')}: el suministro cae`, 'war', me, 3);
  return short;
}

/* ---- órdenes ---- */
function validTargets(w, g, ord) { const side = thSide(w, g.o), O = D.ORDERS[ord];
  if (ord === 'def') return thRegs(w).filter(k => ctlSide(w, k) === side).sort((a, b) => distOwn(w, thOther(side), a) - distOwn(w, thOther(side), b)).slice(0, 8);
  if (ord === 'lnd') return thRegs(w).filter(k => ctlSide(w, k) === thOther(side) && coastal(k)).sort((a, b) => rDist(a, g.at) - rDist(b, g.at)).slice(0, 6);
  if (ord === 'bmb') { const f = thFront(w, side, 5), cap = rk(w[thOther(side)][0], 0); return (ctlSide(w, cap) === thOther(side) && !f.includes(cap) ? f.concat(cap) : f).filter(k => g.t !== 'fl' || coastal(k)); }
  if (O && O.foe) return thFront(w, side, 5); return []; }
function gOrder(g, ord, tgt) { const w = warById(g.w); g.ord = ord; if (ord === 'ret') { g.tgt = g.at = homeReg(w, g.o); return; } if (ord === 'def') { g.tgt = g.at = tgt; return; } g.tgt = tgt || g.tgt; }
/* ---- IA de campaña: elige objetivo, concentra fuerzas, defiende lo amenazado, flanquea, bloquea ---- */
function thPlan(w, iso) {
  const side = thSide(w, iso); if (!side) return; const foeSide = thOther(side), foe = w[foeSide][0], c = S.c[iso], diff = S.diff == null ? 1 : S.diff, nW = Math.max(1, warsOf(iso).length);
  if (!grpOf(iso, w.id).some(g => g.t === 'ej')) { mkGroup(iso, w, 'ej', .55 / nW); mkGroup(iso, w, 'ej', .5 / nW); }
  if (!grpOf(iso, w.id).some(g => g.t === 'es')) mkGroup(iso, w, 'es', .7 / nW);
  if (!grpOf(iso, w.id).some(g => g.t === 'fl') && !D.C[iso].land) mkGroup(iso, w, 'fl', .8 / nW);
  const G = grpOf(iso, w.id), tg = thFront(w, side, 5), th = thFront(w, foeSide, 4), contact = thContact(w, side);
  const foeG = S.army.filter(g => g.w === w.id && w[foeSide].includes(g.o) && g.ord !== 'ret'), sees = isP(iso) ? 1 : [.35, .6, .85, 1][diff];
  const threatAt = k => foeG.filter(g => g.tgt === k && ['atk', 'adv', 'lnd'].includes(g.ord) && (isP(iso) || thHash(g.id + ':' + S.turn + iso) < sees)).reduce((s, g) => s + gsize(g), 0);
  const defAt = k => foeG.filter(g => g.at === k && g.t === 'ej').reduce((s, g) => s + gsize(g), 0) + Object.values(garrison(rSt(k).o, k)).reduce((s, v) => s + v, 0) * (1 + .15 * (rSt(k).fort || 0)) * ((D.TER[terOf(k)] || {}).def || 1);
  const pickT = () => { if (!tg.length) return null; if (thHash(iso + S.turn + 'p') > sees) return tg[0]; return tg.map(k => [k, ((rGeo(k).e || .02) * 40 + 1) / (defAt(k) + 5)]).sort((a, b) => b[1] - a[1])[0][0]; };
  const offensive = side === 'att' ? w.score > -35 || c.per.agres > .6 : power(iso) > power(foe) * .9 && w.score < 10;
  const mainT = pickT(), threat = th.map(k => [k, threatAt(k)]).sort((a, b) => b[1] - a[1])[0];
  const armies = G.filter(g => g.t === 'ej').sort((a, b) => gsize(b) - gsize(a));
  armies.forEach((g, i) => {
    if (g.sup < 20 || g.mor < 15) return gOrder(g, 'ret');
    if (i === 0 && offensive && mainT) return gOrder(g, contact ? (c.per.agres > .6 || isP(iso) ? 'adv' : 'atk') : 'lnd', mainT);
    if (threat && threat[1] > 0) return gOrder(g, 'def', threat[0]);
    if (i === 1 && offensive && tg[1] && contact) return gOrder(g, 'atk', tg[1]);
    gOrder(g, 'def', th[0] || homeReg(w, iso));
  });
  const as = airSup(w, side), ns = navSup(w, side), est = docOf(iso).aire === 'est';
  G.filter(g => g.t === 'es').forEach(g => { if (g.sup < 20) return gOrder(g, 'ret'); if (as > -.25 && mainT && offensive) gOrder(g, est || !contact ? 'bmb' : 'atk', mainT); else gOrder(g, 'pat'); });
  G.filter(g => g.t === 'fl').forEach(g => { if (g.sup < 20) return gOrder(g, 'ret'); if (ns > .1 && !D.C[foe].land) gOrder(g, 'blq'); else gOrder(g, 'pat'); });
}
/* aprender de las derrotas: tras varias batallas perdidas, la IA cambia de doctrina y de compras */
function thLearn(iso, lost, foeU) {
  const c = S.c[iso]; if (isP(iso)) return; c.wl = (c.wl || 0) + (lost ? 1 : -.5); if (c.wl < 3) return; c.wl = 0;
  const R = uRoles(foeU), top = Object.keys(R).sort((a, b) => R[b] - R[a])[0], counter = Object.keys(D.BEATS).filter(r => (D.BEATS[r] || []).includes(top));
  if (top) { c.bias = {}; for (const k in D.ROLE) if (counter.includes(D.ROLE[k])) c.bias[k] = 2.2; }
  c.doct = c.doct || {}; c.doct.tierra = c.doct.tierra === 'blitz' ? 'prof' : 'blitz';
  if (c.gdp > 300 && top && c.bias && Object.keys(c.bias).length) news(`${c.n} cambia su doctrina militar tras sus derrotas: apuesta por ${D.ROLEN[D.ROLE[Object.keys(c.bias)[0]] || 'inf']}`, 'mil', iso, 2);
}
{ const b0 = aiBuy; aiBuy = iso => { const c = S.c[iso], keep = {}; if (c.bias) for (const k in c.bias) { keep[k] = UW[k]; UW[k] = (UW[k] || 1) * c.bias[k]; } try { return b0(iso); } finally { for (const k in keep) UW[k] = keep[k]; } }; }
hook('new', () => { for (const iso of ISOS) { const c = S.c[iso]; c.doct = { tierra: c.per.agres > .45 ? 'blitz' : 'prof', aire: c.per.agres > .6 ? 'est' : 'sup', mar: c.per.agres > .5 ? 'sub' : 'alt' }; } });
hook('load', () => { for (const iso of ISOS) { const c = S.c[iso]; if (!c.doct) c.doct = { tierra: c.per.agres > .45 ? 'blitz' : 'prof', aire: 'sup', mar: 'alt' }; } });

/* ---- el turno de un teatro de guerra ---- */
function theatreTurn(w) {
  if (!S.wars.includes(w)) return; normGroups();
  const me = S.player, mySide = thSide(w, me), auto = !S.war3 || (S.war3.auto || {})[w.id] !== false;
  for (const side of ['att', 'def']) { const lead = w[side][0]; if (!isP(lead) || auto) thPlan(w, lead); }
  if (mySide && w[mySide][0] !== me && auto && !grpOf(me, w.id).length) thPlan(w, me);
  if ((w.cf || 0) > S.turn) { thSupply(w); return; } // alto el fuego: nadie dispara, todos se reabastecen
  const took = [];
  thNaval(w);
  const blk = (S.war3 && (S.war3.blk || (S.war3.blk = {}))) || {}; delete blk[w.id + ':att']; delete blk[w.id + ':def']; delete blk[w.id];
  for (const side of ['att', 'def']) { const fl = S.army.filter(g => g.w === w.id && w[side].includes(g.o) && g.t === 'fl' && g.ord === 'blq');
    if (fl.length && navSup(w, side) > .15 && !D.C[w[thOther(side)][0]].land) { const k = 1 + docM(fl[0].o, 'blq'); blk[w.id + ':' + thOther(side)] = 1; const foe = S.c[w[thOther(side)][0]];
      if (isP(foe.iso)) { blk[w.id] = 1; foe.tr -= foe.gdp * .002 * k; } else foe.gdp *= 1 - .004 * k; w.score = clamp(w.score + (side === 'att' ? 2 : -2) * k, -100, 100); } }
  for (const g of S.army.slice()) if (g.w === w.id && g.ord === 'bmb' && S.army.includes(g)) thBomb(w, g, thSide(w, g.o));
  for (const side of shuffle(['att', 'def'])) {
    const atk = S.army.filter(g => g.w === w.id && w[side].includes(g.o) && ((g.t === 'ej' && ['atk', 'adv', 'lnd'].includes(g.ord)) || (g.t === 'es' && g.ord === 'atk')));
    const byT = {}; for (const g of atk) { if (!g.tgt || ctlSide(w, g.tgt) !== thOther(side)) continue;
      if (g.ord === 'lnd' && !(navSup(w, side) > .25 || S.army.some(f => f.w === w.id && f.o === g.o && f.t === 'fl' && (f.u.anf || 0) > 0))) { if (isP(g.o)) news(`${g.n} no puede desembarcar: no dominas el mar ni tienes buques de desembarco`, 'war', g.o, 2); continue; }
      (byT[g.tgt] = byT[g.tgt] || []).push(g); }
    for (const k in byT) { if (!byT[k].some(g => g.t === 'ej')) continue; const r = thBattle(w, k, byT[k], side, took); thLearn(w[thOther(side)][0], r.win, mergeU(byT[k])); thLearn(w[side][0], !r.win, {}); }
  }
  // tras ganar, quien avanza sigue hacia la siguiente región; los objetivos ya tomados pasan a defenderse
  for (const g of S.army) if (g.w === w.id && g.t === 'ej' && ['atk', 'adv', 'lnd'].includes(g.ord) && g.tgt && ctlSide(w, g.tgt) === thSide(w, g.o)) { if (g.ord === 'adv') { const n = thFront(w, thSide(w, g.o), 1)[0]; if (n) g.tgt = n; else gOrder(g, 'def', g.at); } else gOrder(g, 'def', g.tgt); }
  thSupply(w);
  // el marcador tiende al reparto real del territorio: así se lee de un vistazo quién va ganando
  const held = sd => { const A = S.c[w[thOther(sd)][0]].terr; return A.filter(t => thSide(w, t.o) === sd).length / Math.max(1, A.length); };
  w.score = clamp(w.score * .85 + (held('att') - held('def')) * 100 * .15, -100, 100);
  if (took.length) { Bus.emit('battle', { a: w.att[0], d: w.def[0] }); const mine = thSide(w, me);
    for (const side of ['att', 'def']) { const L = took.filter(x => x[0] === side); if (!L.length) continue; const lead = w[side][0], foe = w[thOther(side)][0];
      news(`${nm(lead)} ${side === 'att' ? 'avanza en' : 'contraataca a'} ${nm(foe)}: ${L.slice(0, 3).map(x => x[1]).join(', ')}${L.length > 3 ? ' y ' + (L.length - 3) + ' más' : ''}`, 'war', lead, mine ? 2 : 1); } }
}
