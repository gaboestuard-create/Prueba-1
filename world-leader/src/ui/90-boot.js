/* =====================================================================
   INTERFAZ · render raíz y arranque
   ===================================================================== */
UI.screen = 'start';
UI.render = () => {
  const app = $('#app'), sc = {}, ae = document.activeElement, fid = ae && ae.id && app.contains(ae) ? ae.id : null, pos = fid && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  app.querySelectorAll('[data-sc]').forEach(e => { sc[e.dataset.sc] = e.scrollTop; });
  app.className = 'scr-' + UI.screen;
  if (UI.screen === 'start') app.innerHTML = startHTML();
  else if (UI.screen === 'create') app.innerHTML = createHTML();
  else app.innerHTML = hudHTML() + dockHTML() + (UI.panel ? panelHTML() : '') + (UI.sel && S().c[UI.sel] ? countryHTML(UI.sel) : '') + (UI.alertsOpen ? alertsHTML() : '');
  app.querySelectorAll('[data-sc]').forEach(e => { if (sc[e.dataset.sc]) e.scrollTop = sc[e.dataset.sc]; });
  if (fid) { const e = document.getElementById(fid); if (e) { e.focus(); if (pos && e.setSelectionRange) try { e.setSelectionRange(pos[0], pos[1]); } catch (_) { } } }
};
Bus.on('state', () => { if (UI.screen === 'game' && !UI.turnBuf) { UI.render(); refreshMap(); } });
Bus.on('loaded', () => { UI.routeKey = UI.frontKey = ''; });
document.addEventListener('toggle', e => { if (e.target.dataset && e.target.dataset.keep === 'terr') UI.terrOpen = e.target.open; }, true);

/* ---- globo: clic y cursor ---- */
function wireGlobe() {
  Globe.onPick((iso, prov) => {
    if (UI.screen === 'create') { if (iso && D.C[iso] && NG.step === 0) H.ngPick({ iso }); return; }
    if (UI.screen !== 'game') return;
    if (iso) selectCountry(iso, UI.sel !== Q.ownerOf(iso), prov); else if (UI.sel) H.unsel();
  });
  const tip = $('#tip');
  Globe.onHover((iso, x, y, prov) => {
    if (!iso || !D.C[iso]) { tip.hidden = true; Globe.hover([]); Globe.hoverProv(); UI.hov = null; return; }
    const terr = D.C[iso].terr[(prov || 1) - 1], multi = D.C[iso].terr.length > 1; Globe.hoverProv(multi ? iso : null, prov);
    const game = UI.screen === 'game' && S(), o = game ? Q.ownerOf(iso) : iso;
    if (o !== UI.hov) { UI.hov = o; Globe.hover(game ? Object.keys(S().c).filter(i => Q.ownerOf(i) === o) : [iso]); }
    const r = game && o !== me() ? Q.rel(me(), o) : null;
    const holder = game && terr ? CC(iso).terr[(prov || 1) - 1].o : iso;
    tip.innerHTML = `${flag(o)} <b>${esc(game ? CC(o).n : D.C[o].n)}</b>${o !== iso && game ? ` <small>(${esc(D.C[iso].n)})</small>` : ''}${multi && terr ? ` <small>· ${esc(terr.n)}${game && holder !== iso && CC(iso).alive ? ' — ocupada por ' + esc(CC(holder).n) : ''}</small>` : ''}${r != null ? ` <small class="${relCls(r)}">${relWord(r)} ${sgn(r)}</small>` : ''}`;
    tip.hidden = false; tip.style.transform = `translate(${Math.min(innerWidth - tip.offsetWidth - 8, x + 14)}px,${Math.max(4, y - 34)}px)`;
  });
}
UI.render();
Globe.init($('#globe'), $('#labels')).then(() => { wireGlobe(); refreshMap(); }).catch(err => {
  document.body.classList.add('noglobe');
  toast('Tu navegador no pudo iniciar el globo 3D (WebGL). Puedes jugar igual: elige países desde las listas.', false);
  if (typeof console !== 'undefined') console.warn(err);
});
