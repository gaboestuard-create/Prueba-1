// Núcleo: espacio de nombres, constantes de cancha, afinado en vivo (G.T), dificultad, eventos y utilidades.
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  // Cancha en metros. x = largo, z = ancho, y = altura. Origen en el centro.
  G.P = { HL: 52.5, HW: 34, GW: 3.66, GH: 2.44, BOXL: 16.5, BOXW: 20.16, SIXL: 5.5, SIXW: 9.16, PEN: 11, CR: 9.15, R: 0.11, NET: 2.2 };

  // Multiplicadores que el panel de debug cambia en vivo (1 = valor de diseño).
  G.T0 = { speed: 1, accel: 1, friction: 1, bounce: 1, shot: 1, pass: 1, curve: 1, touch: 1, aiAggr: 1, aiReact: 1, timeScale: 1 };
  G.T = Object.assign({}, G.T0);
  try { Object.assign(G.T, JSON.parse(localStorage.getItem('golazo.tune') || '{}')); } catch (e) { /* sin almacenamiento (node / modo privado) */ }

  // La dificultad cambia reacción, precisión, presión, lectura y ambición ofensiva (att). Nunca la velocidad de los jugadores.
  G.DIFFS = {
    facil: { name: 'Fácil', react: 0.6, err: 2.1, press: 0.55, tackle: 0.32, gk: 0.72, vision: 0.6, att: 0.5 },
    normal: { name: 'Normal', react: 0.42, err: 1.4, press: 0.8, tackle: 0.55, gk: 0.9, vision: 0.8, att: 0.8 },
    dificil: { name: 'Difícil', react: 0.3, err: 1.0, press: 1.0, tackle: 0.78, gk: 1.0, vision: 1.0, att: 1 },
    leyenda: { name: 'Leyenda', react: 0.2, err: 0.75, press: 1.2, tackle: 0.95, gk: 1.08, vision: 1.15, att: 1.15 },
  };
  G.MATE = { react: 0.3, err: 1, press: 0.8, tackle: 0.5, gk: 1, vision: 1, att: 1 }; // compañeros de la IA en el equipo humano: ayudan sin jugar solos

  const L = {};
  G.on = function (n, fn) { (L[n] = L[n] || []).push(fn); };
  G.emit = function (n, d) { const a = L[n]; if (a) for (let i = 0; i < a.length; i++) a[i](d); };

  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  G.angDiff = function (a, b) { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
  G.rnd = (a, b) => a + Math.random() * (b - a);
  G.gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2; // sigma ~1
  G.f = (v) => G.clamp((v - 40) / 55, 0, 1); // atributo 0-99 -> 0..1
  G.hash = function (s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
})();
