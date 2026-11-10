// Cámaras: transmisión (por defecto), alta/táctica y detrás del jugador. Expone la base para que el stick sea relativo a la cámara.
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, b = G.ball, clamp = G.clamp;
  const Cam = (G.Cam = { mode: 'tv', modes: ['tv', 'alta', 'pro'], names: { tv: 'Transmisión', alta: 'Alta / táctica', pro: 'Detrás del jugador' }, basis: { rx: 1, rz: 0, ux: 0, uz: -1 }, cam: null, snap: true, orbit: false });
  let fx = 0, fz = 0, px = 0, py = 30, pz = 60, fov = 30, t = 0;
  try { const m = localStorage.getItem('golazo.cam'); if (Cam.names[m]) Cam.mode = m; } catch (e) {}

  Cam.init = function () { Cam.cam = new THREE.PerspectiveCamera(30, 1, 1, 700); G.on('cut', () => (Cam.snap = true)); G.on('matchStart', () => (Cam.snap = true)); };
  Cam.set = function (m) { Cam.mode = m; Cam.snap = true; try { localStorage.setItem('golazo.cam', m); } catch (e) {} };
  Cam.next = function () { Cam.set(Cam.modes[(Cam.modes.indexOf(Cam.mode) + 1) % 3]); return Cam.names[Cam.mode]; };

  Cam.update = function (dt) {
    const M = G.M, cam = Cam.cam, B = Cam.basis; t += dt;
    let tx = b.x + clamp(b.vx * 0.5, -7, 7), tz = b.z + clamp(b.vz * 0.4, -4, 4), zoom = 1;
    if (M.state === 'goal' && M.goalInfo.scorer && !M.goalInfo.own) { tx = M.goalInfo.scorer.x; tz = M.goalInfo.scorer.z; zoom = 0.6; }
    else if ((M.state === 'ready' || M.state === 'setup') && M.rs && (M.rs.type === 'corner' || M.rs.type === 'penalty')) { tx = b.x * 0.75 + Math.sign(b.x) * 10; tz = b.z * 0.45; zoom = 1.15; } // encuadra el área
    const k = Cam.snap ? 1 : 1 - Math.exp(-dt * 2.6); // seguimiento suave: la cámara no persigue cada toque
    fx += (tx - fx) * k; fz += (tz - fz) * k;
    let wx, wy, wz, lx, lz, f;
    if (Cam.orbit) { wx = Math.sin(t * 0.1) * 75; wy = 26; wz = Math.cos(t * 0.1) * 62; lx = fx * 0.5; lz = fz * 0.5; f = 34; B.rx = 1; B.rz = 0; B.ux = 0; B.uz = -1; }
    else if (Cam.mode === 'alta') { wx = fx * 0.78; wy = 58; wz = 46; lx = fx * 0.86; lz = fz * 0.3; f = 33; B.rx = 1; B.rz = 0; B.ux = 0; B.uz = -1; }
    else if (Cam.mode === 'pro') {
      const d = M.human >= 0 ? M.teams[M.human].dir : 1;
      wx = clamp(fx - d * 25, -56, 56); wy = 12.5; wz = fz * 0.75; lx = fx + d * 9; lz = fz * 0.82; f = 40; B.rx = 0; B.rz = d; B.ux = d; B.uz = 0;
    } else { wx = clamp(fx * 0.9, -44, 44); wy = 22 + Math.max(0, fz) * 0.1; wz = 52; lx = fx; lz = fz * 0.5 - 2; f = 23.5; B.rx = 1; B.rz = 0; B.ux = 0; B.uz = -1; }
    f = f * zoom * Math.max(1, 1.7 / cam.aspect); // pantallas angostas: abre el campo para no perder ancho
    const k2 = Cam.snap ? 1 : 1 - Math.exp(-dt * 3.5);
    px += (wx - px) * k2; py += (wy - py) * k2; pz += (wz - pz) * k2; fov += (f - fov) * (Cam.snap ? 1 : 1 - Math.exp(-dt * 2.5));
    Cam.snap = false;
    cam.position.set(px, py, pz); cam.lookAt(lx, 0.5, lz);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  };
})();
