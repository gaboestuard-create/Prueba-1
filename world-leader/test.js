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
      ['unLobby', { iso: o, how: pick(['favor', 'aid']), dir: 1 }], ['unPropose', { type: pick(['sanc', 'mision', 'ayuda', 'clima']), target: o }], ['edit', { iso: iso, k: 'terr.1.o', v: o }], ['edit', { iso: o, k: 'party.1.rel', v: 70 }], ['drill', {}], ['fundRes', { iso: pick(G.q.resInfo().map(x => x.iso).concat([o])) }], ['repress', { iso: pick(G.q.annexedList().concat([o])) }], ['discover', { id: pick(['vacuna', 'hiper', 'ia', 'chips', 'luna']) }], ['rdBudget', { v: pick([0, .5, 1, 2, 3, 7]) }], ['returnTerr', { iso: pick(G.q.occList().concat([o])), all: 1, deal: pick(['gesto', 'pna', 'pago']) }], ['restore', { iso: pick(G.q.annexedList().concat([o])), ally: chance5() }], ['occPolicy', { iso: pick(G.q.occList().concat([o])), k: pick(['dura', 'blanda']) }], ['warOp', { w: (G.q.warsOf(iso)[0] || {}).id, k: pick(['bomb', 'bloqueo', 'ofensiva']) }], ['gesture', { iso: o, k: pick(['cultural', 'denuncia', 'ultimatum']) }], ['mission', { k: pick(Object.keys(D.MISSIONS)), t: pick(G.q.nb(iso).concat([o])), w: (G.S.wars[0] || {}).id }], ['mission', { k: 'interior', end: 0 }], ['commSector', { k: pick(Object.keys(D.SECTORS)) }], ['cabinet', {}], ['regCampaign', { i: 1 + Math.floor(rnd() * 3) }], ['proposeLaw', { id: pick(D.LAWS).id, sunset: 1 }], ['breakTreaty', { iso: o, t: 'com' }], ['edit', { iso: o, k: 'stab', v: 50 }], ['edit', { iso: o, k: 'rel', v: 20 }], ['edit', { iso: o, k: 'ally' }]];
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
// tiempo de un turno
G.newGame({ iso: 'MX', name: 'A', traits: [], seed: 5 }); const t1 = Date.now(); for (let i = 0; i < 10; i++) { while (G.S.pend.length) G.act('decide', { i: 0 }); G.act('endTurn'); }
console.log(`OK · ${(Date.now() - t0) / 1000}s en total · ${((Date.now() - t1) / 10) | 0} ms por turno`);
