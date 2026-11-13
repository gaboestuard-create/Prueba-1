/* =====================================================================
   EDITOR AMPLIADO (Fase 2): partidos, memoria y personalidad de la IA,
   economía, dificultad, y exportar/importar los datos corregidos.
   ===================================================================== */
{ const ed0 = ACT.edit;
  ACT.edit = a => {
    const c = S.c[a.iso], k = a.k || '', parts = k.split('.'), v = a.v, num = +v; if (!c) return fail('País inválido');
    if (parts[0] === 'party') { // party.<i>.<n|s|g|rel|v|ax>.<eje>
      const p = S.pol.seats[+parts[1]]; if (!p) return fail('Partido inválido'); const f = parts[2];
      if (f === 'n') { p.n = String(v).slice(0, 50); if (+parts[1] === 0) P().partido = p.n; } else if (f === 'g') p.g = v ? 1 : 0; else if (f === 'v') p.v = !!v;
      else if (f === 'rel') p.rel = clamp(num, 0, 100); else if (f === 'ax') p.ax[+parts[3]] = clamp(num, -2, 2);
      else if (f === 's') { p.s = clamp(num, 0, 100); const o = S.pol.seats.filter(x => x !== p), t = o.reduce((x, y) => x + y.s, 0) || 1; o.forEach(x => { x.s = x.s / t * (100 - p.s); }); } else return fail('Campo inválido');
    }
    else if (parts[0] === 'per') { if (!(parts[1] in c.per) || isNaN(num)) return fail('Rasgo inválido'); c.per[parts[1]] = clamp(num / 100, 0, 1); }
    else if (k === 'goal') { if (!GOALS[v]) return fail('Objetivo inválido'); c.goal = v; }
    else if (k === 'diff') S.diff = clamp(Math.round(num), 0, 3);
    else if (parts[0] === 'eco') { if (!(parts[1] in S.eco) || isNaN(num)) return fail('Campo inválido'); S.eco[parts[1]] = parts[1] === 'debt' ? Math.max(0, num / 100 * P().gdp) : num; }
    else if (k === 'memdel') { const L = S.mods[key(a.iso, a.o)]; if (L) L.splice(+v, 1); }
    else if (k === 'memadd') { if (!S.c[a.o] || a.o === a.iso || isNaN(num)) return fail('Datos inválidos'); (S.mods[key(a.iso, a.o)] = S.mods[key(a.iso, a.o)] || []).push({ k: String(a.label || 'Editor').slice(0, 50), v: clamp(num, -90, 90), d: .3, g: num < 0 ? 1 : 0 }); }
    else return ed0(a);
    dirty(); if (!S.over) S.fin = Object.assign(finance(true), { last: S.fin && S.fin.last });
    return { silent: 1 };
  };
}
const memOf = (a, b) => (S.mods[key(a, b)] || []).map((m, i) => ({ i, k: m.k, v: m.v, g: m.g }));
/* datos corregidos por el jugador (líderes, partidos, regiones): se exportan aparte para reutilizarlos en otra partida */
function exportData() {
  const out = { wl: 'datos', v: 1, c: {}, seats: { [S.player]: S.pol.seats } };
  for (const iso of ISOS) { const c = S.c[iso]; out.c[iso] = { n: c.n, lider: c.lider, partido: c.partido, reg: c.reg, ideo: c.ideo, terr: c.terr.map(t => ({ n: t.n, p: t.p, gob: t.gob, v: t.v })) }; }
  return JSON.stringify(out);
}
function importData(str) {
  let o; try { o = typeof str === 'string' ? JSON.parse(str) : str; } catch (e) { return fail('No es un JSON válido'); }
  if (!o || o.wl !== 'datos' || !o.c) return fail('No es un archivo de datos de World Leader'); let n = 0;
  for (const iso in o.c) { const c = S.c[iso], d = o.c[iso]; if (!c || !d) continue; n++;
    if (d.lider && d.lider.n && !isP(iso)) c.lider = { n: String(d.lider.n).slice(0, 60), verificado: !!d.lider.verificado, img: String(d.lider.img || '').slice(0, 500) };
    if (d.partido && !isP(iso)) c.partido = String(d.partido).slice(0, 60); if (D.REGIMES[d.reg] && !isP(iso)) c.reg = d.reg; if (d.ideo >= -2 && d.ideo <= 2 && !isP(iso)) c.ideo = Math.round(d.ideo);
    (d.terr || []).forEach((t, i) => { const x = c.terr[i]; if (x && t) { if (t.p != null) x.p = String(t.p).slice(0, 60); if (t.gob != null) x.gob = String(t.gob).slice(0, 60); x.v = !!t.v; } }); }
  dirty(); return { msg: `Datos aplicados a ${n} países` };
}
ACT.importData = a => importData(a.json); FREE.importData = 1;
Object.assign(WL, { exportData });
