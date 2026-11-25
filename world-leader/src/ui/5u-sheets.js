/* =====================================================================
   INTERFAZ · HOJAS ARRASTRABLES EN MÓVIL
   La ficha del país y los paneles tienen tres alturas: asomada (solo la
   cabecera), media y completa. Se arrastra con el dedo desde el asa o la
   cabecera, o se toca el asa para alternar. La altura se guarda en
   body[data-snap-cp] y body[data-snap-pn] y la aplica el CSS, así que
   sobrevive a cualquier re-dibujado.
   ===================================================================== */
const SNAPS = ['peek', 'half', 'full'], mobileQ = matchMedia('(max-width: 760px)');
UI.snap = { cp: 'half', pn: 'full' };
const applySnap = () => { document.body.dataset.snapCp = UI.snap.cp; document.body.dataset.snapPn = UI.snap.pn; };
const setSnap = (k, v) => { UI.snap[k] = v; applySnap(); };
applySnap();
{ const o0 = H.open; H.open = d => { setSnap('pn', 'full'); return o0(d); }; }
{ const s0 = selectCountry; selectCountry = (iso, fly, prov) => { setSnap('cp', 'half'); return s0(iso, fly, prov); }; }
let drag = null;
document.addEventListener('pointerdown', e => { if (!mobileQ.matches) return; const g = e.target.closest('[data-grip], .cp-head, .panel > header'); if (!g || e.target.closest('button, a, input')) return;
  const el = g.closest('.cpanel, .panel'); if (!el) return; drag = { el, k: el.classList.contains('cpanel') ? 'cp' : 'pn', y0: e.clientY, dy: 0, grip: g.hasAttribute('data-grip') }; g.setPointerCapture && g.setPointerCapture(e.pointerId); el.style.transition = 'none'; });
document.addEventListener('pointermove', e => { if (!drag) return; drag.dy = e.clientY - drag.y0; drag.el.style.transform = `translateY(${Math.max(-30, drag.dy)}px)`; });
const endDrag = () => { if (!drag) return; const { el, k, dy, grip } = drag; drag = null; el.style.transition = ''; el.style.transform ='';
  const i = SNAPS.indexOf(UI.snap[k]); if (Math.abs(dy) < 8) { if (grip) setSnap(k, SNAPS[i === 1 ? 2 : 1]); return; } /* un toque en el asa alterna media ↔ completa */
  setSnap(k, SNAPS[clampU(i + (dy > 40 ? -1 : dy < -40 ? 1 : 0), 0, 2)]); };
document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
