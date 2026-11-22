/* =====================================================================
   INTERFAZ · EL GLOBO VIVO: fichas de tropas, luces de ciudad e historia
   - Fichas de cada grupo militar en tus guerras: dorado tú, celeste tus
     aliados, rojo el enemigo (si tu espionaje lo ve). Cuadrado ejército,
     triángulo aviación, rombo flota; más grande cuanto más fuerte.
   - Luces nocturnas en las regiones, más intensas cuanto más ricas.
   - Partida → Historia: gráficas de tu mandato frente a las grandes potencias.
   ===================================================================== */
const UTYPE = { ej: 0, es: 1, fl: 2 };
function unitsData() { const s = S(), p = me(), out = [];
  for (const g of s.army || []) { const w = Q.warById(g.w); if (!w || !Q.warsOf(p).includes(w)) continue; const side = Q.thSide(w, p), mine = Q.thSide(w, g.o) === side;
    if (!mine && !Q.knows(g.o)) continue; const geo = Q.rGeo(g.at); if (!geo || geo.la == null) continue; const n = Object.values(g.u).reduce((a, v) => a + v, 0);
    out.push({ la: geo.la, lo: geo.lo, t: UTYPE[g.t] || 0, c: g.o === p ? 0xffc94a : mine ? 0x8fd3ff : 0xff4a3a, s: Math.min(16, 6 + Math.log10(n + 1) * 3) }); }
  return out; }
function citiesData() { const s = S(), out = [];
  for (const iso in s.c) { const c = s.c[iso], g = D.C[iso].terr; if (!c.alive) continue; const own = c.terr.reduce((a, t, i) => a + (t.o === iso ? g[i].e || 0 : 0), 0) || 1;
    c.terr.forEach((t, i) => { if (t.o !== iso || g[i].la == null) return; const gdp = c.gdp * (g[i].e || 0) / own; if (gdp > 4) out.push({ la: g[i].la, lo: g[i].lo, s: Math.min(9, 1.2 + Math.log10(gdp) * 1.8) }); }); }
  return out.sort((a, b) => b.s - a.s).slice(0, 700); }
{ const r0 = refreshMap; refreshMap = () => { r0(); if (!Globe.ready || !S() || UI.screen !== 'game') return;
  const u = unitsData(), uk = JSON.stringify(u); if (uk !== UI.unKey) { UI.unKey = uk; Globe.setUnits(u); }
  const ck = S().turn + ':' + S().player; if (ck !== UI.ctKey) { UI.ctKey = ck; Globe.setCities(citiesData()); } }; }
{ const q0 = H.quit; H.quit = d => { Globe.setUnits(null); Globe.setCities(null); UI.unKey = UI.ctKey = ''; return q0(d); }; }

/* ---- historia del mandato: gráficas en SVG ---- */
PTABS.sys.push(['his', 'Historia']);
{ const s0 = PANELS.sys; PANELS.sys = t => t === 'his' ? historyHTML() : s0(t); }
function lineChart(series, title, fmt) { const W = 640, Hh = 170, pad = 30, all = series.flatMap(x => x.v), mx = Math.max(...all), mn = Math.min(...all, 0), n = Math.max(2, ...series.map(x => x.v.length));
  const X = i => pad + i * (W - pad * 2) / (n - 1), Y = v => Hh - 20 - (v - mn) / ((mx - mn) || 1) * (Hh - 40);
  return `<div class="chart5"><b>${esc(title)}</b><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(title)}"><line x1="${pad}" y1="${Hh - 20}" x2="${W - pad}" y2="${Hh - 20}" class="ax"/>
    ${series.map(x => `<polyline fill="none" stroke="${x.c}" stroke-width="${x.me ? 3 : 1.6}" points="${x.v.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`).join('')}
    <text x="${pad}" y="12">${esc(fmt(mx))}</text><text x="${pad}" y="${Hh - 4}">${esc(fmt(mn))}</text></svg>
    <div class="chips">${series.map(x => `<span class="chip"><i class="dot" style="background:${x.c}"></i>${esc(x.n)}</span>`).join('')}</div></div>`; }
function historyHTML() { const H5 = Q.hist5(); if (H5.length < 2) return '<p class="mut pad">Juega unos turnos: aquí verás cómo evoluciona tu mandato frente a las grandes potencias.</p>';
  const p = me(), rv = Object.keys(H5[H5.length - 1].top || {}).filter(z => z !== p), cols = ['#8fd3ff', '#ff8a7a', '#b99cff', '#7fe0a8'];
  const gdp = [{ n: CC(p).n, c: '#e8c36a', me: 1, v: H5.map(x => x.gdp) }].concat(rv.slice(0, 4).map((z, i) => ({ n: CC(z).n, c: cols[i], v: H5.map(x => (x.top || {})[z] || 0) })));
  return `<p class="mut fine">Un punto cada dos trimestres. Línea gruesa: tu país.</p>${lineChart(gdp, 'PIB frente a las grandes potencias', v => money(v))}
    ${lineChart([{ n: 'Aprobación', c: '#7fe0a8', me: 1, v: H5.map(x => x.ap) }, { n: 'Estabilidad', c: '#8fd3ff', v: H5.map(x => x.st) }], 'Aprobación y estabilidad', v => Math.round(v) + '')}
    ${lineChart([{ n: 'Puntuación', c: '#e8c36a', me: 1, v: H5.map(x => x.sc) }, { n: 'Legado', c: '#b99cff', v: H5.map(x => x.lg) }], 'Puntuación y juicio de la historia', v => Math.round(v) + '')}`; }
