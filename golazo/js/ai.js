// IA de equipo: formaciones, bloque que se mueve junto, desmarques, presión, repliegue y decisiones del poseedor.
(function () {
  'use strict';
  const G = window.G, P = G.P, T = G.T, b = G.ball, hyp = Math.hypot, clamp = G.clamp, rnd = G.rnd, lerp = G.lerp;
  const AI = (G.AI = {});

  // Posición base por rol: x de -1 (arco propio) a 1 (arco rival), z de -1 a 1. l = línea (G/D/M/F).
  const F = (r, x, z, l) => ({ r, x, z, l });
  const GK = F('GK', -0.96, 0, 'G'), B4 = [F('LB', -0.66, -0.74, 'D'), F('CB', -0.7, -0.26, 'D'), F('CB', -0.7, 0.26, 'D'), F('RB', -0.66, 0.74, 'D')];
  AI.FORM = {
    '4-4-2': [GK].concat(B4, [F('LM', -0.18, -0.78, 'M'), F('CM', -0.28, -0.24, 'M'), F('CM', -0.28, 0.24, 'M'), F('RM', -0.18, 0.78, 'M'), F('ST', 0.28, -0.2, 'F'), F('ST', 0.28, 0.2, 'F')]),
    '4-3-3': [GK].concat(B4, [F('CM', -0.2, -0.4, 'M'), F('DM', -0.36, 0, 'M'), F('CM', -0.2, 0.4, 'M'), F('LW', 0.22, -0.72, 'F'), F('ST', 0.32, 0, 'F'), F('RW', 0.22, 0.72, 'F')]),
    '3-5-2': [GK, F('CB', -0.7, -0.42, 'D'), F('CB', -0.72, 0, 'D'), F('CB', -0.7, 0.42, 'D'), F('LM', -0.22, -0.82, 'M'), F('CM', -0.3, -0.3, 'M'), F('AM', -0.06, 0, 'M'), F('CM', -0.3, 0.3, 'M'), F('RM', -0.22, 0.82, 'M'), F('ST', 0.28, -0.2, 'F'), F('ST', 0.28, 0.2, 'F')],
  };

  // Tiempo mínimo para alcanzar la trayectoria del balón; deja el punto en p.ix/p.iz.
  AI.eta = function (p) {
    const path = b.path, v = G.topSpeed(p) * 0.92, maxY = p.gk ? 2.5 : 1.9;
    for (let i = 0; i < path.length; i++) {
      const s = path[i]; if (s.y > maxY) continue;
      if (hyp(s.x - p.x, s.z - p.z) / v + 0.12 <= s.t) { p.ix = s.x; p.iz = s.z; return s.t; }
    }
    const s = path[path.length - 1]; p.ix = s.x; p.iz = s.z;
    return s.t + hyp(s.x - p.x, s.z - p.z) / v;
  };

  AI.moveTo = function (p, x, z, sprint, arrive) {
    const dx = x - p.x, dz = z - p.z, d = hyp(dx, dz);
    if (d < 0.3) { p.mx = p.mz = 0; p.sprint = false; return d; }
    const m = Math.min(1, d / (arrive || 2.5) + 0.15);
    p.mx = (dx / d) * m; p.mz = (dz / d) * m;
    p.sprint = !!sprint && d > 3 && (sprint === 2 || p.stamina > 25);
    return d;
  };

  // ¿Línea de pase libre de rivales? El cono se abre con la distancia (el rival también se mueve).
  AI.lane = function (ax, az, bx, bz, team, w, skipGK) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz + 1e-6, len = Math.sqrt(l2), os = team.opp.players;
    for (let i = 0; i < os.length; i++) {
      const o = os[i]; if (o.off || (skipGK && o.gk)) continue;
      const t = clamp(((o.x - ax) * dx + (o.z - az) * dz) / l2, 0, 1);
      if (t > 0.03 && hyp(o.x - ax - dx * t, o.z - az - dz * t) < w + t * len * 0.09) return false;
    }
    return true;
  };

  // Posición del bloque (coordenadas del equipo: +x = ataque). El bloque sube/baja y bascula con el balón.
  AI.slotPos = function (p, team, phase, out) {
    const s = p.slot, bx = b.x * team.dir, bz = b.z * team.dir;
    let x, z;
    if (phase === 'att') { x = s.x * P.HL * 0.62 + bx * 0.55 + 9 + p.st.depth; z = s.z * P.HW * 0.95 + bz * 0.22; }
    else { x = s.x * P.HL * 0.55 + bx * 0.6 - 7 + Math.min(0, p.st.depth); z = s.z * P.HW * 0.6 + bz * 0.42; }
    out.x = clamp(x, -P.HL + 4, P.HL - 4); out.z = clamp(z, -P.HW + 1.5, P.HW - 1.5);
  };

  function offLine(team) { // línea del fuera de lugar: penúltimo rival, el balón o el medio campo
    const os = team.opp.players, dir = team.dir; let a = -99, c = -99;
    for (let i = 0; i < os.length; i++) { const o = os[i]; if (o.off) continue; const x = o.x * dir; if (x > a) { c = a; a = x; } else if (x > c) c = x; }
    return Math.max(c, b.x * dir, 0);
  }
  AI.offLine = offLine;

  function oppDist(team, x, z) { const os = team.opp.players; let md = 99; for (let i = 0; i < os.length; i++) { const o = os[i]; if (!o.off) md = Math.min(md, hyp(o.x - x, o.z - z)); } return md; }

  function shotK(p, pw) {
    const gk = p.team.opp.players[0], side = gk && !gk.off ? (gk.z > 0 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
    return { type: 'shot', power: pw, aimZ: clamp(side * rnd(0.5, 0.92) + G.gauss() * 0.15 * p.team.D.err, -1.1, 1.1), finesse: false };
  }

  // Mejor opción de pase para el poseedor (o null).
  function bestPass(p, pressed) {
    const team = p.team, dir = team.dir, D = team.D; let best = null, bs = -1;
    for (const m of team.players) {
      if (m === p || m.off) continue;
      const d = hyp(m.x - b.x, m.z - b.z), prog = (m.x - p.x) * dir;
      if (d < 5 || d > 40 + p.st.vision * 25) continue;
      if (m.gk && (!pressed || p.x * dir > -20 || prog > 0)) continue;
      if (m.x * dir > team.offLine + 0.3 && m.x * dir > 0 && Math.random() < D.vision) continue; // fuera de lugar
      const long = d > 26, space = oppDist(team, m.x, m.z);
      if (long ? space < 5 : !AI.lane(b.x, b.z, m.x, m.z, team, 1.5)) continue;
      let s = 0.36 + prog * 0.02 + Math.min(space, 5) * 0.03 - d * 0.004 + p.st.pas + rnd(-0.06, 0.06) * D.err;
      if (prog < -3 && !pressed) s -= 0.15; // el pase atrás solo como salida
      if (long) s -= 0.12;
      if (prog < 0 && m.x * dir < -25) s -= 0.12;
      if (m.ai.runT > 0 && prog > 5) s += 0.15;
      if (s > bs) { bs = s; best = { m, s, long, prog, space }; }
    }
    return best;
  }

  function doPass(p, o) {
    const m = o.m, dir = p.team.dir;
    if (o.long) return G.act.kick(p, { type: 'lob', x: m.x + m.vx, z: m.z + m.vz, target: m });
    if ((m.ai.runT > 0 || m.slot.l === 'F') && o.prog > 8 && m.x * dir > p.team.offLine - 6) { // al hueco
      const L = rnd(7, 12), x = clamp(m.x + dir * L, -P.HL + 4, P.HL - 4), z = clamp(m.z + m.vz * 0.8 - Math.sign(m.z) * 1.5, -P.HW + 2, P.HW - 2);
      if (oppDist(p.team, x, z) > 4) return G.act.kick(p, { type: 'through', x, z, target: m });
    }
    G.act.kick(p, { type: 'pass', target: m });
  }

  function decide(p, nd) {
    const team = p.team, dir = team.dir, D = team.D, a = p.ai, gx = dir * P.HL, gd = hyp(gx - p.x, p.z), xT = p.x * dir;
    const noise = () => rnd(-0.07, 0.07) * D.err, pressed = nd < 2.5;
    // tirar
    let sS = 0; const range = 26 + p.st.longShot;
    if (gd < range) {
      const ang = Math.atan2(Math.abs(p.z), Math.abs(gx - p.x));
      sS = (1.3 - gd / range) * (1 - ang / 1.5) * (AI.lane(p.x, p.z, gx, 0, team, 1.1, true) ? 1 : 0.6) * 1.9 + p.st.sho + (gd < 14 ? 0.3 : 0) + noise();
    }
    // centrar
    let cS = 0;
    if (xT > 30 && Math.abs(p.z) > 13) { let n = 0; for (const m of team.players) if (m !== p && !m.off && m.x * dir > P.HL - 16 && Math.abs(m.z) < 12) n++; if (n) cS = 0.5 + n * 0.08 + noise(); }
    // pasar
    const ps = a.hold > 0.3 || pressed ? bestPass(p, pressed) : null, pS = ps ? ps.s + (nd < 2.5 ? 0.15 : nd < 4.5 ? 0.06 : 0) : 0; // con un rival encima, soltarla antes
    // conducir: la dirección con más espacio, con preferencia por el arco
    const base = Math.atan2(-p.z * 0.4, gx - p.x); let dS = -1, dAng = base, dSpace = 0;
    for (let i = 0; i < 7; i++) {
      const off = [0, 0.5, -0.5, 1, -1, 1.7, -1.7][i], an = base + off, x = p.x + Math.cos(an) * 5, z = p.z + Math.sin(an) * 5;
      if (Math.abs(x) > P.HL - 1 || Math.abs(z) > P.HW - 1) continue;
      const sp = Math.min(oppDist(team, x, z), 8), s = sp * 0.05 + Math.cos(off) * 0.2;
      if (s > dS) { dS = s; dAng = an; dSpace = sp; }
    }
    dS = 0.28 + dS + p.st.drib - (pressed ? 0.18 : 0) - (gd < 20 ? 0.2 : 0) + noise();
    const top = Math.max(sS, cS, pS, dS);
    if (top < 0.3 && pressed && xT < -15) { a.plan = null; return G.act.kick(p, { type: 'clear', x: p.x + dir * 30, z: p.z * 1.2 }); }
    if (top === sS) return G.act.kick(p, Object.assign(shotK(p, clamp(0.42 + gd / 50 + rnd(-0.08, 0.12), 0.4, 0.88)), { finesse: gd < 20 && Math.random() < 0.3 }));
    if (top === cS) return G.act.kick(p, { type: 'cross', x: gx - dir * rnd(6, 11), z: -Math.sign(p.z) * rnd(-1, 5), spin: -Math.sign(p.z) * dir * 3 });
    if (top === pS) return doPass(p, ps);
    a.plan = 'dribble'; a.ang = dAng; a.sprint = dSpace > 5.5 && p.stamina > 30;
    // filigrana si hay un defensa encima y el jugador sabe
    if (nd < 3.2 && nd > 1.5 && p.cd <= 0 && Math.random() < (0.12 + p.st.skill * 0.5) * (1.4 - D.err * 0.4)) {
      const k = Math.random(); G.act.skill(p, k < 0.45 ? 'croqueta' : k < 0.8 ? 'stepover' : 'roulette', Math.cos(dAng + (k < 0.45 ? 1.3 : 0)), Math.sin(dAng + (k < 0.45 ? 1.3 : 0)));
    }
  }

  function carrier(p, dt) {
    const a = p.ai, D = p.team.D;
    a.hold += dt; a.t -= dt;
    G.nearOpp(p); const nd = G.nd;
    if (p.state !== 'free') return;
    if (a.t <= 0 || (nd < 2 && !a.rush)) { a.rush = nd < 2; decide(p, nd); a.t = D.react * T.aiReact * rnd(0.7, 1.3); }
    if (nd >= 2) a.rush = false;
    if (a.plan === 'dribble') { p.mx = Math.cos(a.ang); p.mz = Math.sin(a.ang); p.sprint = a.sprint; } else { p.mx *= 0.9; p.mz *= 0.9; }
  }

  function chase(p, team) {
    AI.moveTo(p, p.ix, p.iz, 2, 1);
    if (b.y > 0.9 && hyp(b.x - p.x, b.z - p.z) < 5 && !p.buf && p.state === 'free') { // balón aéreo: remata o despeja
      const dir = team.dir; G.nearOpp(p);
      if (hyp(dir * P.HL - p.x, p.z) < 15) G.act.kick(p, shotK(p, 0.7));
      else if (p.x * dir < -20 && G.nd < 5) G.act.kick(p, { type: 'clear', x: p.x + dir * 30, z: p.z * 1.3 });
    }
  }

  // contain = solo temporiza a distancia; si no, va a quitar.
  function press(p, c, contain, dt) {
    const team = p.team, D = team.D, gx = -team.dir * P.HL;
    let ux = gx - c.x, uz = -c.z; const ul = hyp(ux, uz) + 0.01; ux /= ul; uz /= ul;
    const d = hyp(b.x - p.x, b.z - p.z), stand = contain ? 3.2 : 0.8;
    AI.moveTo(p, b.x + c.vx * 0.25 + ux * stand, b.z + c.vz * 0.25 + uz * stand, d > 4, 1.2);
    if (d < 3.5) p.faceTo = Math.atan2(b.z - p.z, b.x - p.x);
    if (contain || p.cd > 0 || p.state !== 'free' || p.freeze > 0) return;
    const ag = T.aiAggr;
    if (d < 1.7 && b.y < 0.5) { if (Math.random() < D.tackle * 5 * ag * dt) G.act.tackle(p); }
    else if (d > 2 && d < 4.2 && c.sprint && c.x * team.dir < -15 && Math.random() < 0.3 * ag * D.press * dt) G.act.slide(p);
  }

  const OFF = [[0, 0], [0, 6], [0, -6], [5, 3], [5, -3]], sp = { x: 0, z: 0 };
  function position(p, team, dt) {
    const dir = team.dir, s = p.slot, a = p.ai, bxT = b.x * dir, bzT = b.z * dir, opp = team.opp;
    AI.slotPos(p, team, team.phase, sp);
    let x = sp.x, z = sp.z, sprint = false;
    if (team.phase === 'att') {
      a.st -= dt;
      if (a.st <= 0) { // apoyo: el punto cercano más libre y con línea de pase
        a.st = rnd(0.4, 0.9); let bs = -1e9;
        for (let i = 0; i < 5; i++) {
          const ox = OFF[i][0], oz = OFF[i][1], wx = (x + ox) * dir, wz = (z + oz) * dir;
          const sc = Math.min(oppDist(team, wx, wz), 8) + (AI.lane(b.x, b.z, wx, wz, team, 1.2) ? 3 : 0) - hyp(ox, oz) * 0.25;
          if (sc > bs) { bs = sc; a.ox = ox; a.oz = oz; }
        }
        if (a.runT <= 0 && (s.l === 'F' || p.st.run > 1.3) && bxT > -15 && Math.random() < 0.22 * p.st.run) a.runT = rnd(1.8, 3); // desmarque de ruptura
        a.ov = Math.random() < 0.3;
      }
      x += a.ox; z += a.oz;
      if (a.runT > 0) { a.runT -= dt; x = team.offLine - 0.4; z -= Math.sign(z) * 3; sprint = true; }
      if (s.l === 'D' && Math.abs(s.z) > 0.6 && bzT * s.z > 0 && bxT > -8 && (p.st.overlap || a.ov)) { x = bxT + 8; z = Math.sign(s.z) * (P.HW - 2.5); sprint = true; } // el lateral dobla
      if (s.l === 'F' && bxT > 30 && Math.abs(bzT) > 12) { x = P.HL - 8; z = s.z > 0.1 ? 4 : s.z < -0.1 ? -4 : 0; } // al área a esperar el centro
      x = Math.min(x, Math.max(team.offLine - 0.7, bxT)); // en juego
    } else {
      if (s.l === 'D') x = Math.min(x, bxT - 3); // si el balón superó la línea, a correr hacia atrás
      let mo = null, md = 9;
      for (const o of opp.players) { // marca al rival de su zona, del lado del arco
        if (o.off || o.gk || o === b.owner) continue;
        const ox = -o.x * opp.dir, oz = -o.z * opp.dir; if (ox < x - 4) continue;
        const d = hyp(ox - x, oz - z); if (d < md) { md = d; mo = o; }
      }
      if (mo) { const ox = mo.x * dir, oz = mo.z * dir, gl = hyp(-P.HL - ox, oz) + 0.01, w = bxT < -18 ? 0.75 : 0.5; x = lerp(x, ox + ((-P.HL - ox) / gl) * 1.4, w); z = lerp(z, oz - (oz / gl) * 1.4, w); }
      sprint = p.x * dir - x > 6;
    }
    x = clamp(x, -P.HL + 4, P.HL - 3); z = clamp(z, -P.HW + 1.5, P.HW - 1.5);
    if (AI.moveTo(p, x * dir, z * dir, sprint, 3) < 1.5) p.faceTo = Math.atan2(b.z - p.z, b.x - p.x);
  }

  AI.update = function (team, dt) {
    const dir = team.dir, D = team.D, o = b.held || b.owner, ps = team.players;
    const mine = !!o && o.team === team, theirs = !!o && !mine;
    team.phase = mine ? 'att' : theirs ? 'def' : G.M.lastPoss === team ? 'att' : 'def';
    team.offLine = offLine(team);
    team.chaser = null;
    if (!o) { // balón suelto: va el que llega antes (o el destinatario del pase)
      let be = 1e9;
      for (const p of ps) { if (p.off || p.gk) continue; p.eta = AI.eta(p) + (p.state === 'free' ? 0 : 0.5); if (p.eta < be) { be = p.eta; team.chaser = p; } }
      const r = team.receiver; if (r && !r.off && r.eta < be + 0.7) team.chaser = r;
    }
    let pr1 = null, pr2 = null, m1 = 0, m2 = 0; // presión: 1 = temporizar, 2 = ir a quitar
    if (theirs && !b.held) {
      let s1 = 1e9, s2 = 1e9;
      for (const p of ps) {
        if (p.off || p.gk || (team.human && p === team.active)) continue;
        const s = hyp(p.x - b.x, p.z - b.z) + ((p.x - b.x) * dir < 0 ? 0 : 6);
        if (s < s1) { s2 = s1; pr2 = pr1; s1 = s; pr1 = p; } else if (s < s2) { s2 = s; pr2 = p; }
      }
      const bxT = b.x * dir, ag = D.press * T.aiAggr;
      if (team.human) { const ac = team.active; m1 = team.callPress ? 2 : !ac || hyp(ac.x - b.x, ac.z - b.z) > 7 ? 1 : 0; }
      else { m1 = bxT < -10 + 35 * (ag - 0.55) || bxT < -18 ? 2 : 1; m2 = ag >= 1 && bxT < 0 ? (bxT < -25 ? 2 : 1) : 0; }
    }
    for (const p of ps) {
      if (p.off) continue;
      if (p.gk) { G.GK.think(p, team, dt); continue; }
      if ((team.human && p === team.active) || p.state === 'setpiece') continue;
      p.faceTo = null; p.shield = false;
      if (o === p) carrier(p, dt);
      else if (p === team.chaser) chase(p, team);
      else if (p === pr1 && m1) press(p, o, m1 === 1, dt);
      else if (p === pr2 && m2) press(p, o, m2 === 1, dt);
      else position(p, team, dt);
    }
  };

  // Cobro de balón parado por la IA.
  AI.setPiece = function (p, rs) {
    const team = p.team, dir = team.dir, gx = dir * P.HL;
    switch (rs.type) {
      case 'penalty': return G.act.kick(p, { type: 'shot', power: rnd(0.55, 0.8), aimZ: (Math.random() < 0.5 ? -1 : 1) * rnd(0.5, 0.95), finesse: false });
      case 'corner': return G.act.kick(p, { type: 'cross', x: gx - dir * rnd(5, 10), z: rnd(-4, 4), spin: Math.sign(b.z) * dir * 3 });
      case 'freekick': if (hyp(gx - b.x, b.z) < 28 && Math.abs(b.z) < 22) return G.act.kick(p, Object.assign(shotK(p, rnd(0.7, 0.85)), { finesse: true })); break;
      case 'throwin': {
        let best = null, bd = 1e9;
        for (const m of team.players) { if (m === p || m.off || m.gk) continue; const d = hyp(m.x - p.x, m.z - p.z); if (d > 3 && d < bd) { bd = d; best = m; } }
        if (best) return G.act.kick(p, { type: 'throw', x: best.x, z: best.z, target: best });
      }
    }
    const o = bestPass(p, false);
    if (o) doPass(p, o); else G.GK.longBall(p, team);
  };
})();
