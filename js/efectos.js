'use strict';
/* Pelotazo · efectos visuales: partículas (confeti, polvo, chispas, estela del balón), cielo, césped con detalle,
   afición que se mueve, uniformes con rayas y cámara de gol. Todo es dibujo: no cambia nada de cómo se juega.
   Importante: aquí NUNCA se usa rng() (el azar del juego): solo Math.random(), para que los partidos con semilla
   salgan igual con o sin efectos. */
const efectosActivos = () => DATOS.ajustes.efectos !== 'no' && DATOS.ajustes.calidad !== 'baja';
const _azar = (a, b) => a + Math.random() * (b - a);

/* ---------- partículas: una sola malla de puntos para todo ---------- */
function crearParticulas(escena, N = 600) {
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), tam = new Float32Array(N), alf = new Float32Array(N);
  const vel = new Float32Array(N * 3), vida = new Float32Array(N), vida0 = new Float32Array(N), grav = new Float32Array(N), t0 = new Float32Array(N);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('size', new THREE.BufferAttribute(tam, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('alpha', new THREE.BufferAttribute(alf, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: 'attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uK;\nvoid main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = max(0., size * uK * 420. / -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vC; varying float vA;\nvoid main(){ float d = length(gl_PointCoord - .5) * 2.; if (d > 1.) discard; gl_FragColor = vec4(vC, vA * (1. - d * d * .7)); }',
  });
  const puntos = new THREE.Points(g, mat); puntos.frustumCulled = false; puntos.renderOrder = 10; escena.add(puntos);
  let i0 = 0;
  const api = {
    puntos, mat,
    emitir(x, y, z, vx, vy, vz, r, gg, b, t, v, gr = 9.8) {
      const i = i0; i0 = (i0 + 1) % N;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
      col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b; tam[i] = t; t0[i] = t; vida[i] = vida0[i] = v; grav[i] = gr; alf[i] = 1;
    },
    paso(dt) {
      let vivas = 0;
      for (let i = 0; i < N; i++) {
        if (vida[i] <= 0) { if (tam[i]) { tam[i] = 0; alf[i] = 0; } continue; }
        vivas++;
        vida[i] -= dt; const k = Math.max(0, vida[i] / vida0[i]);
        vel[i * 3 + 1] -= grav[i] * dt;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (pos[i * 3 + 1] < .03 && grav[i] > 0) { pos[i * 3 + 1] = .03; vel[i * 3 + 1] *= -.25; vel[i * 3] *= .6; vel[i * 3 + 2] *= .6; }
        alf[i] = Math.min(1, k * 2.2); tam[i] = t0[i] * (.55 + .45 * k);
      }
      if (vivas || api.sucio) { g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = g.attributes.alpha.needsUpdate = true; api.sucio = vivas > 0; }
    },
    escala(k) { mat.uniforms.uK.value = k; },
    limpiar() { vida.fill(0); tam.fill(0); alf.fill(0); api.sucio = true; },
    // confeti de colores que cae desde arriba
    confeti(cx, cz, n = 140, radio = 14, alto = 11) {
      const cols = [[1, .82, .25], [.2, .5, 1], [.95, .27, .23], [.95, .97, .93], [.5, .82, 1], [1, .54, .4], [.62, .8, .4]];
      for (let i = 0; i < n; i++) {
        const c = cols[i % cols.length], a = Math.random() * 6.283, r = Math.random() * radio;
        api.emitir(cx + Math.cos(a) * r, alto + Math.random() * 4, cz + Math.sin(a) * r, _azar(-1.5, 1.5), _azar(2, 7), _azar(-1.5, 1.5), c[0], c[1], c[2], _azar(.9, 1.5), _azar(2.2, 3.6), 5.5);
      }
    },
    // polvo y briznas de césped
    polvo(x, z, dx, dz, n = 8, fuerza = 1) {
      for (let i = 0; i < n; i++) {
        const v = _azar(.8, 3.4) * fuerza, a = Math.atan2(dz, dx) + _azar(-1.3, 1.3);
        const verde = Math.random() < .5;
        api.emitir(x + _azar(-.3, .3), _azar(.05, .3), z + _azar(-.3, .3), Math.cos(a) * v, _azar(.6, 2.6) * fuerza, Math.sin(a) * v, verde ? .3 : .62, verde ? .5 : .52, verde ? .2 : .36, _azar(.35, .75), _azar(.35, .7), 9);
      }
    },
    chispas(x, y, z, n = 6, fuerza = 1) {
      for (let i = 0; i < n; i++) api.emitir(x, y, z, _azar(-3, 3) * fuerza, _azar(.5, 3) * fuerza, _azar(-3, 3) * fuerza, 1, .97, .85, _azar(.25, .5), _azar(.18, .4), 6);
    },
    destello(x, y, z, t = 2.4, v = .1) { api.emitir(x, y, z, 0, 0, 0, 1, 1, .94, t, v, 0); },
  };
  return api;
}

/* ---------- cielo ---------- */
const CIELOS = {
  dia: { arriba: '#3f8fe0', medio: '#8ccaff', horizonte: '#e6f5ff', nubes: .55 },
  tarde: { arriba: '#3b3f8f', medio: '#ff9e6b', horizonte: '#ffe0b0', nubes: .45 },
  noche: { arriba: '#02050d', medio: '#0b1630', horizonte: '#1c3058', estrellas: true },
};
function construirCielo() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const t = new THREE.CanvasTexture(c);
  R.cieloTex = t; R.cieloCanvas = c;
  R.cielo = new THREE.Mesh(new THREE.SphereGeometry(330, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
  R.cielo.renderOrder = -10; R.scene.add(R.cielo);
}
function pintarCielo(estilo) {
  const E = CIELOS[estilo] || CIELOS.dia, c = R.cieloCanvas, x = c.getContext('2d'), w = c.width, h = c.height, az = mulberry(11);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, E.arriba); g.addColorStop(.42, E.medio); g.addColorStop(.5, E.horizonte); g.addColorStop(.62, E.medio); g.addColorStop(1, E.arriba);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  if (E.estrellas) {
    for (let i = 0; i < 520; i++) { const px = az() * w, py = az() * h * .46, r = .4 + az() * 1.3; x.fillStyle = `rgba(255,255,255,${.25 + az() * .75})`; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
    const l = x.createRadialGradient(w * .74, h * .2, 4, w * .74, h * .2, 90); l.addColorStop(0, 'rgba(255,255,240,.95)'); l.addColorStop(.12, 'rgba(235,240,255,.55)'); l.addColorStop(1, 'rgba(180,200,255,0)');
    x.fillStyle = l; x.fillRect(0, 0, w, h);
  } else {
    // sol y nubes suaves
    const l = x.createRadialGradient(w * .3, h * .3, 5, w * .3, h * .3, 160); l.addColorStop(0, 'rgba(255,252,230,.95)'); l.addColorStop(.25, 'rgba(255,245,210,.35)'); l.addColorStop(1, 'rgba(255,245,210,0)');
    x.fillStyle = l; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const px = az() * w, py = h * (.3 + az() * .17), rx = 40 + az() * 90, ry = 10 + az() * 18;
      for (let k = 0; k < 6; k++) { const ox = (az() - .5) * rx * 1.4, oy = (az() - .5) * ry; const n = x.createRadialGradient(px + ox, py + oy, 1, px + ox, py + oy, rx * .55); n.addColorStop(0, `rgba(255,255,255,${E.nubes * .5})`); n.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = n; x.fillRect(px + ox - rx, py + oy - ry * 3, rx * 2, ry * 6); }
    }
  }
  R.cieloTex.needsUpdate = true;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- césped con detalle ---------- */
function crearTexturaCesped(cols) {
  const alta = DATOS.ajustes.calidad !== 'baja', W = alta ? 2048 : 1024, H = W / 2, az = mulberry(7);
  const tex = texturaCanvas(W, H, (c, w, h) => {
    const n = 18, ancho = w / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = cols[i % 2]; c.fillRect(i * ancho, 0, ancho + 1, h);
      // el corte de la segadora: un lado de cada franja más claro que el otro
      const g = c.createLinearGradient(i * ancho, 0, (i + 1) * ancho, 0);
      g.addColorStop(0, i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'); g.addColorStop(1, i % 2 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)');
      c.fillStyle = g; c.fillRect(i * ancho, 0, ancho + 1, h);
    }
    // manchas grandes y suaves (césped más claro y más oscuro)
    for (let i = 0; i < 70; i++) {
      const x = az() * w, y = az() * h, r = w * (.03 + az() * .09), claro = az() < .5;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, claro ? 'rgba(210,255,170,.07)' : 'rgba(0,25,0,.09)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // zonas gastadas: áreas pequeñas, punto de penalti y centro
    const gasta = (px, py, r, a) => { const g = c.createRadialGradient(px * w, py * h, 0, px * w, py * h, r); g.addColorStop(0, `rgba(120,96,52,${a})`); g.addColorStop(1, 'rgba(120,96,52,0)'); c.fillStyle = g; c.fillRect(px * w - r, py * h - r, r * 2, r * 2); };
    for (const px of [.035, .965]) gasta(px, .5, w * .045, .26);
    for (const px of [.1, .9]) gasta(px, .5, w * .012, .3);
    gasta(.5, .5, w * .02, .2);
    // briznas finas
    for (let i = 0; i < (alta ? 90000 : 30000); i++) {
      const x = az() * w, y = az() * h, l = 2 + az() * 4, a = (az() - .5) * .6, t = az();
      c.strokeStyle = t < .45 ? `rgba(255,255,255,${.03 + az() * .07})` : t < .8 ? `rgba(0,0,0,${.04 + az() * .08})` : `rgba(190,230,90,${.05 + az() * .08})`;
      c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); c.stroke();
    }
  });
  tex.anisotropy = Math.min(8, R.renderer.capabilities.getMaxAnisotropy ? R.renderer.capabilities.getMaxAnisotropy() : 1);
  return tex;
}

/* ---------- afición que se mueve, destellos de cámara y estadio ---------- */
function construirAmbiente() {
  // cielo, techos de las gradas largas y resplandor de los focos
  construirCielo();
  const techo = new THREE.MeshLambertMaterial({ color: 0x2a323d });
  for (const sz of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(PL + 36, .7, 11), techo); t.position.set(0, 17.5, sz * (HW + 16)); t.rotation.x = sz * -.12; R.scene.add(t);
    const luz = new THREE.Mesh(new THREE.BoxGeometry(PL + 34, .12, .5), new THREE.MeshBasicMaterial({ color: 0xdfe9ff })); luz.position.set(0, 17.1, sz * (HW + 11.6)); R.scene.add(luz);
  }
  const rs = texturaCanvas(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,245,1)'); g.addColorStop(.18, 'rgba(255,250,225,.55)'); g.addColorStop(1, 'rgba(255,250,225,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  R.resplandor = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: rs, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); s.scale.set(26, 26, 1); s.position.set(sx * (HL + 14), 30.5, sz * (HW + 14)); R.resplandor.add(s);
  }
  R.scene.add(R.resplandor);
  R.fx = crearParticulas(R.scene, 700);
}
let _tAmb = 0;
// cada fotograma de partido: afición que se mueve, destellos en los goles, partículas, red que tiembla
function animarAmbiente(dt) {
  if (!R || !R.fx) return;
  _tAmb += dt;
  const on = efectosActivos(), gol = G.fase === 'gol';
  R.fx.puntos.visible = on; R.fx.escala(R.renderer.domElement.height / 700);
  if (on) R.fx.paso(dt);
  if (R.texGradas) {
    R.texGradas.forEach((t, i) => { t.offset.x = Math.sin(_tAmb * 2.1 + i * 1.7) * .006; t.offset.y = Math.abs(Math.sin(_tAmb * (gol ? 9 : 3.2) + i)) * (gol ? .02 : .004); });
    R.matsGrada.forEach(m => { const k = gol ? 1.25 + .3 * Math.sin(_tAmb * 16) : 1; m.color.setScalar(k); });
  }
  if (on && gol && G.golT < 4) { // flashes de las cámaras de los aficionados
    for (let i = 0; i < 2; i++) {
      const lado = Math.random() < .5 ? -1 : 1, largo = Math.random() < .6;
      const x = largo ? _azar(-HL, HL) : lado * (HL + _azar(7, 13)), z = largo ? lado * (HW + _azar(8, 14)) : _azar(-HW * .8, HW * .8);
      R.fx.destello(x, _azar(3, 9), z, _azar(1.6, 3), .09);
    }
  }
  if (R.redes && R.redT > 0) { // la red tiembla tras un gol
    R.redT -= dt;
    for (const f of R.redes) { const k = Math.max(0, R.redT) / 1.2; f.m.position.x = f.x0 + Math.sin(_tAmb * 38) * .14 * k * f.s; f.m.scale.y = 1 + Math.sin(_tAmb * 30) * .05 * k; }
  }
  if (R.resplandor) R.resplandor.visible = R.focos.visible;
}
// efectos de juego que se llaman desde el motor (solo dibujo)
function fxGol() {
  if (!R || !R.fx || !efectosActivos()) return;
  const b = G.balon, lado = Math.sign(b.x) || 1;
  R.fx.confeti(lado * (HL - 8), b.z * .5, 150, 15, 11);
  R.fx.chispas(lado * HL, 1.2, b.z, 14, 2);
  R.redT = 1.2;
}
function fxBarrida(p) { if (R && R.fx && efectosActivos()) R.fx.polvo(p.x, p.z, -Math.cos(p.cara), -Math.sin(p.cara), 7, 1.1); }
function fxFreno(p) { if (R && R.fx && efectosActivos()) R.fx.polvo(p.x, p.z, -p.vx, -p.vz, 2, .55); }
function fxPatada(b, vel) { if (R && R.fx && efectosActivos() && vel > 15) R.fx.chispas(b.x, Math.max(.2, b.y), b.z, 4, Math.min(1.5, vel / 22)); }
let _estelaT = 0;
function fxEstela(dt) {
  if (!R || !R.fx || !efectosActivos()) return;
  const b = G.balon, v = hyp(b.vx, b.vz, b.vy);
  if (v < 17 || b.dueno) return;
  _estelaT += dt; if (_estelaT < .016) return; _estelaT = 0;
  R.fx.emitir(b.x, b.y, b.z, 0, 0, 0, .85, .93, 1, .5, .32, 0);
}

/* ---------- uniformes con rayas ----------
   Cada club con su dibujo (rayas verticales, aros, mitades o banda central) y el segundo color. */
const UNIFORMES = {
  BAR: ['v', 0x0a3d8f], MIL: ['v', 0x111111], JUV: ['v', 0x111111], ATM: ['v', 0xf5f5f5], ATH: ['v', 0xf5f5f5], NEW: ['v', 0xf5f5f5], INT: ['v', 0x111111],
  ATA: ['v', 0x111111], BOL: ['v', 0x1a2f48], SUN: ['v', 0xf5f5f5], GDL: ['v', 0x0a2240], SCP: ['o', 0xf5f5f5], PSG: ['c', 0xd6001c], NIC: ['h', 0x111111], FCP: ['v', 0xf5f5f5],
};
const PATRON_ID = { v: 1, o: 2, h: 3, c: 4 };
function patronDeEquipo(E) { const u = UNIFORMES[E.id]; return u ? { id: PATRON_ID[u[0]], col2: u[1] } : { id: 0, col2: E.camiseta }; }
// el material de la camiseta: lleva el dibujo según el atributo de cada jugador (aPat) y su segundo color (aCol2)
function materialCamiseta(base) {
  const m = base.clone();
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aCol2; attribute float aPat; varying vec3 vCol2; varying float vPat; varying vec3 vLoc;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvCol2 = aCol2; vPat = aPat; vLoc = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCol2; varying float vPat; varying vec3 vLoc;')
      .replace('#include <color_fragment>', `#include <color_fragment>
	float ang = atan(vLoc.z, vLoc.x), mk = 0.;
	if (vPat > .5 && vPat < 1.5) mk = step(0., sin(ang * 5.));
	else if (vPat > 1.5 && vPat < 2.5) mk = step(0., sin(vLoc.y * 40.));
	else if (vPat > 2.5 && vPat < 3.5) mk = step(0., vLoc.z);
	else if (vPat > 3.5) mk = 1. - step(.06, abs(vLoc.z));
	diffuseColor.rgb = mix(diffuseColor.rgb, vCol2, mk) * (1. + .12 * (vLoc.y - 1.25));`);
  };
  return m;
}

/* ---------- cámara de gol ---------- */
// devuelve { x, z, h, d, fov } si hay que acercarse a quien celebra el gol; null si no
function camaraGol() {
  if (!efectosActivos() || G.fase !== 'gol' || G.golT < .3 || G.golT > 3.2) return null;
  let mejor = null, md = 1e9;
  for (const p of G.todos) if (p.celebra > 0 && !p.exp) { const d = hyp(p.x - G.balon.x, p.z - G.balon.z); if (d < md) { md = d; mejor = p; } }
  return mejor ? { x: mejor.x, z: mejor.z, h: 6.5, d: 11, fov: 34 } : null;
}

/* ---------- afición: filas de personas con cabeza, camisetas apagadas, algunas con los brazos arriba y bufandas ---------- */
function crearTexturaPublico() {
  const az = mulberry(21);
  return texturaCanvas(1024, 256, (c, w, h) => {
    c.fillStyle = '#10151c'; c.fillRect(0, 0, w, h);
    const ropa = ['#6b7a8c', '#2d4a7a', '#8f2f2f', '#c9ccd2', '#3d5a40', '#a3822f', '#e6e6e6', '#4a3d6a', '#7a4a2a', '#1f2b3a', '#b64b3c', '#5d86b8'];
    const piel = ['#f1c9a5', '#d9a27b', '#b47a4f', '#8a5636', '#5e3a24', '#e8b894'];
    const fila = 11;
    for (let y = 4, r = 0; y < h - 4; y += fila, r++) {
      const sombra = .55 + .45 * (1 - y / h);
      for (let x = -4 + (r % 2) * 5; x < w; x += 9 + az() * 2) {
        if (az() < .08) continue; // un asiento vacío
        const cuerpo = ropa[Math.floor(az() * ropa.length)], p = piel[Math.floor(az() * piel.length)], arriba = az() < .1;
        c.globalAlpha = sombra;
        c.fillStyle = cuerpo; c.fillRect(x - 3, y + 4, 7, 8);                      // torso
        if (arriba) { c.fillRect(x - 5, y - 2, 2, 8); c.fillRect(x + 4, y - 2, 2, 8); } // brazos arriba
        c.fillStyle = p; c.beginPath(); c.arc(x + .5, y + 2.5, 2.6, 0, 7); c.fill();     // cabeza
        if (az() < .12) { c.fillStyle = az() < .5 ? '#d22b2b' : '#2b6fd2'; c.fillRect(x - 3, y + 5, 7, 2); } // bufanda
      }
      c.globalAlpha = 1; c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, y + fila - 2, w, 2); // el escalón
    }
    const v = c.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,.45)'); v.addColorStop(.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.2)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
  });
}
