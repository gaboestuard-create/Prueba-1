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

/* ---- guardado comprimido (LZW, ~5x): las partidas en localStorage llevan el prefijo WLZ1; exportar sigue siendo JSON plano ---- */
const LZ_MAX = 55000;
function lzPack(str) { const b = new TextEncoder().encode(str), o = []; let d = new Map(), n = 256, w = '';
  for (const x of b) { const c = String.fromCharCode(x); if (!w) { w = c; continue; } const wc = w + c; if (d.has(wc)) { w = wc; continue; }
    o.push(String.fromCharCode((w.length === 1 ? w.charCodeAt(0) : d.get(w)) + 32)); if (n < LZ_MAX) d.set(wc, n++); else { d = new Map(); n = 256; } w = c; }
  if (w) o.push(String.fromCharCode((w.length === 1 ? w.charCodeAt(0) : d.get(w)) + 32)); return o.join(''); }
function lzUnpack(s) { let d = [], n = 256, prev = null; const out = [];
  for (let i = 0; i < s.length; i++) { const k = s.charCodeAt(i) - 32; const e = k < 256 ? String.fromCharCode(k) : k < n ? d[k - 256] : prev + prev[0]; out.push(e);
    if (prev !== null) { if (n < LZ_MAX) d[(n++) - 256] = prev + e[0]; else { d = []; n = 256; } } prev = e; }
  const t = out.join(''), b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return new TextDecoder().decode(b); }
const zip = s => 'WLZ1' + lzPack(s), unz = s => typeof s === 'string' && s.startsWith('WLZ1') ? lzUnpack(s.slice(4)) : s;
