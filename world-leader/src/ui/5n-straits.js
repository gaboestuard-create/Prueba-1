/* =====================================================================
   INTERFAZ · RUTAS MARÍTIMAS (Economía → Rutas) y estrechos en el globo
   ===================================================================== */
PTABS.eco.push(['rut', 'Rutas']);
{ const e0 = PANELS.eco; PANELS.eco = t => t === 'rut' ? straitsHTML() : e0(t); }
function straitsHTML() { const L = Q.strInfo(), hit = L.filter(x => !x.open && !x.esc && x.by !== me()).reduce((a, x) => a + x.dep, 0);
  return `<p class="mut fine">Los estrechos por los que pasa el comercio mundial. Si uno se cierra, suben los precios de lo que transporta y caen el comercio y la economía de quien depende de él.</p>
    ${hit ? `<div class="card"><b class="red">Tu comercio exterior cae un ${Math.round(Math.min(.7, hit * D.STR.tradeHit) * 100)}% por estrechos cerrados.</b></div>` : ''}
    ${L.map(x => { const s = x.s, B = (k, t, cls) => `<button class="btn sm ${cls || ''}" data-a="strAct" data-id="${s.id}" data-k="${k}">${t}</button>`;
      return `<div class="card str5 ${x.open ? '' : 'closed'}"><div class="row"><div class="grow"><b>${esc(s.n)}</b> <span class="chip ${x.open ? 'good' : 'bad'}">${x.open ? 'Abierto' : `Cerrado · ${x.left} t`}</span>${x.esc ? ' <span class="chip cyan">Escoltando</span>' : ''}
        <small class="mut">${esc(s.x)} Controla: ${s.ctrl.filter(z => CC(z)).map(cname).join(', ')}${x.by ? ` · lo cerró ${cname(x.by)}` : !x.open ? ' · piratería' : ''}</small></div></div>
        <div class="arow"><span class="grow">Tu dependencia</span>${bar(x.dep * 100, 50, x.dep >= .3 ? 'red' : '')}<b class="num">${Math.round(x.dep * 100)}%</b></div>
        <div class="row wrap">${x.mine && x.open ? B('close', `Cerrar · ${D.STR.closeCp} CP`, 'red') : ''}${x.mine && !x.open && x.by === me() ? B('open', 'Reabrir') : ''}
          ${!x.open && x.by !== me() ? B('escort', `Escoltar convoyes · ${money(CC(me()).gdp * D.STR.escortCost)}`) : ''}${!x.open && x.by && x.by !== me() ? B('press', `Presionar a ${cname(x.by)} · ${D.STR.pressCp} CP`) : ''}</div></div>`; }).join('')}`; }
H.strAct = d => { act('strait', { id: d.id, k: d.k }); UI.render(); refreshMap(); };
{ const r0 = refreshMap; refreshMap = () => { r0(); if (!Globe.ready || !S() || UI.screen !== 'game') return; const L = Q.strInfo().map(x => ({ la: x.s.la, lo: x.s.lo, s: x.open ? 7 : 11, c: x.open ? 0x4fd8ff : 0xff3b30 })), k = JSON.stringify(L);
  if (k !== UI.stKey) { UI.stKey = k; Globe.setStraits(L); } }; }
{ const q0 = H.quit; H.quit = d => { Globe.setStraits(null); UI.stKey = ''; return q0(d); }; }
Bus.on('strait', e => { const s = D.STRAITS.find(x => x.id === e.id); if (!s || CFG.rm) return; Globe.ring(s.la, s.lo, e.closed ? 0xff3b30 : 0x4fd8ff, .1, 2000); if (e.closed) Globe.fx('humo', s.la, s.lo); });
