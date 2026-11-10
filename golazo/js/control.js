// Control humano: convierte la entrada en acciones del jugador activo. Los botones cambian según se ataque o se defienda.
(function () {
  'use strict';
  const G = window.G, P = G.P, b = G.ball, hyp = Math.hypot, clamp = G.clamp;
  const C = (G.Control = { ctx: 'att', power: 0, target: null, autoTackle: true });
  try { C.autoTackle = localStorage.getItem('golazo.auto') !== '0'; } catch (e) {}
  let autoCD = 0;
  let lastOwner = null;

  // Pase asistido: el raso siempre encuentra a alguien (el mejor alineado con el stick, con línea libre);
  // al hueco y largo solo buscan hacia donde se apunta. Mantener el botón prefiere al más lejano.
  function pickMate(p, dx, dz, type, power) {
    const team = p.team, dir = team.dir, pref = type === 'lob' ? 28 + power * 20 : 10 + power * 20;
    let best = null, bs = 1e9;
    for (const m of team.players) {
      if (m === p || m.off) continue;
      const ex = m.x - b.x, ez = m.z - b.z, d = hyp(ex, ez); if (d < 3 || d > 55) continue;
      const ang = Math.acos(clamp((ex * dx + ez * dz) / d, -1, 1));
      if (type !== 'pass' && ang > 0.9) continue;
      let s = ang * 30 + Math.abs(d - pref) * 0.4 + (ang > 1.3 ? 20 : 0) + (m.gk ? 12 : 0) + (type === 'pass' && d > pref + 12 ? (d - pref - 12) * 1.2 : 0); // el raso largo es lento: para eso está el pase largo
      if (type === 'pass' && !G.AI.lane(b.x, b.z, m.x, m.z, team, 1.1)) s += 16; // con un rival en la línea, mejor otro compañero
      if (type === 'through' && (m.x - p.x) * dir < -3) s += 15;
      if (s < bs) { bs = s; best = m; }
    }
    return best;
  }

  const defScore = (m, dir) => hyp(m.x - b.x - b.vx * 0.3, m.z - b.z - b.vz * 0.3) + ((m.x - b.x) * dir < 0 ? 0 : 5);
  function defender(team, skip) { // el mejor para defender: cerca del balón y del lado del arco propio
    let best = null, bs = 1e9;
    for (const m of team.players) { if (m.off || m.gk || m === skip || m.state === 'down') continue; const s = defScore(m, team.dir); if (s < bs) { bs = s; best = m; } }
    return best;
  }

  // Cambio de jugador inteligente: al poseedor, al receptor, al que llega antes al balón suelto, o al mejor defensor.
  function autoSwitch(team, dt) {
    const a = team.active, o = b.owner; team.swCD -= dt;
    if (!a || a.off || a.gk) { G.Match.setActive(team, defender(team, null)); lastOwner = o; return; }
    if (o && o.team === team) { if (o !== a && !o.gk) G.Match.setActive(team, o); }
    else if (o && o !== lastOwner) { const d = defender(team, null); if (d && d !== a && defScore(a, team.dir) > defScore(d, team.dir) + 6) G.Match.setActive(team, d); }
    else if (!o && !b.held) { const c = team.chaser; if (c && c !== a && team.swCD <= 0 && a.eta > c.eta + 0.35) G.Match.setActive(team, c); }
    lastOwner = o;
  }

  function shoot(p, power, fin, sw, wz, mag) {
    const cb = G.Cam.basis; let az = 0, has = false;
    if (sw) { const sz = sw.x * cb.rz + sw.y * cb.uz; if (Math.abs(sz) > 0.3) { az = sz; has = true; } } // el gesto apunta
    if (!has && mag > 0.3 && Math.abs(wz / mag) > 0.25) { az = wz / mag; has = true; }
    const gk = p.team.opp.players[0];
    G.act.kick(p, { type: 'shot', power, finesse: fin, aimZ: has ? clamp(az * 1.5, -1, 1) * 0.9 : (gk.z > 0 ? -1 : 1) * 0.75 }); // sin dirección: palo lejano al portero
  }

  function pass(p, type, power, dx, dz) {
    const M = G.M, team = p.team, dir = team.dir, m = pickMate(p, dx, dz, type, power) || (type === 'through' ? pickMate(p, dx, dz, 'pass', power) : null), far = (a) => ({ type, x: p.x + dx * a, z: p.z + dz * a });
    let k;
    if (M.state === 'ready' && M.rs.type === 'throwin') k = m ? { type: 'throw', x: m.x, z: m.z, target: m } : { type: 'throw', x: p.x + dx * 12, z: p.z + dz * 12 };
    else if (type === 'lob') {
      if (p.x * dir > 28 && Math.abs(p.z) > 11) { // desde la banda en campo rival = centro al área
        let t = null, bd = 1e9;
        for (const q of team.players) { if (q === p || q.off || q.x * dir < P.HL - 18 || Math.abs(q.z) > 13) continue; const d = hyp(q.x - dir * (P.HL - 9), q.z); if (d < bd) { bd = d; t = q; } }
        k = { type: 'cross', x: t ? t.x + t.vx * 0.6 : dir * (P.HL - 9), z: t ? t.z + t.vz * 0.6 : -Math.sign(p.z) * 2, spin: -Math.sign(p.z) * dir * 3, target: t };
      } else k = m ? { type: 'lob', x: m.x + m.vx * 0.9, z: m.z + m.vz * 0.9, target: m } : far(25 + power * 20);
    } else if (type === 'through') {
      if (m) {
        // pase filtrado: de varios puntos por delante del compañero, el más libre de rivales y con línea limpia
        let bx = m.x + dir * 9, bz = m.z, best = -1e9;
        for (const L of [6, 10, 14 + power * 5]) for (const lat of [-4, 0, 4]) {
          const x = clamp(m.x + dir * L, -P.HL + 3, P.HL - 3), z = clamp(m.z + lat + m.vz * 0.6, -P.HW + 2, P.HW - 2);
          const sc = Math.min(G.AI.oppDist(team, x, z), 8) + (G.AI.lane(b.x, b.z, x, z, team, 1.1) ? 4 : 0) - Math.abs(lat) * 0.2 + L * 0.12;
          if (sc > best) { best = sc; bx = x; bz = z; }
        }
        m.ai.runT = 2.8; // el compañero arranca al espacio
        k = { type, x: bx, z: bz, target: m };
      } else k = far(14 + power * 14);
    } else k = m ? { type, target: m } : far(10 + power * 16);
    G.act.kick(p, k);
  }

  C.update = function (dt) {
    const M = G.M; if (M.human < 0) return;
    const team = M.teams[M.human], I = G.Input.s, B = I.b, ready = M.state === 'ready';
    C.target = null;
    if (M.state !== 'play' && !ready) { if (team.active) team.active.charge = null; C.power = 0; return; }
    if (!ready) autoSwitch(team, dt);
    const p = team.active; if (!p || (ready && M.rs.taker !== p)) return;
    const cb = G.Cam.basis, wx = I.x * cb.rx + I.y * cb.ux, wz = I.x * cb.rz + I.y * cb.uz, mag = hyp(wx, wz), o = b.held || b.owner;
    const def = !ready && ((o && o.team !== team) || (!o && M.lastPoss !== team && hyp(p.x - b.x, p.z - b.z) > 3.5));
    C.ctx = def ? 'def' : 'att';
    p.faceTo = null;
    // El destinatario de un pase va solo al encuentro del balón (como en los juegos de consola); el stick manda de nuevo
    // cuando el balón está cerca, o si se empuja claramente en contra.
    const ix = p.ix - p.x, iz = p.iz - p.z, id = hyp(ix, iz);
    const recv = team.receiver === p && hyp(b.x - p.x, b.z - p.z) > 3 && (mag < 0.12 || (wx * ix + wz * iz) / (mag * id + 0.01) > -0.3);
    if (!o && !def && !ready && (recv || (mag < 0.12 && team.chaser === p))) G.AI.moveTo(p, p.ix, p.iz, recv || I.sprint ? 2 : id > 6, 1); // el receptor ataca el balón: no espera a que le llegue
    else { p.mx = wx; p.mz = wz; p.sprint = I.sprint; }
    p.shield = b.owner === p && (I.shield || (G.Input.touch && mag > 0.12 && mag < 0.55 && (G.nearOpp(p), G.nd < 2.2))); // en táctil no hay botón: se protege al caminar con un rival encima
    const dx = mag > 0.2 ? wx / mag : Math.cos(p.face), dz = mag > 0.2 ? wz / mag : Math.sin(p.face);

    if (def) { // defensa: pase = cambiar jugador, tiro = entrada, largo = barrida, hueco/filigrana = pedir presión
      if (B.sw.press || B.pass.press) G.Match.setActive(team, defender(team, p));
      if (B.shoot.press) G.act.tackle(p);
      // Ayuda (se puede apagar en pausa): si llegas de frente o de lado con el balón al alcance, la entrada sale sola.
      autoCD -= dt;
      if (C.autoTackle && o && !b.held && autoCD <= 0 && p.state === 'free' && p.cd <= 0) {
        const ex = b.x - p.x, ez = b.z - p.z, ed = hyp(ex, ez);
        if (ed < 1.25 && b.y < 0.5 && (ex * Math.cos(p.face) + ez * Math.sin(p.face)) / (ed + 0.01) > 0.4 && (p.x - o.x) * Math.cos(o.face) + (p.z - o.z) * Math.sin(o.face) > -0.2) { G.act.tackle(p); autoCD = 0.9; }
      }
      if (B.lob.press) G.act.slide(p);
      team.callPress = B.through.down || B.skill.down;
      p.charge = null; C.power = 0;
      if (!I.sprint && hyp(b.x - p.x, b.z - p.z) < 5) p.faceTo = Math.atan2(b.z - p.z, b.x - p.x); // perfilarse hacia el balón
      return;
    }
    team.callPress = false;
    if (o === p || ready) C.target = pickMate(p, dx, dz, 'pass', 0.2); // el aro blanco
    if (B.sw.press && !ready) G.Match.setActive(team, defender(team, p));
    if (B.shoot.press) p.charge = { t: 0 }; // mantener = potencia
    if (p.charge) {
      p.charge.t += dt; C.power = clamp(0.3 + p.charge.t * 0.9, 0.3, 1);
      if (B.shoot.release || !B.shoot.down || p.charge.t > 0.85) { shoot(p, C.power, I.fin || !!B.shoot.swipe, B.shoot.swipe, wz, mag); p.charge = null; }
    } else C.power = 0;
    if (B.pass.press) pass(p, 'pass', 0.2, dx, dz); // sale al pulsar, sin esperar a soltar: el destino ya lo marca el aro
    if (B.through.press) pass(p, 'through', 0.5, dx, dz);
    if (B.lob.press) pass(p, 'lob', 0.3, dx, dz);
    if (B.skill.press && !ready) { // filigrana según el stick respecto a donde mira: adelante = bicicleta, al lado = bola cruzada, atrás = giro
      let sx = I.rx * cb.rx + I.ry * cb.ux, sz = I.rx * cb.rz + I.ry * cb.uz, sm = hyp(sx, sz);
      if (sm < 0.3) { sx = wx; sz = wz; sm = mag; }
      let kind = 'stepover', ex = Math.cos(p.face), ez = Math.sin(p.face);
      if (sm > 0.3) { ex = sx / sm; ez = sz / sm; const rel = Math.abs(G.angDiff(p.face, Math.atan2(sz, sx))); kind = rel < 0.9 ? 'stepover' : rel < 2.2 ? 'croqueta' : 'roulette'; }
      G.act.skill(p, kind, ex, ez);
    }
  };
})();
