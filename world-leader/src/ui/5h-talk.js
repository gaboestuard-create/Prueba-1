/* =====================================================================
   INTERFAZ · CONVERSACIONES: lo que los líderes se dicen entre ellos
   Mundo → Conversaciones muestra los diálogos como un chat (con retrato y
   bandera). Tras cada turno, el diálogo más reciente asoma sobre el globo
   y un arco cian une a quienes hablan. Puedes intervenir en los debates.
   ===================================================================== */
PTABS.world.splice(1, 0, ['con', 'Conversaciones']);
{ const w0 = PANELS.world; PANELS.world = t => t === 'con' ? talkHTML() : w0(t); }
const TK_N = { war: 'Guerra', sanc: 'Sanciones', treaty: 'Tratado', coup: 'Golpe de Estado', annex: 'Anexión', peace: 'Paz', crisis: 'Crisis', gossipGood: 'Hablan de ti', gossipBad: 'Hablan de ti', chat: 'En los pasillos de la cumbre', un: 'Asamblea de la ONU' };
const face = z => { if (!z || !CC(z)) return `<span class="tk-face sys">${gi('cultural')}</span>`; const L = z === me() ? S().leader : CC(z).lider; return `<span class="tk-face">${portraitSVG(L.n, hash(L.n) % 97)}${L.img ? `<img src="${esc(L.img)}" alt="" onerror="this.remove()">` : ''}</span>`; };
function talkCard(c) {
  const s = S(), open = c.rep && !c.done && c.t >= s.turn - 2, side = z => 'tk-' + (z === me() ? 'me' : z === c.a ? 'l' : z === c.b ? 'r' : 'x');
  return `<div class="card talk5"><p class="eyebrow">${esc(c.title || TK_N[c.k] || 'Conversación')} · ${esc(turnDate(c.t))}</p>
    ${c.lines.map(([z, t]) => `<div class="tk-line ${side(z)}">${z ? face(z) : ''}<div class="tk-b">${z && CC(z) ? `<small>${fl(z)} ${esc(z === me() ? S().leader.n : CC(z).lider.n)}</small>` : ''}<p>${esc(t)}</p></div></div>`).join('')}
    ${open ? `<div class="row wrap tk-rep"><small class="mut">Intervenir:</small>${D.TALK_REPLY[c.rep].map((o, i) => `<button class="btn sm" data-a="talkReply" data-id="${c.id}" data-i="${i}">${esc(o[0].split('{A}').join(CC(c.a).n).split('{B}').join(CC(c.b).n))}</button>`).join('')}</div>` : ''}</div>`;
}
const talkHTML = () => { const L = (S().talk || []).slice().reverse(); return L.length ? `<p class="mut fine">Lo que los líderes se dicen en cumbres, pasillos y asambleas. En los debates abiertos puedes intervenir: tomar partido tiene consecuencias.</p>${L.map(talkCard).join('')}` : '<p class="mut pad">Aún no ha hablado nadie. Termina el turno y escucha.</p>'; };
H.talkReply = d => { act('talkReply', { id: +d.id, i: +d.i }); UI.render(); };
H.talkOpen = () => { $('#tkpop')?.remove(); UI.panel = 'world'; UI.tab.world = 'con'; UI.render(); };
/* tras el turno: el diálogo más jugoso asoma sobre el globo */
Bus.on('turn', () => { const s = S(); if (!s || !s.talk) return; const fresh = s.talk.filter(c => c.t === s.turn); if (!fresh.length) return;
  const c = fresh.find(x => x.rep) || fresh[0]; let tries = 0; clearInterval(UI.tkT);
  UI.tkT = setInterval(() => { if (++tries > 120 || !S() || S().turn !== s.turn) return clearInterval(UI.tkT); if (!$('#modal').hidden || !$('#cine').hidden) return; clearInterval(UI.tkT);
    if (!CFG.rm) fresh.slice(0, 3).forEach((x, i) => x.a !== x.b && setTimeout(() => Globe.trip({ a: x.a, b: x.b, color: 0x4fd8ff }), i * 600));
    $('#tkpop')?.remove(); const d = document.createElement('button'); d.id = 'tkpop'; d.className = 'tkpop glass'; d.dataset.a = 'talkOpen';
    d.innerHTML = `<small class="eyebrow">${esc(TK_N[c.k] || 'Conversación')} · ${fresh.length > 1 ? fresh.length + ' conversaciones' : 'escucha'}</small>${c.lines.slice(0, 2).map(([z, t]) => `<p>${z && CC(z) ? fl(z) + ' <b>' + esc(CC(z).lider.n) + ':</b> ' : ''}${esc(t)}</p>`).join('')}<small class="gold">Ver conversación ›</small>`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 9000); }, 400); });
