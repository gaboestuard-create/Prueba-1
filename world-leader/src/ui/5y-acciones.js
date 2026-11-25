/* =====================================================================
   INTERFAZ · ACCIÓN PRINCIPAL Y FICHA PLEGABLE
   1) Sobre «Terminar turno» aparece lo más urgente de «Qué hacer ahora»
      (si hay algo importante): un toque te lleva allí. Con una decisión
      pendiente, el botón principal pasa a «Resolver decisión».
   2) La ficha de un país muestra lo esencial y pliega el resto en
      secciones (fuerza militar, aliados y enemigos, recursos).
   ===================================================================== */
{ const d0 = dockHTML; dockHTML = () => { const h = d0(), s = S(); if (!s || s.over || s.pend.length || UI.panel || (UI.sel && innerWidth <= 760)) return h; /* solo con el mapa libre */ let t = null; try { t = todo().find(x => x.p >= 6 && x.go); } catch (e) { }
  return t ? h + `<button class="nextact" data-a="goTodo" title="Lo más urgente ahora"><small>Primero</small><span>${esc(t.t)}</span>${ic('next')}</button>` : h; }; }
H.goTodo = () => { const t = todo().find(x => x.p >= 6 && x.go); if (t) goTo(t.go); };
function cps(k, title, hint, body) { const open = (UI.cpSec || (UI.cpSec = {}))[k];
  return `<section class="cps ${open ? 'open' : ''}"><button class="cps-h" data-a="cpToggle" data-k="${k}" aria-expanded="${!!open}"><b>${title}</b><small>${hint}</small><i>${open ? '▾' : '▸'}</i></button>${open ? `<div class="cps-b">${body}</div>` : ''}</section>`; }
H.cpToggle = d => { UI.cpSec = UI.cpSec || {}; UI.cpSec[d.k] = !UI.cpSec[d.k]; UI.render(); };
