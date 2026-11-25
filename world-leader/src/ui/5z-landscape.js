/* =====================================================================
   INTERFAZ · TELÉFONO ACOSTADO
   En pantallas bajas y anchas (≈ 915×412, un Pixel 7 horizontal) el mapa
   queda a la izquierda y los menús entran como un cajón a la derecha. El
   CSS vive en styles.css (orientation: landscape + max-height); aquí solo
   se marca en <body> si hay un cajón abierto, para esconder los recursos.
   ===================================================================== */
{ const r0 = UI.render; UI.render = function () { const v = r0.apply(this, arguments); document.body.dataset.drawer = UI.panel || UI.sel ? '1' : ''; return v; }; }
