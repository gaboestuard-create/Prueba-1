// Simulador sin gráficos: juega partidos IA vs IA y saca estadísticas. Uso: node tools/sim.js [partidos] [dificultad]
// Sirve de prueba de humo: falla (exit 1) si aparece un NaN, el partido se cuelga o no pasa nada.
global.window = global;
const path = require('path');
try { require('../data/db.js'); } catch (e) { /* sin base: equipos de respaldo */ }
['core', 'ball', 'player', 'gk', 'ai', 'data', 'match'].forEach((f) => require(path.join('..', 'js', f + '.js')));
const G = global.G, M = G.M, n = +process.argv[2] || 3, diff = process.argv[3] || 'normal';
const ev = {}; ['goal', 'foul', 'save', 'post', 'tackle', 'skill'].forEach((e) => G.on(e, () => (ev[e] = (ev[e] || 0) + 1)));
const rs = {}; G.on('restart', (r) => (rs[r.type] = (rs[r.type] || 0) + 1));
let bad = false;
G.Data.load(() => {
  const T = G.Data.teams;
  for (let i = 0; i < n; i++) {
    const home = T[(i * 2) % T.length], away = T[(i * 2 + 1) % T.length];
    G.Match.start({ home, away, human: -1, diff, halfLen: 180 });
    let steps = 0, stuck = 0, maxStuck = 0;
    while (M.state !== 'fulltime' && steps < 60 * 60 * 12) {
      if (M.state === 'halftime') G.Match.secondHalf();
      G.Match.step(1 / 60); steps++;
      const b = G.ball;
      if (![b.x, b.y, b.z, b.vx, b.vy, b.vz].every(Number.isFinite) || M.players.some((p) => !Number.isFinite(p.x + p.z + p.vx + p.vz + p.face))) { console.log('NaN en paso', steps, M.state); bad = true; break; }
      stuck = M.state === 'play' && Math.hypot(b.vx, b.vz) < 0.05 && !b.held ? stuck + 1 : 0; maxStuck = Math.max(maxStuck, stuck);
    }
    if (M.state !== 'fulltime') { console.log('NO TERMINÓ, estado', M.state); bad = true; }
    if (maxStuck > 600) { console.log('balón quieto', (maxStuck / 60).toFixed(1), 's'); bad = true; }
    const [a, c] = M.teams, tp = a.stats.poss + c.stats.poss;
    console.log(`${a.short} ${a.score}-${c.score} ${c.short} | tiros ${a.stats.shots}(${a.stats.onTarget})-${c.stats.shots}(${c.stats.onTarget}) pos ${Math.round(a.stats.poss / tp * 100)}% pases ${a.stats.passes}-${c.stats.passes} faltas ${a.stats.fouls}-${c.stats.fouls} TA ${a.stats.yellow}-${c.stats.yellow} TR ${a.stats.red}-${c.stats.red} córners ${a.stats.corners}-${c.stats.corners} offs ${a.stats.offsides}-${c.stats.offsides} | quieto máx ${(maxStuck / 60).toFixed(1)}s`);
  }
  console.log('eventos', JSON.stringify(ev), 'reinicios', JSON.stringify(rs));
  if (!ev.tackle || !rs.throwin) { console.log('sospechoso: sin entradas o sin saques de banda'); bad = true; }
  process.exit(bad ? 1 : 0);
});
