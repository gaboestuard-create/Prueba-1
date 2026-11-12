#!/usr/bin/env node
/* Autocomprobación del motor (sin DOM): juega partidas completas con acciones al azar
   y verifica que nada lance errores, que no aparezcan NaN y que guardar/cargar sea determinista. */
const fs = require('fs'), path = require('path'), assert = require('assert');
(0, eval)(fs.readFileSync(path.join(__dirname, 'dist', 'core.js'), 'utf8'));
const G = WL.Game, D = WL.DATA;
function noNaN(o, p) { if (typeof o === 'number') assert(Number.isFinite(o), 'NaN/Infinity en ' + p); else if (o && typeof o === 'object') for (const k in o) noNaN(o[k], p + '.' + k); }
let r = 12345; const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, pick = a => a[Math.floor(rnd() * a.length)];
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
      ['repealLaw', { id: pick(D.LAWS).id }], ['breakTreaty', { iso: o, t: 'com' }], ['edit', { iso: o, k: 'stab', v: 50 }], ['edit', { iso: o, k: 'rel', v: 20 }], ['edit', { iso: o, k: 'ally' }]];
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
// tiempo de un turno
G.newGame({ iso: 'MX', name: 'A', traits: [], seed: 5 }); const t1 = Date.now(); for (let i = 0; i < 10; i++) { while (G.S.pend.length) G.act('decide', { i: 0 }); G.act('endTurn'); }
console.log(`OK · ${(Date.now() - t0) / 1000}s en total · ${((Date.now() - t1) / 10) | 0} ms por turno`);
