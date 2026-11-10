// Render: cancha, arcos con red, gradas con público animado, luces, sombras, balón y marcadores. Calidad escalable.
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, P = G.P, b = G.ball;
  const Rn = (G.Render = { q: 3, renderer: null, scene: null });
  let renderer, scene, sun, ballMesh, ballSh, ring, arrow, blobs, figs = [], ref, crowd = [], time = 0, grass;
  const mobile = (Rn.mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900));
  const up = new THREE.Vector3(), m4 = new THREE.Matrix4(), col = new THREE.Color();

  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }

  // Césped con franjas de corte y todas las líneas reglamentarias. El lienzo cubre 126 x 84 m.
  function pitchTex(s) {
    return canvasTex(126 * s, 84 * s, (g, w, h) => {
      const X = (x) => (x + 63) * s, Z = (z) => (z + 42) * s;
      g.fillStyle = '#1f6b2c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) { g.fillStyle = i % 2 ? '#2f8f3d' : '#37a046'; g.fillRect(X(-P.HL + (i * 105) / 18), Z(-P.HW), (105 / 18) * s + 1, 68 * s); }
      for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.045)'; g.fillRect(Math.random() * w, Math.random() * h, s * 0.25, s * 0.9); }
      g.strokeStyle = '#f4f7f2'; g.fillStyle = '#f4f7f2'; g.lineWidth = Math.max(2, 0.13 * s);
      g.strokeRect(X(-P.HL), Z(-P.HW), 105 * s, 68 * s);
      g.beginPath(); g.moveTo(X(0), Z(-P.HW)); g.lineTo(X(0), Z(P.HW)); g.stroke();
      g.beginPath(); g.arc(X(0), Z(0), P.CR * s, 0, 7); g.stroke();
      g.beginPath(); g.arc(X(0), Z(0), 0.25 * s, 0, 7); g.fill();
      for (const d of [-1, 1]) {
        const gx = d * P.HL;
        g.strokeRect(X(Math.min(gx, gx - d * P.BOXL)), Z(-P.BOXW), P.BOXL * s, P.BOXW * 2 * s);
        g.strokeRect(X(Math.min(gx, gx - d * P.SIXL)), Z(-P.SIXW), P.SIXL * s, P.SIXW * 2 * s);
        g.beginPath(); g.arc(X(gx - d * P.PEN), Z(0), 0.22 * s, 0, 7); g.fill();
        const a = Math.acos((P.BOXL - P.PEN) / P.CR), c = d > 0 ? Math.PI : 0;
        g.beginPath(); g.arc(X(gx - d * P.PEN), Z(0), P.CR * s, c - a, c + a); g.stroke();
        for (const e of [-1, 1]) { g.beginPath(); g.arc(X(gx), Z(e * P.HW), s, 0, 7); g.stroke(); }
      }
      g.fillStyle = '#1f6b2c'; // tapa los arcos de esquina fuera del campo
      g.fillRect(0, 0, w, Z(-P.HW) - g.lineWidth / 2); g.fillRect(0, Z(P.HW) + g.lineWidth / 2, w, h); g.fillRect(0, 0, X(-P.HL) - g.lineWidth / 2, h); g.fillRect(X(P.HL) + g.lineWidth / 2, 0, w, h);
    });
  }

  function crowdTex(seed, colors, gaps) {
    let r = seed; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const pal = ['#d9d9d9', '#2b2b2b', '#b33', '#36c', '#e8c84a', '#eee', '#555', '#284', '#c63'].concat(colors, colors, colors);
    return canvasTex(1024, 256, (g, w, h) => {
      if (!gaps) { g.fillStyle = '#1a1d26'; g.fillRect(0, 0, w, h); }
      for (let row = 0; row < 16; row++) for (let i = 0; i < 64; i++) {
        if (gaps ? (i + row) % 2 : rnd() < 0.12) { rnd(); continue; }
        const x = i * 16 + 8 + rnd() * 3, y = row * 16 + 15;
        g.fillStyle = pal[(rnd() * pal.length) | 0]; g.fillRect(x - 5, y - 9, 10, 9);
        g.fillStyle = ['#e8b98f', '#c98d62', '#8a5a3a', '#f0c9a4'][(rnd() * 4) | 0]; g.beginPath(); g.arc(x, y - 12, 3.4, 0, 7); g.fill();
      }
    }, [4, 1]);
  }

  function buildStadium(homeCol, awayCol) {
    const g = new THREE.Group(); g.name = 'stadium';
    const cols = [homeCol, homeCol, awayCol];
    const texA = crowdTex(7, cols, false), texB = crowdTex(13, cols, true);
    const matA = new THREE.MeshBasicMaterial({ map: texA, color: 0xb9b9c4 }), matB = new THREE.MeshBasicMaterial({ map: texB, color: 0xc9c9d2, alphaTest: 0.5 });
    const wall = new THREE.MeshLambertMaterial({ color: 0x20242e }), roofM = new THREE.MeshLambertMaterial({ color: 0x141821 });
    const ad = new THREE.MeshBasicMaterial({ map: canvasTex(1024, 64, (c, w, h) => {
      const bg = ['#0b3d91', '#b3121d', '#111', '#e0a80f', '#0a7a3c', '#111'];
      for (let i = 0; i < 6; i++) { c.fillStyle = bg[i]; c.fillRect((i * w) / 6, 0, w / 6, h); c.fillStyle = '#fff'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.fillText(['GOLAZO', 'FÚTBOL 3D', 'GOLAZO', '¡VAMOS!', 'GOLAZO', 'LA LIGA DEL BARRIO'][i], (i + 0.5) * (w / 6), 46, w / 6 - 10); }
    }, [2, 1]) });
    crowd = [];
    // cuatro tribunas inclinadas: [centro x, centro z, ancho, giro]
    const S = [[0, -(P.HW + 8), 150, 0], [0, P.HW + 8, 150, Math.PI], [-(P.HL + 9), 0, 100, Math.PI / 2], [P.HL + 9, 0, 100, -Math.PI / 2]];
    S.forEach((s, i) => {
      const st = new THREE.Group(); st.position.set(s[0], 0, s[1]); st.rotation.y = s[3];
      const slope = Math.atan2(13, 22), len = Math.hypot(13, 22);
      for (let L = 0; L < 2; L++) {
        const geo = new THREE.PlaneGeometry(s[2], len); const m = new THREE.Mesh(geo, L ? matB : matA);
        m.rotation.x = -(Math.PI / 2 - slope); m.position.set(0, 1.4 + 6.5 + L * 0.12, -11 - L * 0.05); st.add(m);
        if (L) crowd.push({ m, y: m.position.y, ph: i * 1.7 });
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(s[2], 22, 1), wall); back.position.set(0, 11, -22.6); st.add(back);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(s[2], 0.6, 16), roofM); roof.position.set(0, 22, -15); st.add(roof);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(i < 2 ? 112 : 72, 1), ad); board.position.set(0, 0.5, 3.6); st.add(board);
      const base = new THREE.Mesh(new THREE.BoxGeometry(s[2], 1.4, 0.4), wall); base.position.set(0, 0.7, 0); st.add(base);
      g.add(st);
    });
    const lampM = new THREE.MeshBasicMaterial({ color: 0xfff6d8 }), poleM = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { // torres de luz
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.8, 34, 0.8), poleM); pole.position.set(sx * 68, 17, sz * 50); g.add(pole);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(7, 3.5, 0.5), lampM); lamp.position.set(sx * 68, 35, sz * 50); lamp.lookAt(0, 0, 0); g.add(lamp);
    }
    return g;
  }

  function buildGoals() {
    const g = new THREE.Group(), white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const net = new THREE.MeshBasicMaterial({ map: canvasTex(32, 32, (c) => { c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; c.strokeRect(0, 0, 32, 32); }, [1, 1]), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    const netP = (w, h) => { const ge = new THREE.PlaneGeometry(w, h), uv = ge.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 4, uv.getY(i) * h * 4); return new THREE.Mesh(ge, net); };
    for (const d of [-1, 1]) {
      const gx = d * P.HL;
      for (const k of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, P.GH, 8), white); post.position.set(gx, P.GH / 2, k * P.GW); post.castShadow = true; g.add(post); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, P.GW * 2 + 0.12, 8), white); bar.rotation.x = Math.PI / 2; bar.position.set(gx, P.GH, 0); bar.castShadow = true; g.add(bar);
      const back = netP(P.GW * 2, P.GH); back.rotation.y = Math.PI / 2; back.position.set(gx + d * P.NET, P.GH / 2, 0); g.add(back);
      const top = netP(P.NET, P.GW * 2); top.rotation.x = Math.PI / 2; top.position.set(gx + (d * P.NET) / 2, P.GH, 0); g.add(top);
      for (const k of [-1, 1]) { const side = netP(P.NET, P.GH); side.position.set(gx + (d * P.NET) / 2, P.GH / 2, k * P.GW); g.add(side); }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5), new THREE.MeshLambertMaterial({ color: 0xf2e23a })); f.position.set(sx * P.HL, 0.75, sz * P.HW); g.add(f); }
    return g;
  }

  Rn.init = function (canvas) {
    renderer = Rn.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = Rn.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1326); scene.fog = new THREE.Fog(0x0b1326, 140, 320);
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x35553a, 1.7));
    sun = new THREE.DirectionalLight(0xfff4e0, 2.3);
    sun.shadow.camera.left = -42; sun.shadow.camera.right = 42; sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30; sun.shadow.camera.near = 10; sun.shadow.camera.far = 160; sun.shadow.bias = -0.0006;
    scene.add(sun, sun.target);

    const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x1f6b2c })); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.03; scene.add(outer);
    grass = new THREE.Mesh(new THREE.PlaneGeometry(126, 84), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
    scene.add(buildGoals());

    ballMesh = new THREE.Mesh(new THREE.SphereGeometry(P.R, 16, 12), new THREE.MeshLambertMaterial({ map: canvasTex(128, 64, (g, w, h) => {
      g.fillStyle = '#fafafa'; g.fillRect(0, 0, w, h); g.fillStyle = '#16181d';
      for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(((i % 6) + 0.5 * ((i / 6) | 0)) * (w / 6) + 8, i < 6 ? 18 : 46, 7.5, 0, 7); g.fill(); }
    }) }));
    ballMesh.castShadow = true; scene.add(ballMesh);
    const shM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false });
    ballSh = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), shM.clone()); ballSh.rotation.x = -Math.PI / 2; scene.add(ballSh);
    blobs = new THREE.InstancedMesh(new THREE.CircleGeometry(0.42, 12).rotateX(-Math.PI / 2), shM, 23); blobs.frustumCulled = false; scene.add(blobs);
    ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.6, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.9, depthWrite: false })); scene.add(ring);
    arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xffe14a })); scene.add(arrow);

    G.Figure.init(scene, 23);
    G.Cam.init();
    Rn.setQuality(mobile ? 1 : 3);
    Rn.resize(); addEventListener('resize', Rn.resize);
  };

  // 3 = sombras 2048 · 2 = sombras 1024 · 1 = sin sombras (manchas) · 0 = además baja la resolución
  Rn.setQuality = function (q) {
    Rn.q = q = G.clamp(q, 0, 3);
    const sh = q >= 2;
    sun.castShadow = sh; G.Figure.shadows(sh); blobs.visible = !sh;
    if (sh) { sun.shadow.mapSize.set(q === 3 ? 2048 : 1024, q === 3 ? 2048 : 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    const s = q >= 2 ? 16 : 10;
    if (grass.userData.s !== s) { if (grass.material.map) grass.material.map.dispose(); const t = pitchTex(s); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); grass.material.map = t; grass.material.needsUpdate = true; grass.userData.s = s; }
    Rn.resize();
  };

  Rn.resize = function () {
    if (!renderer) return;
    const w = innerWidth, h = innerHeight, dpr = devicePixelRatio || 1;
    renderer.setPixelRatio(Math.min(dpr, [0.8, 1.25, 1.5, 2][Rn.q]));
    renderer.setSize(w, h, false);
    G.Cam.cam.aspect = w / h; G.Cam.cam.updateProjectionMatrix();
  };

  function dist(a, c) { return Math.hypot(a.r - c.r, a.g - c.g, a.b - c.b); }
  const SKIN = ['#f0c7a2', '#e0ac82', '#c68958', '#9a6238', '#6b4326'], HAIR = ['#1a1410', '#2c1e12', '#5a3a1c', '#b08a4a', '#0d0d0d', '#7a4a22'];

  // Crea las 23 figuras (22 jugadores + árbitro) con los uniformes del partido.
  Rn.build = function (M) {
    const kits = M.teams.map((t) => Object.assign({}, t.data.colors));
    const c0 = new THREE.Color(kits[0].shirt), c1 = new THREE.Color(kits[1].shirt);
    if (dist(c0, c1) < 0.45) { // uniformes parecidos: el visitante cambia
      const alt = M.teams[1].data.alt || (c0.r + c0.g + c0.b > 1.8 ? { shirt: '#1b1e28', sleeves: '#1b1e28', shorts: '#1b1e28', socks: '#1b1e28' } : { shirt: '#f4f4f4', sleeves: '#f4f4f4', shorts: '#f4f4f4', socks: '#f4f4f4' });
      Object.assign(kits[1], alt); c1.set(kits[1].shirt);
    }
    Rn.kits = kits;
    const gkPal = ['#e8d21d', '#2fd16a', '#ff7a1a', '#e84fb0', '#35c9e8', '#9a9a9a'];
    const gkCol = (skip) => gkPal.find((c) => { col.set(c); return dist(col, c0) > 0.5 && dist(col, c1) > 0.5 && c !== skip; }) || gkPal[0];
    const gk0 = gkCol(null), gk1 = gkCol(gk0);
    figs = M.players.map((p, i) => {
      const k = kits[p.team.id], h = G.hash(p.name), g = p.gk ? (p.team.id ? gk1 : gk0) : null;
      p.skin = SKIN[h % 5]; p.hair = HAIR[(h >>> 4) % 6];
      return G.Figure.create(i, { shirt: g || k.shirt, sleeves: g || k.sleeves || k.shirt, shorts: g || k.shorts, socks: g || k.socks || k.shirt, skin: p.skin, hair: p.hair, boots: (h >>> 8) % 3 ? '#15171c' : '#e9e9e9' });
    });
    ref = { fig: G.Figure.create(22, { shirt: '#101114', sleeves: '#101114', shorts: '#101114', socks: '#101114', skin: SKIN[1], hair: HAIR[0], boots: '#111' }), x: 0, y: 0, z: -8, vx: 0, vz: 0, face: 0, state: 'free', stateT: 0 };
    const old = scene.getObjectByName('stadium'); if (old) { scene.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    scene.add(buildStadium(kits[0].shirt, kits[1].shirt));
    ring.material.color.set(M.human >= 0 ? 0xffe14a : 0xffffff);
  };

  function updateRef(dt) { // el árbitro sigue la jugada a unos metros
    const tx = b.x * 0.8 - 6, tz = b.z * 0.6 + (b.z > 0 ? -9 : 9), dx = tx - ref.x, dz = tz - ref.z, d = Math.hypot(dx, dz), sp = Math.min(6.5, d * 1.2);
    ref.vx += ((d > 0.5 ? (dx / d) * sp : 0) - ref.vx) * Math.min(1, dt * 4); ref.vz += ((d > 0.5 ? (dz / d) * sp : 0) - ref.vz) * Math.min(1, dt * 4);
    ref.x += ref.vx * dt; ref.z += ref.vz * dt;
    ref.face += G.angDiff(ref.face, Math.atan2(b.z - ref.z, b.x - ref.x)) * Math.min(1, dt * 5);
    G.Figure.pose(ref.fig, ref, dt);
  }

  Rn.update = function (dt, simDt) {
    const M = G.M; time += dt;
    if (figs.length) {
      for (let i = 0; i < figs.length; i++) {
        const p = M.players[i];
        if (p.off) { G.Figure.hide(figs[i]); m4.makeTranslation(0, -50, 0); } else { G.Figure.pose(figs[i], p, simDt); m4.makeTranslation(p.x, 0.02, p.z); }
        blobs.setMatrixAt(i, m4);
      }
      updateRef(simDt); m4.makeTranslation(ref.x, 0.02, ref.z); blobs.setMatrixAt(22, m4);
      G.Figure.flush(); blobs.instanceMatrix.needsUpdate = true;
    }
    // balón: rueda según su velocidad
    ballMesh.position.set(b.x, b.y, b.z);
    const sp = Math.hypot(b.vx, b.vz);
    if (sp > 0.05 && simDt > 0 && !b.held) { up.set(b.vz / sp, 0, -b.vx / sp); ballMesh.rotateOnWorldAxis(up, (sp * simDt) / P.R); }
    ballSh.position.set(b.x, 0.025, b.z); ballSh.scale.setScalar(1 + b.y * 0.3); ballSh.material.opacity = 0.45 / (1 + b.y * 0.35);
    // marcador del jugador activo
    const t = M.human >= 0 ? M.teams[M.human] : null, a = t && t.active;
    ring.visible = arrow.visible = !!a && (M.state === 'play' || M.state === 'ready' || M.state === 'setup');
    if (a) { ring.position.set(a.x, 0.04, a.z); arrow.position.set(a.x, 2.25 + a.y + Math.sin(time * 5) * 0.06, a.z); arrow.rotation.y = time * 2; }
    // público: salta más cuanto más emoción
    if (Rn.q > 0) for (const c of crowd) c.m.position.y = c.y + Math.abs(Math.sin(time * (2.2 + M.excite * 5) + c.ph)) * (0.06 + M.excite * 0.55);
    sun.position.set(b.x * 0.7 - 30, 70, b.z * 0.5 + 45); sun.target.position.set(b.x * 0.7, 0, b.z * 0.5);
    renderer.render(scene, G.Cam.cam);
  };
})();
