/* =====================================================================
   INTERFAZ · VISTA DE REGIONES OCUPADAS Y ANEXIONADAS
   Al tocar una región que no está en manos de su país original, una
   tarjeta muestra el país original y el ocupante por separado, los datos
   de esa región (integración, resistencia, política) y las acciones que
   te corresponden: ocupante, dueño original o tercero. La lista de
   provincias separa lo propio, lo perdido y lo conquistado.
   ===================================================================== */
{ const s0 = selectCountry; selectCountry = (iso, fly, prov) => { UI.occ = null;
  if (iso && S() && S().c[iso]) { const c = CC(iso), t = prov ? c.terr[prov - 1] : null; if (t && t.o !== iso && CC(t.o)) UI.occ = { iso, i: prov - 1 }; else if (!c.alive) UI.occ = { iso, i: Math.max(0, c.terr.findIndex(x => x.o === Q.ownerOf(iso))) }; }
  s0(iso, fly, prov); if (UI.occ) Globe.hoverProv(UI.occ.iso, UI.occ.i + 1); }; }
{ const u0 = H.unsel; H.unsel = d => { UI.occ = null; return u0(d); }; }
{ const r0 = H.regSel; H.regSel = d => { r0(d); const t = UI.sel && UI.terrSel != null && CC(UI.sel).terr[UI.terrSel]; UI.occ = t && t.o !== UI.sel ? { iso: UI.sel, i: UI.terrSel } : null; UI.render(); }; }
H.occSel = d => { UI.occ = { iso: d.iso, i: +d.i }; UI.render(); Globe.focus(d.iso, 2.2); Globe.hoverProv(d.iso, +d.i + 1); };
H.occBack = d => { act('returnTerr', { iso: d.iso, i: +d.i, deal: fv('oc:deal', 'gesto') }); UI.occ = null; refreshMap(); };
H.occPolSet = d => act('occPolicy', { iso: d.iso, k: d.k });
function occCard(o) {
  const s = S(), V = CC(o.iso), t = V && V.terr[o.i]; if (!t) return ''; const h = t.o, p = me(), dead = !V.alive, d = D.C[o.iso], g = d.terr[o.i] || {}, k = o.iso + ':' + o.i;
  const isMine = h === p, wasMine = o.iso === p, res = dead ? Math.round((s.res || {})[o.iso] || 0) : null, int = Math.round(t.int || 0), pol = Q.occPol(o.iso), ter = Q.terOf(k), r = Q.rel(o.iso, h);
  const popR = (d.pop || 0) * (g.w || .02), gdpR = t.g || (d.gdp || 0) * (g.e || .02);
  const acts = [];
  if (isMine && !dead) acts.push(`<div class="row wrap"><small class="mut">Política de ocupación:</small>${[['normal', 'Sin política'], ['dura', 'Mano dura'], ['blanda', 'Reconstrucción']].map(x => `<button class="chip ${pol === x[0] ? 'gold' : ''}" data-a="occPolSet" data-iso="${o.iso}" data-k="${x[0]}">${x[1]}</button>`).join('')}</div>`,
    `<div class="row wrap">${sel('oc:deal', [['gesto', 'Como gesto'], ['pna', 'Por no agresión'], ['pago', 'Por compensación']], 'gesto')}<button class="btn sm gold" data-a="occBack" data-iso="${o.iso}" data-i="${o.i}" ${Q.atWar(p, o.iso) ? 'disabled title="Primero firma la paz"' : ''}>Devolver esta región</button></div>`);
  if (isMine && dead) acts.push(`<div class="row wrap"><button class="btn sm" data-a="restore" data-iso="${o.iso}" data-confirm>Restaurar ${cname(o.iso)}</button><button class="btn sm gold" data-a="restore" data-iso="${o.iso}" data-ally="1" data-confirm>Restaurar como aliado</button><button class="btn sm red" data-a="repress" data-iso="${o.iso}" data-confirm>Reprimir la resistencia · 1 CP</button></div>`);
  if (!isMine && !dead) acts.push(`<div class="row wrap"><button class="btn sm" data-a="armCell" data-iso="${o.iso}" data-i="${o.i}">${wasMine ? 'Armar a la resistencia local' : 'Armar a la guerrilla'} · 1 CP</button>${Q.atWar(p, h) ? '<button class="btn sm gold" data-a="warRoom">Sala de guerra</button>' : ''}</div>`);
  if (!isMine && dead) acts.push(`<div class="row wrap"><button class="btn sm gold" data-a="fundResist" data-iso="${o.iso}">Financiar su resistencia · 1 CP</button></div>`);
  const dip = [h !== p ? `<button class="chip" data-a="dipOpen" data-iso="${h}">Diplomacia con ${cname(h)}</button>` : '', !dead && o.iso !== p && o.iso !== h ? `<button class="chip" data-a="dipOpen" data-iso="${o.iso}">Diplomacia con ${cname(o.iso)}</button>` : '', !dead && o.iso !== UI.sel ? `<button class="chip" data-a="sel" data-iso="${o.iso}">Ver ${cname(o.iso)}</button>` : ''].join('');
  return `<div class="occ-card ${isMine ? 'mine' : wasMine ? 'lost' : ''}"><p class="eyebrow">${dead ? 'Nación anexionada' : wasMine ? 'Tu región, ocupada' : isMine ? 'Región que ocupas' : 'Región ocupada'}</p><h3>${gi('pin')} ${esc(t.n)} ${o.i === 0 ? '<span class="chip gold">Capital</span>' : ''}</h3>
    <div class="occ-sides"><div class="occ-s orig">${fl(o.iso)}<b>${esc(V.n)}</b><small>${dead ? 'País original · ya no existe' : 'País original'}</small><small>${dead ? (V.exile ? `Gobierno en el exilio en ${cname(V.exile)}` : 'Sin gobierno en el exilio') : `Gobierna ${esc(V.lider.n)}`}</small></div>
      <div class="occ-arrow">${gi('ofensiva')}</div><div class="occ-s hold">${fl(h)}<b>${cname(h)}${isMine ? ' (tú)' : ''}</b><small>Ocupante</small><small>Relación entre ambos: <span class="${r >= 0 ? 'up' : 'down'}">${sgn(Math.round(r))}</span></small></div></div>
    <div class="kvs">${kv('Población', popFmt(popR))}${kv('Economía', money(gdpR))}${kv('Terreno', D.TER[ter].n)}${dead ? kv('Resistencia', res + '/100') : kv('Integración', t.int >= 100 ? 'Integrada' : int + '%')}</div>
    ${dead ? `${bar(res, 100, res >= 70 ? 'red' : 'gold')}<small class="mut">Al llegar a 100 estalla un levantamiento que puede devolverle la independencia.</small>` : `${bar(int, 100, 'gold')}<small class="mut">${t.int >= 100 ? 'Ya no se resiste: forma parte del ocupante.' : 'Mientras no se integre, puede rebelarse y su gente guarda rencor al ocupante.'}</small>`}
    ${acts.join('')}<div class="chips">${dip}</div></div>`;
}
{ const c0 = countryHTML; countryHTML = iso => { let h = c0(iso); const o = UI.occ; if (!o || !S().c[o.iso]) return h; const card = occCard(o); if (!card) return h;
  const i = h.indexOf('</button>') + 9; return h.slice(0, i) + card + `<p class="eyebrow occ-lab">${o.iso === iso ? 'País original' : 'País que controla la región'}</p>` + h.slice(i); }; }
/* lista de provincias: propias, perdidas (en rojo) y conquistadas fuera de sus fronteras (en dorado) */
{ const r0 = regionsHTML; regionsHTML = iso => { const base = r0(iso), held = {};
  for (const z of Object.keys(S().c)) if (z !== iso) CC(z).terr.forEach((t, i) => { if (t.o === iso) (held[z] = held[z] || []).push([i, t]); });
  const zs = Object.keys(held); if (!zs.length) return base; const n = zs.reduce((a, z) => a + held[z].length, 0);
  return base + `<details class="held" ${UI.heldOpen !== false ? 'open' : ''}><summary>${gi('pin')} Territorios fuera de sus fronteras · ${n}</summary>
    ${zs.map(z => `<div class="held-g"><b>${fl(z)} ${cname(z)} <small class="mut">${CC(z).alive ? `ocupa ${held[z].length} de sus ${CC(z).terr.length} regiones` : 'nación anexionada'}</small></b>
      <div class="reglist">${held[z].map(([i, t]) => `<button class="reg occ-held ${UI.occ && UI.occ.iso === z && UI.occ.i === i ? 'on' : ''}" data-a="occSel" data-iso="${z}" data-i="${i}"><i class="dot"></i><span class="grow">${esc(t.n)}</span><small>${t.int >= 100 ? 'integrada' : (CC(z).alive ? 'ocupada' : 'anexionada') + (t.int ? ' · ' + Math.round(t.int) + '%' : '')}</small></button>`).join('')}</div></div>`).join('')}</details>`; }; }
