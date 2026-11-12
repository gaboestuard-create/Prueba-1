/* =====================================================================
   WORLD LEADER · 4b. INTERFAZ · base
   Reglas: la UI solo LEE el estado (G.S, G.q.*) y solo ESCRIBE con
   G.act(). Todo el HTML se genera con plantillas y se delega el click
   mediante data-a="manejador".
   ===================================================================== */
const D = WL.DATA, G = WL.Game, Q = G.q, Bus = WL.Bus, Globe = WL.Globe;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = () => G.S, me = () => G.S.player, CC = iso => G.S.c[iso];
const money = v => Q.money(v), pct = v => Math.round(v) + '%';
const num = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + ' M' : v >= 1e3 ? Math.round(v / 1e3) + ' mil' : String(Math.round(v));
const sgn = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d || 0);
const UI = WL.UI = { panel: null, tab: {}, sel: null, mode: 'pol', form: {}, H: {}, busy: false };
const H = UI.H;

/* ---- iconos (trazos sobre rejilla de 24) ---- */
const IC = {
  eco: 'M4 19h16M7 16V9m5 7V5m5 11v-4', pol: 'M4 20h16M6 20v-8m4 8v-8m4 8v-8m4 8v-8M4 12h16L12 5z',
  dip: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', mil: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  world: 'M5 6h14M5 12h14M5 18h9', edit: 'M4 20l10-10m2-2l4-4M14 6l4 4M5 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z', sys: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  next: 'M5 12h14m-6-6l6 6-6 6', x: 'M6 6l12 12M18 6L6 18', war: 'M5 5l14 14M19 5L5 19M5 5v4M5 5h4M19 5v4M19 5h-4',
  treaty: 'M6 4h10l3 3v13H6zM9 10h7M9 14h7M9 18h4', coup: 'M13 3L5 14h6l-1 7 8-11h-6z', vote: 'M4 12l5 5L20 6',
  peace: 'M12 21c-5-3-8-7-8-11a8 8 0 0116 0c0 4-3 8-8 11zM12 21V9', money: 'M12 3v18M16 7c-1-1.5-2.5-2-4-2-2.5 0-4 1.3-4 3.2 0 4.3 8 2.3 8 6.6 0 2-1.6 3.2-4 3.2-1.8 0-3.3-.7-4.4-2',
  cp: 'M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17l-5.4 2.8 1.1-6.1L3.2 9.4l6.1-.8z', people: 'M8 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 100-5M16 14c3 0 6 2.3 6 6',
  stab: 'M12 4v16M7 20h10M5 8h14M5 8l-2 6a3 3 0 006 0zM19 8l-2 6a3 3 0 006 0z', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  un: 'M12 4a8 8 0 100 16 8 8 0 000-16zM4 12h16M12 4v16M6 7c2 1.5 10 1.5 12 0M6 17c2-1.5 10-1.5 12 0', elec: 'M5 10h14v10H5zM9 10V5h6v5M9 15l2 2 4-4', home: 'M4 11l8-7 8 7M6 10v10h12V10',
  tec: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M8 15h8', spy: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  snd: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11', mute: 'M4 9v6h4l5 4V5L8 9zM17 9l4 6M21 9l-4 6',
  good: 'M4 12l5 5L20 6', bad: 'M12 4v9M12 17v2', map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14'
};
const ic = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n] || IC.world}"/></svg>`;
const NEWS_IC = { war: 'war', peace: 'peace', dip: 'treaty', eco: 'eco', pol: 'pol', mil: 'mil', world: 'dip', un: 'un', coup: 'coup', elec: 'elec' };

/* ---- banderas (emoji regional; si el sistema no las tiene, quedan las dos letras) ---- */
const flag = iso => { const c = G.S && G.S.c[iso]; if (c && c.custom) return '🏴'; return iso === 'XK' ? '🇽🇰' : String.fromCodePoint(...[...iso].map(ch => 0x1F1A5 + ch.charCodeAt(0))); };
const fl = iso => `<span class="flag" title="${esc(iso)}">${flag(iso)}</span>`;
const cname = iso => esc(CC(iso).n);

/* ---- retratos vectoriales generados por código a partir del nombre ---- */
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function portraitSVG(name, seed) {
  let h = hash(name + '|' + (seed || 0)); const r = n => { const v = h % n; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return v; };
  const skin = ['#f2cfb0', '#e3b08a', '#c98f66', '#a56e4b', '#7b4d33', '#5a3724'][r(6)], hair = ['#17130f', '#2e2018', '#5b3a21', '#8a8f98', '#d9dce2', '#7a2f1c'][r(6)];
  const suit = ['#1b2740', '#22252b', '#3a1f2b', '#263a2e', '#2b2440'][r(5)], tie = ['#e8c36a', '#4fd8ff', '#c9423a', '#e9eef7', '#7ac77f'][r(5)], hue = r(360), style = r(6), glasses = r(4) === 0, beard = r(5) === 0, mil = /^Gral\./.test(name);
  const hairs = [
    `<path d="M26 40c-2-16 8-26 24-26s26 10 24 26c-3-9-9-14-24-14s-21 5-24 14z" fill="${hair}"/>`,
    `<path d="M25 44c-4-20 8-31 26-30 16 1 26 10 23 28-2-8-6-12-12-14-10 4-28 3-37 16z" fill="${hair}"/>`,
    `<path d="M25 42c-3-17 8-28 25-28s28 11 25 28c-2-10-8-15-25-15s-23 5-25 15z" fill="${hair}"/><circle cx="50" cy="12" r="8" fill="${hair}"/>`,
    `<path d="M22 66c-6-30 4-53 28-53s34 23 28 53c-2-14-2-26-8-34-8 4-32 4-40 0-6 8-6 20-8 34z" fill="${hair}"/>`,
    `<path d="M26 46c-2-6-1-12 2-16 0 6 1 10 3 13zM74 46c2-6 1-12-2-16 0 6-1 10-3 13z" fill="${hair}"/>`,
    `<path d="M24 42c-4-10 0-22 8-24 2-6 12-8 18-5 8-4 18 0 20 7 8 3 10 14 6 22-2-9-8-15-26-15s-24 6-26 15z" fill="${hair}"/>`][style];
  return `<svg viewBox="0 0 100 100" class="pt" role="img" aria-label="Retrato de ${esc(name)}"><defs><linearGradient id="pg${h}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,34%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},50%,14%)"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#pg${h})"/><circle cx="78" cy="20" r="26" fill="#fff" opacity=".06"/>
    <path d="M8 100c2-22 16-30 42-30s40 8 42 30z" fill="${suit}"/><path d="M40 71l10 12 10-12-4 29H44z" fill="#e9eef7"/><path d="M47 80h6l2 20h-10z" fill="${tie}"/>
    <path d="M40 71l10 12-9 7-7-17zM60 71l-10 12 9 7 7-17z" fill="${suit}" stroke="#0008" stroke-width=".6"/>
    ${mil ? `<path d="M14 82h14v4H14zM72 82h14v4H72z" fill="${tie}"/>` : ''}
    <rect x="43" y="58" width="14" height="16" rx="5" fill="${skin}"/><path d="M43 66c4 4 10 4 14 0v6c-4 3-10 3-14 0z" fill="#0002"/>
    <ellipse cx="50" cy="42" rx="21" ry="25" fill="${skin}"/><path d="M50 17c12 0 21 11 21 25s-9 25-21 25z" fill="#0001"/>
    ${hairs}
    ${mil ? `<path d="M24 30c2-14 12-20 26-20s24 6 26 20z" fill="#2d3a2a"/><path d="M22 30h56v5H22z" fill="#1c241a"/><circle cx="50" cy="22" r="4" fill="${tie}"/>` : ''}
    <ellipse cx="41" cy="43" rx="2.4" ry="2.8" fill="#1a1410"/><ellipse cx="59" cy="43" rx="2.4" ry="2.8" fill="#1a1410"/>
    <path d="M36 37q5-3 10 0M54 37q5-3 10 0" stroke="${hair}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M50 44v8l-3 2" stroke="#0003" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M43 58q7 4 14 0" stroke="#5a2d22" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${beard ? `<path d="M31 50c2 16 10 19 19 19s17-3 19-19c-4 8-10 10-19 10s-15-2-19-10z" fill="${hair}" opacity=".9"/>` : ''}
    ${glasses ? `<g fill="none" stroke="#111" stroke-width="1.6"><rect x="34" y="38" width="13" height="10" rx="3"/><rect x="53" y="38" width="13" height="10" rx="3"/><path d="M47 42h6"/></g>` : ''}</svg>`;
}
function portrait(iso, big) {
  const c = CC(iso), img = c.lider.img;
  return `<div class="portrait ${big ? 'big' : ''}">${portraitSVG(c.lider.n, isPlayer(iso) ? S().leader.pseed : 0)}${img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : ''}</div>`;
}
const isPlayer = iso => iso === me();

/* ---- piezas ---- */
const bar = (v, max, cls) => `<span class="bar ${cls || ''}"><i style="width:${Math.max(0, Math.min(100, v / (max || 100) * 100))}%"></i></span>`;
function relBar(v) { const w = Math.abs(v) / 2; return `<span class="relbar"><i class="${v >= 0 ? 'pos' : 'neg'}" style="width:${w}%;${v >= 0 ? 'left:50%' : 'right:50%'}"></i><b></b></span>`; }
const relWord = v => v <= -100 ? 'En guerra' : v < -60 ? 'Hostil' : v < -25 ? 'Tensa' : v < 15 ? 'Fría' : v < 45 ? 'Cordial' : v < 75 ? 'Amistosa' : 'Fraternal';
const relCls = v => v < -25 ? 'bad' : v < 15 ? '' : 'good';
function spark(arr, w, h) {
  if (!arr || arr.length < 2) return ''; w = w || 90; h = h || 26; const mn = Math.min(...arr), mx = Math.max(...arr), sp = mx - mn || 1;
  const pts = arr.map((v, i) => [(i / (arr.length - 1) * (w - 4) + 2).toFixed(1), (h - 3 - (v - mn) / sp * (h - 6)).toFixed(1)]), up = arr[arr.length - 1] >= arr[0], last = pts[pts.length - 1];
  return `<svg class="spark ${up ? 'up' : 'down'}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path class="area" d="M${pts.map(p => p.join(',')).join('L')}L${w - 2},${h}L2,${h}z"/><path class="line" d="M${pts.map(p => p.join(',')).join('L')}"/><circle cx="${last[0]}" cy="${last[1]}" r="2.2"/></svg>`;
}
const fxChips = list => list.map(x => /^· |:$/.test(x[0]) && !x[1] ? `<span class="fxl">${esc(x[0])}</span>` : `<span class="chip ${x[1] > 0 ? 'good' : x[1] < 0 ? 'bad' : ''}">${esc(x[0])}</span>`).join('');
const tabs = (id, list) => { const cur = UI.tab[id] || list[0][0]; return `<div class="tabs" role="tablist">${list.map(t => `<button role="tab" data-a="tab" data-id="${id}" data-t="${t[0]}" class="${cur === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>`; };
const curTab = (id, def) => UI.tab[id] || def;
const fv = (id, def) => UI.form[id] != null ? UI.form[id] : def; // valor recordado de un campo
const inp = (id, def, attrs) => `<input id="${id}" data-f="${id}" value="${esc(fv(id, def))}" ${attrs || ''}>`;
const sel = (id, opts, def) => { const v = fv(id, def); return `<select id="${id}" data-f="${id}">${opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(v) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`; };

/* ---- avisos ---- */
function toast(msg, ok) { const d = document.createElement('div'); d.className = 'toast ' + (ok === false ? 'bad' : 'ok'); d.innerHTML = ic(ok === false ? 'bad' : 'good') + `<span>${esc(msg)}</span>`; $('#toasts').appendChild(d); setTimeout(() => d.classList.add('out'), 3600); setTimeout(() => d.remove(), 4100); while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove(); }
Bus.on('toast', t => toast(t.msg, t.ok));

/* ---- delegación de eventos ---- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  if (el.dataset.confirm != null && !el.dataset.armed) { // confirmación en dos toques (no existen confirm() ni alert())
    el.dataset.armed = 1; el.dataset.label = el.innerHTML; el.innerHTML = '¿Seguro? Toca otra vez'; el.classList.add('armed');
    setTimeout(() => { if (el.isConnected && el.dataset.armed) { delete el.dataset.armed; el.innerHTML = el.dataset.label; el.classList.remove('armed'); } }, 3000); return;
  }
  const f = H[el.dataset.a]; if (f) f(el.dataset, el, e);
});
document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.f; if (k) { UI.form[k] = e.target.value; const f = H['in:' + k.split(':')[0]]; if (f) f(e.target.value, e.target); } });
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.c; if (k && H[k]) H[k](e.target.dataset, e.target); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#modal').hidden && UI.modalClosable) closeModal(); else if (UI.panel) { UI.panel = null; UI.render(); } else if (UI.sel) H.unsel(); } });
H.tab = d => { UI.tab[d.id] = d.t; UI.render(); };
const act = (name, args) => G.act(name, args);

/* ---- modal genérico ---- */
function openModal(html, closable, cls) { const m = $('#modal'); UI.modalClosable = !!closable; m.innerHTML = `<div class="mbox glass ${cls || ''}" role="dialog" aria-modal="true">${closable ? `<button class="xbtn" data-a="closeModal" aria-label="Cerrar">${ic('x')}</button>` : ''}${html}</div>`; m.hidden = false; }
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; UI.sheet = null; }
H.closeModal = closeModal;
