/* =====================================================================
   SISTEMA · HISTORIAL DEL MANDATO (para las gráficas de Partida → Historia)
   Cada 2 turnos: tu PIB, aprobación, estabilidad, puntuación, legado y el PIB
   de las 4 mayores economías. Máximo 80 puntos (160 turnos).
   ===================================================================== */
hook('new', () => { S.h5 = []; }); hook('load', () => { S.h5 = S.h5 || []; });
function histSnap() { const c = P(), top = {}; for (const z of alive().filter(x => !isP(x)).sort((a, b) => S.c[b].gdp - S.c[a].gdp).slice(0, 4)) top[z] = Math.round(S.c[z].gdp);
  S.h5.push({ t: S.turn, gdp: Math.round(c.gdp), ap: Math.round(approval()), st: Math.round(c.stab), sc: score().total, lg: legacy().score, top }); if (S.h5.length > 80) S.h5.shift(); }
hook('late', () => { if (S.turn % 2 === 0 && !S.over) histSnap(); });
const hist5 = () => S.h5;
