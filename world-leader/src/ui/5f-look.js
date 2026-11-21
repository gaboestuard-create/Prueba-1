/* =====================================================================
   INTERFAZ · VISTA DE REGIONES, CÁMARA, FONDOS Y PERSONALIDAD VISUAL
   - Modo de mapa «Regiones»: cada estado o provincia con su propio tono
     (estabilidad del país × peso económico de la región), fronteras internas
     marcadas y ocupaciones con el color del ocupante.
   - Nombres de estados y provincias al acercarte (Texas, California, Guangdong…).
   - Cámara orbital o táctica (se inclina al acercarte) y cuatro fondos.
   ===================================================================== */
Object.assign(MODES, { reg: 'Regiones' });
LEGEND.reg = 'Cada región por su cuenta: rojo inestable → verde sólido, más claro cuanto más rica · acércate para ver los nombres';
Object.assign(CFG, Object.assign({ cam: 'orbital', bg: 'espacio' }, CFG));
{ const c0 = colorOf; colorOf = (iso, mode, ctx) => mode === 'reg' ? ramp([[176, 64, 56], [196, 142, 74], [170, 168, 96], [72, 164, 112]], CC(iso).stab / 100) : c0(iso, mode, ctx); }
/* tono propio de cada provincia: más clara cuanto más pesa en la economía del país */
function regOver(colors, over) {
  const o = Object.assign({}, over);
  for (const iso in colors) { const g = D.C[iso] && D.C[iso].terr, c = S() && CC(iso); if (!g || g.length < 2 || !c || !c.alive) continue; const n = g.length, base = colors[iso], mine = o[iso] = Object.assign({}, o[iso]);
    g.forEach((t, i) => { if (mine[i + 1] || c.terr[i].o !== iso) return; const f = Math.max(.7, Math.min(1.28, .74 + .3 * Math.sqrt((t.e || 0) * n))); mine[i + 1] = base.map(v => Math.min(255, v * f)); }); }
  return o;
}
{ const r0 = refreshMap; refreshMap = () => { if (Globe.ready && !Globe.paint.p5) { const gp = Globe.paint; Globe.paint = (c, w, o) => gp(c, w, UI.mode === 'reg' && S() ? regOver(c, o) : o); Globe.paint.p5 = 1; }
  Globe.setReg(UI.mode === 'reg'); r0(); }; }

/* ---- cámara y fondo (Ajustes) ---- */
const BGS = [['espacio', 'Espacio'], ['mando', 'Sala de mando'], ['despacho', 'Despacho'], ['aurora', 'Aurora']];
function applyLook() { document.body.dataset.bg = CFG.bg; Globe.setBg(CFG.bg); Globe.setCam(CFG.cam); }
{ const a0 = applyCfg; applyCfg = () => { a0(); applyLook(); }; }
H.cfgCam = d => { CFG.cam = d.v; cfgSave(); applyLook(); UI.render(); };
H.cfgBg = d => { CFG.bg = d.v; cfgSave(); applyLook(); UI.render(); };
{ const s0 = PANELS.sys; PANELS.sys = t => t !== 'aju' ? s0(t) : s0(t) + `<h4>${gi('ojo')} Cámara</h4><div class="chips">${[['orbital', 'Orbital · siempre desde arriba'], ['tactica', 'Táctica · se inclina al acercarte']].map(x => `<button class="chip ${CFG.cam === x[0] ? 'gold' : ''}" data-a="cfgCam" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
  <h4>${gi('pin')} Fondo</h4><div class="chips">${BGS.map(x => `<button class="chip ${CFG.bg === x[0] ? 'gold' : ''}" data-a="cfgBg" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
  <p class="mut fine">Acerca la cámara (rueda o pellizco) para ver los nombres de estados y provincias. El modo de mapa «Regiones» colorea cada una por separado.</p>`; }

/* ---- nombres de regiones: se cargan una vez cuando el globo está listo ---- */
{ const t = setInterval(() => { if (!Globe.ready) return; clearInterval(t); const L = [];
  for (const iso in D.C) { const g = D.C[iso].terr; if (g.length > 1) g.forEach(x => { if (x.la != null && x.lo != null) L.push({ la: x.la, lo: x.lo, n: x.n }); }); }
  Globe.setProvLabels(L); applyLook(); refreshMap(); }, 250); }
