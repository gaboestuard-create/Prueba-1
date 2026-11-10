// Figuras: esqueleto procedural (cadera, torso, cabeza, brazos y piernas de dos segmentos) y sus animaciones.
// Todas las figuras comparten 9 InstancedMesh (una por tipo de pieza): ~10 draw calls para los 23 en cancha.
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, clamp = G.clamp, b = G.ball;
  const Fig = (G.Figure = {});
  const parts = {}, col = new THREE.Color();

  function geo(name) {
    let g;
    switch (name) {
      case 'torso': g = new THREE.CylinderGeometry(0.21, 0.16, 0.48, 10); g.scale(1, 1, 0.6); g.translate(0, 0.24, 0); break;
      case 'hips': g = new THREE.CylinderGeometry(0.165, 0.175, 0.27, 10); g.scale(1, 1, 0.66); g.translate(0, -0.06, 0); break;
      case 'head': g = new THREE.SphereGeometry(0.105, 10, 8); g.scale(0.92, 1.08, 1); break;
      case 'hair': g = new THREE.SphereGeometry(0.112, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52); g.translate(0, 0.012, -0.012); break;
      case 'uarm': g = new THREE.CylinderGeometry(0.052, 0.045, 0.28, 7); g.translate(0, -0.14, 0); break;
      case 'farm': g = new THREE.CylinderGeometry(0.042, 0.034, 0.27, 7); g.translate(0, -0.135, 0); break;
      case 'thigh': g = new THREE.CylinderGeometry(0.078, 0.058, 0.42, 8); g.translate(0, -0.21, 0); break;
      case 'shin': g = new THREE.CylinderGeometry(0.054, 0.04, 0.4, 8); g.translate(0, -0.2, 0); break;
      default: g = new THREE.BoxGeometry(0.09, 0.07, 0.24); g.translate(0, -0.42, 0.06); // foot
    }
    return g;
  }

  Fig.init = function (scene, n) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    ['torso', 'hips', 'head', 'hair', 'uarm', 'farm', 'thigh', 'shin', 'foot'].forEach((name, i) => {
      const m = new THREE.InstancedMesh(geo(name), mat, n * (i < 4 ? 1 : 2));
      m.castShadow = true; m.frustumCulled = false;
      m.setColorAt(0, col.set(0xffffff)); // crea instanceColor
      scene.add(m); parts[name] = m;
    });
  };

  // kit: { shirt, sleeves, shorts, socks, skin, hair, boots }
  Fig.create = function (i, kit) {
    const N = () => new THREE.Object3D(), root = N(), hips = N(), spine = N(), head = N();
    root.add(hips); hips.add(spine); spine.add(head); hips.position.y = 0.92; spine.position.y = 0.08; head.position.y = 0.6;
    const f = { root, hips, spine, head, arm: [], elb: [], leg: [], knee: [], map: [], ph: Math.random() * 6, pf: 0, c: null, i };
    for (let s = 0; s < 2; s++) {
      const sg = s ? -1 : 1, arm = N(), elb = N(), leg = N(), knee = N();
      spine.add(arm); arm.add(elb); hips.add(leg); leg.add(knee);
      arm.position.set(sg * 0.25, 0.44, 0); elb.position.y = -0.28; leg.position.set(sg * 0.095, -0.06, 0); knee.position.y = -0.42;
      f.arm.push(arm); f.elb.push(elb); f.leg.push(leg); f.knee.push(knee);
      f.map.push(['uarm', i * 2 + s, arm, kit.sleeves], ['farm', i * 2 + s, elb, kit.skin], ['thigh', i * 2 + s, leg, kit.skin], ['shin', i * 2 + s, knee, kit.socks], ['foot', i * 2 + s, knee, kit.boots]);
    }
    f.map.push(['torso', i, spine, kit.shirt], ['hips', i, hips, kit.shorts], ['head', i, head, kit.skin], ['hair', i, head, kit.hair]);
    for (const m of f.map) { parts[m[0]].setColorAt(m[1], col.set(m[3])); parts[m[0]].instanceColor.needsUpdate = true; }
    // pose actual: se interpola hacia la pose objetivo para que no haya saltos
    f.c = { y: 0, lean: 0, roll: 0, tw: 0, hd: 0, a0f: 0, a1f: 0, a0s: 0, a1s: 0, e0: 0.3, e1: 0.3, l0f: 0, l1f: 0, l0s: 0, l1s: 0, k0: 0, k1: 0 };
    return f;
  };

  const t = {}; // pose objetivo (reutilizada)
  const KEYS = ['y', 'lean', 'roll', 'tw', 'hd', 'a0f', 'a1f', 'a0s', 'a1s', 'e0', 'e1', 'l0f', 'l1f', 'l0s', 'l1s', 'k0', 'k1'];

  // p: jugador de la simulación (o el árbitro). Lado 0 = izquierda del modelo, 1 = derecha (pierna hábil).
  Fig.pose = function (f, p, dt) {
    const sp = Math.hypot(p.vx, p.vz), st = p.state, T = p.stateT, own = b.owner === p;
    for (const k of KEYS) t[k] = 0;
    let rate = 16, yaw = 0;
    // ciclo de carrera, guiado por la distancia recorrida
    f.ph += (sp * dt * 6.283) / (1.5 + 0.22 * sp);
    const A = Math.min(1.05, 0.12 + sp * 0.118), s = Math.sin(f.ph), c = Math.cos(f.ph);
    const fwd = sp > 0.5 ? (p.vx * Math.cos(p.face) + p.vz * Math.sin(p.face)) / sp : 1;
    if (sp < 0.4) { t.e0 = t.e1 = 0.25; t.a0s = t.a1s = 0.08; t.k0 = t.k1 = 0.06; t.y = Math.sin(f.ph * 0.3 + f.i) * 0.004; }
    else if (fwd < 0.35) { // paso lateral / de espaldas (marca, portero)
      t.l0s = 0.35 * s; t.l1s = -0.35 * s; t.k0 = t.k1 = 0.45; t.y = -0.09; t.a0s = t.a1s = 0.5; t.e0 = t.e1 = 0.7; t.lean = 0.12;
    } else {
      t.l0f = A * s; t.l1f = -A * s; t.k0 = Math.max(0, c) * A * 1.5 + 0.08; t.k1 = Math.max(0, -c) * A * 1.5 + 0.08;
      t.a0f = -A * 0.85 * s; t.a1f = A * 0.85 * s; t.e0 = t.e1 = 0.35 + A * 0.95;
      t.lean = 0.04 + sp * 0.026; t.y = -0.03 * A + Math.abs(s) * 0.035 * A; t.tw = 0.14 * A * s;
      if (own) { t.a0s = t.a1s = 0.3; t.lean += 0.05; }
    }
    // inclinación en el giro
    const df = G.angDiff(f.pf, p.face); f.pf = p.face;
    t.roll = clamp((df / Math.max(dt, 0.001)) * sp * 0.012, -0.32, 0.32);
    if (p.gk && st === 'free' && sp < 2.5) { t.y -= 0.1; t.k0 += 0.35; t.k1 += 0.35; t.a0s = t.a1s = 0.65; t.e0 = t.e1 = 0.5; t.lean = 0.15; }
    if (p.shield) { t.y -= 0.08; t.a0s = t.a1s = 0.9; t.lean = 0.2; }

    switch (st) {
      case 'kick': {
        const k = p.k, pre = T < k.wind; rate = 34;
        if (b.held === p || (k.type === 'throw' && !pre)) { // saque con las manos
          t.a0f = t.a1f = pre ? 3.3 : 1.2; t.e0 = t.e1 = pre ? 0.6 : 0.1; t.lean = pre ? -0.2 : 0.3;
        } else if (k.air && p.y > 0.05) { t.lean = pre ? -0.25 : 0.45; t.hd = pre ? -0.3 : 0.5; t.a0s = t.a1s = 0.8; t.k0 = t.k1 = 0.5; } // cabezazo
        else {
          t.l1f = pre ? -1.0 : 1.3; t.k1 = pre ? 1.4 : 0.05; t.l0f = pre ? 0.25 : -0.3; t.k0 = 0.2;
          t.lean = pre ? -0.08 : 0.16; t.a0f = pre ? 0.9 : -0.5; t.a1f = pre ? -0.7 : 0.4; t.a0s = 0.5; t.tw = pre ? -0.3 : 0.35;
        }
        break;
      }
      case 'setpiece': if (b.held === p) { t.a0f = t.a1f = 3.1; t.e0 = t.e1 = 0.5; t.l0f = t.l1f = 0; t.k0 = t.k1 = 0.05; } break;
      case 'tackle': t.l1f = 1.15; t.k1 = 0.1; t.l0f = -0.5; t.k0 = 0.9; t.y = -0.26; t.lean = 0.3; t.a0s = t.a1s = 0.7; rate = 26; break;
      case 'slide': t.y = -0.58; t.lean = -1.15; t.l1f = 1.4; t.k1 = 0.05; t.l0f = 0.9; t.k0 = 1.5; t.a0f = t.a1f = -0.7; t.a0s = t.a1s = 0.5; t.hd = 0.5; rate = 22; break;
      case 'stun': t.lean = 0.5; t.a0s = 1.1; t.a1s = 0.9; t.y -= 0.08; break;
      case 'down': t.y = -0.74; t.lean = -1.45; t.k0 = 0.7; t.k1 = 0.3; t.l0f = 0.5; t.a0s = t.a1s = 1.2; t.hd = 0.3; rate = 9; break;
      case 'celebrate': t.a0s = t.a1s = 2.5; t.e0 = t.e1 = 0.2; if (sp < 1) { t.y = Math.abs(Math.sin(T * 7)) * 0.22; t.k0 = t.k1 = 0.3; } break;
      case 'skill': {
        const k = p.sk.kind; rate = 30;
        if (k === 'stepover') { const w = Math.sin(T * 24); t.l0s = Math.max(0, w) * 0.7; t.l1s = Math.max(0, -w) * 0.7; t.l0f = 0.3 * Math.max(0, w); t.l1f = 0.3 * Math.max(0, -w); t.y = -0.07; t.a0s = t.a1s = 0.7; t.roll = w * 0.15; }
        else if (k === 'croqueta') { t.roll = 0.3; t.l0s = 0.5; t.l1s = 0.5; t.y = -0.06; t.a0s = t.a1s = 0.8; }
        else { t.a0s = t.a1s = 1.0; t.y = -0.05; t.lean = 0.1; }
        break;
      }
      case 'gkdive': {
        const u = Math.min(1, T / 0.28); rate = 30;
        t.roll = p.dv.s * 1.38 * u; t.y = -0.55 * u; t.a0f = t.a1f = 2.9; t.e0 = t.e1 = 0.1; t.l0f = -0.2; t.l1f = 0.3; t.k0 = 0.3; t.k1 = 0.5; t.lean = 0; t.tw = 0;
        break;
      }
      case 'gkhold': t.a0f = t.a1f = 1.15; t.e0 = t.e1 = 1.0; t.a0s = t.a1s = -0.1; break;
    }
    if (b.held === p && p.gk && st !== 'kick') { t.a0f = t.a1f = 1.15; t.e0 = t.e1 = 1.0; }

    const cu = f.c, kk = 1 - Math.exp(-dt * rate);
    for (const k of KEYS) cu[k] += (t[k] - cu[k]) * kk;
    f.root.position.set(p.x, p.y, p.z); f.root.rotation.y = Math.PI / 2 - p.face + yaw;
    f.hips.position.y = 0.92 + cu.y; f.hips.rotation.set(cu.lean, 0, cu.roll);
    f.spine.rotation.set(cu.lean * 0.25, cu.tw, 0); f.head.rotation.x = cu.hd - cu.lean * 0.7;
    f.arm[0].rotation.set(-cu.a0f, 0, cu.a0s); f.arm[1].rotation.set(-cu.a1f, 0, -cu.a1s);
    f.elb[0].rotation.x = -cu.e0; f.elb[1].rotation.x = -cu.e1;
    f.leg[0].rotation.set(-cu.l0f, 0, cu.l0s); f.leg[1].rotation.set(-cu.l1f, 0, -cu.l1s);
    f.knee[0].rotation.x = cu.k0; f.knee[1].rotation.x = cu.k1;
    f.root.updateMatrixWorld(true);
    for (const m of f.map) parts[m[0]].setMatrixAt(m[1], m[2].matrixWorld);
  };

  Fig.hide = function (f) { f.root.position.set(0, -50, 0); f.root.updateMatrixWorld(true); for (const m of f.map) parts[m[0]].setMatrixAt(m[1], m[2].matrixWorld); };
  Fig.flush = function () { for (const k in parts) parts[k].instanceMatrix.needsUpdate = true; };
  Fig.shadows = function (on) { for (const k in parts) parts[k].castShadow = on; };
})();
