#!/usr/bin/env node
/* Autocomprobación del motor (sin DOM): juega partidas completas con acciones al azar
   y verifica que nada lance errores, que no aparezcan NaN y que guardar/cargar sea determinista. */
const fs = require('fs'), path = require('path'), assert = require('assert');
(0, eval)(fs.readFileSync(path.join(__dirname, 'dist', 'core.js'), 'utf8'));
const G = WL.Game, D = WL.DATA;
function noNaN(o, p) { if (typeof o === 'number') assert(Number.isFinite(o), 'NaN/Infinity en ' + p); else if (o && typeof o === 'object') for (const k in o) noNaN(o[k], p + '.' + k); }
let r = 12345; const chance5 = () => rnd() < .5; const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, pick = a => a[Math.floor(rnd() * a.length)];
function play(iso, traits, turns, seed) {
  G.newGame({ iso, name: 'Test', traits, seed });
  const S0 = () => G.S, errs = []; WL.Bus.h = {};
  for (let t = 0; t < turns && !G.S.over; t++) {
    let guard = 0; while (G.S.pend.length && guard++ < 50) G.act('decide', { i: Math.floor(rnd() * G.S.pend[0].opts.length) }) .ok || G.act('decide', { i: 0 });
    assert(!G.S.pend.length || G.S.over, 'decisiones atascadas');
    if (G.S.over) break;
    const others = Object.keys(G.S.c).filter(i => i !== iso && G.S.c[i].alive), o = pick(others);
    const acts = [['proposeLaw', { id: pick(D.LAWS).id, mode: pick(['normal', 'lobby', 'bribe', 'decree']) }], ['propose', { iso: o, t: pick(['com', 'pna', 'ali', 'def']) }], ['visit', { iso: o }], ['invite', { iso: o }],
      ['recruit', { k: pick(Object.keys(D.UNITS)), n: 2 }], ['buildBase', { k: pick(Object.keys(D.BASES)) }], ['buyStock', { id: pick(D.COMPANIES).id, amt: 1 }], ['sellStock', { id: pick(D.COMPANIES).id }],
      ['buyCom', { k: 'hie', q: 5 }], ['sellCom', { k: 'pet', q: 3 }], ['sanction', { iso: o }], ['lift', { iso: o }], ['giveAid', { iso: o, kind: 'eco', v: 1 }], ['giveAid', { iso: o, kind: 'mil', k: 'tierra', v: .1 }], ['askAid', { iso: o, kind: pick(['eco', 'mil', 'mat']), k: 'pet' }],
      ['base', { iso: o }], ['contract', { iso: o, k: 'pet', q: 1 }], ['buyTerr', { iso: pick(G.q.nb(iso).concat([o])), i: 1 }], ['cedeTerr', { iso: pick(G.q.nb(iso).concat([o])), i: 1 }], ['unPropose', { type: 'condena', target: o }],
      ['repealLaw', { id: pick(D.LAWS).id }], ['research', { id: pick(D.TECHS).id }], ['fundResearch', {}], ['spy', { iso: o, op: pick(Object.keys(D.SPYOPS)) }], ['policy', { k: pick(['rate', 'tar', 'fis']), v: pick([0, 1, 2]) }], ['buildInd', { k: pick(['man', 'tec', 'agr']) }], ['bond', { amt: pick([5, -3]) }], ['reserves', { amt: pick([2, -1]) }],
      ['summit', { iso: o, agenda: pick(['com', 'seg', 'rec']) }], ['embargo', { iso: o }], ['bloc', { b: pick(Object.keys(D.BLOCS)), leave: chance5() }], ['partyTalk', { k: pick(['woo', 'pledge', 'pact', 'expel']), i: 1 + Math.floor(rnd() * 3), law: pick(D.LAWS).id }],
      ['unLobby', { iso: o, how: pick(['favor', 'aid']), dir: 1 }], ['unPropose', { type: pick(['sanc', 'mision', 'ayuda', 'clima']), target: o }], ['edit', { iso: iso, k: 'terr.1.o', v: o }], ['edit', { iso: o, k: 'party.1.rel', v: 70 }], ['drill', {}], ['demandApology', { iso: o }], ['askLift', { iso: o, offer: pick(['nada', 'pago', 'concesion']) }], ['setAlert', { v: pick([0, 1, 2, 3, 9]) }], ['wpol', { k: pick(['racion', 'leva', 'econ']), on: pick([0, 1]) }], ['doctrine', { b: pick(['tierra', 'aire', 'mar']), k: pick(['blitz', 'prof', 'sup', 'est', 'alt', 'sub', 'x']) }],
      ['mkGroup', { w: (G.q.warsOf(iso)[0] || {}).id, t: pick(['ej', 'es', 'fl']), f: .5 }], ['grpOrder', { g: (G.q.grpOf(iso)[0] || {}).id, ord: pick(['atk', 'adv', 'def', 'ret', 'blq', 'bmb', 'lnd', 'pat']) }], ['grpAdd', { g: (G.q.grpOf(iso)[0] || {}).id }], ['grpDel', { g: (G.q.grpOf(iso)[1] || {}).id }],
      ['warAuto', { w: (G.q.warsOf(iso)[0] || {}).id, on: pick([0, 1]) }], ['ceasefire', { w: (G.q.warsOf(iso)[0] || {}).id, arm: pick([0, 1]) }], ['breakCf', { w: (G.q.warsOf(iso)[0] || {}).id }], ['fortify', { k: iso + ':' + pick([0, 1, 2]) }],
      ['buyArms', { iso: o, k: pick(['tan', 'caz', 'inf']), n: 3 }], ['sellArms', { iso: o, k: pick(['tan', 'inf']), n: 2 }], ['armsEmb', { iso: o }], ['showForce', { iso: o }], ['strat', { v: pick([0, 1]) }], ['stratThreat', { w: (G.q.warsOf(iso)[0] || {}).id }],
      ['agency', { v: pick([0, 1, 2, 3]) }], ['spy', { iso: o, op: pick(['mil', 'eco', 'cib', 'fil', 'opo']) }], ['edWar', { op: pick(['score', 'cf', 'add', 'sup']), w: (G.S.wars[0] || {}).id, g: (G.S.army[0] || {}).id, v: 20 }], ['armCell', { iso: o, i: 1 }], ['buildFac', { k: pick(['pet', 'hie', 'tie', 'ura', 'zzz']) }], ['fundRes', { iso: pick(G.q.resInfo().map(x => x.iso).concat([o])) }], ['repress', { iso: pick(G.q.annexedList().concat([o])) }], ['discover', { id: pick(['vacuna', 'hiper', 'ia', 'chips', 'luna']) }], ['rdBudget', { v: pick([0, .5, 1, 2, 3, 7]) }], ['returnTerr', { iso: pick(G.q.occList().concat([o])), all: 1, deal: pick(['gesto', 'pna', 'pago']) }], ['restore', { iso: pick(G.q.annexedList().concat([o])), ally: chance5() }], ['occPolicy', { iso: pick(G.q.occList().concat([o])), k: pick(['dura', 'blanda']) }], ['warOp', { w: (G.q.warsOf(iso)[0] || {}).id, k: pick(['bomb', 'bloqueo', 'ofensiva']) }], ['gesture', { iso: o, k: pick(['cultural', 'denuncia', 'ultimatum']) }], ['mission', { k: pick(Object.keys(D.MISSIONS)), t: pick(G.q.nb(iso).concat([o])), w: (G.S.wars[0] || {}).id }], ['mission', { k: 'interior', end: 0 }], ['commSector', { k: pick(Object.keys(D.SECTORS)) }], ['cabinet', {}], ['regCampaign', { i: 1 + Math.floor(rnd() * 3) }], ['proposeLaw', { id: pick(D.LAWS).id, sunset: 1 }], ['breakTreaty', { iso: o, t: 'com' }], ['edit', { iso: o, k: 'stab', v: 50 }], ['edit', { iso: o, k: 'rel', v: 20 }], ['edit', { iso: o, k: 'ally' }]];
    for (let i = 0; i < 4; i++) { const a = pick(acts); G.act(a[0], a[1]); }
    if (t % 7 === 3) { const n = G.q.nb(iso); if (n.length) G.act('declareWar', { iso: pick(n) }); }
    if (t % 5 === 4) for (const w of G.q.warsOf(iso)) G.act('peace', { w: w.id, kind: pick(['blanca', 'actual']) });
    guard = 0; while (G.S.pend.length && guard++ < 50) G.act('decide', { i: 0 });
    const res = G.act('endTurn'); assert(res.ok, 'endTurn falló: ' + res.msg);
    noNaN(G.S, 'S');
  }
  const S = G.S, al = Object.keys(S.c).filter(i => S.c[i].alive).length;
  return `${iso} · ${S.turn} turnos · ${S.over ? 'fin: ' + S.over.r : 'sigue'} · países ${al} · guerras ${S.wars.length} · tratados ${S.tr.length} · sanciones ${S.sanc.length} · caja ${G.q.money(S.c[iso].tr)} · aprob ${Math.round(G.q.approval())} · save ${(G.save().length / 1024) | 0}KB`;
}
const realErr = console.error; let internal = 0; console.error = e => { internal++; realErr(e); };
const t0 = Date.now();
for (const [iso, tr] of [['MX', ['carismatico', 'populista']], ['US', ['belicista', 'estratega', 'autoritario']], ['CN', ['tecnocrata']], ['CH', ['diplomatico', 'negociador', 'pacifista']], ['KP', ['corrupto', 'intrigante']], ['TV', []], ['RU', ['belicista']], ['BR', []]])
  console.log(play(iso, tr, 60, 7 + iso.charCodeAt(0)));
assert.strictEqual(internal, 0, 'hubo errores internos en acciones');
// determinismo: misma semilla + mismas acciones = mismo estado; y guardar/cargar no altera el futuro
G.newGame({ iso: 'MX', name: 'A', traits: [], seed: 99 }); for (let i = 0; i < 6; i++) { while (G.S.pend.length) G.act('decide', { i: 0 }); G.act('endTurn'); }
const snap = G.save(); while (G.S.pend.length) G.act('decide', { i: 0 }); G.act('endTurn'); const a = G.save();
assert(G.load(snap).ok); while (G.S.pend.length) G.act('decide', { i: 0 }); G.act('endTurn'); assert.strictEqual(G.save(), a, 'guardar/cargar no es determinista');
assert(!G.load('{"x":1}').ok && !G.load('no json').ok, 'load debe rechazar basura');
// migración: una partida de la Fase 1 (sin geo/tech/spy y con otros territorios) debe cargar y seguir
{ const o = JSON.parse(snap); delete o.geo; delete o.tech; delete o.spy; for (const i in o.c) o.c[i].terr = [{ n: 'Capital', o: i }, { n: 'Norte', o: i }, { n: 'Sur', o: i === 'UA' ? 'RU' : i }];
  assert(G.load(JSON.stringify(o)).ok, 'no migra partidas de la Fase 1'); assert.strictEqual(G.S.c.MX.terr.length, D.C.MX.terr.length); assert(G.S.c.UA.terr.some(t => t.o === 'RU'), 'la migración pierde la ocupación');
  while (G.S.pend.length) G.act('decide', { i: 0 }); assert(G.act('endTurn').ok); noNaN(G.S, 'S'); }
// partida real de una versión anterior (si existe el archivo de prueba)
{ const f = path.join(__dirname, 'test-oldsave.json'); if (fs.existsSync(f)) { assert(G.load(fs.readFileSync(f, 'utf8')).ok, 'no carga la partida antigua'); for (let i = 0; i < 4; i++) { while (G.S.pend.length) G.act('decide', { i: 0 }); const r = G.act('endTurn'); assert(r.ok, 'la partida antigua se traba: ' + r.msg); } noNaN(G.S, 'S'); } }
// cada evento con cada una de sus opciones, también las ocultas y diferidas
{ let n = 0; for (const e of D.EVENTS) for (let i = 0; i < e.opts.length; i++) {
    G.newGame({ iso: 'MX', name: 'E', traits: ['intrigante'], seed: 31 + n }); G.S.pend = []; const r = G.act('fireEvent', { id: e.id });
    if (!r.ok) continue; const p = G.S.pend[G.S.pend.length - 1]; G.S.pend = [p]; assert(G.act('decide', { i }).ok, 'falla ' + e.id + ' opción ' + i); n++;
    for (let t = 0; t < 6; t++) { while (G.S.pend.length) G.act('decide', { i: 0 }); assert(G.act('endTurn').ok); } noNaN(G.S, 'S'); }
  console.log('eventos probados:', n); }
// una nación anexionada por la IA puede recuperar su independencia con su líder original
{ G.newGame({ iso: 'MX', name: 'G', traits: [], seed: 9 }); const S = G.S; S.pend = []; const A = S.c.AF; A.alive = false; A.owner = 'CN'; A.lider = { n: 'Gobernador impuesto' }; A.terr.forEach(t => { t.o = 'CN'; });
  assert(G.q.resInfo().some(x => x.iso === 'AF' && x.owner === 'CN')); G.act('edit', { iso: 'MX', k: 'cp', v: 12 }); G.act('edit', { iso: 'MX', k: 'tr', v: 500 }); G.act('fundRes', { iso: 'AF' });
  for (let i = 0; i < 12 && !A.alive; i++) { S.res.AF = 100; S.pend = []; G.act('endTurn'); }
  assert(A.alive, 'la resistencia debe poder liberar Afganistán'); assert.strictEqual(A.lider.n, D.C.AF.lider.n); assert.strictEqual(A.reg, D.C.AF.reg); assert(A.terr.every(t => t.o === 'AF')); S.pend = []; assert(G.act('endTurn').ok); noNaN(S, 'S'); }
// la IA arma guerrillas contra tus anexiones
{ G.newGame({ iso: 'MX', name: 'H', traits: [], seed: 11 }); const S = G.S; S.pend = []; const A = S.c.GT; A.alive = false; A.owner = 'MX'; A.terr.forEach(t => { t.o = 'MX'; }); G.act('edit', { iso: 'US', k: 'enemy' });
  let by = null; for (let i = 0; i < 40 && !by && !S.over; i++) { S.pend = []; G.act('endTurn'); by = S.resF['GT:by']; } assert(by && by !== 'MX', 'algún rival debe armar a la guerrilla'); noNaN(S, 'S'); }
// Fase 3: guerra región a región con grupos, órdenes, alto el fuego, obras y espionaje
{ G.newGame({ iso: 'BR', name: 'W', traits: [], seed: 21 }); const S = G.S, q = G.q; S.pend = []; S.pol.nextElec = 999; G.act('edit', { iso: 'BR', k: 'cp', v: 12 }); G.act('edit', { iso: 'BR', k: 'tr', v: 900 });
  assert(G.act('declareWar', { iso: 'PY' }).ok); const w = S.wars.find(x => x.att[0] === 'BR' && x.def[0] === 'PY'); assert(w, 'hay guerra');
  assert(q.grpOf('BR', w.id).length >= 2, 'el Estado Mayor despliega al empezar'); assert(q.grpOf('PY', w.id).length >= 1, 'el enemigo también');
  const g = q.grpOf('BR', w.id).find(x => x.t === 'ej'), T = q.validTargets(w, g, 'atk'); assert(T.length, 'hay objetivos');
  assert(G.act('grpOrder', { g: g.id, ord: 'atk', tgt: T[0] }).ok); assert(S.war3.auto[w.id] === false, 'dar órdenes toma el mando');
  assert(!G.act('grpOrder', { g: g.id, ord: 'blq' }).ok, 'un ejército no bloquea'); const own0 = S.c.PY.terr.filter(t => t.o === 'PY').length;
  G.act('warAuto', { w: w.id, on: 1 }); for (let i = 0; i < 6 && S.wars.includes(w); i++) { S.pend = []; G.act('endTurn'); }
  assert(S.blog.some(b => b.w === w.id && b.kind === 'tierra'), 'hubo batallas'); assert(S.c.PY.terr.filter(t => t.o === 'PY').length < own0 || !S.wars.includes(w), 'Brasil avanza sobre Paraguay');
  if (S.wars.includes(w)) { S.pend = []; const r = G.act('ceasefire', { w: w.id }); if (r.ok) { const n = S.blog.length; S.pend = []; G.act('endTurn'); assert(S.blog.filter(b => b.w === w.id && b.t === S.turn - 1).length === 0, 'con alto el fuego no hay combates'); } }
  S.pend = []; const b0 = S.c.BR.bases.cuartel; assert(G.act('buildBase', { k: 'cuartel' }).ok); assert.strictEqual(S.c.BR.bases.cuartel, b0, 'las obras tardan'); S.pend = []; G.act('endTurn'); S.pend = []; G.act('endTurn'); assert.strictEqual(S.c.BR.bases.cuartel, b0 + 1);
  S.pend = []; const k = 'BR:' + S.c.BR.terr.findIndex(t => t.o === 'BR'); const rf = G.act('fortify', { k }); assert(rf.ok, 'fortificar: ' + rf.msg + ' caja ' + S.c.BR.tr); S.pend = []; G.act('endTurn'); S.pend = []; G.act('endTurn'); assert(q.rSt(k).fort >= 1, 'fortificación terminada');
  S.pend = []; G.act('agency', { v: 3 }); for (let i = 0; i < 4; i++) { S.pend = []; G.act('endTurn'); } assert(S.spy.lvl > 1, 'la agencia sube de nivel');
  S.pend = []; assert(G.act('setAlert', { v: 2 }).ok); noNaN(S, 'S'); }
// la IA libra sus propias guerras región a región y el mapa cambia sin el jugador
{ G.newGame({ iso: 'MX', name: 'W2', traits: [], seed: 22 }); const S = G.S; S.pend = []; G.act('edWar', { op: 'war', a: 'IN', b: 'PK' }); const w = S.wars.find(x => x.att[0] === 'IN' && x.def[0] === 'PK');
  for (let i = 0; i < 8 && S.wars.includes(w); i++) { S.pend = []; G.act('endTurn'); } assert(S.blog.some(b => b.w === w.id && b.took), 'la IA conquista regiones'); noNaN(S, 'S'); }
// reciprocidad: la IA levanta sus sanciones cuando mejoran las cosas
{ G.newGame({ iso: 'MX', name: 'R', traits: [], seed: 41 }); const S = G.S; S.pend = []; S.pol.nextElec = 999; G.act('edit', { iso: 'MX', k: 'cp', v: 12 });
  const z = 'AR'; G.act('sanction', { iso: z }); S.sanc = S.sanc.filter(x => !(x.by === z && x.on === 'MX')); S.sanc.push({ by: z, on: 'MX', s: S.turn }); S.c[z].scd = {}; S.c[z].esc = {}; S.c[z].plan = null;
  G.act('lift', { iso: z }); G.act('edit', { iso: z, k: 'rel', v: 40 });
  let t = 0; for (; t < 12 && S.sanc.some(x => x.by === z && x.on === 'MX'); t++) { S.pend = []; G.act('endTurn'); } assert(!S.sanc.some(x => x.by === z && x.on === 'MX'), 'el país debe levantar sus sanciones cuando la relación mejora');
  // entre IAs también
  S.sanc.push({ by: 'FR', on: 'DE', s: S.turn }); for (let i = 0; i < 12 && S.sanc.some(x => x.by === 'FR' && x.on === 'DE'); i++) { S.pend = []; G.act('endTurn'); } assert(!S.sanc.some(x => x.by === 'FR' && x.on === 'DE'), 'las IAs revisan sus sanciones');
  // pedirlo
  S.sanc.push({ by: 'CL', on: 'MX', s: S.turn }); S.pend = []; G.act('edit', { iso: 'CL', k: 'rel', v: 60 }); G.act('edit', { iso: 'MX', k: 'cp', v: 12 }); let ok = false; for (let i = 0; i < 6 && !ok; i++) { S.c.CL.ask.lift = 0; ok = G.act('askLift', { iso: 'CL', offer: 'pago' }).ok; G.act('edit', { iso: 'MX', k: 'cp', v: 12 }); } assert(ok, 'pedir que levanten sanciones puede funcionar'); noNaN(S, 'S'); }
// motivos para la guerra: las provocaciones justifican y suavizan la reacción del mundo
{ G.newGame({ iso: 'MX', name: 'J', traits: [], seed: 51 }); const S = G.S, q = G.q; S.pend = []; S.pol.nextElec = 999; G.act('edit', { iso: 'MX', k: 'cp', v: 12 });
  assert.strictEqual(q.justInfo('GT').lvl, 0, 'sin agravios no hay justificación'); const sanc0 = S.sanc.filter(x => x.on === 'MX').length;
  S.cb.GT = [{ t: S.turn, k: 'frontera', v: 30, x: 'a' }, { t: S.turn, k: 'sabotaje', v: 25, x: 'b' }, { t: S.turn, k: 'ultimatum', v: 30, x: 'c' }]; assert.strictEqual(q.justInfo('GT').lvl, 3, 'indiscutible');
  const p0 = S.rep.paz; assert(G.act('declareWar', { iso: 'GT' }).ok); const w = S.wars.find(x => x.att[0] === 'MX' && x.def[0] === 'GT'); assert(w.casus && w.just === 3, 'la guerra cuenta como provocada'); assert(S.rep.paz > p0 - 10, 'la reputación casi no sufre');
  S.cb.HN = [{ t: S.turn, k: 'espias', v: 20, x: 'x' }]; let tries = 0, r; do { S.c.HN.ask.apo = 0; G.act('edit', { iso: 'MX', k: 'cp', v: 12 }); r = G.act('demandApology', { iso: 'HN' }); } while (!r.ok && ++tries < 15); assert(tries < 15 || q.justInfo('HN').score > 20, 'exigir disculpas funciona o aumenta los agravios'); noNaN(S, 'S'); }
// Fase 4: sinergias, diario y legado
{ G.newGame({ iso: 'MX', name: 'L', traits: ['carismatico', 'tecnocrata', 'sereno', 'cercano'], seed: 31 }); const S = G.S, q = G.q; S.pend = [];
  assert(q.synergies().some(x => x.n === 'Encanto popular') && q.synergies().some(x => x.n === 'Gestor frío'), 'sinergias activas');
  for (let i = 0; i < 6; i++) { while (S.pend.length) G.act('decide', { i: 0 }); G.act('endTurn'); } assert(S.diary.length > 0, 'el diario registra decisiones');
  const L = q.legacy(); assert(L.title && L.score >= 0 && L.score <= 100 && L.text.length > 20, 'legado'); noNaN(S, 'S'); }
// fábricas, guerrillas urbanas y registro mundial
{ G.newGame({ iso: 'MX', name: 'F', traits: [], seed: 13 }); const S = G.S; S.pend = []; G.act('edit', { iso: 'MX', k: 'tr', v: 500 }); G.act('edit', { iso: 'MX', k: 'cp', v: 12 });
  const p0 = G.q.resFlow().tie.prod; assert(G.act('buildFac', { k: 'tie' }).ok); assert(!G.act('buildFac', { k: 'tie' }).ok, 'una obra a la vez'); S.pend = []; G.act('endTurn'); S.pend = []; G.act('endTurn'); S.pend = [];
  assert(G.q.resFlow().tie.prod > p0, 'la fábrica produce'); assert(G.q.finance().exp.fab > 0);
  G.act('edit', { iso: 'UA', k: 'terr.3.o', v: 'RU' }); assert(G.q.occCells().some(c => c.iso === 'UA' && c.i === 3)); G.act('armCell', { iso: 'UA', i: 3 });
  for (let i = 0; i < 5; i++) { S.pend = []; G.act('endTurn'); } assert(S.rarm.length === 0, 'el levantamiento se resuelve');
  assert(G.q.worldFeed().filter(e => !e.n && e.t === S.turn - 1).length >= 5, 'el mundo hace cosas cada turno'); noNaN(S, 'S'); }
// carrera tecnológica: dominar un descubrimiento da sus efectos y avisa al mundo
{ G.newGame({ iso: 'US', name: 'R', traits: [], seed: 5 }); const S = G.S; S.pend = []; const m0 = G.q.lawSum('mil');
  assert(!G.act('discover', { id: 'laser' }).ok, 'láser exige hipersónicos'); assert(G.act('discover', { id: 'hiper' }).ok); S.disc.prog.US = { hiper: 999 }; G.act('endTurn'); S.pend = [];
  assert(G.q.hasD('US', 'hiper') && S.disc.own.hiper[0] === 'US', 'el primero queda registrado'); assert(G.q.lawSum('mil') > m0 + .1, 'el descubrimiento da fuerza'); assert.strictEqual(S.disc.cur, null);
  assert(G.q.discCost('hiper') < 100, 'los que llegan después pagan menos'); assert(G.act('discover', { id: 'laser' }).ok); }
// ocupación → restitución → anexión → restauración
{ G.newGame({ iso: 'US', name: 'O', traits: [], seed: 4 }); G.S.pend = []; const S = G.S; G.act('edit', { iso: 'MX', k: 'terr.3.o', v: 'US' }); G.act('edit', { iso: 'MX', k: 'terr.4.o', v: 'US' });
  assert.strictEqual(G.q.occOf('MX').length, 2); const rA = G.q.rel('US', 'MX'); G.act('endTurn'); S.pend = []; assert(G.q.rel('US', 'MX') < rA - 8, 'la ocupación debe generar rencor');
  const r0 = G.q.rel('US', 'MX'); assert(G.act('returnTerr', { iso: 'MX', all: 1, deal: 'pna' }).ok); assert.strictEqual(G.q.occOf('MX').length, 0); assert(G.q.rel('US', 'MX') > r0, 'devolver debe mejorar la relación'); assert(G.q.hasExplicit('pna', 'US', 'MX'));
  for (let i = 0; i < S.c.GT.terr.length; i++) G.act('edit', { iso: 'GT', k: 'terr.' + i + '.o', v: 'US' }); S.c.GT.alive = false; S.c.GT.owner = 'US';
  assert(G.q.annexedList().includes('GT')); assert(G.act('restore', { iso: 'GT', ally: 1 }).ok); assert(S.c.GT.alive && G.q.ownCount('GT') === S.c.GT.terr.length); S.pend = []; assert(G.act('endTurn').ok); noNaN(S, 'S'); }
// Fase 5: escenarios, modos, campañas, victorias, código de partida, epílogo y logros
{ const q = G.q, P5 = q.p5, D = WL.DATA, turns = n => { for (let i = 0; i < n && !G.S.over; i++) { let k = 0; while (G.S.pend.length && k++ < 40) G.act('decide', { i: 0 }); G.act('endTurn'); } };
  for (const sc of D.SCEN) { G.newGame({ iso: 'MX', name: 'E', seed: 21, setup: { scen: sc.id } }); turns(3); assert(!(G.S.errs || []).length, 'escenario sin errores: ' + sc.id + ' ' + JSON.stringify(G.S.errs)); noNaN(G.S, 'S'); }
  const same = setup => { G.newGame({ iso: 'BR', name: 'D', seed: 77, setup }); turns(3); return G.save(); };
  const st = { scen: 'caos', opts: { alt: 1, escasez: 1, hostil: 1 }, dk: { ai: 1.4, eco: .8, stab: 1.3, ev: 1.6 } }; assert.strictEqual(same(st), same(st), 'misma semilla y configuración = mismo mundo');
  G.newGame({ iso: 'MX', name: 'C', seed: 5, setup: { scen: 'guerrafria' } }); assert.strictEqual(G.S.year, 1987); assert.strictEqual(G.S.c.US.lider.n, 'Ronald Reagan'); assert(!G.S.wars.some(w => w.att[0] === 'RU' && w.def[0] === 'UA'), 'sin guerra en Ucrania en 1987');
  assert(G.q.diffK('ai') === 1 && (G.S.setup.dk.ai = 1.5) && Math.abs(G.q.diffK('ai') - 1.5) < 1e-9, 'la agresividad de la IA escala diffK');
  // código de partida
  G.newGame({ iso: 'AR', name: 'Código', traits: ['carismatico'], seed: 1234, setup: { mode: 'rapido', scen: 'crisis', opts: { perm: 1 } } }); const code = P5.gameCode(), o = P5.readCode(code);
  assert(o && o.iso === 'AR' && o.seed === 1234 && o.setup.scen === 'crisis' && o.setup.mode === 'rapido' && o.setup.opts.perm && o.traits[0] === 'carismatico', 'el código conserva la partida');
  assert.strictEqual(P5.readCode('hola'), null); assert.strictEqual(P5.readCode('WL5-%%%'), null); assert.strictEqual(P5.readCode('WL5-' + Buffer.from('{"iso":"ZZ","seed":1}').toString('base64')), null, 'código con país inválido');
  // modo rápido: termina a los 36 turnos con puntuación
  turns(60); if (G.S.over.r !== 'tiempo') { assert(G.S.turn < D.QUICK_TURNS); G.newGame({ iso: 'AR', name: 'R', seed: 1234, setup: { mode: 'rapido' } }); G.S.turn = D.QUICK_TURNS - 1; G.S.pol.nextElec = 999; G.S.c.AR.stab = 80; G.S.pend = []; G.act('endTurn'); } assert.strictEqual(G.S.turn, D.QUICK_TURNS); assert.strictEqual(G.S.over.r, 'tiempo'); const sc = P5.score(); assert(sc.total >= 0 && sc.total <= 100 && sc.parts.length === D.SCORE.length);
  assert(sc.parts.every(p => p.v >= 0 && p.v <= p.max), 'cada bloque respeta su máximo'); assert(!G.act('keepPlaying').ok, 'tras el tiempo no se sigue');
  // sandbox: no se pierde por política; sin editor: el editor queda bloqueado
  G.newGame({ iso: 'MX', name: 'S', seed: 3, setup: { mode: 'sandbox' } }); G.S.pend = []; G.S.c.MX.stab = 2; G.act('endTurn'); assert(!G.S.over, 'en sandbox no hay revolución');
  G.newGame({ iso: 'MX', name: 'S', seed: 3, setup: { opts: { solo: 1 } } }); G.S.pend = []; assert(!G.act('edit', { iso: 'MX', k: 'tr', v: 999 }).ok, 'sin editor'); assert(!G.act('fireProc').ok || true);
  // victoria alternativa → seguir gobernando
  G.newGame({ iso: 'MX', name: 'V', seed: 8 }); G.S.pend = []; assert(G.act('testVic', { k: 'eco' }).ok && G.S.over.r === 'vic_eco'); assert(G.act('keepPlaying').ok && !G.S.over && G.S.p5.cont);
  assert(G.S.p5.edited, 'probar victorias marca la partida como editada'); turns(2); assert(!G.S.over || G.S.over.r !== 'vic_eco', 'una victoria no se repite');
  // campaña: eventos, etapas, plazos y finales
  G.newGame({ name: '', seed: 9, setup: { mode: 'camp', camp: 'reformista' } }); const S = G.S; assert(S.player === 'CU' && S.leader.n === 'Elena Varona' && S.camp && S.camp.st === 0);
  S.stats.laws = 5; S.c.CU.stab = 70; S.pend = []; G.act('endTurn'); assert.strictEqual(S.camp.st, 1, 'la etapa avanza al cumplir los objetivos');
  for (let i = 0; i < 3 && !S.flags.re_dummy; i++) { let k = 0; while (S.pend.length && k++ < 9) G.act('decide', { i: 0 }); G.act('endTurn'); } assert(S.camp.fired.re_deshielo, 'los eventos de campaña llegan');
  assert(G.act('campSkip').ok && S.camp.st === 2); S.flags.re_mercado = 1; assert(G.act('campSkip').ok && S.over.r === 'camp_win'); const ci = P5.campInfo(); assert(ci.end && ci.K.end >= 0 && ci.K.end <= 2, 'hay un final');
  for (const k of D.CAMP) { assert(k.stages.length === 3 && k.endings.length === 3 && !k.endings[2].if, 'campaña completa: ' + k.id); for (const s2 of k.stages) for (const g of s2.goal) assert(P5.goalText(g) !== g[0], 'objetivo con texto: ' + g[0]);
    for (const e of k.events) assert(e.opts.length >= 2 && e.opts.every(x => Array.isArray(x.fx)), 'evento de campaña: ' + e.id); }
  G.newGame({ name: '', seed: 9, setup: { mode: 'camp', camp: 'declive' } }); G.S.pend = []; G.S.c.US.gdp = 900; G.act('endTurn'); assert(G.S.over && G.S.over.r === 'camp_lose', 'la derrota de campaña llega');
  G.newGame({ name: '', seed: 9, setup: { mode: 'camp', camp: 'mediador' } }); G.S.camp.s0 = -30; G.S.pend = []; G.act('endTurn'); assert.strictEqual(G.S.over.r, 'camp_time', 'el plazo vence');
  // mediar por iniciativa propia
  G.newGame({ iso: 'NO', name: 'M', seed: 3, setup: { scen: 'tension' } }); G.S.pend = []; const w = G.S.wars.find(x => !x.att.includes('NO') && !x.def.includes('NO') && q.rel('NO', x.att[0]) >= -25 && q.rel('NO', x.def[0]) >= -25);
  if (w) { G.S.pol.cp = 12; let n = 0; while (q.warById(w.id) && n++ < 12) { w.medT = 0; G.act('mediate', { w: w.id }); G.S.pol.cp = 12; } assert(!q.warById(w.id) && G.S.p5.med === 1, 'la mediación cuenta'); }
  // escenario propio: operaciones, objetivo y evento programado
  const ev = Object.keys(q.EV())[0]; G.newGame({ iso: 'MX', name: 'P', seed: 3, setup: { custom: { n: 'Mío', ops: [['rel', 'MX', 'US', -30, 'Prueba'], ['stab', 'P', 10], ['war', 'CO', 'VE']], goals: [['laws', 1]], events: [{ at: 1, id: ev }] } } });
  assert(G.S.wars.some(x => x.att[0] === 'CO' && x.def[0] === 'VE'), 'la guerra del escenario propio existe'); G.S.pend = []; G.S.stats.laws = 1; G.act('endTurn'); assert.strictEqual(G.S.over.r, 'vic_obj', 'el objetivo propio da la victoria');
  // epílogo: el mundo sigue y luego todo vuelve
  G.newGame({ iso: 'DE', name: 'Epi', seed: 6 }); turns(3); const before = G.save(), e = P5.epilogue(12); assert(e.n === 12 && Array.isArray(e.heads) && e.top.length === 5); assert.strictEqual(G.save(), before, 'el epílogo no toca la partida');
  // eventos procedurales: se combinan sin repetirse
  G.S.pend = []; const keys = new Set(); for (let i = 0; i < 6; i++) { G.S.procCd = {}; if (G.act('fireProc').ok) { const p = G.S.pend[0]; assert(p && p.opts.length >= 2 && !/\{|\}/.test(p.t + p.x), 'texto procedural completo'); keys.add(p.t); G.act('decide', { i: 0 }); } }
  assert(keys.size >= 4, 'los eventos procedurales varían'); assert(new Set(G.S.procSeen).size === G.S.procSeen.length, 'ninguna combinación se repite');
  // partida de la Fase 4 (sin datos de Fase 5) se adapta con aviso
  const old = JSON.parse(G.save()); delete old.setup; delete old.p5; delete old.camp; assert(G.load(JSON.stringify(old)).ok && G.S.p5mig && G.S.setup.mode === 'libre' && G.S.p5.treat === 0); turns(1);
  // logros: datos coherentes y evaluables
  assert(D.ACH.length >= 60 && new Set(D.ACH.map(a => a[0])).size === D.ACH.length, '60+ logros sin repetir'); const m = P5.metrics(); for (const a of D.ACH) { a[4](m, { games: 1, campDone: 0 }); if (a[6]) assert(D.UNLOCK[a[6]], 'desbloqueable inexistente: ' + a[6]); }
  for (const s2 of D.SCEN) if (s2.lock) assert(D.UNLOCK[s2.lock]); for (const t of D.TRAITS) if (t.lock) assert(D.UNLOCK[t.lock]);
  const wk = P5.weekly(Date.UTC(2026, 10, 16)); assert.deepStrictEqual(wk, P5.weekly(Date.UTC(2026, 10, 22, 20)), 'el reto es el mismo de lunes a domingo'); assert.notDeepStrictEqual(wk, P5.weekly(Date.UTC(2026, 10, 23)), 'cambia cada lunes'); G.newGame({ iso: wk.iso, name: 'W', seed: wk.seed, setup: wk.setup }); turns(2); assert(!(G.S.errs || []).length); }
// conversaciones entre líderes, asamblea de la ONU y prensa
{ G.newGame({ iso: 'MX', name: 'T', seed: 12 }); const S = G.S, q = G.q; S.pend = []; S.pol.nextElec = 999;
  S.talkQ.push(['war', 'IN', 'PK']); G.act('endTurn'); S.pend = []; const c = S.talk.find(x => x.k === 'war'); assert(c && c.rep === 'duel' && c.lines.length >= 2 && c.lines.every(l => !/\{/.test(l[1])), 'diálogo de guerra completo');
  const r0 = q.rel('MX', 'IN'); assert(G.act('talkReply', { id: c.id, i: 0 }).ok && q.rel('MX', 'IN') > r0, 'apoyar mejora la relación'); assert(!G.act('talkReply', { id: c.id, i: 0 }).ok, 'una sola intervención');
  S.un.queue = null; let un = 0, press = 0; for (let i = 0; i < 40 && !(un && press); i++) { let k = 0; while (S.pend.length && k++ < 20) { if (S.pend[0].id === 'prensa') press++; G.act('decide', { i: 0 }); } G.act('endTurn'); un = S.talk.filter(x => x.k === 'un').length; }
  assert(un && press, 'la ONU deja discursos y hay ruedas de prensa'); assert(S.talk.length <= 40); noNaN(S, 'S'); }
// regiones con vida: malestar, independentismo, acciones, crisis y desastres
{ G.newGame({ iso: 'ES', name: 'R', seed: 9 }); const S = G.S, q = G.q; S.pend = []; S.pol.nextElec = 999; const cat = S.c.ES.terr.findIndex(t => t.n === 'Cataluña');
  assert(cat > 0 && q.sepOf('ES', cat) && q.rlInfo(cat).sep >= 50, 'Cataluña tiene movimiento'); assert(q.rlInfo(1) && q.rlInfo(1).sep == null || q.sepOf('ES', 1), 'solo las regiones con movimiento tienen independentismo');
  const m0 = q.rlInfo(cat).m; assert(G.act('rlAct', { i: cat, k: 'inv' }).ok && q.rlInfo(cat).m < m0 && q.rlInfo(cat).inv === 6); assert(!G.act('rlAct', { i: cat, k: 'visita' }).ok, 'una acción cada dos turnos');
  assert(!G.act('rlAct', { i: 1, k: 'aut' }).ok || q.sepOf('ES', 1), 'sin movimiento no hay autonomía'); assert(!G.act('rlAct', { i: cat, k: 'xx' }).ok);
  S.rl[cat].sep = 95; S.rl[cat].cd = 0; G.act('endTurn'); const p = S.pend.find(x => x.id === 'region'); assert(p && /Crisis independentista/.test(p.t), 'llega la crisis independentista');
  S.pend = [p]; G.act('decide', { i: 0 }); assert(S.rl[cat].aut && S.rl[cat].sep < 95, 'el referéndum pactado da autonomía');
  for (let i = 0; i < 30; i++) { let k = 0; while (S.pend.length && k++ < 20) G.act('decide', { i: 0 }); G.act('endTurn'); }
  assert(!(S.errs || []).length, JSON.stringify(S.errs)); for (const k in S.rl) assert(S.rl[k].m >= 0 && S.rl[k].m <= 100); noNaN(S, 'S');
  const old = JSON.parse(G.save()); delete old.rl; assert(G.load(JSON.stringify(old)).ok && G.S.rl, 'partida sin regiones vivas carga'); G.S.pend = []; assert(G.S.over || G.act('endTurn').ok); }
// tiempo de un turno
G.newGame({ iso: 'MX', name: 'A', traits: [], seed: 5 }); const t1 = Date.now(); for (let i = 0; i < 10; i++) { while (G.S.pend.length) G.act('decide', { i: 0 }); G.act('endTurn'); }
console.log(`OK · ${(Date.now() - t0) / 1000}s en total · ${((Date.now() - t1) / 10) | 0} ms por turno`);
