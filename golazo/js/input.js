// Entrada unificada: teclado, gamepad y táctil -> un mismo estado lógico (G.Input.s) con flancos de pulsar/soltar.
(function () {
  'use strict';
  const G = window.G;
  const NAMES = ['pass', 'shoot', 'lob', 'through', 'skill', 'sw', 'pause', 'cam', 'debug'];
  const I = (G.Input = { s: { x: 0, y: 0, sprint: false, shield: false, fin: false, rx: 0, ry: 0, b: {} }, touch: false });
  const raw = {}, keys = {}, gpPrev = {};
  NAMES.forEach((n) => { raw[n] = { down: false, pn: 0, rn: 0, t0: 0, held: 0, swipe: null }; I.s.b[n] = { down: false, press: false, release: false, held: 0, swipe: null }; });

  // Contadores en vez de banderas: un toque más corto que un cuadro no se pierde.
  function set(n, down, swipe) {
    const r = raw[n]; if (r.down === down) return;
    r.down = down;
    if (down) { r.pn++; r.t0 = performance.now(); } else { r.rn++; r.held = (performance.now() - r.t0) / 1000; r.swipe = swipe || null; }
  }
  I.set = set;

  const KEY = { KeyJ: 'pass', KeyK: 'shoot', KeyL: 'lob', KeyI: 'through', Space: 'skill', KeyQ: 'sw', Escape: 'pause', KeyP: 'pause', KeyC: 'cam', Backquote: 'debug', F2: 'debug' };
  addEventListener('keydown', (e) => {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    keys[e.code] = true; if (KEY[e.code]) set(KEY[e.code], true);
    if (KEY[e.code] || /^Arrow|^Space/.test(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; if (KEY[e.code]) set(KEY[e.code], false); });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; NAMES.forEach((n) => set(n, false)); tSprint = false; });

  // Pantalla lógica: siempre horizontal. En un teléfono en vertical (o en una app que no gira) todo se rota 90°.
  G.vp = function () { const w = innerWidth, h = innerHeight, rot = h > w && w < 820 && navigator.maxTouchPoints > 0; return { w: rot ? h : w, h: rot ? w : h, rot }; };
  const loc = (e) => (G.vp().rot ? { x: e.clientY, y: innerWidth - e.clientX } : { x: e.clientX, y: e.clientY }); // punto de pantalla -> pantalla lógica
  function layout() { const v = G.vp(), st = document.documentElement.style; document.body.classList.toggle('rot', v.rot); document.body.classList.toggle('short', v.h < 480); st.setProperty('--vw', v.w / 100 + 'px'); st.setProperty('--vh', v.h / 100 + 'px'); }
  addEventListener('resize', layout); layout();

  // ---- táctil: joystick flotante a la izquierda (al borde = sprint) y botones a la derecha con gesto de deslizar ----
  let tx = 0, ty = 0, tEdge = false, tSprint = false;
  I.initTouch = function () {
    const zone = document.getElementById('joy'), base = document.getElementById('joy-base'), knob = document.getElementById('joy-knob');
    let id = null, ox = 0, oy = 0;
    const R = () => Math.min(innerWidth, innerHeight) * 0.15;
    const end = (e) => { if (e.pointerId !== id) return; id = null; tx = ty = 0; tEdge = false; base.style.display = 'none'; };
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      id = e.pointerId; zone.setPointerCapture(id); const q = loc(e); ox = q.x; oy = q.y; I.touch = true;
      base.style.display = 'block'; base.style.left = ox + 'px'; base.style.top = oy + 'px'; knob.style.transform = 'translate(-50%,-50%)'; e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const r = R(), q = loc(e), dx = q.x - ox, dy = q.y - oy, len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / r);
      tx = (dx / len) * k; ty = (-dy / len) * k; tEdge = len > r * 1.6;
      knob.style.transform = `translate(calc(-50% + ${(dx / len) * Math.min(len, r * 1.7)}px), calc(-50% + ${(dy / len) * Math.min(len, r * 1.7)}px))`;
      base.classList.toggle('sprint', tEdge);
    });
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    document.querySelectorAll('.tb').forEach((el) => {
      const n = el.dataset.b; let pid = null, sx = 0, sy = 0, mx = 0, my = 0;
      const up = (e) => {
        if (e.pointerId !== pid) return; pid = null; el.classList.remove('on');
        const dx = mx - sx, dy = my - sy, len = Math.hypot(dx, dy);
        if (n === 'sprint') tSprint = false; else set(n, false, len > Math.min(innerWidth, innerHeight) * 0.07 ? { x: dx / len, y: -dy / len } : null);
      };
      el.addEventListener('pointerdown', (e) => { pid = e.pointerId; el.setPointerCapture(pid); const q = loc(e); sx = mx = q.x; sy = my = q.y; el.classList.add('on'); I.touch = true; if (n === 'sprint') tSprint = true; else set(n, true); e.preventDefault(); });
      el.addEventListener('pointermove', (e) => { if (e.pointerId === pid) { const q = loc(e); mx = q.x; my = q.y; } });
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  };

  const GP = { 0: 'pass', 1: 'shoot', 2: 'lob', 3: 'through', 4: 'sw', 9: 'pause', 8: 'cam', 11: 'skill' };
  I.poll = function () {
    const s = I.s;
    let x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), y = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    let sprint = !!(keys.ShiftLeft || keys.ShiftRight) || tSprint || tEdge, shield = !!keys.KeyO, fin = !!keys.KeyU;
    if (tx || ty) { x = tx; y = ty; }
    s.rx = s.ry = 0;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) {
      const gp = pads[i]; if (!gp || !gp.connected || gp.buttons.length < 10) continue;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, m = Math.hypot(ax, ay);
      if (m > 0.2) { const k = Math.min(1, (m - 0.15) / 0.8) / m; x = ax * k; y = -ay * k; }
      const B = (j) => !!(gp.buttons[j] && (gp.buttons[j].pressed || gp.buttons[j].value > 0.4));
      for (const j in GP) { const d = B(+j); if (gpPrev[j] !== d) { gpPrev[j] = d; set(GP[j], d); } }
      sprint = sprint || B(7); shield = shield || B(6); fin = fin || B(5);
      const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0, flick = Math.hypot(rx, ry) > 0.7; // stick derecho = filigrana
      if (flick) { s.rx = rx; s.ry = -ry; }
      if (gpPrev.flick !== flick) { gpPrev.flick = flick; set('skill', flick); }
      break;
    }
    s.x = x; s.y = y; s.sprint = sprint; s.shield = shield; s.fin = fin;
    const now = performance.now();
    for (const n of NAMES) { const r = raw[n], o = s.b[n]; o.press = r.pn > 0; o.release = r.rn > 0; o.down = r.down; o.held = r.down ? (now - r.t0) / 1000 : r.held; o.swipe = r.swipe; r.pn = r.rn = 0; if (!r.down) r.swipe = null; }
  };
})();
