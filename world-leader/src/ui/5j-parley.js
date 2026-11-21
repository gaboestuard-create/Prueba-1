/* =====================================================================
   INTERFAZ · NEGOCIACIÓN EN PERSONA (ficha de cualquier país)
   ===================================================================== */
TK_N.parley = 'Reunión en persona';
const PYK = { halcon: 'Halcón', paloma: 'Paloma', rencor: 'Rencoroso', pragma: 'Pragmático' };
{ const x0 = sheetExtra; sheetExtra = iso => { const s = S(), c = CC(iso); if (iso === me() || !c.alive || Q.atWar(me(), iso)) return x0(iso);
  const G = Object.entries(D.PARLEY.goals).filter(([g]) => Q.pyGoalOk(g, iso)), wait = (c.ask.parley || 0) - s.turn;
  return x0(iso) + `<h4>Negociar en persona</h4><p class="mut fine">${esc(c.lider.n)} tiene carácter de <b>${PYK[Q.archetype(iso)]}</b>. Tres rondas: elige bien cómo le hablas. Cuesta ${D.PARLEY.cost} de capital político.</p>
    ${wait > 0 ? `<small class="mut">No quiere verte hasta dentro de ${wait} turnos.</small>` : `<div class="row wrap">${G.map(([g, x]) => `<button class="btn sm" data-a="pyStart" data-iso="${iso}" data-g="${g}">${esc(x[0])}</button>`).join('')}</div>`}`; }; }
function pyModal(res) { const p = Q.parley(); if (!p && !res) return closeModal();
  const lines = p ? p.lines : res.lines, z = p ? p.iso : res.iso, side = w => w === me() ? 'tk-me' : 'tk-l';
  openModal(`<p class="eyebrow">Reunión en persona · ${esc(CC(z).n)}${p ? ` · ronda ${p.r + 1} de ${D.PARLEY.rounds}` : ''}</p><h2>${p ? esc(D.PARLEY.goals[p.g][0]) : esc(res.msg)}</h2>
    <div class="card talk5">${lines.map(([w, t]) => `<div class="tk-line ${side(w)}">${face(w)}<div class="tk-b"><small>${fl(w)} ${esc(w === me() ? S().leader.n : CC(w).lider.n)}</small><p>${esc(t)}</p></div></div>`).join('')}</div>
    ${p ? `<div class="pyways">${Object.entries(D.PARLEY.ways).map(([k, w]) => `<button class="btn" data-a="pySay" data-w="${k}">${esc(w.n)}${w.gift ? ' · ' + money(CC(me()).gdp * D.PARLEY.giftGdp) : ''}</button>`).join('')}</div>
      <div class="row end"><button class="btn ghost" data-a="pyQuit">Levantarse de la mesa</button></div>` : `<div class="row end"><button class="btn gold" data-a="closeModal">Cerrar</button></div>`}`, false, 'event');
}
H.pyStart = d => { const r = act('parleyStart', { iso: d.iso, g: d.g }); if (r.ok) pyModal(); };
H.pySay = d => { const p = Q.parley(), lines = p.lines, iso = p.iso, r = act('parleySay', { w: d.w }); if (!Q.parley()) { UI.render(); refreshMap(); pyModal({ lines: S().talk[S().talk.length - 1].lines, iso, msg: r.msg }); } else pyModal(); };
H.pyQuit = () => { const iso = Q.parley().iso, r = act('parleyQuit'); UI.render(); pyModal({ lines: S().talk[S().talk.length - 1].lines, iso, msg: r.msg }); };
