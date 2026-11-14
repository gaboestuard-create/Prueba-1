#!/usr/bin/env node
// Prueba de resistencia (node build.js && node soak.js). Partida larga: 150 turnos con acciones al azar, buscando errores internos, NaN, crecimiento de estado y tiempos
const vm = require('vm'), fs = require('fs'); const g = { console }; g.globalThis = g; vm.createContext(g);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, 'dist', 'core.js'), 'utf8'), g); const G = g.WL.Game, q = G.q, D = g.WL.DATA; g.WL.Bus.h = {};
let r = 7; const rnd = () => (r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, pick = a => a[Math.floor(rnd() * a.length)];
for (const [iso, seed] of [['FR', 3], ['IN', 5], ['NG', 8]]) {
  G.newGame({ iso, name: 'Soak', traits: [], seed }); const S = G.S; let errs = 0, tmax = 0, nan = 0, over = null;
  const sizes = [];
  for (let t = 0; t < 150; t++) {
    if (S.over) { over = S.over.r; S.over = null; S.pol.nextElec = S.turn + 16; S.c[iso].stab = 60; } // seguir jugando para buscar fugas
    const o = pick(Object.keys(S.c).filter(z => z !== iso && S.c[z].alive));
    for (const [a, x] of [['visit', { iso: o }], ['propose', { iso: o, t: pick(['com', 'pna', 'ali']) }], ['proposeLaw', { id: pick(D.LAWS).id }], ['recruit', { k: pick(Object.keys(D.UNITS)), n: 2 }],
      ['spy', { iso: o, op: pick(Object.keys(D.SPYOPS)) }], ['discover', { id: pick(D.DISC).id }], ['buildFac', { k: pick(Object.keys(D.FACT)) }], ['setAlert', { v: pick([0, 1, 2]) }]]) if (rnd() < .3) G.act(a, x);
    if (t === 20) G.act('edWar', { op: 'war', a: iso, b: pick(q.nb(iso).length ? q.nb(iso) : [o]) });
    let k = 0; while (S.pend.length && k++ < 30) G.act('decide', { i: Math.floor(rnd() * 2) });
    const t0 = Date.now(); const res = G.act('endTurn'); const dt = Date.now() - t0; tmax = Math.max(tmax, dt); if (!res.ok) errs++;
    if (t % 50 === 49) sizes.push(Math.round(G.save().length / 1024) + 'KB');
  }
  const big = Object.entries(S).filter(([k, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log(`${iso}: turno ${S.turn}, errores internos ${(S.errs || []).length}, endTurn fallidos ${errs}, turno más lento ${tmax}ms, guardado ${sizes.join(' → ')}, fin intermedio: ${over}`);
  console.log('   listas más grandes:', big.map(x => x.join('=')).join(' '));
  if ((S.errs || []).length) console.log('   ', JSON.stringify(S.errs.slice(0, 4)).slice(0, 600));
  const save = G.save(); const re = G.load(save); console.log('   recarga:', re.ok, G.save() === save ? 'idéntica' : 'DIFERENTE');
}
