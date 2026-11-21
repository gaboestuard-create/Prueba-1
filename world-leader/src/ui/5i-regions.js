/* =====================================================================
   INTERFAZ · REGIONES CON VIDA: malestar, independentismo y acciones
   En la ficha de tu país: las regiones más tensas arriba y, al elegir una,
   sus barras, los motivos y las acciones. En el modo de mapa «Regiones»,
   tus regiones se pintan por malestar (verde calma → rojo estallido) y las
   independentistas se tiñen de violeta. Los sucesos regionales hacen onda.
   ===================================================================== */
const RLFX = { rev: [0xff6a3a, 'rev'], ayuda: [0x7dffb0, 'ayuda'], humo: [0x9aa0aa, 'humo'], tormenta: [0xdfe8ff, 'tormenta'], des: [0xb48cff, 'des'], exp: [0xffa040, 'exp'] };
Bus.on('regfx', e => { const g = D.C[e.iso] && D.C[e.iso].terr[e.i]; if (!g || g.la == null) return; const k = RLFX[e.k] || RLFX.rev;
  if (!CFG.rm) Globe.ring(g.la, g.lo, k[0], .06, 1600); Globe.fx(k[1], g.la, g.lo); });
const mCol = m => ramp([[72, 164, 112], [196, 182, 84], [214, 120, 60], [200, 50, 46]], m / 100);
function rlCard(i) { const r = Q.rlInfo(i); if (!r) return ''; const A = D.RL.acts;
  return `<div class="rl5"><div class="arow"><div class="grow"><b>Malestar</b><small>${r.why.map(w => `${esc(w[1])} ${sgn(w[0])}`).join(' · ') || 'Sin motivos de queja'}</small></div>${bar(r.m, 100, r.m >= D.RL.protestAt ? 'red' : r.m < D.RL.hot * .75 ? 'green' : '')}<b class="num">${Math.round(r.m)}</b></div>
    ${r.sep != null ? `<div class="arow"><div class="grow"><b>Independentismo</b><small>${esc(r.mov)}${r.aut ? ' · con autonomía' : ''}</small></div>${bar(r.sep, 100, r.sep >= D.RL.crisisAt ? 'red' : '')}<b class="num">${Math.round(r.sep)}</b></div>` : ''}
    <div class="chips">${r.inv ? `<span class="chip good">Inversión: ${r.inv} t</span>` : ''}${r.dura ? `<span class="chip bad">Mano dura: ${r.dura} t</span>` : ''}${r.m >= D.RL.protestAt ? '<span class="chip bad">Protestas probables</span>' : ''}</div>
    <div class="row wrap">${Object.entries(A).filter(([k, a]) => !a.sep_only || (r.sep != null && !r.aut)).map(([k, a]) => `<button class="btn sm" data-a="rlAct" data-i="${i}" data-k="${k}" title="${esc(a.x)}" ${r.cd ? 'disabled' : ''}>${esc(a.n)} · ${a.cp} CP${a.gdp ? ' + ' + money(CC(me()).gdp * a.gdp) : ''}</button>`).join('')}</div>${r.cd ? `<small class="mut">Podrás volver a actuar aquí en ${r.cd} turno${r.cd > 1 ? 's' : ''}.</small>` : ''}</div>`; }
{ const r0 = regionsHTML; regionsHTML = iso => { let h = r0(iso); if (iso !== me() || !h) return h;
  if (UI.terrSel != null && Q.rlInfo(UI.terrSel)) h = h.replace('<div class="row wrap">', rlCard(UI.terrSel) + '<div class="row wrap">');
  const hot = Q.rlList().filter(x => x[1] >= D.RL.hot).slice(0, 4);
  return h.replace('<div class="chips legendp">', `${hot.length ? `<div class="chips rlhot"><small class="mut">Regiones en tensión:</small>${hot.map(([i, m]) => `<button class="chip ${m >= D.RL.protestAt ? 'bad' : ''}" data-a="regSel" data-i="${i}">${esc(CC(me()).terr[i].n)} ${Math.round(m)}</button>`).join('')}</div>` : ''}<div class="chips legendp">`); }; }
H.rlAct = d => { act('rlAct', { i: +d.i, k: d.k }); UI.render(); refreshMap(); };
/* mapa «Regiones»: tu país por malestar */
{ const o0 = regOver; regOver = (colors, over) => { const o = o0(colors, over), m = me(); if (!S() || !CC(m).alive) return o;
  const mine = o[m] = Object.assign({}, o[m]); for (const [i] of Q.rlList()) { const r = Q.rlInfo(i); let col = mCol(r.m); if (r.sep != null && r.sep >= D.RL.crisisAt * .8) col = col.map((v, j) => v * .55 + [150, 100, 220][j] * .45); mine[i + 1] = col; }
  return o; }; }
LEGEND.reg += ' · tu país: por malestar (violeta = independentismo fuerte)';
