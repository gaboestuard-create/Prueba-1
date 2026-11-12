/* =====================================================================
   INTERFAZ · REGIONES (Fase 2): color por partido, ficha y edición
   ===================================================================== */
const PCOL = { R: '#d0433b', D: '#3b72d0', Morena: '#8f2f45', PAN: '#2463c4', PRI: '#2f9a4d', MC: '#f08a24', PVEM: '#6fbf48', PT: '#c43c2e', CDU: '#59657a', CSU: '#3aa0d8', SPD: '#e0412f', Verdes: '#46a35e', BJP: '#f39c34', INC: '#2fa3d6', PCCh: '#c62828', RU: '#2f6fd0', PCFR: '#c0392b', PP: '#2f80d0', PSOE: '#e03a3a', PNV: '#3f9b4f', Laborista: '#d43b3b', SNP: '#f2d43d', 'Plaid Cymru': '#3fa066', 'Sinn Féin': '#2e8b57', Lega: '#3f9b4f', PD: '#e0584a', FdI: '#2d4f8f', 'Forza Italia': '#4a90d9', M5S: '#e8c53a', LR: '#2f6fb5', PS: '#e0548a', Renacimiento: '#f0b63a', UCR: '#d85a5a', PJ: '#4aa3df', PRO: '#f2c230', PT_BR: '#c0392b', PL: '#2b4c9b', MDB: '#3d9b52', PSD: '#e08a2a', Liberal: '#d43b3b', 'Conservador Progresista': '#2b6cb0', NDP: '#f08a24', 'Adm. central': '#6b7890', 'Oposición': '#8a5fb8', 'Coalición': '#7a8aa3' };
const partyColor = p => { if (!p) return [107, 120, 144]; if (PCOL[p]) return hexRgb(PCOL[p]); const h = hash('p' + p); return hsl(h % 360, .42, .5); };
const rgbCss = c => `rgb(${c.map(Math.round).join(',')})`;
const popFmt = v => v >= 1 ? v.toFixed(v >= 10 ? 0 : 1) + ' M' : Math.round(v * 1000) + ' mil';
function regionsHTML(iso) {
  const c = CC(iso), n = c.terr.length; if (n < 2) return '';
  const own = Q.ownCount(iso), held = Object.keys(S().c).reduce((s, z) => s + (z !== iso ? CC(z).terr.filter(t => t.o === iso).length : 0), 0);
  const parties = {}; c.terr.forEach(t => { if (t.o === iso) parties[t.p] = (parties[t.p] || 0) + 1; });
  const legend = Object.keys(parties).sort((a, b) => parties[b] - parties[a]).slice(0, 8).map(p => `<span class="chip"><i class="dot" style="background:${rgbCss(partyColor(p))}"></i>${esc(p || 'Sin dato')} ${parties[p]}</span>`).join('');
  const sel = UI.terrSel != null && Q.regionInfo(iso, UI.terrSel), i0 = UI.terrSel;
  const card = sel ? `<div class="card regcard"><div class="row"><i class="dot big" style="background:${rgbCss(partyColor(sel.p))}"></i><div class="grow"><b>${esc(sel.n)}</b>${sel.cap ? ' <span class="chip gold">Capital</span>' : ''}<small class="mut">${esc(sel.gob || 'Autoridad sin dato')} · ${esc(sel.p || 'sin partido')} · <span class="chip ${sel.v ? 'good' : ''}">${sel.v ? '✓ verificado' : 'sin verificar'}</span></small></div></div>
      <div class="kvs">${kv('Población', popFmt(sel.pop))}${kv('Economía', money(sel.gdp))}${kv('Controla', sel.o === iso ? 'Su país' : cname(sel.o))}</div>
      <div class="chips">${sel.r.map(k => `<span class="chip gold">${D.COMMODITIES[k].n}</span>`).join('') || '<span class="mut">Sin recursos destacados</span>'}</div>
      <div class="row wrap">${iso !== me() && sel.o === iso && i0 > 0 ? `<button class="btn sm" data-a="regBuy" data-iso="${iso}" data-i="${i0}" data-confirm>Ofrecer compra · 3 CP</button>` : ''}${iso === me() && sel.o === iso && i0 > 0 ? `<small class="mut">Para cederla, abre “Diplomacia y guerra” del país vecino.</small>` : ''}<button class="btn sm ghost" data-a="regEdit" data-iso="${iso}" data-i="${i0}">Editar región</button></div></div>` : '';
  return `<details ${UI.terrOpen ? 'open' : ''} data-keep="terr"><summary>${D.LEVEL_A.includes(iso) ? 'Estados y provincias' : 'Regiones'} · conserva ${own} de ${n}${held ? ' · ocupa ' + held + ' ajenas' : ''}</summary>
    <div class="chips legendp">${legend}</div>${card}
    <div class="reglist">${c.terr.map((t, i) => `<button class="reg ${i === UI.terrSel ? 'on' : ''} ${t.o !== iso ? 'occ' : ''}" data-a="regSel" data-i="${i}"><i class="dot" style="background:${rgbCss(partyColor(t.o === iso ? t.p : ''))}"></i><span class="grow">${esc(t.n)}</span><small>${t.o !== iso ? '→ ' + cname(t.o) : esc(t.gob || t.p || '')}</small></button>`).join('')}</div></details>`;
}
H.regSel = d => { UI.terrSel = UI.terrSel === +d.i ? null : +d.i; UI.terrOpen = true; UI.render(); Globe.hoverProv(UI.terrSel == null ? null : UI.sel, UI.terrSel + 1); };
H.regBuy = d => { act('buyTerr', { iso: d.iso, i: +d.i }); refreshMap(); };
H.regEdit = d => { UI.form['ed:iso'] = d.iso; UI.form['ed:reg'] = d.i; UI.panel = 'edit'; UI.tab.edit = 'reg'; UI.render(); };
