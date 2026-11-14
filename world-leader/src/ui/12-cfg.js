/* =====================================================================
   INTERFAZ · AJUSTES DEL JUGADOR (Fase 4). Se guardan en este navegador,
   no en la partida: calidad gráfica, reducir movimiento, volúmenes por
   canal, silencio total, portada del periódico y cámara cinematográfica.
   ===================================================================== */
const CFG = (() => {
  const def = { q: 'auto', rm: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches), mute: false, vol: { master: .8, music: .45, sfx: .8, amb: .3, ui: .5 }, paper: true, cine: true, hover: true, observer: false };
  let c = Object.assign({}, def, { vol: Object.assign({}, def.vol) });
  try { const s = JSON.parse(localStorage.getItem('wl_cfg') || 'null'); if (s) c = Object.assign({}, def, s, { vol: Object.assign({}, def.vol, s.vol || {}) }); else if (localStorage.getItem('wl_snd') === '0') c.mute = true; } catch (e) { }
  return c;
})();
const cfgSave = () => { try { localStorage.setItem('wl_cfg', JSON.stringify(CFG)); } catch (e) { } };
const quality = () => CFG.q !== 'auto' ? CFG.q : innerWidth < 760 || (navigator.hardwareConcurrency || 4) <= 4 ? 'med' : 'high';
function applyCfg() { const b = document.body; if (!b) return; b.classList.toggle('rm', !!CFG.rm); b.dataset.q = quality(); try { Globe.setQuality(quality(), CFG.rm); } catch (e) { } if (typeof Sfx !== 'undefined') Sfx.mix(); }
