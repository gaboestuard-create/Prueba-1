// Física del balón: vuelo con arrastre y efecto (Magnus), bote, rodamiento con fricción, postes, travesaño y red.
(function () {
  'use strict';
  const G = window.G, P = G.P, T = G.T, R = P.R;
  const GRAV = 9.81, DRAG = 0.0075, KM = 0.045, ROLL_A = 1.3, ROLL_K = 0.32, POST = 0.06;

  const b = (G.ball = { x: 0, y: R, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, owner: null, held: null, lastTouch: null, kicker: null, kickT: 9, inNet: 0, bounced: false, path: [] });
  for (let i = 0; i < 50; i++) b.path.push({ t: 0, x: 0, y: 0, z: 0 });

  // Un paso de integración. spin > 0 curva hacia (-vz, vx).
  function integrate(o, h) {
    if (o.y > R + 0.005 || o.vy > 0.3) {
      const sp = Math.hypot(o.vx, o.vy, o.vz), dr = DRAG * sp, m = o.spin * KM * T.curve;
      const ax = -dr * o.vx - m * o.vz, az = -dr * o.vz + m * o.vx;
      o.vx += ax * h; o.vz += az * h; o.vy -= (GRAV + dr * o.vy) * h;
      o.x += o.vx * h; o.y += o.vy * h; o.z += o.vz * h;
      o.spin *= 1 - 0.4 * h;
      if (o.y <= R) {
        o.y = R;
        if (o.vy < -1.2) { o.vy *= -0.55 * T.bounce; o.vx *= 0.8; o.vz *= 0.8; o.bounced = true; } else o.vy = 0;
      }
    } else {
      o.y = R; o.vy = 0;
      const hs = Math.hypot(o.vx, o.vz);
      if (hs > 0.03) {
        const k = Math.max(0, hs - (ROLL_A + ROLL_K * hs) * T.friction * h) / hs, m = o.spin * KM * T.curve * 0.35, vx = o.vx, vz = o.vz;
        o.vx = (vx - m * vz * h) * k; o.vz = (vz + m * vx * h) * k;
        o.x += o.vx * h; o.z += o.vz * h;
      } else o.vx = o.vz = 0;
      o.spin *= 1 - 2 * h;
    }
  }

  // Velocidad inicial para rodar d metros y llegar con velocidad va (solución cerrada + bisección).
  function rollDist(v0, va) { const a = ROLL_A * T.friction, k = ROLL_K * T.friction; return (v0 - va) / k - (a / (k * k)) * Math.log((a + k * v0) / (a + k * va)); }
  function speedForRoll(d, va) { let lo = va, hi = 40; for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (rollDist(m, va) < d) lo = m; else hi = m; } return hi; }

  // Velocidad para que un balón levantado con ángulo ang caiga a d metros (simulando el vuelo real).
  const tmp = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0 };
  function lobDist(sp, ang, y0) {
    tmp.x = 0; tmp.y = Math.max(R, y0); tmp.z = 0; tmp.vx = sp * Math.cos(ang); tmp.vy = sp * Math.sin(ang); tmp.vz = 0; tmp.spin = 0;
    for (let i = 0; i < 300; i++) { integrate(tmp, 0.02); if (tmp.y <= R) break; }
    return tmp.x;
  }
  function lobSpeed(d, ang, y0) { let lo = 4, hi = 42; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (lobDist(m, ang, y0) < d) lo = m; else hi = m; } return hi; }

  // Trayectoria futura (3 s) que usa la IA para interceptar. Ignora postes y jugadores.
  function predict() {
    tmp.x = b.x; tmp.y = b.y; tmp.z = b.z; tmp.vx = b.vx; tmp.vy = b.vy; tmp.vz = b.vz; tmp.spin = b.spin;
    for (let i = 0; i < 50; i++) { const s = b.path[i]; s.t = i * 0.06; s.x = tmp.x; s.y = tmp.y; s.z = tmp.z; integrate(tmp, 0.03); integrate(tmp, 0.03); }
    tmp.bounced = false;
  }

  function hitBar(nx, ny, nz, pen) {
    const vn = b.vx * nx + b.vy * ny + b.vz * nz;
    b.x += nx * pen; b.y += ny * pen; b.z += nz * pen;
    if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; b.vz -= 1.6 * vn * nz; if (vn < -3) G.emit('post', -vn); }
  }

  // Postes, travesaño y red. (px,py,pz) = posición anterior del balón.
  function collideGoal(px, py, pz) {
    const s = b.x > 0 ? 1 : -1, u = s * b.x, pu = s * px, gx = s * P.HL;
    if (u < P.HL - 1 && !b.inNet) return;
    for (let k = -1; k <= 1; k += 2) {
      const dx = b.x - gx, dz = b.z - k * P.GW, d = Math.hypot(dx, dz);
      if (d < R + POST && d > 1e-4 && b.y < P.GH + POST) hitBar(dx / d, 0, dz / d, R + POST - d);
    }
    if (Math.abs(b.z) < P.GW) {
      const dx = b.x - gx, dy = b.y - P.GH, d = Math.hypot(dx, dy);
      if (d < R + POST && d > 1e-4) hitBar(dx / d, dy / d, 0, R + POST - d);
    }
    if (b.inNet) {
      let hit = false;
      if (u > P.HL + P.NET - R) { b.x = s * (P.HL + P.NET - R); b.vx *= -0.15; hit = true; }
      if (Math.abs(b.z) > P.GW - R) { b.z = Math.sign(b.z) * (P.GW - R); b.vz *= -0.15; hit = true; }
      if (b.y > P.GH - R) { b.y = P.GH - R; b.vy = -Math.abs(b.vy) * 0.15; hit = true; }
      if (hit) { if (Math.hypot(b.vx, b.vy, b.vz) > 4) G.emit('net'); b.vx *= 0.5; b.vy *= 0.6; b.vz *= 0.5; b.spin = 0; }
      if (u < P.HL - 0.5) b.inNet = 0;
    } else if (u > P.HL && u < P.HL + P.NET && Math.abs(b.z) < P.GW && b.y < P.GH) {
      // Entró al volumen del arco: por el frente es gol; por fuera, rebota en la red exterior.
      if (Math.abs(pz) >= P.GW) { b.z = Math.sign(pz) * (P.GW + R); b.vz *= -0.3; b.vx *= 0.6; }
      else if (py >= P.GH) { b.y = P.GH + R; b.vy = Math.abs(b.vy) * 0.3; b.vx *= 0.6; b.vz *= 0.6; }
      else if (pu >= P.HL + P.NET) { b.x = s * (P.HL + P.NET + R); b.vx *= -0.3; }
      else b.inNet = s;
    }
  }

  G.Ball = { integrate, speedForRoll, lobSpeed, predict, collideGoal, GRAV, KM };
})();
