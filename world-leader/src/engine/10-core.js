/* =====================================================================
   WORLD LEADER · 2. ESTADO  +  3. LÓGICA (núcleo)
   S es el único objeto de estado y es 100% serializable (JSON).
   La UI nunca lo modifica: llama a Game.act(nombre, args).
   ===================================================================== */
const D = WL.DATA;
const Bus = WL.Bus = { h: {}, on(e, f) { (this.h[e] = this.h[e] || []).push(f); }, emit(e, p) { (this.h[e] || []).slice().forEach(f => f(p)); } };
let S = null;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TR = {}, LAW = {}, CO = {}, TECH = {};
D.TRAITS.forEach(t => TR[t.id] = t); D.LAWS.forEach(l => LAW[l.id] = l); D.COMPANIES.forEach(c => CO[c.id] = c); D.TECHS.forEach(t => TECH[t.id] = t);
const ISOS = Object.keys(D.C);
const QN = ['Ene–Mar', 'Abr–Jun', 'Jul–Sep', 'Oct–Dic'];

/* ---- RNG con semilla (mulberry32); el estado del generador vive en S.rng ---- */
function rnd() { S.rng = (S.rng + 0x6D2B79F5) | 0; let t = S.rng; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rr = (a, b) => a + (b - a) * rnd(), ri = (a, b) => Math.floor(rr(a, b + 1)), pick = a => a[Math.floor(rnd() * a.length)], chance = p => rnd() < p;
function wpick(items, wf) { let tot = 0; const ws = items.map(i => { const w = Math.max(0, wf(i)); tot += w; return w; }); if (tot <= 0) return null; let r = rnd() * tot; for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---- accesos ---- */
const C = iso => S.c[iso], P = () => S.c[S.player], isP = iso => iso === S.player, nm = iso => S.c[iso].n;
const alive = () => ISOS.filter(i => S.c[i].alive);
const key = (a, b) => a < b ? a + '|' + b : b + '|' + a;
const money = v => (v < 0 ? '−' : '') + '$' + (Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(2) + ' B' : Math.abs(v) >= 100 ? Math.abs(v).toFixed(0) + ' mM' : Math.abs(v).toFixed(1) + ' mM');
const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v * 10) / 10);
const dateStr = () => QN[S.q] + ' ' + S.year;
function ownerOf(iso) { let c = S.c[iso], n = 0; while (!c.alive && c.owner !== c.iso && n++ < 8) c = S.c[c.owner]; return c.iso; }

/* ---- modificadores del líder (rasgos) y de las leyes vigentes ---- */
function mod(k) { let v = 0; for (const t of S.leader.traits) v += TR[t].m[k] || 0; for (const t of S.tech.done) v += (TECH[t].m || {})[k] || 0; return v; }
function lawSum(k) { let v = 0; for (const id in S.pol.laws) { const p = LAW[id].per; if (p && p[k]) v += p[k]; } for (const t of S.tech.done) v += (TECH[t].per || {})[k] || 0; return v; }

/* ---- noticias: p = importancia 1-3 (3 abre el resumen del turno) ---- */
function news(x, k, iso, p) { const n = { id: ++S.nid, t: S.turn, x, k: k || 'world', i: iso || '', p: p || 1 }; S.news.push(n); if (S.news.length > 160) S.news.shift(); Bus.emit('news', n); }

/* ---- índices derivados (no se serializan; se reconstruyen tras cada cambio) ---- */
let ix = null, relCache = {};
function dirty() { ix = null; relCache = {}; }
function IX() {
  if (ix) return ix;
  ix = { t: {}, w: {}, wars: {}, s: {}, sp: {}, ally: {}, base: {}, nb: {} };
  const al = (a, b) => { (ix.ally[a] = ix.ally[a] || new Set()).add(b); (ix.ally[b] = ix.ally[b] || new Set()).add(a); };
  for (const t of S.tr) { const k = key(t.a, t.b); (ix.t[k] = ix.t[k] || {})[t.t] = 1; if (t.t === 'ali' || t.t === 'def') al(t.a, t.b); }
  for (const b in D.BLOCS) if (D.BLOCS[b].def) { const m = ISOS.filter(i => S.c[i].alive && S.c[i].blocs.includes(b)); for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) al(m[i], m[j]); }
  for (const w of S.wars) {
    for (const a of w.att) { (ix.wars[a] = ix.wars[a] || []).push(w); for (const d of w.def) ix.w[key(a, d)] = w; }
    for (const d of w.def) (ix.wars[d] = ix.wars[d] || []).push(w);
  }
  for (const s of S.sanc) { ix.s[s.by + '>' + s.on] = 1; ix.sp[key(s.by, s.on)] = 1; }
  for (const b of S.bases) (ix.base[b.by] = ix.base[b.by] || []).push(b.in);
  return ix;
}
const shareBloc = (a, b, flag) => C(a).blocs.some(x => D.BLOCS[x][flag] && C(b).blocs.includes(x));
const hasExplicit = (t, a, b) => !!(IX().t[key(a, b)] || {})[t];
const hasT = (t, a, b) => hasExplicit(t, a, b) || (t === 'def' && shareBloc(a, b, 'def')) || (t === 'com' && shareBloc(a, b, 'com'));
const alliesOf = a => [...(IX().ally[a] || [])].filter(x => S.c[x].alive);
const atWar = (a, b) => !!IX().w[key(a, b)];
const warsOf = a => IX().wars[a] || [];
const inWar = a => warsOf(a).length > 0;
const enemiesOf = a => { const s = new Set(); for (const w of warsOf(a)) (w.att.includes(a) ? w.def : w.att).forEach(x => s.add(x)); return [...s]; };
const sanctioned = (by, on) => !!IX().s[by + '>' + on];
const ownCount = iso => C(iso).terr.filter(t => t.o === iso).length;

/* vecinos dinámicos: fronteras propias + las de todo lo anexado u ocupado */
function nb(a) {
  const I = IX(); if (I.nb[a]) return I.nb[a];
  const set = new Set();
  for (const iso of ISOS) { const c = S.c[iso]; if (iso === a || c.owner === a || c.terr.some(t => t.o === a)) { D.C[iso].bord.forEach(b => set.add(b)); set.add(iso); } }
  const out = new Set(); set.forEach(x => { const o = ownerOf(x); if (o !== a && S.c[o].alive) out.add(o); });
  return I.nb[a] = [...out];
}

/* ---- fuerza militar ---- */
const costLvl = iso => clamp(C(iso).gdp / Math.max(.001, C(iso).pop) / 20, .08, 2);
function catPow(iso, cat) { const u = C(iso).u; let v = 0; for (const k in D.UNITS) if (D.UNITS[k].cat === cat) v += (u[k] || 0) * D.UNITS[k].pow; return v; }
function power(iso) {
  const c = C(iso); if (!c.alive) return 0;
  let v = 0; for (const k in D.UNITS) v += (c.u[k] || 0) * D.UNITS[k].pow;
  v *= (.7 + .3 * Math.min(1, c.gdp / Math.max(.001, c.pop) / 40)) * (.75 + c.stab / 400);
  if (isP(iso)) v *= Math.max(.3, 1 + mod('atk') + lawSum('mil')) * (S.flags.oilShort ? .75 : 1);
  return v;
}
const troops = iso => { let v = 0; const u = C(iso).u; for (const k in D.UNITS) v += (u[k] || 0) * D.UNITS[k].men; return v; };
function upkeep(iso) { const c = C(iso), cl = costLvl(iso); let v = 0; for (const k in D.UNITS) v += (c.u[k] || 0) * D.UNITS[k].up; for (const k in D.BASES) v += (c.bases[k] || 0) * D.BASES[k].up; return v * cl; }
/* alcance: frontera, base cercana o armada suficiente */
function canReach(a, b) {
  if (nb(a).includes(b)) return true;
  const A = D.C[a], B = D.C[b];
  if ((IX().base[a] || []).some(h => D.C[h].region === B.region || D.C[h].bord.includes(b))) return true;
  if (!A.land && !B.land) { const n = catPow(a, 'mar'); if (n >= Math.max(15, .25 * catPow(b, 'mar')) && (A.region === B.region || n >= 80)) return true; }
  return false;
}

/* ---- relaciones: base + memoria (modificadores que decaen) + tratados + sanciones + reputación ---- */
function baseRel(a, b) {
  const k = key(a, b); if (k in relCache) return relCache[k];
  const A = C(a), B = C(b); let v = 0;
  for (const x of A.blocs) if (B.blocs.includes(x)) v += D.BLOCS[x].rel;
  if (D.C[a].region === D.C[b].region) v += 6;
  const da = A.reg === 'dem', db = B.reg === 'dem';
  v += da && db ? 8 : da !== db ? -10 : 4;
  v += 4 - 4 * Math.abs(A.ideo - B.ideo);
  v += (PAIR[k] || 0);
  return relCache[k] = clamp(v, -95, 95);
}
const PAIR = {}; D.PAIRS.forEach(p => PAIR[key(p[0], p[1])] = p[2]);
function addMod(a, b, label, v, decay, g) {
  if (a === b || !v) return;
  const k = key(a, b), L = S.mods[k] || (S.mods[k] = []), m = L.find(x => x.k === label);
  if (m) m.v = clamp(m.v + v, -90, 90); else L.push({ k: label, v, d: decay == null ? 1 : decay, g: g ? 1 : 0 });
  if (L.length > 10) L.shift();
}
function repTerm(o) { const p = C(o).per, r = S.rep; return r.conf * .25 * (.5 + p.leal) + r.paz * .2 * (1 - 1.6 * p.agres) + r.dem * .15 * (C(o).reg === 'dem' ? 1 : -.4) + r.gen * .1; }
function treatyBonus(a, b) { const t = IX().t[key(a, b)]; if (!t) return 0; return (t.com ? 10 : 0) + (t.pna ? 8 : 0) + (t.def ? 30 : t.ali ? 25 : 0); }
function rel(a, b) {
  if (a === b) return 100; if (atWar(a, b)) return -100;
  let v = baseRel(a, b) + treatyBonus(a, b);
  for (const m of S.mods[key(a, b)] || []) v += m.v;
  if (IX().sp[key(a, b)]) v -= 25;
  if (isP(a)) v += repTerm(b); else if (isP(b)) v += repTerm(a);
  return clamp(Math.round(v), -100, 100);
}
function relBreakdown(iso) { // para la UI: por qué me quieren o me odian
  const me = S.player, out = [['Afinidad de base', Math.round(baseRel(me, iso))]];
  const tb = treatyBonus(me, iso); if (tb) out.push(['Tratados vigentes', tb]);
  for (const m of S.mods[key(me, iso)] || []) out.push([m.k, Math.round(m.v)]);
  if (IX().sp[key(me, iso)]) out.push(['Sanciones', -25]);
  const rt = Math.round(repTerm(iso)); if (rt) out.push(['Tu reputación mundial', rt]);
  if (atWar(me, iso)) out.push(['En guerra', -100]);
  return out;
}
const grudge = (a, b) => (S.mods[key(a, b)] || []).reduce((s, m) => s + (m.g && m.v < 0 ? m.v : 0), 0);

/* ---- reputación mundial (4 ejes, -100..100) ---- */
function repAdd(axis, v) { S.rep[axis] = clamp(S.rep[axis] + v, -100, 100); }
function repTitle() {
  const r = S.rep;
  if (r.paz <= -40) return 'Señor de la guerra'; if (r.conf <= -40) return 'Traidor'; if (r.dem <= -45) return 'Autócrata';
  if (r.paz >= 40 && r.conf >= 20) return 'Estadista de la paz'; if (r.conf >= 40) return 'Aliado confiable'; if (r.gen >= 40) return 'Benefactor mundial';
  if (r.dem >= 40) return 'Faro democrático'; if (r.paz >= 25) return 'Líder pacífico'; if (r.paz <= -20) return 'Líder belicoso'; if (r.dem <= -25) return 'Líder autoritario';
  return 'Líder emergente';
}

/* ---- construcción del estado inicial ---- */
function genLeader(iso, mil) { const p = D.NAMES[D.C[iso].region] || D.NAMES.EUR; return (mil ? 'Gral. ' : '') + pick(p[0]) + ' ' + pick(p[1]); }
function initUnits(d) {
  const cl = clamp(d.gdp / d.pop / 20, .08, 2), q = .5 + .5 * Math.min(1, cl), m = d.mil, u = {};
  u.inf = Math.round(m / 5); u.tan = Math.round(m / 25 * q); u.art = Math.round(m / 30 * q);
  u.caz = m > 0 ? Math.round((m * .08 + Math.pow(d.gdp, .55) * .6) * q) : 0; u.bom = Math.round(u.caz * .12); u.dro = Math.round(u.caz * .3);
  const sea = m > 0 && !d.land;
  u.fra = sea ? Math.round((Math.sqrt(d.gdp) * .35 + m * .02) * q) : 0; u.sub = Math.round(u.fra * .25); u.por = sea && d.gdp > 1500 ? Math.floor(d.gdp / 2500 * q) : 0;
  return u;
}
const mkTerr = iso => D.C[iso].terr.map(t => t.p ? { n: t.n, o: iso, p: t.p } : { n: t.n, o: iso }); // la geometría (la, lo) vive en DATA, por índice
function mkCountry(iso) {
  const d = D.C[iso], o = D.PERSONALITY[iso] || {}, auth = d.reg !== 'dem';
  const base = { agres: auth ? .4 : .18, expan: auth ? .3 : .1, leal: auth ? .5 : .7, coop: auth ? .45 : .65, rencor: auth ? .65 : .45 }, per = {};
  for (const k in base) per[k] = clamp(o[k] != null ? o[k] : base[k] + rr(-.15, .15), 0, 1);
  const u = initUnits(d), pw = c => Object.keys(D.UNITS).filter(k => D.UNITS[k].cat === c).reduce((s, k) => s + u[k] * D.UNITS[k].pow, 0);
  return {
    iso, n: d.n, alive: true, owner: iso, gdp: d.gdp, pop: d.pop, stab: d.stab, stab0: d.stab, tr: d.gdp * .02,
    lider: { n: d.lider.n, verificado: d.lider.verificado, img: '' }, partido: d.partido, ideo: d.ideo, reg: d.reg, blocs: d.blocs.slice(), rec: Object.assign({}, d.rec), nuke: d.nuke,
    u, bases: { cuartel: 1 + Math.floor(pw('tierra') / 150), aerea: u.caz ? 1 + Math.floor(pw('aire') / 400) : 0, naval: u.fra ? 1 + Math.floor(pw('mar') / 300) : 0 },
    terr: mkTerr(iso),
    per, nextElec: d.reg === 'dem' || d.reg === 'hib' ? ri(2, 16) : 0, cd: ri(0, 6), ask: {}, lastAsk: -9
  };
}

function newGame(o) {
  const seed = (o.seed >>> 0) || 1;
  S = {
    v: 1, geo: 2, seed, rng: seed | 0, turn: 0, year: 2027, q: 0, player: o.iso, wid: 0, nid: 0,
    leader: { n: o.name || 'Líder', traits: (o.traits || []).filter(t => TR[t]), img: o.img || '', pseed: o.pseed || 0 },
    c: {}, mods: {}, tr: [], wars: [], sanc: [], bases: [], contracts: [], news: [], pend: [], later: [], gm: [],
    mkt: { com: {}, co: {}, shocks: [], sent: 0 }, port: {}, auto: true, built: {},
    pol: { laws: {}, cool: {}, seats: [], sec: {}, cp: 6, tax: .22, spend: .2, nextElec: 8, camp: 0 },
    tech: { done: [], cur: null, pts: 0, funded: -1 }, spy: { net: {} },
    rep: { paz: 0, conf: 0, dem: 0, gen: 0 }, un: { queue: null, cur: null, last: null }, flags: {}, evSeen: {}, aiWarCd: 3,
    over: null, stats: { laws: 0, wars: 0, annexed: 0, elections: 0, gdp0: 0 }, hist: { tr: [], appr: [], gdp: [] }, fin: null
  };
  dirty();
  for (const iso of ISOS) S.c[iso] = mkCountry(iso);
  for (const t of D.TREATIES0) S.tr.push({ t: t[0], a: t[1], b: t[2], s: 0 });
  for (const w of D.WARS0) { S.wars.push({ id: ++S.wid, att: [w[0]], def: [w[1]], s: -6, score: 12, casus: 0 }); }
  for (const s of D.SANC0) S.sanc.push({ by: s[0], on: s[1], s: 0 });
  for (const k in D.COMMODITIES) S.mkt.com[k] = { p: D.COMMODITIES[k].p * rr(.92, 1.08), h: [] };
  for (const c of D.COMPANIES) S.mkt.co[c.id] = { p: c.p * rr(.95, 1.05), h: [] };
  for (let i = 0; i < 8; i++) marketTurn(); // historial inicial para las gráficas
  // --- el jugador
  const c = P(); c.lider = { n: S.leader.n, verificado: true, img: S.leader.img };
  if (o.custom) { // país creado por el jugador sobre un territorio existente
    if (o.custom.n) c.n = o.custom.n; if (o.custom.reg) c.reg = o.custom.reg; if (o.custom.ideo != null) c.ideo = +o.custom.ideo;
    c.custom = 1; c.blocs = []; S.tr = S.tr.filter(t => t.a !== o.iso && t.b !== o.iso); S.sanc = S.sanc.filter(s => s.by !== o.iso && s.on !== o.iso);
    S.wars = S.wars.filter(w => !w.att.includes(o.iso) && !w.def.includes(o.iso));
  }
  if (o.partido) c.partido = o.partido;
  c.stock = {}; initPolitics();
  for (const t of S.leader.traits) { const st = TR[t].start; if (!st) continue; for (const k in st.sec || {}) S.pol.sec[k].a = clamp(S.pol.sec[k].a + st.sec[k], 0, 100); for (const k in st.rep || {}) repAdd(k, st.rep[k]); }
  dirty();
  const f = resFlow(); for (const k in f) c.stock[k] = Math.round(f[k].reserve);
  S.stats.gdp0 = c.gdp;
  news(`${S.leader.n} asume el poder en ${c.n}`, 'pol', o.iso, 3);
  S.fin = finance(true);
  return S;
}

/* ---- guardado / carga ---- */
function save() { return JSON.stringify(S); }
function load(str) {
  let o; try { o = typeof str === 'string' ? JSON.parse(str) : str; } catch (e) { return { ok: false, msg: 'El archivo no es un JSON válido' }; }
  if (!o || o.v !== 1 || !o.c || !o.c[o.player] || !o.pol || !o.mkt) return { ok: false, msg: 'No es una partida de World Leader compatible' };
  for (const iso of ISOS) if (!o.c[iso]) return { ok: false, msg: 'A la partida le faltan países (' + iso + ')' };
  // migración de partidas de la Fase 1: estado nuevo y territorios con geometría real
  o.tech = o.tech || { done: [], cur: null, pts: 0, funded: -1 }; o.spy = o.spy || { net: {} };
  if (o.geo !== 2) {
    for (const iso of ISOS) { const c = o.c[iso], old = c.terr, occ = old.filter(t => t.o !== iso), nt = mkTerr(iso);
      if (!c.alive) nt.forEach(t => { t.o = c.owner; }); else { let k = Math.min(nt.length - 1, Math.round(occ.length / old.length * nt.length)); for (let i = nt.length - 1; k > 0 && occ.length; i--, k--) nt[i].o = occ[0].o; }
      c.terr = nt; }
    o.geo = 2;
  }
  S = o; dirty(); Bus.emit('loaded'); Bus.emit('state');
  return { ok: true, msg: 'Partida cargada: ' + dateStr() };
}

/* ---- puerta única de acciones ---- */
const ACT = {}, OPS = {};
const FREE = { decide: 1, edit: 1, asylum: 1 };
const fail = msg => ({ ok: false, msg });
const canPay = x => P().tr - x >= -P().gdp * .15;
function useCP(n) { if (S.pol.cp < n) return false; S.pol.cp -= n; return true; }
function act(name, a) {
  let r;
  if (!S) r = fail('No hay partida en curso');
  else if (S.over && name !== 'asylum') r = fail('La partida ha terminado');
  else if (!ACT[name]) r = fail('Acción desconocida: ' + name);
  else if (S.pend.length && !FREE[name]) r = fail('Resuelve primero la decisión pendiente');
  else { try { r = ACT[name](a || {}) || {}; } catch (e) { if (typeof console !== 'undefined') console.error(e); r = fail('Error interno: ' + e.message); } }
  if (r.ok !== false) r.ok = true;
  if (r.msg) Bus.emit('toast', { ok: r.ok, msg: r.msg });
  if (S) Bus.emit('state');
  return r;
}
function over(reason) { if (S.over) return; S.over = { r: reason, t: S.turn, date: dateStr(), title: repTitle() }; Bus.emit('over', S.over); }
function pushPend(p) { S.pend.push(p); }
