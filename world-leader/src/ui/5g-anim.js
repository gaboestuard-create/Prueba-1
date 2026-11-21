/* =====================================================================
   INTERFAZ · EL GLOBO REACCIONA: ondas, ataques y pulsos por cada suceso
   Ondas expansivas (Globe.ring), arcos de ataque y de tratado (Globe.trip),
   y tras cada turno un repaso animado de lo que hicieron las demás naciones.
   Respeta «Reducir movimiento».
   ===================================================================== */
const RC = { war: 0xff4a3a, coup: 0xff8a3a, peace: 0xf4f7ff, dip: 0xffd36a, eco: 0xffb04a, elec: 0x4fd8ff, tec: 0xb99cff, mil: 0xff6a5a, pol: 0x9ad8ff };
const ringAt = (iso, col, size, life) => { if (CFG.rm) return; const p = LL(iso); if (p) Globe.ring(p[0], p[1], col, size, life); };
const bigRing = (iso, col) => { ringAt(iso, col, .12, 1500); setTimeout(() => ringAt(iso, col, .2, 2200), 260); };
/* guerra: salvas de misiles del atacante al defensor y onda roja al impactar */
Bus.on('war', w => { if (CFG.rm || !w.a || !w.d) return; for (let i = 0; i < 3; i++) setTimeout(() => Globe.trip({ a: w.a, b: w.d, color: 0xff5a3a }), i * 280); setTimeout(() => { bigRing(w.d, RC.war); fxAt('exp', w.d); }, 1700); });
Bus.on('coup', c => bigRing(c.iso, RC.coup));
Bus.on('annex', a => { bigRing(a.v, RC.war); setTimeout(() => ringAt(a.t, RC.dip, .1, 1600), 500); });
Bus.on('treaty', t => { if (!t.a || !t.b || t.a === t.b) return ringAt(t.a, RC.dip, .08); ringAt(t.a, RC.dip, .08); ringAt(t.b, RC.dip, .08); if (!CFG.rm) Globe.trip({ a: t.a, b: t.b, color: 0xffd36a }); });
Bus.on('election', e => bigRing(me(), e.win ? RC.elec : RC.war));
Bus.on('tech', () => { bigRing(me(), RC.tec); fxAt('des', me()); });
Bus.on('campStage', () => bigRing(me(), RC.dip));
/* tras el turno: repaso de lo que pasó en el resto del mundo, en cuanto el globo queda a la vista */
const globeFree = () => $('#modal').hidden && $('#cine').hidden;
Bus.on('turn', t => { if (CFG.rm || !t || !t.news) return; const seen = new Set(), L = t.news.filter(n => n.i && n.i !== me() && n.p >= 2 && CC(n.i) && !seen.has(n.i) && seen.add(n.i)).slice(0, 8), turn = S().turn; let tries = 0;
  clearInterval(UI.recapT); UI.recapT = setInterval(() => { if (!S() || S().turn !== turn || ++tries > 120) return clearInterval(UI.recapT); if (!globeFree()) return; clearInterval(UI.recapT); recap(L); }, 400); });
function recap(L) {
  L.forEach((n, i) => setTimeout(() => { const k = /declara la guerra|ataca|bombarde|invade/i.test(n.x) ? 'war' : /golpe|revoluci|derroca/i.test(n.x) ? 'coup' : /paz|alto el fuego/i.test(n.x) ? 'peace' : n.k;
    ringAt(n.i, RC[k] || RC.pol, n.p >= 3 ? .11 : .07, n.p >= 3 ? 2000 : 1400); if (k === 'war' && n.p >= 3) fxAt('humo', n.i); }, 300 + i * 420)); }
