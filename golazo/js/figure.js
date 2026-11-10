// Figuras: cuerpo articulado (pelvis, abdomen, pecho, cuello, cabeza con rostro, hombros, codos, manos, caderas, rodillas, tobillos)
// con animación procedural. Todas comparten 14 InstancedMesh (una por pieza), así que los 23 en cancha cuestan pocas llamadas de dibujo.
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, clamp = G.clamp, b = G.ball, PI = Math.PI;
  const Fig = (G.Figure = {});
  const parts = {}, col = new THREE.Color();

  function merge(list) { // une varias geometrías en una sola pieza
    const pos = [], nor = [];
    for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; for (const v of g.attributes.position.array) pos.push(v); for (const v of g.attributes.normal.array) nor.push(v); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  }
  const cyl = (rt, rb, h, y, sz) => { const g = new THREE.CylinderGeometry(rt, rb, h, 10); g.scale(1, 1, sz || 1); g.translate(0, y, 0); return g; };
  const sph = (r, x, y, z, sx, sy, sz) => { const g = new THREE.SphereGeometry(r, 10, 8); g.scale(sx || 1, sy || 1, sz || 1); g.translate(x, y, z); return g; };
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };

  // Cada pieza se modela alrededor de su articulación (origen = punto de giro).
  const GEO = {
    pelvis: () => merge([cyl(0.165, 0.175, 0.2, -0.02, 0.68), sph(0.172, 0, -0.12, 0, 1, 0.45, 0.68)]),
    abdomen: () => cyl(0.152, 0.162, 0.22, 0.1, 0.66),
    chest: () => merge([cyl(0.198, 0.155, 0.3, 0.15, 0.6), sph(0.078, 0.2, 0.265, 0), sph(0.078, -0.2, 0.265, 0), sph(0.1, 0, 0.29, 0, 1.55, 0.5, 0.78)]), // con hombros y trapecio
    neck: () => cyl(0.046, 0.052, 0.1, 0.355),
    head: () => merge([sph(0.1, 0, 0, 0, 0.93, 1.13, 1.02), sph(0.072, 0, -0.058, 0.018, 0.95, 0.8, 1), box(0.024, 0.036, 0.03, 0, -0.014, 0.098), sph(0.021, 0.094, -0.004, 0, 0.5, 1.2, 0.8), sph(0.021, -0.094, -0.004, 0, 0.5, 1.2, 0.8)]), // cráneo, mandíbula, nariz, orejas
    hair: () => { const g = new THREE.SphereGeometry(0.106, 10, 6, 0, PI * 2, 0, PI * 0.5); g.scale(0.96, 1.1, 1.06); g.translate(0, 0.022, -0.014); return g; },
    eyes: () => merge([sph(0.013, 0.036, 0.014, 0.088), sph(0.013, -0.036, 0.014, 0.088), box(0.03, 0.007, 0.012, 0.036, 0.036, 0.09), box(0.03, 0.007, 0.012, -0.036, 0.036, 0.09)]), // ojos y cejas
    sleeve: () => cyl(0.059, 0.055, 0.17, -0.07),
    uarm: () => merge([cyl(0.047, 0.04, 0.17, -0.215), sph(0.041, 0, -0.29, 0)]),
    farm: () => merge([cyl(0.04, 0.031, 0.24, -0.12), sph(0.04, 0, -0.285, 0, 0.7, 1.15, 1)]), // antebrazo y mano
    shortleg: () => cyl(0.096, 0.089, 0.21, -0.09),
    thigh: () => merge([cyl(0.086, 0.06, 0.42, -0.21), sph(0.061, 0, -0.42, 0)]), // muslo y rodilla
    shin: () => merge([cyl(0.057, 0.061, 0.14, -0.07), cyl(0.061, 0.04, 0.27, -0.275)]), // gemelo y media
    foot: () => merge([box(0.086, 0.062, 0.14, 0, -0.04, 0.02), sph(0.046, 0, -0.045, 0.115, 0.95, 0.62, 1.35)]), // botín con puntera
  };
  const SINGLE = ['pelvis', 'abdomen', 'chest', 'neck', 'head', 'hair', 'eyes'];

  Fig.init = function (scene, n) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (const name in GEO) {
      const m = new THREE.InstancedMesh(GEO[name](), mat, n * (SINGLE.indexOf(name) < 0 ? 2 : 1));
      m.castShadow = name !== 'eyes' && name !== 'neck'; m.userData.sh = m.castShadow; m.frustumCulled = false;
      m.setColorAt(0, col.set(0xffffff)); // crea instanceColor
      scene.add(m); parts[name] = m;
    }
  };

  // kit: { shirt, sleeves, shorts, socks, skin, hair, boots }
  Fig.create = function (i, kit) {
    const N = () => new THREE.Object3D(), root = N(), hips = N(), spine = N(), chest = N(), head = N();
    root.add(hips); hips.add(spine); spine.add(chest); chest.add(head);
    hips.position.y = 0.95; spine.position.y = 0.08; chest.position.y = 0.2; head.position.y = 0.47;
    const f = { root, hips, spine, chest, head, arm: [], elb: [], leg: [], knee: [], ank: [], map: [], ph: Math.random() * 6, pf: 0, ps: 0, acc: 0, gw: 1, i, c: {} };
    for (let s = 0; s < 2; s++) {
      const sg = s ? -1 : 1, arm = N(), elb = N(), leg = N(), knee = N(), ank = N(), j = i * 2 + s;
      chest.add(arm); arm.add(elb); hips.add(leg); leg.add(knee); knee.add(ank);
      arm.position.set(sg * 0.215, 0.265, 0); elb.position.y = -0.29; leg.position.set(sg * 0.095, -0.06, 0); knee.position.y = -0.42; ank.position.y = -0.4;
      f.arm.push(arm); f.elb.push(elb); f.leg.push(leg); f.knee.push(knee); f.ank.push(ank);
      f.map.push(['sleeve', j, arm, kit.sleeves], ['uarm', j, arm, kit.skin], ['farm', j, elb, kit.skin], ['shortleg', j, leg, kit.shorts], ['thigh', j, leg, kit.skin], ['shin', j, knee, kit.socks], ['foot', j, ank, kit.boots]);
    }
    f.map.push(['pelvis', i, hips, kit.shorts], ['abdomen', i, spine, kit.shirt], ['chest', i, chest, kit.shirt], ['neck', i, chest, kit.skin], ['head', i, head, kit.skin], ['hair', i, head, kit.hair], ['eyes', i, head, '#1a1410']);
    for (const m of f.map) { parts[m[0]].setColorAt(m[1], col.set(m[3])); parts[m[0]].instanceColor.needsUpdate = true; }
    for (const k of KEYS) f.c[k] = 0;
    return f;
  };

  // Pose: y (altura de cadera), lean/roll/pyaw (pelvis), bend (columna), tw (giro del pecho), hd/hy (cabeza),
  // aNf/aNs (hombro adelante/abierto), eN (codo), lNf/lNs (cadera), kN (rodilla), nN (tobillo). Lado 0 = +x del modelo, 1 = pierna hábil.
  const KEYS = ['y', 'lean', 'roll', 'pyaw', 'bend', 'tw', 'hd', 'hy', 'a0f', 'a1f', 'a0s', 'a1s', 'e0', 'e1', 'l0f', 'l1f', 'l0s', 'l1s', 'k0', 'k1', 'n0', 'n1'];
  const t = {}, g = {};

  // Zancada: no es un vaivén simétrico. La pierna de apoyo empuja extendida; la que vuela recoge el talón, sube la rodilla y se estira para caer.
  function gait(f, p, dt, sp) {
    for (const k of KEYS) g[k] = 0;
    const cf = Math.cos(p.face), sf = Math.sin(p.face), vf = p.vx * cf + p.vz * sf, vs = -p.vx * sf + p.vz * cf;
    const back = vf < -0.35 * sp, ff = sp > 0.3 ? Math.abs(vf) / sp : 1, fs = sp > 0.3 ? vs / sp : 0;
    f.ph += ((sp * dt * 6.283) / (1.45 + 0.21 * sp)) * (back ? -1 : 1);
    const run = clamp((sp - 1.5) / 5, 0, 1), A = Math.min(1, 0.14 + sp * 0.105) * (sp < 0.25 ? sp * 4 : 1);
    for (let i = 0; i < 2; i++) {
      const ph = f.ph + i * PI, s = Math.sin(ph), c = Math.cos(ph), L = i ? 'l1' : 'l0', K = i ? 'k1' : 'k0', Nn = i ? 'n1' : 'n0', Ar = i ? 'a1' : 'a0', E = i ? 'e1' : 'e0';
      g[L + 'f'] = A * (0.16 * run + 0.95 * s) * ff;                       // el muslo sube más adelante de lo que se extiende atrás
      g[L + 's'] = A * 0.5 * s * fs * (i ? 1 : -1);                         // paso lateral
      g[K] = 0.1 + 0.12 * run + (0.45 + 1.5 * run) * A * Math.pow(Math.max(0, Math.cos(ph - 0.35)), 1.3) * ff + Math.abs(fs) * 0.3 * A; // recoge el talón al pasar
      g[Nn] = 0.5 * A * Math.max(0, Math.sin(-ph - 0.3)) - 0.25 * A * Math.max(0, c); // empuja de puntera, cae de talón
      g[Ar + 'f'] = -A * (0.7 + 0.25 * run) * s * ff;                       // brazo contrario a la pierna
      g[Ar + 's'] = 0.1 + 0.06 * run;
      g[E] = 0.3 + 1.2 * run - 0.25 * A * s;
    }
    const s0 = Math.sin(f.ph);
    g.y = -0.03 * A + 0.045 * A * Math.abs(Math.sin(f.ph + 0.6)) * (0.5 + run); // dos botes por ciclo
    g.pyaw = 0.13 * A * s0 * ff; g.tw = -0.36 * A * s0 * ff; g.roll = 0.04 * A * Math.cos(f.ph);
    // el cuerpo se inclina con la aceleración: se echa adelante al arrancar y atrás al frenar
    f.acc += (clamp((sp - f.ps) / Math.max(dt, 0.001), -30, 30) - f.acc) * Math.min(1, dt * 7); f.ps = sp;
    const lean = (0.03 + 0.022 * sp * ff) * (back ? -0.5 : 1) + clamp(f.acc * 0.011, -0.2, 0.22);
    g.lean = lean * 0.45; g.bend = lean * 0.55;
    if (sp < 0.4) { g.y += Math.sin(f.ph * 0.2 + f.i) * 0.004; g.e0 = g.e1 = 0.22; g.k0 = g.k1 = 0.07; g.bend += 0.02; }
  }

  // p: jugador de la simulación (o el árbitro).
  Fig.pose = function (f, p, dt) {
    const sp = Math.hypot(p.vx, p.vz), st = p.state, T = p.stateT, own = b.owner === p;
    for (const k of KEYS) t[k] = 0;
    let rate = 12, legs = 1, arms = 1; // cuánto de la zancada se mezcla con la pose del estado
    gait(f, p, dt, sp);
    const df = G.angDiff(f.pf, p.face); f.pf = p.face;
    t.roll = clamp((df / Math.max(dt, 0.001)) * sp * 0.012, -0.32, 0.32); // se acuesta en el giro
    const look = G.angDiff(p.face, Math.atan2(b.z - p.z, b.x - p.x));
    t.hy = -clamp(look, -1, 1) * 0.8; // la cabeza sigue al balón
    if (own) { t.a0s = t.a1s = 0.22; t.bend = 0.07; t.hd = 0.18; }
    if (p.gk && st === 'free' && sp < 2.5) { t.y = -0.1; t.k0 = t.k1 = 0.35; t.a0s = t.a1s = 0.6; t.e0 = t.e1 = 0.35; t.bend = 0.14; }
    if (p.shield) { t.y = -0.08; t.a0s = t.a1s = 0.85; t.bend = 0.18; }
    if (p.charge && st === 'free') { const u = Math.min(1, p.charge.t / 0.35); t.l1f = -0.55 * u; t.k1 = 0.7 * u; t.a0f = 0.5 * u; t.a0s = 0.4; t.tw = -0.25 * u; t.lean = -0.05 * u; } // arma la pierna mientras se carga el tiro

    switch (st) {
      case 'kick': {
        const k = p.k, pre = T < k.wind; rate = 30; legs = arms = 0;
        if (b.held === p || (k.type === 'throw' && !pre)) { t.a0f = t.a1f = pre ? 3.3 : 1.2; t.e0 = t.e1 = pre ? 0.6 : 0.1; t.lean = pre ? -0.2 : 0.3; t.k0 = t.k1 = 0.1; } // saque con las manos
        else if (k.air && p.y > 0.05) { t.lean = pre ? -0.25 : 0.3; t.bend = pre ? -0.1 : 0.3; t.hd = pre ? -0.3 : 0.5; t.a0s = t.a1s = 0.8; t.e0 = t.e1 = 0.6; t.k0 = t.k1 = 0.5; } // cabezazo
        else { // pierna de apoyo firme, cadera abierta, brazo contrario al frente
          t.l1f = pre ? -1.0 : 1.25; t.k1 = pre ? 1.45 : 0.08; t.n1 = pre ? 0.2 : 0.6; t.l0f = pre ? 0.22 : -0.28; t.k0 = 0.22;
          t.lean = pre ? -0.06 : 0.1; t.bend = pre ? -0.05 : 0.12; t.pyaw = pre ? 0.3 : -0.35; t.tw = pre ? -0.5 : 0.55;
          t.a0f = pre ? 0.9 : -0.5; t.a1f = pre ? -0.7 : 0.4; t.a0s = 0.55; t.a1s = 0.3; t.e0 = t.e1 = 0.5;
        }
        break;
      }
      case 'setpiece': legs = arms = 0; t.k0 = t.k1 = 0.06; t.e0 = t.e1 = 0.2; t.a0s = t.a1s = 0.08; if (b.held === p) { t.a0f = t.a1f = 3.1; t.e0 = t.e1 = 0.5; } break;
      case 'tackle': legs = arms = 0; rate = 24; t.l1f = 1.15; t.k1 = 0.1; t.n1 = -0.3; t.l0f = -0.5; t.k0 = 0.9; t.y = -0.26; t.lean = 0.2; t.bend = 0.15; t.a0s = t.a1s = 0.7; t.e0 = t.e1 = 0.5; break;
      case 'slide': legs = arms = 0; rate = 20; t.y = -0.6; t.lean = -1.15; t.bend = 0.35; t.l1f = 1.4; t.k1 = 0.05; t.n1 = -0.4; t.l0f = 0.9; t.k0 = 1.5; t.a0f = t.a1f = -0.7; t.a0s = t.a1s = 0.5; t.e0 = t.e1 = 0.3; t.hd = 0.3; break;
      case 'stun': legs = 0.6; arms = 0; t.lean = 0.25; t.bend = 0.3; t.a0s = 1.1; t.a1s = 0.9; t.e0 = t.e1 = 0.6; t.y = -0.08; break;
      case 'down': legs = arms = 0; rate = 8; t.y = -0.76; t.lean = -1.45; t.k0 = 0.7; t.k1 = 0.3; t.l0f = 0.5; t.a0s = t.a1s = 1.2; t.e0 = t.e1 = 0.3; t.hd = 0.3; break;
      case 'celebrate': arms = 0; t.a0s = t.a1s = 2.5; t.e0 = t.e1 = 0.25; t.bend = -0.08; t.hd = -0.2; if (sp < 1) { t.y = Math.abs(Math.sin(T * 7 + f.i)) * 0.22; t.k0 = t.k1 = 0.3; } break;
      case 'skill': {
        const k = p.sk.kind; rate = 26; legs = 0.3; arms = 0;
        if (k === 'stepover') { const w = Math.sin(T * 24); t.l0s = Math.max(0, w) * 0.7; t.l1s = Math.max(0, -w) * 0.7; t.l0f = 0.3 * Math.max(0, w); t.l1f = 0.3 * Math.max(0, -w); t.y = -0.07; t.a0s = t.a1s = 0.7; t.roll = w * 0.15; t.pyaw = w * 0.3; }
        else if (k === 'croqueta') { t.roll = 0.3; t.l0s = 0.5; t.l1s = 0.5; t.y = -0.06; t.a0s = t.a1s = 0.8; }
        else { t.a0s = t.a1s = 1.0; t.y = -0.05; t.bend = 0.12; }
        t.e0 = t.e1 = 0.6; t.k0 = t.k1 = 0.3;
        break;
      }
      case 'gkdive': {
        const u = Math.min(1, T / 0.28); rate = 26; legs = arms = 0;
        t.roll = p.dv.s * 1.38 * u; t.y = -0.55 * u; t.a0f = t.a1f = 2.9; t.e0 = t.e1 = 0.1; t.l0f = -0.2; t.l1f = 0.3; t.k0 = 0.3; t.k1 = 0.5; t.hy = 0;
        break;
      }
      case 'gkhold': arms = 0; break;
    }
    if (b.held === p && p.gk && st !== 'kick') { arms = 0; t.a0f = t.a1f = 1.15; t.e0 = t.e1 = 1.0; t.a0s = t.a1s = -0.08; }

    // la pose del estado se interpola (sin saltos); la zancada se suma directa para no perder amplitud ni ritmo
    const cu = f.c, kk = 1 - Math.exp(-dt * rate);
    for (const k of KEYS) cu[k] += (t[k] - cu[k]) * kk;
    f.gw += (legs - f.gw) * Math.min(1, dt * 14); f.aw = (f.aw === undefined ? arms : f.aw + (arms - f.aw) * Math.min(1, dt * 14));
    const w = f.gw, wa = f.aw, V = (k) => cu[k] + g[k] * w, VA = (k) => cu[k] + g[k] * wa;
    const lean = V('lean'), bend = V('bend'), roll = V('roll'), pyaw = V('pyaw');
    f.root.position.set(p.x, p.y, p.z); f.root.rotation.y = PI / 2 - p.face;
    f.hips.position.y = 0.95 + V('y'); f.hips.rotation.set(lean, pyaw, roll);
    f.spine.rotation.set(bend * 0.5, -pyaw * 0.5, -roll * 0.5); f.chest.rotation.set(bend * 0.5, V('tw') - pyaw * 0.5, 0);
    f.head.rotation.set(cu.hd - (lean + bend) * 0.85, cu.hy - V('tw') * 0.8, 0);
    f.arm[0].rotation.set(-VA('a0f'), 0, VA('a0s')); f.arm[1].rotation.set(-VA('a1f'), 0, -VA('a1s'));
    f.elb[0].rotation.x = -VA('e0'); f.elb[1].rotation.x = -VA('e1');
    f.leg[0].rotation.set(-V('l0f'), 0, V('l0s')); f.leg[1].rotation.set(-V('l1f'), 0, -V('l1s'));
    f.knee[0].rotation.x = V('k0'); f.knee[1].rotation.x = V('k1');
    f.ank[0].rotation.x = V('n0'); f.ank[1].rotation.x = V('n1');
    f.root.updateMatrixWorld(true);
    for (const m of f.map) parts[m[0]].setMatrixAt(m[1], m[2].matrixWorld);
  };

  Fig.hide = function (f) { f.root.position.set(0, -50, 0); f.root.updateMatrixWorld(true); for (const m of f.map) parts[m[0]].setMatrixAt(m[1], m[2].matrixWorld); };
  Fig.flush = function () { for (const k in parts) parts[k].instanceMatrix.needsUpdate = true; };
  Fig.shadows = function (on) { for (const k in parts) parts[k].castShadow = on && parts[k].userData.sh; };
})();
