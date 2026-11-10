// Partido: máquina de estados, reloj y árbitro (gol, fuera, saques, faltas, tarjetas, penal, fuera de lugar).
(function () {
  'use strict';
  const G = window.G, P = G.P, T = G.T, b = G.ball, hyp = Math.hypot, clamp = G.clamp, rnd = G.rnd, AI = G.AI;
  const M = (G.M = { state: 'idle', stateT: 0, teams: [], players: [], human: -1, clock: 0, half: 1, halfLen: 180, excite: 0.2, rs: null, lastPoss: null, time: 0, goalInfo: null });
  const Match = (G.Match = {});
  const LABEL = { corner: 'Saque de esquina', goalkick: 'Saque de meta', throwin: 'Saque de banda', freekick: 'Tiro libre', penalty: '¡PENAL!' };

  function makeTeam(id, data, human, diff, formation) {
    const team = {
      id, data, name: data.name, short: data.short, dir: id ? -1 : 1, human, D: human ? G.MATE : G.DIFFS[diff] || G.DIFFS.normal,
      score: 0, players: [], active: null, receiver: null, chaser: null, callPress: false, phase: 'def', offLine: 0, swCD: 0, lastP: null, lastPT: -99,
      formation: formation || data.formation || '4-4-2', stats: { shots: 0, onTarget: 0, poss: 0, fouls: 0, yellow: 0, red: 0, corners: 0, offsides: 0, passes: 0 },
    };
    team.players = G.Data.lineup(data, team.formation).map((l) => G.makePlayer(team, l.info, l.slot));
    return team;
  }

  // cfg: { home, away, human: 0|1|-1 (demo IA vs IA), diff, halfLen (s reales por tiempo), formations: [f0, f1] }
  Match.start = function (cfg) {
    M.cfg = cfg; M.human = cfg.human == null ? -1 : cfg.human; M.halfLen = cfg.halfLen || 180;
    M.half = 1; M.clock = 0; M.time = 0; M.excite = 0.2; M.state = 'idle'; M.goalInfo = null;
    M.teams = [0, 1].map((id) => makeTeam(id, id ? cfg.away : cfg.home, M.human === id, cfg.diff, cfg.formations && cfg.formations[id]));
    M.teams[0].opp = M.teams[1]; M.teams[1].opp = M.teams[0];
    M.players = M.teams[0].players.concat(M.teams[1].players);
    b.lastTouch = b.kicker = b.shotBy = null;
    G.emit('matchStart', M);
    restart('kickoff', M.teams[0], 0, 0);
  };

  Match.minute = () => Math.floor((M.half - 1) * 45 + Math.min(M.clock / M.halfLen, 1.2) * 45);
  Match.setActive = function (team, p) { if (p && !p.off) { if (team.active && team.active !== p) team.active.charge = null; team.active = p; team.swCD = 0.6; } };

  // ---------- Balón parado ----------
  function restart(type, team, x, z) {
    const first = M.state === 'idle';
    M.state = 'setup'; M.stateT = 0;
    const rs = (M.rs = { type, team, x, z, taker: null, dur: first ? 0.05 : type === 'kickoff' ? 1.4 : 2.4, aiT: rnd(0.9, 1.7) });
    b.x = x; b.z = z; b.y = P.R; b.vx = b.vy = b.vz = b.spin = 0; b.owner = b.held = null; b.inNet = 0; b.kickT = 9;
    M.lastPoss = team; team.receiver = team.opp.receiver = null;
    for (const p of M.players) { G.setState(p, 'free'); p.buf = p.charge = null; p.offs = false; p.shield = false; p.freeze = 0; }
    placeSpots(rs);
    if (LABEL[type]) G.emit('msg', { t: LABEL[type], c: team });
    G.emit('restart', rs);
  }
  Match.restart = restart;

  function placeSpots(rs) {
    const type = rs.type, team = rs.team, x = rs.x, z = rs.z, opp = team.opp, dir = team.dir, gx = dir * P.HL, o = { x: 0, z: 0 };
    const ox = b.x; if (type === 'goalkick') b.x = -18 * dir; // el bloque se abre como si el balón ya estuviera en juego
    for (const t of M.teams) for (const p of t.players) {
      if (p.gk) { p.sx = -t.dir * (P.HL - 1.5); p.sz = 0; continue; }
      AI.slotPos(p, t, t === team ? 'att' : 'def', o); p.sx = o.x * t.dir; p.sz = o.z * t.dir;
    }
    b.x = ox;
    const field = (t, skip) => t.players.filter((p) => !p.off && !p.gk && skip.indexOf(p) < 0);
    const near = (t, px, pz, skip) => field(t, skip).sort((a, c) => hyp(a.sx - px, a.sz - pz) - hyp(c.sx - px, c.sz - pz))[0];
    const best = (t, fn) => field(t, []).sort((a, c) => fn(c) - fn(a))[0];
    let taker, face = dir > 0 ? 0 : Math.PI;
    switch (type) {
      case 'kickoff': {
        for (const t of M.teams) for (const p of field(t, [])) { p.sx = Math.min((p.slot.x - 0.5) * P.HL * 0.62, -2) * t.dir; p.sz = p.slot.z * P.HW * 0.8 * t.dir; }
        const fw = field(team, []).sort((a, c) => c.slot.x - a.slot.x);
        taker = fw[0]; fw[1].sx = -1.2 * dir; fw[1].sz = 7; face = Math.atan2(7, -1.2 * dir); break;
      }
      case 'penalty': {
        taker = best(team, (p) => p.sho);
        let i = 0;
        for (const t of M.teams) for (const p of field(t, [taker])) { p.sx = gx - dir * (P.BOXL + 5 + (i % 2) * 2.5); p.sz = ((i % 10) - 4.5) * 3.6 * (i < 10 ? 1 : 0.9); i++; }
        opp.players[0].sx = gx - dir * 0.4; break;
      }
      case 'corner': {
        const sg = Math.sign(z), SP = [[5, 2.5], [7, -3], [10.5, 0], [9, -7], [14, 5], [20, -2]], used = [];
        taker = best(team, (p) => p.pas - (p.slot.l === 'D' ? 1 : 0));
        const att = field(team, [taker]).sort((a, c) => c.slot.x - a.slot.x + (c.phy - a.phy) * 0.3);
        SP.forEach((s, i) => {
          const p = att[i]; if (!p) return;
          p.sx = gx - dir * s[0]; p.sz = sg * s[1];
          const d = i < 5 && near(opp, p.sx, p.sz, used); if (d) { used.push(d); d.sx = p.sx + dir; d.sz = p.sz * 0.85; }
        });
        if (att[6]) { att[6].sx = x - dir * 8; att[6].sz = z - sg * 7; }
        face = Math.atan2(-z, gx - dir * 9 - x); break;
      }
      case 'freekick': {
        const gd = hyp(gx - x, z), ux = (gx - x) / gd, uz = -z / gd;
        if (gd < 30 && Math.abs(z) < 24) { // barrera
          taker = best(team, (p) => p.sho);
          const n = gd < 22 ? 4 : 3, used = [];
          for (let i = 0; i < n; i++) { const w = near(opp, x + ux * 9.3, z + uz * 9.3, used); if (!w) break; used.push(w); const k = (i - (n - 1) / 2) * 0.72; w.sx = x + ux * 9.3 - uz * k; w.sz = z + uz * 9.3 + ux * k; }
          face = Math.atan2(uz, ux);
        } else taker = near(team, x, z, []);
        break;
      }
      case 'throwin': {
        const sg = Math.sign(z);
        taker = near(team, x, z, []);
        const m1 = near(team, x, z, [taker]), m2 = m1 && near(team, x, z, [taker, m1]);
        if (m1) { m1.sx = clamp(x + dir * 8, -P.HL + 3, P.HL - 3); m1.sz = z - sg * 5; }
        if (m2) { m2.sx = clamp(x - dir * 7, -P.HL + 3, P.HL - 3); m2.sz = z - sg * 7; }
        face = Math.atan2(-sg, dir * 0.4); break;
      }
      case 'goalkick':
        taker = team.players[0];
        for (const p of field(opp, [])) if (G.GK.inOwnBox(team, p.sx, p.sz, 1)) p.sx = -dir * (P.HL - P.BOXL - 3);
        break;
    }
    taker = taker || team.players.find((p) => !p.off); // por si las expulsiones dejaron sin candidatos
    rs.taker = taker; rs.face = face;
    taker.sx = x - Math.cos(face) * 0.85; taker.sz = z - Math.sin(face) * 0.85;
    const minD = type === 'throwin' ? 3 : type === 'goalkick' ? 0 : 9.3; // distancia reglamentaria
    for (const p of field(opp, [])) {
      const d = hyp(p.sx - x, p.sz - z);
      if (d < minD) { const ux = d > 0.1 ? (p.sx - x) / d : -dir, uz = d > 0.1 ? (p.sz - z) / d : 0; p.sx = x + ux * minD; p.sz = z + uz * minD; }
    }
  }

  function stepSetup(dt) {
    const rs = M.rs;
    for (const p of M.players) {
      if (p.off) continue;
      p.faceTo = null; AI.moveTo(p, p.sx, p.sz, 2, 2);
      G.updatePlayer(p, dt * 1.4); p.stamina = Math.min(p.maxSt, p.stamina + 8 * dt);
    }
    if (M.stateT < rs.dur) return;
    let jump = 0;
    for (const p of M.players) {
      if (p.off) continue;
      jump = Math.max(jump, hyp(p.x - p.sx, p.z - p.sz));
      p.x = p.sx; p.z = p.sz; p.vx = p.vz = p.mx = p.mz = 0; p.y = 0; p.jumpV = 0; p.sprint = false; p.face = Math.atan2(b.z - p.z, b.x - p.x); G.setState(p, 'free');
    }
    const t = rs.taker; t.face = rs.face; G.setState(t, 'setpiece');
    if (rs.type === 'throwin') { b.held = t; t.x = rs.x; t.z = rs.z; }
    for (const tm of M.teams) if (tm.human) Match.setActive(tm, tm === rs.team && !t.gk || rs.type === 'goalkick' && tm === rs.team ? t : tm.players.filter((p) => !p.off && !p.gk).sort((a, c) => G.dist(a, b) - G.dist(c, b))[0]);
    M.state = 'ready'; M.stateT = 0;
    if (jump > 6) G.emit('cut');
    G.emit('whistle', 1);
  }

  function stepReady(dt) {
    const rs = M.rs, t = rs.taker;
    M.time += dt; b.kickT += dt;
    for (const p of M.players) {
      if (p.off) continue;
      if (p !== t) { p.mx = p.mz = 0; p.sprint = false; p.faceTo = Math.atan2(b.z - p.z, b.x - p.x); }
      else if (!G.isHuman(p)) p.mx = p.mz = 0;
      G.updatePlayer(p, dt);
    }
    if (M.state !== 'ready') { ballStep(dt); return; } // ya cobró
    if (b.held) heldBall(); else { b.x = rs.x; b.z = rs.z; }
    if (M.stateT > (t.team.human ? 12 : rs.aiT) && t.state === 'setpiece') AI.setPiece(t, rs);
  }

  // ---------- Simulación ----------
  function heldBall() {
    const h = b.held, c = Math.cos(h.face), s = Math.sin(h.face);
    if (h.gk) { b.x = h.x + c * 0.4; b.z = h.z + s * 0.4; b.y = 1.1 + h.y; } else { b.x = h.x + c * 0.15; b.z = h.z + s * 0.15; b.y = 2.05; }
    b.vx = h.vx; b.vz = h.vz; b.vy = 0;
  }

  function ballStep(dt) {
    if (b.held) return heldBall();
    const n = clamp(Math.ceil((hyp(b.vx, b.vy, b.vz) * dt) / 0.07), 1, 14), h = dt / n, ps = M.players;
    for (let i = 0; i < n && !b.held; i++) {
      const px = b.x, py = b.y, pz = b.z;
      G.Ball.integrate(b, h); G.Ball.collideGoal(px, py, pz);
      if (M.state !== 'play') continue;
      for (let j = 0; j < ps.length && !b.held && M.state === 'play'; j++) G.ballContact(ps[j]);
    }
    if (b.bounced) { b.bounced = false; G.emit('bounce'); }
    if (b.held) heldBall();
  }

  function separate() { // los cuerpos no se atraviesan; el más fuerte desplaza al otro
    const ps = M.players;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], c = ps[j]; if (a.off || c.off) continue;
      const dx = c.x - a.x, dz = c.z - a.z, d = hyp(dx, dz);
      if (d >= 0.6 || d < 1e-3 || a.state === 'down' || c.state === 'down' || a.state === 'setpiece' || c.state === 'setpiece') continue;
      const push = 0.6 - d, wa = clamp(0.5 + (c.phy + c.st.shield + (c.shield ? 0.3 : 0) - a.phy - a.st.shield - (a.shield ? 0.3 : 0)) * 0.4, 0.15, 0.85);
      a.x -= (dx / d) * push * wa; a.z -= (dz / d) * push * wa; c.x += (dx / d) * push * (1 - wa); c.z += (dz / d) * push * (1 - wa);
    }
  }

  function sim(dt) {
    M.time += dt; b.kickT += dt;
    if (!b.held) G.Ball.predict();
    AI.update(M.teams[0], dt); AI.update(M.teams[1], dt);
    for (const p of M.players) G.updatePlayer(p, dt);
    if (M.state !== 'play') return; // una falta cortó el juego
    separate(); ballStep(dt);
    if (M.state !== 'play') return;
    if (M.lastPoss) M.lastPoss.stats.poss += dt;
    if (Math.abs(b.x) > P.HL - 18 && Math.abs(b.z) < 20) M.excite = Math.max(M.excite, 0.5);
    rules();
    if (M.state !== 'play') return;
    M.clock += dt;
    if (M.clock >= M.halfLen && (M.clock > M.halfLen + 8 || !(Math.abs(b.x) > P.HL - 22 && Math.abs(b.z) < 24))) { // no pita en plena jugada de gol
      G.emit('whistle', M.half === 1 ? 2 : 3);
      M.state = M.half === 1 ? 'halftime' : 'fulltime'; M.stateT = 0;
      G.emit(M.state, M);
    }
  }

  function rules() {
    if (b.held) return;
    const R = P.R, s = b.x > 0 ? 1 : -1, lt = b.lastTouch;
    if (Math.abs(b.x) > P.HL + R) {
      const att = M.teams[0].dir === s ? M.teams[0] : M.teams[1], zs = b.z >= 0 ? 1 : -1;
      if (b.inNet) return goal(att);
      if (lt && lt.team === att) restart('goalkick', att.opp, s * (P.HL - P.SIXL), zs * 5);
      else { att.stats.corners++; restart('corner', att, s * (P.HL - 0.4), zs * (P.HW - 0.4)); }
    } else if (Math.abs(b.z) > P.HW + R) restart('throwin', lt ? lt.team.opp : M.teams[0], clamp(b.x, -P.HL + 1, P.HL - 1), Math.sign(b.z) * P.HW);
  }

  function goal(team) {
    team.score++; M.state = 'goal'; M.stateT = 0; M.excite = 1;
    const own = !(team.lastP && M.time - team.lastPT < 8), scorer = own ? b.lastTouch : team.lastP;
    if (!own && b.shotBy && b.shotBy.team === team) { team.stats.onTarget++; b.shotBy = null; }
    M.goalInfo = { team, scorer, own, minute: Match.minute() + 1 };
    for (const p of M.players) { p.buf = p.charge = null; if (p.state !== 'gkdive') G.setState(p, p.team === team ? 'celebrate' : 'free'); }
    G.emit('goal', M.goalInfo);
  }

  function stepGoal(dt) {
    const gi = M.goalInfo, sc = gi.own ? null : gi.scorer;
    M.time += dt;
    for (const p of M.players) {
      if (p.off) continue;
      p.faceTo = null; p.sprint = false; p.mx = p.mz = 0;
      if (p === sc) AI.moveTo(p, Math.sign(p.x) * (P.HL - 9), P.HW - 5, false, 3);
      else if (sc && p.team === gi.team && !p.gk && G.dist(p, sc) > 2.5) AI.moveTo(p, sc.x, sc.z, false, 3);
      G.updatePlayer(p, dt);
    }
    separate(); ballStep(dt);
    if (M.stateT > 4.5) restart('kickoff', gi.team.opp, 0, 0);
  }

  // ---------- Eventos que llegan desde la física ----------
  Match.onKick = function (p, k) {
    const team = p.team, dir = team.dir, rst = M.state === 'ready' ? M.rs.type : null;
    M.lastPoss = team; team.lastP = p; team.lastPT = M.time;
    team.receiver = k.target || null; team.opp.receiver = null;
    if (rst) { M.state = 'play'; M.stateT = 0; }
    for (const m of M.players) m.offs = false;
    if (rst !== 'throwin' && rst !== 'corner' && rst !== 'goalkick') { // foto del fuera de lugar en el momento del pase
      let a = -99, c = -99;
      for (const o of team.opp.players) { if (o.off) continue; const x = o.x * dir; if (x > a) { c = a; a = x; } else if (x > c) c = x; }
      for (const m of team.players) { const x = m.x * dir; if (m !== p && !m.off && x > 0 && x > b.x * dir + 0.1 && x > c + 0.25) { m.offs = true; m.offsX = m.x; m.offsZ = m.z; } }
    }
    if (k.type === 'shot') { team.stats.shots++; M.excite = Math.max(M.excite, 0.75); b.shotBy = p; b.shotT = M.time; }
    else if (k.type !== 'clear') team.stats.passes++;
    if (team.human && k.target && !k.target.gk) Match.setActive(team, k.target);
  };

  Match.onTouch = function (p, control) {
    const team = p.team;
    if (p.offs && M.state === 'play') {
      team.stats.offsides++;
      G.emit('msg', { t: 'Fuera de lugar', c: team.opp }); G.emit('whistle', 1);
      return restart('freekick', team.opp, p.offsX, p.offsZ);
    }
    for (const m of M.players) m.offs = false;
    team.lastP = p; team.lastPT = M.time;
    if (!control) return;
    const changed = M.lastPoss !== team;
    M.lastPoss = team; team.receiver = team.opp.receiver = null;
    if (team.human && !p.gk) Match.setActive(team, p);
    if (changed) G.emit('turnover', team);
  };

  Match.foul = function (p, v, slide, behind) {
    if (M.state !== 'play') return;
    const team = p.team, r = Math.random(); team.stats.fouls++;
    let card = null;
    if (slide && behind) card = r < 0.18 ? 'red' : r < 0.8 ? 'yellow' : null;
    else if (slide) card = r < 0.35 ? 'yellow' : null;
    else if (behind) card = r < 0.25 ? 'yellow' : null;
    else if (r < 0.06) card = 'yellow';
    if (card === 'yellow' && ++p.yellow >= 2) card = 'red';
    if (card === 'red' && p.gk) card = 'yellow'; // shortcut: sin cambios no se puede expulsar al portero; revisar si se agregan sustituciones
    if (card === 'yellow') team.stats.yellow++;
    if (card === 'red') { team.stats.red++; p.off = true; p.x = 0; p.z = -P.HW - 40; if (team.active === p) team.active = null; }
    const pen = G.GK.inOwnBox(team, v.x, v.z, 0);
    G.emit('whistle', 1);
    restart(pen ? 'penalty' : 'freekick', v.team, pen ? -team.dir * (P.HL - P.PEN) : clamp(v.x, -P.HL + 1, P.HL - 1), pen ? 0 : clamp(v.z, -P.HW + 1, P.HW - 1));
    G.setState(v, 'down', 1.1);
    G.emit('foul', { p, v, card, pen });
  };

  G.on('save', function (e) { if (b.shotBy && b.shotBy.team !== e.p.team && M.time - b.shotT < 4) { b.shotBy.team.stats.onTarget++; b.shotBy = null; M.excite = Math.max(M.excite, 0.85); } });

  Match.secondHalf = function () {
    if (M.state !== 'halftime') return;
    M.half = 2; M.clock = 0; M.state = 'idle';
    for (const t of M.teams) t.dir = -t.dir;
    for (const p of M.players) p.stamina = Math.min(p.maxSt, p.stamina + 35);
    restart('kickoff', M.teams[1], 0, 0);
  };

  Match.step = function (dt) {
    dt *= T.timeScale; M.stateT += dt; M.excite = Math.max(0.15, M.excite - dt * 0.12);
    if (M.state === 'setup') stepSetup(dt);
    else if (M.state === 'ready') stepReady(dt);
    else if (M.state === 'play') sim(dt);
    else if (M.state === 'goal') stepGoal(dt);
  };
})();
