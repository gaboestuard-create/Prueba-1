// Portero: colocación en el ángulo, lectura de tiros, estiradas, salidas, atrapadas/despejes y saque.
(function () {
  'use strict';
  const G = window.G, P = G.P, T = G.T, b = G.ball, hyp = Math.hypot, clamp = G.clamp, rnd = G.rnd, gauss = G.gauss;
  const GK = (G.GK = {});

  function inOwnBox(team, x, z, m) { const u = -team.dir * x; m = m || 0; return u > P.HL - P.BOXL - m && u < P.HL + 0.5 && Math.abs(z) < P.BOXW + m; }
  GK.inOwnBox = inOwnBox;

  function startDive(p, ux, uz, dist, ty) {
    const s = Math.cos(p.face) * uz - Math.sin(p.face) * ux >= 0 ? 1 : -1;
    p.dv = { ux, uz, dist: Math.max(0, dist - 0.65), ty: clamp(ty, 0.25, 2.5), s, v: 0, moved: 0 }; // el balón debe cruzar a la altura de los brazos
    p.react = null; G.setState(p, 'gkdive');
  }

  GK.diveUpdate = function (p, dt) {
    const d = p.dv, t = p.stateT, vmax = (3.4 + 2 * p.gkv) * (1 + p.st.gkReach);
    if (d.moved < d.dist && t < 0.7) d.v = Math.min(vmax, d.v + 14 * dt); else d.v = Math.max(0, d.v - 22 * dt);
    p.vx = d.ux * d.v; p.vz = d.uz * d.v; p.x += p.vx * dt; p.z += p.vz * dt; d.moved += d.v * dt;
    p.y = clamp(d.ty - 0.9, 0, 1.3) * Math.sin(Math.PI * Math.min(1, t / 0.7));
    if (t > 1.15) { p.y = 0; G.setState(p, b.held === p ? 'gkhold' : 'free'); }
  };

  // Punto donde la trayectoria cruza el plano x = px (viniendo hacia el arco propio).
  const cr = { z: 0, y: 0, t: 0 };
  function cross(px, dir) {
    const path = b.path;
    if ((path[0].x - px) * dir <= 0) return false;
    for (let i = 1; i < 34; i++) {
      const a = path[i - 1], c = path[i];
      if ((c.x - px) * dir <= 0) { const u = (a.x - px) / (a.x - c.x || 1e-6); cr.z = a.z + (c.z - a.z) * u; cr.y = a.y + (c.y - a.y) * u; cr.t = a.t + (c.t - a.t) * u; return true; }
    }
    return false;
  }

  function shot(p, team, dt) {
    const dir = team.dir, gx = -dir * P.HL, D = team.D;
    if (-b.vx * dir < 3 || hyp(b.vx, b.vz) < 7) return false;
    if (!cross(gx, dir) || Math.abs(cr.z) > P.GW + 1 || cr.y > P.GH + 0.6) return false;
    if (!cross(p.x, dir)) cross(gx, dir); // ya lo superó: va a la línea
    const zk = cr.z, yk = cr.y, tk = cr.t;
    if (!p.react) p.react = { t: ((0.4 - 0.2 * p.gkv) / D.gk) * T.aiReact * rnd(0.85, 1.5), err: (gauss() * (1 - p.gkv) * 0.45) / D.gk };
    if ((p.react.t -= dt) > 0) { p.mx = p.mz = 0; return true; }
    const dz = zk + p.react.err - p.z;
    if (Math.abs(dz) < 0.55) { // le llega al cuerpo
      p.mx = p.mz = 0;
      if (yk > 1.9 && tk < 0.25 && p.y === 0) p.jumpV = 3.6;
    } else if (tk < 0.2 + Math.abs(dz) / 6) startDive(p, 0, Math.sign(dz), Math.abs(dz), yk);
    else G.AI.moveTo(p, p.x, zk + p.react.err, 2, 0.6);
    return true;
  }

  function freeMate(p, team, min, max) {
    let best = null, bs = 0;
    for (const m of team.players) {
      if (m === p || m.off) continue;
      const d = hyp(m.x - p.x, m.z - p.z); if (d < min || d > max) continue;
      G.nearOpp(m); if (G.nd < 7) continue;
      const s = G.nd - Math.abs(d - 20) * 0.2 + rnd(0, 2);
      if (!best || s > bs) { bs = s; best = m; }
    }
    return best;
  }

  function longBall(p, team) {
    let best = null, bs = -1;
    for (const m of team.players) { if (m.slot.l !== 'F' || m.off) continue; G.nearOpp(m); if (G.nd > bs) { bs = G.nd; best = m; } }
    G.act.kick(p, best ? { type: 'lob', x: best.x, z: best.z, target: best } : { type: 'lob', x: team.dir * 8, z: rnd(-15, 15) });
  }
  GK.longBall = longBall;

  function hold(p, team, dt) {
    p.holdT += dt; p.mz = 0; p.mx = -team.dir * p.x > P.HL - 11 ? team.dir * 0.5 : 0; p.faceTo = team.dir > 0 ? 0 : Math.PI;
    if (p.state !== 'gkhold' || p.holdT < 1.5) return;
    const m = freeMate(p, team, 12, 30);
    if (m && Math.random() < 0.75) G.act.kick(p, { type: 'throw', cap: 22, x: m.x + m.vx * 0.8, z: m.z + m.vz * 0.8, target: m });
    else longBall(p, team);
  }

  function feet(p, team, dt) { // balón en los pies (pase atrás o salida fuera del área)
    p.mx = p.mz = 0; p.ai.hold += dt; G.nearOpp(p);
    if (G.nd > 9 && p.ai.hold < 0.9) return;
    const m = freeMate(p, team, 8, 35);
    if (m && G.AI.lane(b.x, b.z, m.x, m.z, team, 1.8)) G.act.kick(p, { type: 'pass', target: m });
    else G.act.kick(p, { type: 'clear', x: p.x + team.dir * 30, z: p.z + rnd(-15, 15) });
  }

  GK.think = function (p, team, dt) {
    const dir = team.dir, gx = -dir * P.HL, D = team.D;
    p.faceTo = Math.atan2(b.z - p.z, b.x - p.x); p.sprint = false;
    if (b.held === p) return hold(p, team, dt);
    if (p.state !== 'free') return;
    if (b.owner === p) return feet(p, team, dt);
    const loose = !b.owner && !b.held;
    if (loose && shot(p, team, dt)) return;
    p.react = null;
    if (loose && inOwnBox(team, b.x, b.z, 2)) { // balón dividido en el área: sale si llega antes
      const me = G.AI.eta(p); let oe = 9;
      for (const o of team.opp.players) if (!o.off && o.eta < oe) oe = o.eta;
      if (me < oe - 0.1 && inOwnBox(team, p.ix, p.iz, 0)) { G.AI.moveTo(p, p.ix, p.iz, 2, 0.8); return; }
    }
    const o = b.owner;
    if (o && o.team !== team && inOwnBox(team, b.x, b.z, 4)) { // mano a mano: achica
      let cover = false;
      for (const m of team.players) if (!m.gk && !m.off && hyp(m.x - o.x, m.z - o.z) < 2.5) cover = true;
      if (!cover) {
        const d = hyp(b.x - p.x, b.z - p.z);
        if (d < 2.6 && hyp(o.x - b.x, o.z - b.z) > 0.55 && Math.random() < 4 * D.gk * dt) { startDive(p, (b.x - p.x) / d, (b.z - p.z) / d, d, 0.3); return; }
        const bd = hyp(b.x - gx, b.z) + 0.01, r = Math.min(bd - 1.5, 7.5);
        G.AI.moveTo(p, gx + ((b.x - gx) / bd) * r, (b.z / bd) * r, 2, 1.2); return;
      }
    }
    // colocación: sobre la bisectriz balón-arco, más adelantado cuanto más lejos está el balón
    const bx = b.x - gx, bd = hyp(bx, b.z) + 0.01;
    let r = clamp(1.3 + (bd - 10) * 0.1, 1.3, 4.5);
    if (bd > 42) r = Math.min(15, 4.5 + (bd - 42) * 0.3) * p.st.gkOut;
    let tx = gx + (bx / bd) * r; const tz = (b.z / bd) * r;
    if (-dir * tx > P.HL - 0.6) tx = -dir * (P.HL - 0.6);
    G.AI.moveTo(p, tx, tz, false, 1.5);
  };

  // Manos: atrapa o despeja. Devuelve true si el contacto lo resolvió el portero.
  GK.contact = function (p) {
    const team = p.team, o = b.owner;
    if (b.held || !inOwnBox(team, p.x, p.z, 0.5) || o === p) return false;
    if (b.kicker === p && b.kickT < 0.5) return false;
    if (o && o.team === team) return false;
    const lt = b.lastTouch;
    if (lt && lt !== p && lt.team === team && b.kicker === lt) return false; // pase atrás: con el pie
    const diving = p.state === 'gkdive';
    if (!diving && p.state !== 'free') return false;
    let cx = p.x, cz = p.z, cy = 1.1 + p.y, rh = 0.7 + 0.2 * p.gkv, rv = 1.3, stretch = 0;
    if (diving) { // cuerpo estirado: segmento desde la cadera hasta las manos
      stretch = clamp((b.x - p.x) * p.dv.ux + (b.z - p.z) * p.dv.uz, -0.3, 1.1);
      cx += p.dv.ux * stretch; cz += p.dv.uz * stretch; cy = 0.75 + p.y; rh = 0.45 + p.st.gkReach; rv = 0.75;
    }
    if (hyp(b.x - cx, b.z - cz) > rh || Math.abs(b.y - cy) > rv) return false;
    if (o && !diving && hyp(o.x - b.x, o.z - b.z) < 0.9) return false;
    const sp = hyp(b.vx, b.vy, b.vz);
    if (stretch > 0.7 && Math.random() < (stretch - 0.7) * 1.6 + Math.max(0, sp - 18) * 0.025 - p.gkv * 0.15) { // estirado al límite: apenas la roza
      b.vx *= 0.93; b.vz = b.vz * 0.93 + p.dv.uz * 1.2; b.kicker = p; b.kickT = 0; b.lastTouch = p; return true;
    }
    const isCatch = sp < 14 + 13 * p.gkv - (diving ? 5 : 0) || Math.random() < 0.25;
    b.owner = null; b.lastTouch = p; b.spin = 0;
    if (isCatch) {
      b.held = p; b.vx = b.vy = b.vz = 0; p.holdT = 0;
      if (!diving) G.setState(p, 'gkhold');
    } else {
      const side = Math.sign(b.z - p.z) || (Math.random() < 0.5 ? 1 : -1), k = clamp(sp / 25, 0.5, 1.2);
      b.vx = team.dir * (diving && Math.random() < 0.4 ? -rnd(2, 6) : rnd(2, 7)) * k; b.vz = side * rnd(5, 10) * k; // estirado, a veces solo alcanza a mandarla al córner b.vy = rnd(2, 6); b.kicker = p; b.kickT = 0;
    }
    G.emit('save', { p, catch: isCatch, sp });
    G.Match.onTouch(p, isCatch);
    return true;
  };
})();
