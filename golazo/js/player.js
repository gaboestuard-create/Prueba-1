// Jugador: atributos -> física, locomoción con inercia, conducción a toques, pases/tiros, entradas y filigranas.
(function () {
  'use strict';
  const G = window.G, P = G.P, T = G.T, b = G.ball, R = P.R, hyp = Math.hypot, clamp = G.clamp, f = G.f, rnd = G.rnd, gauss = G.gauss;

  // Estilos de juego: cambian decisiones de la IA y la física del jugador, no solo el número.
  G.STYLES = {
    equilibrado: { label: 'Equilibrado' },
    muro: { label: 'Muro defensivo', tackle: 0.18, depth: -3, shield: 0.1, pas: -0.05 },
    regateador: { label: 'Regateador hábil', drib: 0.22, skill: 0.5, ctrl: 0.2 },
    tanque: { label: 'Tanque ofensivo', shield: 0.3, sho: 0.08, head: 0.3, depth: 2 },
    organizador: { label: 'Organizador', pas: 0.2, vision: 0.3, depth: -2 },
    cazagoles: { label: 'Cazagoles', sho: 0.18, run: 1.6, depth: 3 },
    velocista: { label: 'Velocista', run: 1.8, drib: 0.08, stam: 0.8 },
    todoterreno: { label: 'Todoterreno', stam: 0.65, tackle: 0.08 },
    carrilero: { label: 'Carrilero', overlap: 1, stam: 0.8, run: 1.2 },
    francotirador: { label: 'Francotirador', longShot: 8, sho: 0.1 },
    libero: { label: 'Portero líbero', gkOut: 1.5 },
    atajador: { label: 'Atajador', gkReach: 0.12 },
  };
  const ST0 = { drib: 0, pas: 0, sho: 0, longShot: 0, run: 1, depth: 0, tackle: 0, shield: 0, skill: 0, ctrl: 0, vision: 0, stam: 1, overlap: 0, gkOut: 1, gkReach: 0, head: 0 };

  G.makePlayer = function (team, info, slot) {
    const a = info.attr;
    return {
      team, info, name: info.name, slot, gk: slot.r === 'GK', st: Object.assign({}, ST0, G.STYLES[info.style]),
      pac: f(a.pac), sho: f(a.sho), pas: f(a.pas), dri: f(a.dri), def: f(a.def), phy: f(a.phy), gkv: f(a.gk),
      x: 0, y: 0, z: 0, vx: 0, vz: 0, face: 0, faceTo: null, mx: 0, mz: 0, sprint: false, shield: false,
      state: 'free', stateT: 0, dur: 0, stamina: 100, maxSt: 100, touchCD: 0, cd: 0, boost: 0, freeze: 0, jumpV: 0,
      k: null, buf: null, charge: null, tk: null, sk: null, dv: null, react: null, sv: 0, holdT: 0,
      yellow: 0, off: false, offs: false, offsX: 0, offsZ: 0, eta: 9, ix: 0, iz: 0, sx: 0, sz: 0,
      ai: { t: Math.random(), st: Math.random(), ox: 0, oz: 0, runT: 0, hold: 0, plan: null, ang: 0, sprint: false },
    };
  };

  const setState = (G.setState = function (p, s, dur) { p.state = s; p.stateT = 0; p.dur = dur || 0; });
  const topSpeed = (G.topSpeed = (p) => (6.5 + 2.1 * p.pac) * T.speed * (0.88 + 0.12 * Math.min(1, p.stamina / 30)));
  const isHuman = (G.isHuman = (p) => p.team.human && p.team.active === p);

  G.nd = 0; // distancia del último nearOpp
  G.nearOpp = function (p) {
    const os = p.team.opp.players; let bd = 1e9, bo = null;
    for (let i = 0; i < os.length; i++) { const o = os[i]; if (o.off) continue; const d = hyp(o.x - p.x, o.z - p.z); if (d < bd) { bd = d; bo = o; } }
    G.nd = bd; return bo;
  };

  // Movimiento con inercia: aceleración limitada, frenar/girar cuesta, con balón es más pesado.
  function locomote(p, dt, mx, mz, sprint, accMul) {
    const own = b.owner === p;
    let mag = hyp(mx, mz); if (mag > 1) { mx /= mag; mz /= mag; mag = 1; }
    const sprinting = sprint && p.stamina > 1 && mag > 0.5;
    let top = topSpeed(p) * (sprinting ? 1 : 0.68);
    if (own) top *= 0.9 + 0.06 * p.dri;
    if (p.shield) top *= 0.55;
    if (p.boost > 0) top *= 1.07;
    const wx = mx * top, wz = mz * top, sp = hyp(p.vx, p.vz);
    let acc = (10 + 6 * p.pac) * T.accel * accMul * (own ? 0.85 : 1) * (p.boost > 0 ? 1.5 : 1);
    acc *= wx * p.vx + wz * p.vz < sp * sp * 0.6 ? 1.5 : 1.15 - 0.6 * Math.min(1, sp / (top + 0.01));
    let dx = wx - p.vx, dz = wz - p.vz; const dl = hyp(dx, dz), md = acc * dt;
    if (dl > md) { dx *= md / dl; dz *= md / dl; }
    p.vx += dx; p.vz += dz; p.x += p.vx * dt; p.z += p.vz * dt;
    if (sprinting) { const dr = (10 - 4.5 * p.phy) * p.st.stam * dt; p.stamina = Math.max(0, p.stamina - dr); p.maxSt = Math.max(55, p.maxSt - dr * 0.03); }
    else p.stamina = Math.min(p.maxSt, p.stamina + (mag < 0.3 ? 9 : 4.5) * dt);
    const sp2 = hyp(p.vx, p.vz), tf = p.faceTo != null ? p.faceTo : sp2 > 0.6 ? Math.atan2(p.vz, p.vx) : p.face, mr = (own ? 9 : 13) * dt;
    p.face += clamp(G.angDiff(p.face, tf), -mr, mr);
  }

  function pressure(p) { G.nearOpp(p); return clamp((3 - G.nd) / 2.5, 0, 1); }

  // ---------- Golpeos ----------
  function canKick(p, wind, reach) {
    if (b.held) return b.held === p;
    if (b.owner && b.owner !== p && (b.owner.team === p.team || hyp(b.owner.x - b.x, b.owner.z - b.z) < 1.15)) return false;
    const d = hyp(b.x + b.vx * wind - p.x - p.vx * wind, b.z + b.vz * wind - p.z - p.vz * wind);
    return d < (reach || 1.15) && b.y + b.vy * wind < 2.5;
  }

  const WIND = { pass: 0.07, through: 0.08, lob: 0.12, cross: 0.12, clear: 0.08, throw: 0.18, shot: 0.1 };
  function startKick(p, k) {
    k.wind = (WIND[k.type] || 0.1) + (k.type === 'shot' ? 0.08 * k.power : 0);
    if (b.owner !== p && !b.held) k.wind = 0.06; // de primera
    k.done = false; k.sp = p.state === 'setpiece';
    k.air = b.y + b.vy * k.wind > 0.7;
    if (b.y + b.vy * k.wind > 1.45 && !b.held) p.jumpV = 3.4;
    p.k = k; setState(p, 'kick');
  }

  // Calcula la velocidad de salida del balón según el tipo de golpeo, los atributos y el error.
  function aim(p, k) {
    const team = p.team, errM = isHuman(p) ? 1 : team.D.err, air = k.air && !b.held;
    let tx = k.x, tz = k.z, vh, vy = 0, spin = 0, sig, sigV = 0;
    switch (k.type) {
      case 'pass': case 'through': {
        if (k.target) { const m = k.target, tf = hyp(m.x - b.x, m.z - b.z) / 15; tx = m.x + m.vx * tf * 0.8; tz = m.z + m.vz * tf * 0.8; }
        const d = hyp(tx - b.x, tz - b.z);
        vh = clamp(G.Ball.speedForRoll(d, k.type === 'pass' ? 6 : 4) * T.pass, 5, 27);
        if (air) { vh *= 0.85; vy = b.y > 1.4 ? -1 : 1.5; }
        sig = (0.012 + (1 - p.pas) * 0.05) * errM; break;
      }
      case 'lob': case 'cross': case 'throw': {
        const d = Math.max(6, hyp(tx - b.x, tz - b.z));
        const ang = k.type === 'cross' ? 0.42 : k.type === 'throw' ? 0.36 : d < 22 ? 0.62 : 0.5;
        const sp = Math.min(G.Ball.lobSpeed(d, ang, b.y) * Math.sqrt(T.pass), k.cap || (k.type === 'throw' ? 16 : 34));
        vh = sp * Math.cos(ang); vy = sp * Math.sin(ang); spin = k.spin || 0;
        sig = (0.015 + (1 - p.pas) * 0.06) * errM; break;
      }
      case 'clear': vh = 22; vy = 11; sig = 0.12; break;
      default: { // shot
        const gx = team.dir * P.HL, pw = k.power, fin = k.finesse, head = air && b.y > 1.4;
        let gz = k.aimZ * (P.GW - 0.45);
        let sp = (15 + 15 * pw) * (0.86 + 0.2 * p.sho) * T.shot * (fin ? 0.8 : 1);
        if (air) sp *= head ? 0.62 + 0.15 * (p.phy + p.st.head) : 0.95;
        const d = hyp(gx - b.x, gz - b.z), t = d / sp * 1.06;
        const ty = head ? 0.3 + pw * 1.2 : fin ? 0.5 + pw * 1.6 : 0.25 + pw * pw * 2.5;
        vy = (ty - b.y) / t + 0.5 * G.Ball.GRAV * t;
        if (fin) { // comba hacia el palo elegido: se apunta por dentro y el efecto la abre
          const sz = gz >= 0 ? 1 : -1; spin = sz * team.dir * (5 + 4 * p.sho);
          gz -= sz * 0.5 * Math.abs(spin) * G.Ball.KM * T.curve * sp * t * t * 0.75;
        } else spin = gauss() * 0.8;
        tx = gx; tz = gz; vh = sp;
        const off = Math.abs(G.angDiff(p.face, Math.atan2(gz - b.z, gx - b.x))) / Math.PI;
        sig = (0.018 + (1 - p.sho) * 0.055) * (0.7 + pw * 0.7) * (1 + pressure(p) * 0.5) * (1 + off * 1.2) * (air ? 1.5 : 1) * (fin ? 0.6 : 1) * errM;
        sigV = sig * sp * 0.55;
      }
    }
    const a = Math.atan2(tz - b.z, tx - b.x) + gauss() * sig;
    vh *= 1 + gauss() * sig * 0.8;
    return { vx: Math.cos(a) * vh, vy: vy + gauss() * sigV, vz: Math.sin(a) * vh, spin };
  }

  function execKick(p, k) {
    if (!canKick(p, 0, 1.5)) return; // llegó tarde: patea al aire
    const v = aim(p, k);
    b.held = null; b.owner = null;
    b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.spin = v.spin;
    if (b.y < R) b.y = R;
    b.kicker = p; b.kickT = 0; b.lastTouch = p; b.inNet = 0;
    p.touchCD = 0.3; p.faceTo = null; p.face = Math.atan2(v.vz, v.vx);
    G.emit('kick', { p, k, speed: hyp(v.vx, v.vy, v.vz) });
    G.Match.onKick(p, k);
  }

  // ---------- Conducción y control ----------
  // El balón es un objeto libre: el dueño lo empuja a toques. En sprint los toques son largos (riesgo).
  function dribble(p, d) {
    if (p.state !== 'free' || b.y > 0.5 || p.touchCD > 0 || p.freeze > 0) return;
    if (d > 0.78 + 0.1 * p.dri) return;
    let mx = p.mx, mz = p.mz; const mag = hyp(mx, mz), sp = hyp(p.vx, p.vz);
    if (mag < 0.15) { // pisarla
      if (hyp(b.vx - p.vx, b.vz - p.vz) > 0.5) { b.vx = p.vx * 0.6; b.vz = p.vz * 0.6; p.touchCD = 0.1; }
      return;
    }
    mx /= mag; mz /= mag;
    const top = topSpeed(p), sprint = p.sprint && p.stamina > 1;
    let push;
    if (p.shield) { // protección: el balón va al lado contrario del rival
      const o = G.nearOpp(p);
      if (o && G.nd < 3) { const ax = p.x - o.x, az = p.z - o.z, al = hyp(ax, az) + 0.01; mx = mx * 0.5 + ax / al; mz = mz * 0.5 + az / al; const l = hyp(mx, mz); mx /= l; mz /= l; }
      push = sp + 0.7;
    } else if (sp > 1 && (p.vx * mx + p.vz * mz) / sp < 0.5) { push = 2.2 + sp * 0.25; p.vx *= 0.75; p.vz *= 0.75; } // recorte
    else if (sprint) push = top * 0.93 + (2.4 + (1 - p.dri) * 1.6) * T.touch;
    else push = Math.max(sp, top * 0.48 * mag) + (0.9 + (1 - p.dri) * 0.4) * T.touch;
    b.vx = mx * push; b.vz = mz * push; b.vy = 0; b.spin = 0; b.lastTouch = p;
    p.touchCD = sprint ? 0.4 : 0.22 - 0.05 * p.dri - 0.03 * p.st.ctrl;
  }

  function trap(p, rs) {
    const heavy = clamp((rs - 8) / 22, 0, 1) * (1.1 - p.dri), mag = hyp(p.mx, p.mz), ox = b.vx, oz = b.vz;
    b.owner = p; b.lastTouch = p; b.spin = 0;
    b.vx = p.vx + (mag > 0.2 ? (p.mx / mag) * 1.6 : 0) + ox * 0.25 * heavy;
    b.vz = p.vz + (mag > 0.2 ? (p.mz / mag) * 1.6 : 0) + oz * 0.25 * heavy;
    b.vy = b.y > 0.3 ? -1 : 0;
    p.touchCD = 0.12 + heavy * 0.25; p.ai.hold = 0;
    G.Match.onTouch(p, true);
  }

  // Contacto balón-jugador. Se llama en cada subpaso del balón (los tiros rápidos no atraviesan).
  G.ballContact = function (p) {
    if (p.off || b.held) return;
    const dx = b.x - p.x, dz = b.z - p.z, d = hyp(dx, dz);
    if (d > 3.5) return;
    if (p.gk && G.GK.contact(p)) return;
    if (p.state === 'down') return;
    if (b.owner === p) { dribble(p, d); return; }
    if (b.kicker === p && b.kickT < 0.3) return;
    const rvx = b.vx - p.vx, rvz = b.vz - p.vz;
    if (p.state === 'free' && p.touchCD <= 0 && d < 0.8 && b.y < 1.35 + p.y) {
      const o = b.owner;
      if (o && (o.team === p.team || hyp(o.x - b.x, o.z - b.z) < 1.15 || o.state === 'skill')) return; // solo se roba con entrada o si el toque fue largo
      const rs = hyp(rvx, rvz, b.vy), max = 13 + 12 * (p.dri + p.pas) * 0.5 + (b.kicker && b.kicker.team === p.team ? 8 : 0);
      if (rs < max) { trap(p, rs); return; }
    }
    if (d < 0.38 + R && d > 1e-3 && b.y < 1.85 + p.y) { // bloqueo con el cuerpo
      const nx = dx / d, nz = dz / d, vn = rvx * nx + rvz * nz;
      if (vn < 0) {
        b.vx -= 1.35 * vn * nx; b.vz -= 1.35 * vn * nz; b.vx *= 0.75; b.vz *= 0.75; b.vy += rnd(0, 2);
        b.x = p.x + nx * (0.39 + R); b.z = p.z + nz * (0.39 + R);
        b.owner = null; b.lastTouch = p; b.spin = 0;
        G.Match.onTouch(p, false);
      }
    }
  };

  // ---------- Entradas ----------
  function tackleCheck(p, slide) {
    const c = Math.cos(p.face), s = Math.sin(p.face), fx = p.x + c * (slide ? 0.9 : 0.6), fz = p.z + s * (slide ? 0.9 : 0.6);
    const o = b.owner && b.owner.team !== p.team ? b.owner : null;
    const behind = o ? ((o.x - p.x) * Math.cos(o.face) + (o.z - p.z) * Math.sin(o.face)) / (hyp(o.x - p.x, o.z - p.z) + 0.01) > 0.35 : false;
    const foulP = slide ? (behind ? 0.95 : 0.6) : behind ? 0.6 : 0.22;
    if (!b.held && b.y < 0.7 && hyp(b.x - fx, b.z - fz) < (slide ? 1.05 : 0.8) + p.def * 0.15 + p.st.tackle * 0.5) {
      let ch = 1;
      if (o) {
        ch = (slide ? 0.72 : 0.62) + (p.def - o.dri) * 0.45 + p.st.tackle + (o.sprint ? 0.1 : 0);
        if (behind) ch *= 0.45;
        if (o.state === 'skill') ch *= 0.25;
        if (o.shield) ch *= 0.6 - o.st.shield * 0.5;
      }
      if (Math.random() < ch) {
        p.tk = 'win'; b.lastTouch = p; b.kicker = null; b.spin = 0;
        if (slide) { b.owner = null; b.vx = c * rnd(8, 12) + gauss(); b.vz = s * rnd(8, 12) + gauss(); b.vy = rnd(1, 3); }
        else { b.owner = p; b.vx = c * 3 + p.vx * 0.3; b.vz = s * 3 + p.vz * 0.3; p.touchCD = 0.25; p.boost = 0.5; p.ai.t = 0.2; }
        if (o) setState(o, 'stun', 0.6);
        G.emit('tackle', { p, slide });
        G.Match.onTouch(p, !slide);
        return;
      }
      p.tk = 'miss';
      if (o && hyp(o.x - fx, o.z - fz) < 0.75 && Math.random() < foulP) { p.tk = 'foul'; G.Match.foul(p, o, slide, behind); }
    } else if (o && hyp(o.x - fx, o.z - fz) < 0.55) {
      p.tk = 'miss';
      if (Math.random() < foulP) { p.tk = 'foul'; G.Match.foul(p, o, slide, behind); }
    }
  }

  // ---------- Filigranas ----------
  function skillUpdate(p, dt) {
    const k = p.sk, t = p.stateT, own = b.owner === p;
    let end = false;
    if (k.kind === 'croqueta') { // bola cruzada: desplazamiento lateral rápido con el balón pegado
      p.vx = k.lx * 6 + k.fx * 2.5; p.vz = k.lz * 6 + k.fz * 2.5; p.x += p.vx * dt; p.z += p.vz * dt;
      if (own) { b.x = p.x + k.fx * 0.5 + k.lx * 0.15; b.z = p.z + k.fz * 0.5 + k.lz * 0.15; }
      end = t > 0.3;
    } else if (k.kind === 'roulette') { // giro rápido protegiendo el balón
      const u = Math.min(1, t / 0.42);
      p.face = k.a0 + (k.a1 - k.a0) * u;
      p.vx = k.vx * (1 - u) + k.ex * 4 * u; p.vz = k.vz * (1 - u) + k.ez * 4 * u; p.x += p.vx * dt; p.z += p.vz * dt;
      if (own) { b.x = p.x + Math.cos(p.face) * 0.5; b.z = p.z + Math.sin(p.face) * 0.5; }
      end = u >= 1;
    } else { locomote(p, dt, k.fx * 0.6, k.fz * 0.6, false, 1); end = t > 0.36; } // bicicleta: el balón sigue rodando
    if (own && k.kind !== 'stepover') { b.vx = p.vx; b.vz = p.vz; b.y = R; b.vy = 0; }
    if (end) {
      setState(p, 'free'); p.cd = 0.45; p.touchCD = 0.05; p.boost = 0.7;
      if (own && k.kind !== 'stepover') { const sp = hyp(p.vx, p.vz) + 1.2; b.vx = k.ex * sp; b.vz = k.ez * sp; }
    }
  }

  // ---------- API de acciones (la usan el control humano y la IA) ----------
  G.act = {
    kick(p, k) {
      if ((p.state === 'free' || p.state === 'setpiece' || p.state === 'gkhold') && canKick(p, 0.06)) startKick(p, k);
      else { k.t = 0.55; p.buf = k; } // buffer: se ejecuta de primera cuando el balón llegue
    },
    tackle(p) {
      if (p.state !== 'free' || p.cd > 0) return;
      if (hyp(b.x - p.x, b.z - p.z) < 3) p.face = Math.atan2(b.z - p.z, b.x - p.x);
      p.tk = null; p.cd = 0.3; setState(p, 'tackle');
    },
    slide(p) {
      if (p.state !== 'free' || p.cd > 0) return;
      if (hyp(b.x - p.x, b.z - p.z) < 5) p.face = Math.atan2(b.z + b.vz * 0.2 - p.z, b.x + b.vx * 0.2 - p.x);
      p.tk = null; p.cd = 0.5; p.sv = Math.max(hyp(p.vx, p.vz), 5.5) + 2; setState(p, 'slide');
    },
    skill(p, kind, dx, dz) {
      if (p.state !== 'free' || p.cd > 0 || b.owner !== p || p.stamina < 5 || hyp(b.x - p.x, b.z - p.z) > 1.3) return false;
      const c = Math.cos(p.face), s = Math.sin(p.face);
      const k = (p.sk = { kind, fx: c, fz: s, lx: 0, lz: 0, a0: p.face, a1: p.face, ex: dx, ez: dz, vx: p.vx, vz: p.vz });
      if (kind === 'croqueta') { const side = -s * dx + c * dz >= 0 ? 1 : -1; k.lx = -s * side; k.lz = c * side; k.ex = c; k.ez = s; }
      if (kind === 'roulette') k.a1 = p.face + G.angDiff(p.face, Math.atan2(dz, dx));
      const os = p.team.opp.players; // los defensas de la IA cercanos pueden morder el amague
      for (let i = 0; i < os.length; i++) {
        const o = os[i];
        if (o.off || o.gk || isHuman(o) || hyp(o.x - p.x, o.z - p.z) > 3.5) continue;
        if (Math.random() < 0.35 + 0.5 * (p.dri - o.def) + p.st.skill * 0.2) o.freeze = rnd(0.3, 0.55);
      }
      p.stamina -= 4; setState(p, 'skill'); G.emit('skill', p);
      return true;
    },
  };

  G.updatePlayer = function (p, dt) {
    if (p.off) return;
    p.stateT += dt; p.touchCD -= dt; p.cd -= dt;
    if (p.boost > 0) p.boost -= dt;
    if (p.freeze > 0) p.freeze -= dt;
    if (p.buf) {
      if ((p.buf.t -= dt) <= 0) p.buf = null;
      else if (p.state === 'free' && canKick(p, 0.06)) { const k = p.buf; p.buf = null; startKick(p, k); }
    }
    let mx = p.freeze > 0 ? 0 : p.mx, mz = p.freeze > 0 ? 0 : p.mz;
    switch (p.state) {
      case 'free': case 'celebrate':
        if (b.owner === p) { // si el balón se alejó, primero va por él
          const fx = b.x + b.vx * 0.12 - p.x, fz = b.z + b.vz * 0.12 - p.z, fd = hyp(fx, fz), mag = hyp(mx, mz);
          if (fd > 4.5) b.owner = null;
          else if (fd > 0.7 && (mag < 0.15 || (fx * mx + fz * mz) / (fd * mag) < 0.75)) { const m2 = Math.max(mag, 0.75); mx = (fx / fd) * m2; mz = (fz / fd) * m2; }
        }
        locomote(p, dt, mx, mz, p.sprint, 1);
        break;
      case 'kick': {
        const k = p.k, m = k.sp ? 0 : 0.5;
        locomote(p, dt, mx * m, mz * m, false, 0.7);
        if (!k.done && p.stateT >= k.wind) { k.done = true; execKick(p, k); }
        if (p.stateT >= k.wind + 0.16) setState(p, 'free');
        break;
      }
      case 'tackle': {
        const t = p.stateT, v = t < 0.2 ? 6.5 : Math.max(0, 6.5 - (t - 0.2) * 30);
        p.vx = Math.cos(p.face) * v; p.vz = Math.sin(p.face) * v; p.x += p.vx * dt; p.z += p.vz * dt;
        if (!p.tk && t > 0.06 && t < 0.24) tackleCheck(p, false);
        if (p.state === 'tackle' && t > (p.tk === 'win' ? 0.32 : 0.62)) setState(p, 'free');
        break;
      }
      case 'slide': {
        const t = p.stateT, v = Math.max(0, p.sv * (1 - t / 0.75));
        p.vx = Math.cos(p.face) * v; p.vz = Math.sin(p.face) * v; p.x += p.vx * dt; p.z += p.vz * dt;
        if (!p.tk && t > 0.08 && t < 0.6) tackleCheck(p, true);
        if (p.state === 'slide' && t > (p.tk === 'win' ? 0.95 : 1.25)) setState(p, 'free');
        break;
      }
      case 'stun': case 'down':
        locomote(p, dt, 0, 0, false, 0.6);
        if (p.stateT > p.dur) setState(p, 'free');
        break;
      case 'skill': skillUpdate(p, dt); break;
      case 'setpiece': { // cobrador: el stick apunta
        p.vx = p.vz = 0;
        if (hyp(mx, mz) > 0.3) p.face += clamp(G.angDiff(p.face, Math.atan2(mz, mx)), -3.5 * dt, 3.5 * dt);
        if (!b.held) { p.x = b.x - Math.cos(p.face) * 0.85; p.z = b.z - Math.sin(p.face) * 0.85; }
        break;
      }
      case 'gkdive': G.GK.diveUpdate(p, dt); break;
      case 'gkhold': locomote(p, dt, mx * 0.5, mz * 0.5, false, 1); break;
    }
    if (p.state !== 'gkdive' && (p.jumpV !== 0 || p.y > 0)) { p.y += p.jumpV * dt; p.jumpV -= 12 * dt; if (p.y <= 0) { p.y = 0; p.jumpV = 0; } }
    p.x = clamp(p.x, -P.HL - 4, P.HL + 4); p.z = clamp(p.z, -P.HW - 3, P.HW + 3);
  };
})();
