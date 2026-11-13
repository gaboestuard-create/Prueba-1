#!/usr/bin/env node
/* Revisión de balance: cuatro bots de estrategia única juegan 40 turnos en varios países y semillas.
   Ninguna estrategia debería dominar. Uso: node build.js && node balance.js */
const fs = require('fs'), path = require('path'); (0, eval)(fs.readFileSync(path.join(__dirname, 'dist', 'core.js'), 'utf8'));
const G = WL.Game, D = WL.DATA, q = G.q; WL.Bus.h = {};
const BOT = {
  pasivo: () => { },
  guerra: (S, me) => { if (S.c[me].tr > S.c[me].gdp * .01) for (const k of ['inf', 'tan', 'art', 'caz']) G.act('recruit', { k, n: 3 }); const t = q.nb(me).filter(z => !q.atWar(me, z) && !q.alliesOf(me).includes(z)).sort((a, b) => q.power(a) - q.power(b))[0]; if (t && !q.inWar(me) && q.power(me) > (q.power(t) * 1.25 + q.alliesOf(t).reduce((a, z) => a + q.power(z) * .6, 0)) * 1.4) G.act('declareWar', { iso: t }); },
  comercio: (S, me) => { const c = Object.keys(S.c).filter(z => z !== me && S.c[z].alive && !q.hasT('com', me, z)).sort((a, b) => q.rel(me, b) - q.rel(me, a)); G.act('propose', { iso: c[0], t: 'com' }); G.act('visit', { iso: c[1] }); G.act('policy', { k: 'tar', v: 0 }); G.act('proposeLaw', { id: 'libre_comercio' }); },
  dinero: (S, me) => { const c = S.c[me]; if (c.tr > c.gdp * .01) G.act('buyStock', { id: D.COMPANIES[(S.turn * 7) % D.COMPANIES.length].id, amt: c.tr * .6 }); G.act('proposeLaw', { id: 'imp_recorte' }); G.act('proposeLaw', { id: 'desregular' }); },
  equilibrado: (S, me) => { const t = S.turn; if (t % 3 === 0) G.act('proposeLaw', { id: ['edu_publica', 'pymes', 'becas_tec', 'banda_ancha', 'salud_universal', 'vacunas'][(t / 3) % 6] }); if (!S.tech.cur) G.act('research', { id: D.TECHS.find(x => q.techOpen(x)).id }); G.act('buildInd', { k: 'man' }); const c = Object.keys(S.c).filter(z => z !== me && S.c[z].alive && !q.hasT('com', me, z)).sort((a, b) => q.rel(me, b) - q.rel(me, a)); if (t % 2) G.act('propose', { iso: c[0], t: 'com' }); }
};
const res = {};
for (const bot in BOT) { res[bot] = { vivos: 0, turnos: 0, pib: 0, apr: 0, n: 0 };
  for (const iso of (process.argv[2] || 'MX,DE,AR,TR,NG').split(',')) for (const seed of [3, 17, 41]) {
    G.newGame({ iso, name: 'Bot', traits: [], seed }); const g0 = G.S.c[iso].gdp;
    for (let t = 0; t < 40 && !G.S.over; t++) { let k = 0; while (G.S.pend.length && k++ < 40) G.act('decide', { i: 0 }); if (G.S.over) break; BOT[bot](G.S, iso); k = 0; while (G.S.pend.length && k++ < 40) G.act('decide', { i: 0 }); G.act('endTurn'); }
    const r = res[bot], S = G.S; r.n++; r.turnos += S.turn; if (!S.over) r.vivos++; r.pib += (S.c[iso].gdp / g0 - 1) * 100 + (q.portValue() / g0) * 100; r.apr += q.approval(); } }
for (const b in res) { const r = res[b]; console.log(b.padEnd(12), `sobrevive ${r.vivos}/${r.n} · turnos ${(r.turnos / r.n).toFixed(0)} · riqueza ${(r.pib / r.n).toFixed(0)}% · aprobación ${(r.apr / r.n).toFixed(0)}`); }
