// Anuncio 3D "Juntos" — marca, consola, juego y personajes ficticios. Todo se modela con primitivas de Three.js.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import aptHDR from './node_modules/@pmndrs/assets/hdri/apartment.exr.js';
import studioHDR from './node_modules/@pmndrs/assets/hdri/studio.exr.js';
import fontJSON from './node_modules/@pmndrs/assets/fonts/inter_extra_bold.json.js';
import fontBoldWoff from './node_modules/@pmndrs/assets/fonts/inter_bold.woff.js';
import fontSemiWoff from './node_modules/@pmndrs/assets/fonts/inter_semi_bold.woff.js';

const W = 1280, H = 720, PI = Math.PI;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const back = p => 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2); // easeOutBack
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- motor ----------
const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const ui = document.createElement('canvas'); ui.width = W; ui.height = H; document.body.appendChild(ui);
const g2 = ui.getContext('2d');
const camera = new THREE.PerspectiveCamera(35, W / H, .05, 600);
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType }));
const renderPass = new RenderPass(new THREE.Scene(), camera); composer.addPass(renderPass);
const bokeh = new BokehPass(renderPass.scene, camera, { focus: 5, aperture: .002, maxblur: .006 }); composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .35, .55, .88); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, warm: { value: 0 }, sepia: { value: 0 }, vig: { value: .35 }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float warm,sepia,vig,time;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;
    c*=vec3(1.+.07*warm,1.+.015*warm,1.-.09*warm);
    float l=dot(c,vec3(.299,.587,.114));c=mix(c,vec3(l*1.08,l*.9,l*.68),sepia);
    c*=1.-vig*smoothstep(.3,.9,distance(vUv,vec2(.5)));
    c+=(h(vUv*977.+fract(time)*31.)-.5)*.022;
    gl_FragColor=vec4(c,1.);}`
});
composer.addPass(grade);

// ---------- utilidades de modelado ----------
const MC = {};
const mat = (color, o = {}) => MC[color + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color, roughness: .62, ...o });
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .32, clearcoat: .7, clearcoatRoughness: .25, ...o });
const glow = (color, i = 1.6) => new THREE.MeshStandardMaterial({ color: '#000', emissive: color, emissiveIntensity: i });
function mesh(geo, m, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s, parent, shadow = true } = {}) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz);
  if (s != null) Array.isArray(s) ? o.scale.set(...s) : o.scale.setScalar(s);
  o.castShadow = o.receiveShadow = shadow; parent && parent.add(o); return o;
}
const rbox = (w, h, d, r = .04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .002, h / 2 - .002, d / 2 - .002));
const box = (parent, w, h, d, m, pos = {}, r = .04) => mesh(rbox(w, h, d, r), typeof m === 'string' ? mat(m) : m, { ...pos, parent });
const cyl = (rt, rb, h, n = 24) => new THREE.CylinderGeometry(rt, rb, h, n);
const sph = (r, a = 24, b = 16) => new THREE.SphereGeometry(r, a, b);
function group(parent, x = 0, y = 0, z = 0, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent && parent.add(g); return g; }

// ---------- texturas dibujadas ----------
const FONT = 'Inter, "DejaVu Sans", sans-serif';
const TEXTURES = [];
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.redraw = (...a) => { draw(ctx, w, h, ...a); t.needsUpdate = true; }; t.redraw(); TEXTURES.push(t); return t;
}
function rr(c, x, y, w, h, r, fill, stroke, lw = 3) { c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
function txt(c, s, x, y, size, color, w = 800, align = 'center') { c.font = `${w} ${size}px ${FONT}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); }
function kart2d(c, x, y, s, col, drv) {
  c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = '#222';
  for (const a of [-48, 48]) { c.beginPath(); c.arc(a, 18, 18, 0, 7); c.fill(); }
  rr(c, -62, -18, 124, 40, 16, col); rr(c, -40, -34, 80, 22, 8, '#ddd');
  c.fillStyle = drv === 'gorila' ? '#6b3e26' : '#f2c9a0'; c.beginPath(); c.arc(0, -62, 26, 0, 7); c.fill();
  if (drv === 'gorra') { c.fillStyle = '#e53935'; c.beginPath(); c.arc(0, -70, 27, PI, 0); c.fill(); rr(c, 0, -74, 34, 8, 4, '#e53935'); rr(c, -14, -54, 28, 8, 4, '#3b2a20'); }
  c.fillStyle = '#222'; c.beginPath(); c.arc(-8, -66, 3.5, 0, 7); c.arc(8, -66, 3.5, 0, 7); c.fill(); c.restore();
}
function woodTex(base, seed, rep) {
  return canvasTex(512, 512, c => {
    const r = rng(seed);
    for (let i = 0; i < 8; i++) {
      const col = new THREE.Color(base).offsetHSL((r() - .5) * .02, (r() - .5) * .08, (r() - .5) * .07);
      c.fillStyle = '#' + col.getHexString(); c.fillRect(i * 64, 0, 64, 512);
      c.strokeStyle = 'rgba(70,40,20,.12)'; c.lineWidth = 1.5;
      for (let k = 0; k < 6; k++) { c.beginPath(); const x0 = i * 64 + 8 + r() * 48; c.moveTo(x0, 0); for (let y = 0; y <= 512; y += 32) c.lineTo(x0 + Math.sin(y * .02 + k) * 3, y); c.stroke(); }
      c.fillStyle = 'rgba(60,35,20,.35)'; c.fillRect(i * 64, 0, 2, 512); c.fillRect(i * 64, r() * 512, 64, 2);
    }
  }, rep);
}
function skyNight(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#101a3d'); g.addColorStop(1, '#3a4a8a');
  c.fillStyle = g; c.fillRect(0, 0, w, h); const r = rng(7);
  for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,255,240,${.4 + r() * .6})`; c.beginPath(); c.arc(r() * w, r() * h * .8, r() * 1.6 + .4, 0, 7); c.fill(); }
  c.fillStyle = '#fff4cf'; c.beginPath(); c.arc(w * .72, h * .28, h * .11, 0, 7); c.fill();
}
function skySunset(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ff9e6b'); g.addColorStop(.55, '#ffd29a'); g.addColorStop(1, '#ffe9c4');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#fff3d0'; c.beginPath(); c.arc(w * .35, h * .62, h * .13, 0, 7); c.fill();
  c.fillStyle = '#e48a6a'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 8) c.lineTo(x, h * .78 - Math.sin(x * .02) * h * .06); c.lineTo(w, h); c.fill();
  c.fillStyle = '#c96f5a'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 8) c.lineTo(x, h * .88 - Math.sin(x * .03 + 1) * h * .04); c.lineTo(w, h); c.fill();
}
const gradientBg = (stops) => canvasTex(16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); c.fillStyle = g; c.fillRect(0, 0, w, h); });
function labelSprite(text, bg = 'rgba(30,20,12,.72)', fg = '#fff', scale = .5) {
  const t = canvasTex(256, 96, c => { c.clearRect(0, 0, 256, 96); rr(c, 8, 14, 240, 68, 34, bg); txt(c, text, 128, 49, 40, fg); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); s.scale.set(scale * 2.67, scale, 1); return s;
}

// TV / pantallas
function tvDraw(c, w, h, mode, t) {
  c.save(); c.scale(w / 640, h / 360); w = 640; h = 360;
  if (mode === 'off') { c.fillStyle = '#050608'; c.fillRect(0, 0, w, h); }
  else if (mode === 'title') {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3f97ff'); g.addColorStop(1, '#a6e3ff'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#5cc35a'; c.beginPath(); c.ellipse(w / 2, h + 40, w * .7, 130, 0, 0, 7); c.fill();
    const b = 1 + .04 * Math.sin(t * 5); c.save(); c.translate(w / 2, 120); c.scale(b, b);
    c.font = `900 66px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = 14; c.strokeStyle = '#c62828'; c.strokeText('SÚPER KART', 0, -20); c.fillStyle = '#ffd54a'; c.fillText('SÚPER KART', 0, -20);
    c.font = `900 44px ${FONT}`; c.strokeText('MUNDIAL', 0, 42); c.fillStyle = '#fff'; c.fillText('MUNDIAL', 0, 42); c.restore();
    kart2d(c, w / 2 + Math.sin(t * 2) * 30, 300, .9, '#e53935', 'gorra');
    if (Math.floor(t * 2) % 2) txt(c, 'PRESIONA  A', w / 2, 215, 22, '#fff');
  } else if (mode === 'race' || mode === 'meta') {
    c.fillStyle = '#86cfff'; c.fillRect(0, 0, w, h * .45); c.fillStyle = '#5cbf5a'; c.fillRect(0, h * .45, w, h * .55);
    c.fillStyle = '#7b7b86'; c.beginPath(); c.moveTo(w * .46, h * .45); c.lineTo(w * .54, h * .45); c.lineTo(w * .98, h); c.lineTo(w * .02, h); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.setLineDash([22, 22]); c.lineDashOffset = -t * 260;
    c.beginPath(); c.moveTo(w / 2, h * .45); c.lineTo(w / 2, h); c.stroke(); c.setLineDash([]);
    kart2d(c, w * (.36 + .06 * Math.sin(t * 3)), h * .86, .9, '#e53935', 'gorra');
    kart2d(c, w * (.64 + .05 * Math.sin(t * 2.3)), h * .78, .7, '#8a5634', 'gorila');
    rr(c, 14, 14, 150, 44, 10, 'rgba(0,0,0,.45)'); txt(c, 'VUELTA 3/3', 89, 37, 22, '#fff');
    if (mode === 'meta') {
      for (let i = 0; i < 16; i++) for (let j = 0; j < 9; j++) { c.fillStyle = (i + j) % 2 ? 'rgba(17,17,17,.85)' : 'rgba(255,255,255,.85)'; c.fillRect(i * 40, j * 40, 40, 40); }
      const s = 1 + .08 * Math.sin(t * 8); c.save(); c.translate(w / 2, h / 2); c.scale(s, s);
      rr(c, -170, -60, 340, 120, 28, '#e53935'); txt(c, '¡META!', 0, 4, 72, '#fff', 900); c.restore();
    }
  }
  c.restore();
}
const consoleScreen = canvasTex(256, 144, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#ffd54a'); g.addColorStop(1, '#ffb347'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = '#ff4b4b'; c.beginPath(); c.arc(w * .4, h * .44, 24, 0, 7); c.fill();
  c.fillStyle = '#2aa7e0'; c.beginPath(); c.arc(w * .6, h * .44, 24, 0, 7); c.fill(); txt(c, 'NEXO', w / 2, h * .82, 22, '#5d3a00', 900);
});

// ---------- personajes ----------
const DAD = { shirt: '#4f7cc4', pants: '#34445c', skin: '#e3ad82', hair: '#3b2a20', style: 'short', seed: .3 };
const MOM = { shirt: '#e0675a', pants: '#56507a', skin: '#f3cba5', hair: '#6b3f26', style: 'long', seed: 1.1 };
const LEO = { shirt: '#f4a53a', pants: '#3f66a0', skin: '#ecbc93', hair: '#2b1d14', style: 'spiky', kid: true, seed: 2.2 };
const SOFI = { shirt: '#9a6fd0', pants: '#3a5d7c', skin: '#f3cba5', hair: '#8a5530', style: 'bun', kid: true, seed: 1.7 };

function makePerson(o) {
  const s = o.kid ? .78 : 1, HIP = .55, hc = .3, P = {};
  const g = new THREE.Group(), root = group(g); root.scale.setScalar(s);
  const skin = mat(o.skin, { roughness: .5 }), shirt = mat(o.shirt, { roughness: .8 }), pants = mat(o.pants, { roughness: .85 });
  const hair = mat(o.hair, { roughness: .6 }), dark = phys('#1c1717', { roughness: .1, clearcoat: 1 });
  P.legs = [-1, 1].map(sx => {
    const l = group(root, sx * .11, HIP, 0);
    mesh(new THREE.CapsuleGeometry(.085, .28, 6, 16), pants, { y: -.23, parent: l });
    box(l, .17, .1, .25, mat(o.shoes || '#f4efe6', { roughness: .7 }), { y: -.5, z: .04 }, .045); return l;
  });
  mesh(sph(.205), pants, { y: HIP + .04, s: [1, .65, .9], parent: root });
  mesh(new THREE.CapsuleGeometry(.2, .26, 8, 24), shirt, { y: HIP + .3, s: [1.05, 1, .85], parent: root });
  P.arms = [-1, 1].map(sx => {
    const a = group(root, sx * .25, HIP + .5, 0); a.userData.sx = sx;
    mesh(new THREE.CapsuleGeometry(.065, .24, 6, 12), shirt, { y: -.17, parent: a });
    mesh(sph(.075, 16, 12), skin, { y: -.36, parent: a }); return a;
  });
  const head = group(root, 0, HIP + .62, 0); P.head = head;
  mesh(sph(.32, 40, 28), skin, { y: hc, parent: head });
  const ey = o.gorilla ? hc + .1 : hc + .04;
  if (o.gorilla) {
    mesh(sph(.2), mat('#d9b08c', { roughness: .6 }), { y: hc - .1, z: .2, s: [1.15, .8, .7], parent: head });
    for (const sx of [-1, 1]) mesh(sph(.09), skin, { x: sx * .31, y: hc + .02, parent: head });
    mesh(new THREE.ConeGeometry(.06, .14, 10), skin, { y: hc + .34, parent: head });
  }
  P.eyes = []; P.happy = [];
  for (const sx of [-1, 1]) {
    const e = mesh(sph(.05, 20, 14), dark, { x: sx * .11, y: ey, z: .285, s: [1, 1.15, .6], parent: head });
    mesh(sph(.017, 8, 8), glow('#ffffff', 1), { x: .016, y: .022, z: .045, parent: e, shadow: false });
    P.eyes.push(e);
    const he = mesh(new THREE.TorusGeometry(.04, .012, 8, 16, PI), dark, { x: sx * .11, y: ey - .01, z: .292, parent: head }); he.visible = false; P.happy.push(he);
    if (!o.gorilla) mesh(sph(.055, 12, 10), mat('#ff8f99', { transparent: true, opacity: .45 }), { x: sx * .19, y: hc - .06, z: .245, s: [1, .7, .4], parent: head, shadow: false });
  }
  const mz = o.gorilla ? .345 : .303, my = o.gorilla ? hc - .14 : hc - .1, mm = mat('#7a2e2a', { roughness: .5 });
  P.mouth = {
    smile: mesh(new THREE.TorusGeometry(.065, .014, 8, 20, PI), mm, { y: my, z: mz - .003, rz: PI, parent: head }),
    laugh: mesh(new THREE.CircleGeometry(.075, 24, PI, PI), mm, { y: my + .015, z: mz + .002, parent: head }),
    wow: mesh(new THREE.CircleGeometry(.04, 20), mm, { y: my, z: mz + .002, parent: head }),
    neutral: mesh(new THREE.CapsuleGeometry(.012, .07, 4, 8), mm, { y: my, z: mz - .003, rz: PI / 2, parent: head }),
  };
  const cap = (th, m = hair) => mesh(new THREE.SphereGeometry(.338, 40, 20, 0, PI * 2, 0, PI * th), m, { y: hc, rx: -.32, parent: head });
  if (o.style === 'short') cap(.44);
  if (o.style === 'spiky') { cap(.43); for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; mesh(new THREE.ConeGeometry(.08, .2, 10), hair, { x: Math.cos(a) * .16, y: hc + .3, z: Math.sin(a) * .16 - .05, rx: Math.sin(a) * .55, rz: -Math.cos(a) * .55, parent: head }); } }
  if (o.style === 'long') { cap(.5); mesh(new THREE.CapsuleGeometry(.3, .3, 8, 24), hair, { y: hc - .14, z: -.1, s: [1.08, 1, .75], parent: head }); }
  if (o.style === 'bun') { cap(.47); mesh(sph(.13), hair, { y: hc + .33, z: -.1, parent: head }); }
  if (o.capColor) {
    const cm = phys(o.capColor, { roughness: .45 });
    mesh(new THREE.SphereGeometry(.348, 40, 16, 0, PI * 2, 0, PI * .44), cm, { y: hc + .02, rx: -.12, parent: head });
    mesh(new THREE.CylinderGeometry(.22, .22, .03, 32, 1, false, -PI / 2, PI), cm, { y: hc + .17, z: .2, rx: .12, parent: head });
    mesh(sph(.065), skin, { y: hc - .01, z: .33, parent: head });
    if (o.mustache) mesh(new THREE.CapsuleGeometry(.035, .13, 6, 10), mat('#3b2418'), { y: hc - .055, z: .31, rz: PI / 2, parent: head });
  }
  // objetos en las manos
  const holder = group(root, 0, HIP + .26, .3); holder.rotation.x = -.7; P.dev = {};
  const phone = group(holder); box(phone, .12, .2, .025, mat('#1b1b22', { roughness: .3 }), {}, .02);
  mesh(new THREE.PlaneGeometry(.1, .17), glow('#8fd3ff', 2.2), { z: .0135, parent: phone, shadow: false }); P.dev.phone = phone;
  const pad = group(holder); box(pad, .09, .14, .05, phys('#29a8e0'), { x: -.065 }, .03); box(pad, .09, .14, .05, phys('#ff4b4b'), { x: .065 }, .03); P.dev.controller = pad;
  const con = makeConsole(); con.scale.setScalar(.36); holder.add(con); con.userData.screen.emissiveIntensity = 1.4; P.dev.console = con;
  P.light = new THREE.PointLight('#86ccff', 0, 1.2, 2); P.light.position.set(0, HIP + .7, .55); root.add(P.light);
  g.userData.P = P;
  g.pose = (q = {}) => {
    const t = q.t || 0, w = q.walk, sw = w != null ? Math.sin(w * 7) : 0;
    root.position.set(0, q.sit ? (q.seat ?? .45) - HIP * s + .03 : (w != null ? Math.abs(Math.cos(w * 7)) * .035 : 0) + (q.jump || 0), q.sit ? -.04 : 0);
    root.rotation.x = q.lean || 0;
    P.legs.forEach((l, i) => l.rotation.set(q.sit ? -PI / 2 + .1 : (i ? sw : -sw) * .55, 0, 0));
    P.arms.forEach((a, i) => {
      const sx = a.userData.sx; a.rotation.set(0, 0, 0);
      if (q.arms === 'front') { a.rotation.x = -1.05; a.rotation.z = -sx * .42; }
      else if (q.arms === 'up') a.rotation.z = sx * (2.55 + Math.sin(t * 9 + i * 2) * .18);
      else { a.rotation.x = (i ? -sw : sw) * .5; a.rotation.z = sx * .1; }
    });
    const mood = q.mood || 'neutral';
    head.rotation.set((q.nod || 0) + (mood === 'laugh' ? -.12 + Math.sin(t * 14) * .03 : 0), q.look || 0, q.tilt || 0);
    for (const k in P.mouth) P.mouth[k].visible = k === mood || (k === 'smile' && mood === 'happy');
    const blink = ((t + o.seed * 2) % 3.3) < .1;
    P.eyes.forEach(e => { e.visible = mood !== 'laugh' && mood !== 'happy'; e.scale.y = blink ? .15 : 1.15; });
    P.happy.forEach(e => e.visible = mood === 'laugh' || mood === 'happy');
    for (const k in P.dev) P.dev[k].visible = q.device === k;
    holder.rotation.x = q.device === 'console' ? -.25 : -.7;
    P.light.intensity = q.glow ? .4 * q.glow : 0;
  };
  g.pose();
  return g;
}

function makeConsole() {
  const g = new THREE.Group();
  box(g, 1.1, .62, .09, phys('#2a2a30', { roughness: .4 }), {}, .05);
  const scr = glow('#ffffff', 0); scr.emissiveMap = consoleScreen;
  mesh(new THREE.PlaneGeometry(.98, .52), scr, { z: .047, parent: g, shadow: false }); g.userData.screen = scr;
  for (const [sx, col] of [[-1, '#29a8e0'], [1, '#ff4b4b']]) {
    box(g, .3, .62, .11, phys(col), { x: sx * .7 }, .13);
    mesh(cyl(.055, .06, .06, 16), mat('#222'), { x: sx * .7, y: sx * -.12, z: .07, rx: PI / 2, parent: g });
    for (let k = 0; k < 4; k++) mesh(sph(.028, 10, 8), mat('#333'), { x: sx * .7 + Math.cos(k * PI / 2) * .06, y: sx * .13 + Math.sin(k * PI / 2) * .06, z: .055, parent: g });
  }
  return g;
}

function makeKart(color, driverOpts, tag) {
  const g = new THREE.Group(), body = group(g);
  const paint = phys(color, { roughness: .25 });
  box(body, 1.2, .32, 1.7, paint, { y: .42 }, .14);
  box(body, 1.0, .22, .5, paint, { y: .52, z: .78 }, .1);
  box(body, .75, .5, .3, mat('#2a2a2a'), { y: .7, z: -.45 }, .1);
  mesh(new THREE.TorusGeometry(.17, .03, 8, 20), mat('#222'), { y: .92, z: .38, rx: -.9, parent: body });
  for (const sx of [-1, 1]) mesh(cyl(.07, .09, .25, 12), mat('#9a9aa2', { metalness: .7, roughness: .3 }), { x: sx * .3, y: .5, z: -.9, rx: PI / 2, parent: body });
  const wheels = [];
  for (const [x, z] of [[-.62, .55], [.62, .55], [-.66, -.55], [.66, -.55]]) {
    const wg = group(g, x, .28, z); wheels.push(wg);
    mesh(cyl(.28, .28, .26, 24), mat('#232326', { roughness: .9 }), { rz: PI / 2, parent: wg });
    mesh(cyl(.13, .13, .27, 16), mat('#e8e8ee', { metalness: .5, roughness: .3 }), { rz: PI / 2, parent: wg });
  }
  const d = makePerson(driverOpts); d.scale.setScalar(.72); d.position.set(0, .2, -.15); body.add(d);
  const lab = labelSprite(tag); lab.position.set(0, 2.25, 0); g.add(lab);
  g.update = (t, i) => { wheels.forEach(w => w.rotation.x = t * 22); body.position.y = Math.abs(Math.sin(t * 9 + i)) * .03; d.pose({ sit: true, seat: .32, arms: 'front', mood: 'laugh', t: t + i }); };
  return g;
}

function makeTV(parent, x, y, z) {
  const tex = canvasTex(640, 360, (c, w, h, mode = 'off', t = 0) => tvDraw(c, w, h, mode, t));
  const g = group(parent, x, y, z);
  box(g, 3.1, 1.78, .1, phys('#18181c', { roughness: .3 }), {}, .04);
  const scr = glow('#ffffff', 0); scr.emissiveMap = tex; scr.roughness = .2;
  mesh(new THREE.PlaneGeometry(2.96, 1.66), scr, { z: .052, parent: g, shadow: false });
  g.set = (mode, t, power = 1) => { tex.redraw(mode, t); scr.emissiveIntensity = mode === 'off' ? 0 : 1.15 * power; scr.color.set(mode === 'off' ? '#0b0c10' : '#000'); };
  return g;
}

function makeRoomBasics(scene, { w, d, h = 3.2, wall, floor, walls = ['back', 'left', 'right'], woodSeed = 1 }) {
  const ft = woodTex(floor, woodSeed, [w / 2.2, d / 2.2]);
  box(scene, w, .2, d, new THREE.MeshStandardMaterial({ map: ft, roughness: .55 }), { y: -.1 }, .02);
  const wm = mat(wall, { roughness: .9 });
  if (walls.includes('back')) box(scene, w, h, .2, wm, { y: h / 2, z: -d / 2 }, .02);
  if (walls.includes('front')) box(scene, w, h, .2, wm, { y: h / 2, z: d / 2 }, .02);
  if (walls.includes('left')) box(scene, .2, h, d, wm, { x: -w / 2, y: h / 2 }, .02);
  if (walls.includes('right')) box(scene, .2, h, d, wm, { x: w / 2, y: h / 2 }, .02);
  const bm = mat('#fff7ec');
  if (walls.includes('back')) box(scene, w, .14, .05, bm, { y: .07, z: -d / 2 + .12 }, .01);
}
function windowOn(scene, x, y, z, ry, w, h, skyTex, curtain) {
  const g = group(scene, x, y, z, ry);
  mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: skyTex }), { z: .005, parent: g, shadow: false });
  const fm = mat('#fffaf2');
  box(g, w + .16, .1, .1, fm, { y: h / 2 }); box(g, w + .16, .1, .14, fm, { y: -h / 2 }); box(g, .1, h, .1, fm, { x: -w / 2 }); box(g, .1, h, .1, fm, { x: w / 2 });
  box(g, .06, h, .06, fm, {}); box(g, w, .06, .06, fm, {});
  if (curtain) for (const sx of [-1, 1]) box(g, .45, h + .5, .08, mat(curtain, { roughness: 1 }), { x: sx * (w / 2 + .2), y: -.1, z: .1 }, .03);
  return g;
}
function plant(parent, x, z, s = 1, seed = 3) {
  const g = group(parent, x, 0, z); g.scale.setScalar(s); const r = rng(seed);
  mesh(cyl(.22, .16, .4, 20), mat('#d2805a'), { y: .2, parent: g });
  for (let i = 0; i < 7; i++) mesh(sph(.16 + r() * .08, 16, 12), mat(['#5f9e5a', '#73b169', '#4f8b4f'][i % 3], { roughness: .8 }), { x: (r() - .5) * .35, y: .55 + r() * .45, z: (r() - .5) * .35, s: [1, 1.3, 1], parent: g });
  return g;
}
function lamp(parent, x, z, h = 1.6, color = '#ffcf94', intensity = 5) {
  const g = group(parent, x, 0, z);
  mesh(cyl(.18, .22, .05, 20), mat('#3a3a3a'), { y: .025, parent: g });
  mesh(cyl(.025, .025, h, 8), mat('#3a3a3a'), { y: h / 2, parent: g });
  mesh(new THREE.CylinderGeometry(.18, .3, .34, 24, 1, true), glow('#ffd8a8', .9), { y: h + .1, parent: g, shadow: false }).material.side = THREE.DoubleSide;
  const l = new THREE.PointLight(color, intensity, 7, 1.6); l.position.y = h; g.add(l); g.light = l; return g;
}
function bubbleSprite(draw, size = .5) {
  const t = canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); draw(c, w, h); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true })); s.scale.setScalar(size); return s;
}
const notif = () => bubbleSprite((c, w, h) => { c.fillStyle = '#ff5a5a'; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.fill(); txt(c, '1', 64, 68, 64, '#fff', 900); }, .32);
const surprise = () => bubbleSprite((c) => { rr(c, 34, 10, 60, 92, 24, '#fff', '#3a2a20', 6); txt(c, '!', 64, 58, 70, '#ff5a3a', 900); }, .55);

// ---------- set 1: casa (cada quien en su mundo) ----------
const HOUSE = (() => {
  const sc = new THREE.Scene(); sc.background = gradientBg(['#0b1230', '#1c2a5e', '#33427e']);
  sc.add(new THREE.HemisphereLight('#8ea2d8', '#2a2233', .55));
  const moon = new THREE.DirectionalLight('#a9bcff', 1.1); moon.position.set(-6, 9, 8); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 7, bottom: -3 }); moon.shadow.bias = -.0005; sc.add(moon);
  const r = rng(11), stars = new Float32Array(900);
  for (let i = 0; i < 300; i++) { stars[i * 3] = (r() - .5) * 120; stars[i * 3 + 1] = r() * 50 + 2; stars[i * 3 + 2] = -40 - r() * 10; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  sc.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff8e0', size: 2, sizeAttenuation: false })));
  mesh(sph(2.2, 32, 20), new THREE.MeshBasicMaterial({ color: '#fff3c9' }), { x: 16, y: 16, z: -38, parent: sc, shadow: false });
  mesh(new THREE.PlaneGeometry(200, 200), mat('#2c4a3a', { roughness: 1 }), { y: -.34, rx: -PI / 2, parent: sc, shadow: false }).receiveShadow = true;
  for (const [x, z, k] of [[-7.2, 1.4, 1], [7.4, 1.2, 1.2], [-8.6, -.8, .8], [8.8, -.5, .9]]) mesh(sph(.9 * k, 16, 12), mat('#2f6b45', { roughness: 1 }), { x, y: .1, z, s: [1.3, .8, 1], parent: sc });
  // casa de muñecas en corte
  const hw = 11.4, d = 3.4, h = 2.9;
  const ext = mat('#f2e2cf', { roughness: .9 });
  box(sc, hw + .6, .35, d + .5, mat('#8d6e58'), { y: -.17 }, .05);
  box(sc, hw + .2, h + .2, .2, ext, { y: h / 2, z: -d / 2 - .1 }, .03);
  for (const x of [-hw / 2, -hw / 6, hw / 6, hw / 2]) box(sc, .2, h, d, ext, { x, y: h / 2 }, .03);
  box(sc, hw + .4, .2, d + .2, ext, { y: h + .1 }, .03);
  const roof = new THREE.Shape(); roof.moveTo(-hw / 2 - .7, 0); roof.lineTo(0, 2.2); roof.lineTo(hw / 2 + .7, 0); roof.lineTo(-hw / 2 - .7, 0);
  mesh(new THREE.ExtrudeGeometry(roof, { depth: d + .6, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 2 }), mat('#c8664a', { roughness: .8 }), { y: h + .2, z: -d / 2 - .3, parent: sc });
  mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ color: '#ffd98a' }), { y: h + 1.05, z: d / 2 + .4, parent: sc, shadow: false });
  box(sc, .1, .9, .06, mat('#fff'), { y: h + 1.05, z: d / 2 + .42 }); box(sc, .9, .1, .06, mat('#fff'), { y: h + 1.05, z: d / 2 + .42 });
  const rooms = [[-3.8, '#dbe5f2', 21], [0, '#f6e5cf', 22], [3.8, '#eadcf3', 23]];
  rooms.forEach(([x, col, seed]) => {
    mesh(new THREE.PlaneGeometry(3.6, h - .02), mat(col, { roughness: .95 }), { x, y: h / 2, z: -d / 2 + .01, parent: sc, shadow: false }).receiveShadow = true;
    mesh(new THREE.PlaneGeometry(3.6, d), new THREE.MeshStandardMaterial({ map: woodTex('#c9996a', seed, [1.6, 1.6]), roughness: .6 }), { x, y: .005, rx: -PI / 2, parent: sc, shadow: false }).receiveShadow = true;
  });
  const night = canvasTex(256, 256, skyNight);
  windowOn(sc, -4.8, 1.9, -d / 2 + .05, 0, .9, .9, night); windowOn(sc, 4.9, 1.9, -d / 2 + .05, 0, .8, .9, night);
  // estudio: papá
  const desk = (x, w = 1.7) => { box(sc, w, .07, .75, mat('#a8774f'), { x, y: .76, z: -.1 }, .02); for (const sx of [-1, 1]) box(sc, .06, .74, .65, mat('#8c613f'), { x: x + sx * (w / 2 - .08), y: .37, z: -.1 }, .02); };
  const laptop = (x, z = -.12) => { const g = group(sc, x, .8, z); box(g, .56, .03, .38, mat('#b9c0c7', { metalness: .4, roughness: .35 }), { y: .015 });
    const lid = group(g, 0, .03, -.18); lid.rotation.x = -.25; box(lid, .56, .38, .025, mat('#b9c0c7', { metalness: .4, roughness: .35 }), { y: .19 });
    mesh(sph(.03, 12, 8), glow('#e8f4ff', 1.2), { y: .2, z: .015, parent: lid, shadow: false });
    mesh(new THREE.PlaneGeometry(.5, .32), glow('#9fd8ff', 1.6), { y: .19, z: -.014, ry: PI, parent: lid, shadow: false });
    const l = new THREE.PointLight('#8cc8ff', .9, 2.2, 2); l.position.set(0, .35, -.45); g.add(l); return g; };
  desk(-3.8); laptop(-3.8);
  box(sc, .9, 1.9, .35, mat('#9b6f4b'), { x: -5.0, y: .95, z: -1.45 }, .03);
  for (let i = 0; i < 9; i++) box(sc, .08, .3, .22, mat(['#e07a5f', '#3d5a80', '#81b29a', '#f2cc8f'][i % 4]), { x: -5.35 + i * .085, y: 1.5, z: -1.42 }, .01);
  const dad = makePerson(DAD); dad.position.set(-3.8, 0, -.75); sc.add(dad);
  // comedor: mamá
  desk(0, 1.9); laptop(0);
  mesh(cyl(.06, .05, .12, 16), mat('#fff'), { x: .62, y: .86, z: .05, parent: sc });
  plant(sc, 1.45, -1.2, .8, 5);
  const clock = group(sc, -.9, 2.15, -d / 2 + .06);
  mesh(cyl(.28, .28, .05, 32), mat('#fff'), { rx: PI / 2, parent: clock }); mesh(new THREE.TorusGeometry(.28, .03, 8, 32), mat('#c8664a'), { parent: clock });
  const hm = box(clock, .03, .16, .02, '#333', { z: .04 }), mh = box(clock, .02, .23, .02, '#333', { z: .05 });
  const mom = makePerson(MOM); mom.position.set(0, 0, -.75); sc.add(mom);
  // cuarto de los niños
  box(sc, 2.6, .36, 1.2, mat('#d9b48f'), { x: 3.8, y: .18, z: -.95 }, .06);
  box(sc, 2.5, .2, 1.12, mat('#8e7cc3', { roughness: .95 }), { x: 3.8, y: .45, z: -.95 }, .08);
  box(sc, .7, .18, .5, mat('#fff'), { x: 2.85, y: .62, z: -1.2 }, .08);
  const poster = canvasTex(256, 340, (c, w, h) => { c.fillStyle = '#ffd54a'; c.fillRect(0, 0, w, h); txt(c, 'SÚPER KART', w / 2, 50, 30, '#c62828', 900); kart2d(c, w / 2, 230, 1.3, '#e53935', 'gorra'); });
  mesh(new THREE.PlaneGeometry(.75, 1.0), mat('#fff', { map: poster }), { x: 4.4, y: 1.95, z: -d / 2 + .03, parent: sc });
  const leo = makePerson(LEO); leo.position.set(3.3, 0, -.75); sc.add(leo);
  const sofi = makePerson(SOFI); sofi.position.set(4.35, 0, -.75); sc.add(sofi);
  for (let i = 0; i < 4; i++) box(sc, .18, .18, .18, mat(['#ef476f', '#ffd166', '#06d6a0', '#118ab2'][i]), { x: 2.6 + i * .3, y: .09, z: .9 - (i % 2) * .2, ry: i }, .03);
  const notes = [[-3.8, 1.3], [3.3, .6], [0, 2.2], [4.35, 3.0], [-3.8, 3.8], [3.3, 4.6], [0, 5.4], [4.35, 6.2], [-3.8, 6.9]].map(([x, t0]) => { const s = notif(); s.userData = { x, t0 }; sc.add(s); return s; });
  const people = [[dad, .45, 0], [mom, .45, 0], [leo, .52, .25], [sofi, .52, -.25]];
  return {
    scene: sc, exposure: .95, update(t) {
      people.forEach(([p, seat, look], i) => p.pose({ sit: true, seat, arms: 'front', device: i > 1 ? 'phone' : null, glow: i > 1 ? 1 : 0, nod: .28, look: look + Math.sin(t * .7 + i) * .05, t }));
      notes.forEach(s => { const p = seg(t, s.userData.t0, s.userData.t0 + 1.3); s.visible = p > 0 && p < 1; s.position.set(s.userData.x, 1.85 + p * .6, -.6); s.material.opacity = Math.min(1, (1 - p) * 2); s.scale.setScalar(.32 * back(Math.min(1, p * 4))); });
      hm.rotation.z = -t * .12; hm.position.set(Math.sin(t * .12) * .07, Math.cos(t * .12) * .07, .04);
      mh.rotation.z = -t * 1.2; mh.position.set(Math.sin(t * 1.2) * .1, Math.cos(t * 1.2) * .1, .05);
      const p = ease(seg(t, 0, 8));
      camera.fov = 30; camera.position.set(lerp(-.8, .4, p), lerp(3.0, 2.1, p), lerp(18.5, 12.2, p)); camera.lookAt(0, lerp(2.2, 1.35, p), 0);
      return { focus: camera.position.distanceTo(v3(0, 1, -.6)), aperture: .0012, maxblur: .006, warm: -.9, vig: .5 };
    }
  };
})();

// ---------- set 2: cuarto de Leo (el armario) ----------
const BED = (() => {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#1a1a2a');
  sc.environment = null;
  sc.add(new THREE.HemisphereLight('#a6b0e0', '#3a2e3a', .6));
  const moon = new THREE.DirectionalLight('#aebcff', .9); moon.position.set(-4, 6, 5); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -6, right: 6, top: 5, bottom: -3 }); moon.shadow.bias = -.0005; sc.add(moon);
  makeRoomBasics(sc, { w: 8, d: 6, wall: '#e6d8f0', floor: '#c49468', woodSeed: 31 });
  windowOn(sc, -1.6, 2.0, -2.88, 0, 1.3, 1.1, canvasTex(256, 256, skyNight), '#9fb7e8');
  const poster = canvasTex(256, 340, (c, w, h) => { c.fillStyle = '#ffd54a'; c.fillRect(0, 0, w, h); txt(c, 'SÚPER KART', w / 2, 50, 30, '#c62828', 900); kart2d(c, w / 2, 230, 1.3, '#e53935', 'gorra'); });
  mesh(new THREE.PlaneGeometry(.8, 1.05), mat('#fff', { map: poster }), { x: .5, y: 2.0, z: -2.88, parent: sc });
  // cama + buró
  box(sc, 2.1, .4, 1.3, mat('#d9b48f'), { x: -2.6, y: .2, z: -1.9 }, .06);
  box(sc, 2.0, .22, 1.22, mat('#8e7cc3', { roughness: .95 }), { x: -2.6, y: .5, z: -1.9 }, .1);
  box(sc, .75, .2, .5, mat('#fff'), { x: -3.2, y: .7, z: -2.2 }, .09);
  box(sc, .6, .6, .5, mat('#a8774f'), { x: -3.6, y: .3, z: -.75 }, .04);
  const nl = lamp(sc, -3.6, -.75, .55, '#ffc98a', 2.2); nl.position.y = .6;
  for (let i = 0; i < 3; i++) box(sc, .22, .22, .22, mat(['#ef476f', '#ffd166', '#06d6a0'][i]), { x: -.6 + i * .32, y: .11, z: .9, ry: i * .7 }, .04);
  box(sc, 2.4, .02, 1.6, mat('#f2c6a0', { roughness: 1 }), { x: -.6, y: .01, z: -.2 }, .01);
  // armario (frente hacia -x, en la pared derecha)
  const cl = group(sc, 3.35, 0, -.9, -PI / 2), wood = mat('#9c6b45'), inside = mat('#5a3c28', { roughness: .9 });
  box(cl, 2.3, 2.7, .08, inside, { y: 1.35, z: -.45 });
  box(cl, .1, 2.7, .95, wood, { x: -1.12, y: 1.35 }); box(cl, .1, 2.7, .95, wood, { x: 1.12, y: 1.35 });
  box(cl, 2.34, .1, .95, wood, { y: 2.7 }); box(cl, 2.34, .1, .95, wood, { y: .05 });
  box(cl, 2.15, .06, .85, wood, { y: 1.9 });
  mesh(cyl(.02, .02, 2.1, 8), mat('#bbb', { metalness: .6 }), { y: 1.75, rz: PI / 2, parent: cl });
  ['#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8'].forEach((c, i) => mesh(new THREE.CapsuleGeometry(.17, .45, 6, 12), mat(c, { roughness: 1 }), { x: -.8 + i * .4, y: 1.35, s: [1, 1, .45], parent: cl }));
  box(cl, .7, .55, .6, mat('#c9a06a'), { x: -.6, y: .38 }, .03); box(cl, .8, .45, .6, mat('#d4ad78'), { x: .45, y: .33 }, .03);
  const doors = [-1, 1].map(sx => { const p = group(cl, sx * 1.1, 1.36, .47); box(p, 1.08, 2.5, .06, mat('#b98257'), { x: -sx * .54 }, .02); mesh(sph(.04), mat('#d4b06a', { metalness: .8, roughness: .3 }), { x: -sx * .95, z: .05, parent: p }); return p; });
  // caja de recuerdos
  const memo = group(cl, .35, 1.93, -.05), cb = mat('#d2a86e');
  const lbl = canvasTex(256, 96, (c, w, h) => { c.fillStyle = '#d2a86e'; c.fillRect(0, 0, w, h); rr(c, 20, 18, 216, 60, 8, '#f6ead2'); txt(c, 'RECUERDOS', w / 2, 49, 30, '#6d4c2a', 900); });
  box(memo, .8, .45, .55, cb, { y: .225 }, .02);
  mesh(new THREE.PlaneGeometry(.6, .22), mat('#fff', { map: lbl }), { y: .24, z: .278, parent: memo });
  const lid = group(memo, 0, .45, -.275); box(lid, .84, .06, .58, mat('#c49a60'), { z: .275 }, .02);
  const cons = makeConsole(); cons.scale.setScalar(.42); sc.add(cons); cons.userData.screen.emissiveIntensity = 0;
  const gold = new THREE.PointLight('#ffc860', 0, 6, 1.5); sc.add(gold);
  const sparkles = Array.from({ length: 26 }, () => mesh(sph(.025, 8, 6), glow('#ffe7a0', 4), { parent: sc, shadow: false }));
  const shaftM = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shafts = group(sc); for (let i = 0; i < 6; i++) { const m = mesh(new THREE.CylinderGeometry(.35, .05, 2.6, 16, 1, true), shaftM, { y: 1.3, parent: group(shafts, 0, 0, 0, i), shadow: false }); m.parent.rotation.z = (i - 2.5) * .22; }
  const leo = makePerson(LEO); sc.add(leo);
  const tmp = new THREE.Vector3();
  return {
    scene: sc, exposure: 1.0, update(t) {
      // Leo: cama -> armario -> descubre la consola
      const walk = ease(seg(t, 1.5, 3.0));
      const open = ease(seg(t, 3.0, 3.8));
      doors[0].rotation.y = -1.85 * open; doors[1].rotation.y = 1.85 * open;
      const fall = seg(t, 3.95, 4.55), fe = fall * fall;
      memo.position.set(lerp(.35, .2, fe), lerp(1.93, .02, fe) + (fall > .9 ? Math.sin((fall - .9) * 30) * .02 : 0), lerp(-.05, 1.35, fe));
      memo.rotation.set(fe * .15 * (1 - seg(t, 4.55, 4.8)), 0, fe * .5 * (1 - seg(t, 4.55, 4.8)));
      lid.rotation.x = -1.9 * back(seg(t, 4.6, 5.1));
      const rev = seg(t, 4.75, 5.8), pick = ease(seg(t, 5.7, 6.3));
      memo.getWorldPosition(tmp);
      let lx = lerp(-2.1, 1.75, walk), lz = lerp(-1.05, -.55, walk), ry = 0;
      if (t > 1.5 && t < 3.05) ry = Math.atan2(1.75 + 2.1, .5);
      if (t >= 3.05) ry = lerp(PI / 2, .15, ease(seg(t, 4.7, 5.4)));
      if (t >= 3.9) { lx = lerp(1.75, 1.45, ease(seg(t, 3.9, 4.3))); }
      leo.position.set(lx, 0, lz); leo.rotation.y = ry;
      const holding = t > 6.0;
      leo.pose({ sit: t < 1.5, seat: .62, walk: t > 1.5 && t < 3.0 ? t : null, arms: t < 1.5 || holding ? 'front' : 'down', device: t < 1.5 ? 'phone' : holding ? 'console' : null, glow: t < 1.5 ? 1 : 0, nod: t < 1.5 ? .3 : 0, mood: t > 6.3 ? 'laugh' : t > 4.6 ? 'wow' : 'neutral', look: t > 4.4 && t < 5.6 ? .55 * (1 - seg(t, 5.2, 5.6)) : 0, t });
      const cp = tmp.clone().add(v3(0, .55 + rev * .5, 0));
      cons.visible = rev > 0 && !holding;
      cons.position.copy(cp.lerp(v3(lx + .3, 1.0, lz + .2), pick)); cons.rotation.set(-.15, -.9 + Math.sin(t * 1.5) * .2, 0);
      cons.userData.screen.emissiveIntensity = rev * 1.2;
      gold.position.copy(tmp).add(v3(0, .9, 0)); gold.intensity = (holding ? 2.2 : 7) * rev;
      shafts.position.copy(tmp).add(v3(0, .3, 0)); shaftM.opacity = .13 * rev * (1 - pick * .7);
      sparkles.forEach((s, i) => { const a = i * 2.4 + t * (1 + i % 3 * .4), rad = .5 + (i % 5) * .12; s.visible = rev > 0; s.position.copy(tmp).add(v3(Math.cos(a) * rad, .5 + ((i * .37 + t * .4) % 1.4), Math.sin(a) * rad)); s.scale.setScalar(rev * (.6 + Math.sin(t * 6 + i) * .4)); });
      // cámara
      const c1 = ease(seg(t, 1.8, 3.6)), c2 = ease(seg(t, 4.5, 7.5));
      const pos = v3(lerp(-1.0, .2, c1), lerp(2.3, 1.75, c1), lerp(4.8, 3.5, c1)).lerp(v3(.5, 1.4, 2.5), c2);
      const tgt = v3(lerp(-2.2, 2.0, c1), lerp(.95, 1.25, c1), lerp(-1.4, -.7, c1)).lerp(v3(1.4, 1.0, -.4), c2);
      camera.fov = 34; camera.position.copy(pos); camera.lookAt(tgt);
      return { focus: pos.distanceTo(tgt), aperture: .0018, maxblur: .007, warm: lerp(-.4, .9, rev), vig: .45, battery: t < 1.5 ? leo : null };
    }
  };
})();

// ---------- set 3: sala ----------
const LIVING = (() => {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#2b1d14');
  sc.add(new THREE.HemisphereLight('#ffeedd', '#8a6448', .85));
  const sun = new THREE.DirectionalLight('#ffc48a', 2.3); sun.position.set(-4, 6, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 6, bottom: -4, far: 30 }); sun.shadow.bias = -.0004; sun.shadow.radius = 4; sc.add(sun);
  makeRoomBasics(sc, { w: 12, d: 8, wall: '#f3dcc0', floor: '#c99a6b', walls: ['back', 'front', 'left', 'right'], woodSeed: 41 });
  const sunset = canvasTex(512, 384, skySunset);
  windowOn(sc, -2.3, 1.9, 3.88, PI, 2.2, 1.5, sunset, '#e07a5f'); windowOn(sc, 5.88, 1.9, 1.2, -PI / 2, 1.6, 1.5, sunset, '#e07a5f');
  const rug = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#efd3ae'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d9a46c'; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28); c.strokeStyle = '#e07a5f'; c.lineWidth = 4; c.strokeRect(34, 34, w - 68, h - 68); });
  box(sc, 5, .03, 3.2, mat('#fff', { map: rug, roughness: 1 }), { y: .015, z: -.4 }, .01);
  // mueble TV + TV + dock
  box(sc, 3.8, .55, .65, mat('#8b5a3c'), { y: .3, z: -3.5 }, .04);
  for (const x of [-1.25, 0, 1.25]) box(sc, 1.15, .4, .02, mat('#9c6a48'), { x, y: .3, z: -3.17 }, .01);
  const tv = makeTV(sc, 0, 1.6, -3.75);
  const dock = group(sc, 1.35, .58, -3.45); box(dock, .55, .3, .16, phys('#2a2a30'), { y: .15 }, .03);
  const docked = makeConsole(); docked.scale.setScalar(.45); docked.position.set(0, .34, .0); dock.add(docked); docked.visible = false;
  plant(sc, -2.6, -3.4, 1.1, 9); plant(sc, 4.9, -3.4, 1.4, 12);
  box(sc, 1.6, .06, .3, mat('#a8774f'), { x: -3.9, y: 1.5, z: -3.75 }); box(sc, 1.6, .06, .3, mat('#a8774f'), { x: -3.9, y: 2.1, z: -3.75 });
  for (let i = 0; i < 10; i++) box(sc, .1, .34 + (i % 3) * .05, .22, mat(['#e07a5f', '#3d5a80', '#81b29a', '#f2cc8f', '#c8664a'][i % 5]), { x: -4.55 + i * .12, y: 1.7 + (i % 3) * .025, z: -3.75 }, .01);
  const photo = canvasTex(256, 192, (c, w, h) => { c.fillStyle = '#fbe8cf'; c.fillRect(0, 0, w, h); ['#e3ad82', '#f3cba5', '#ecbc93', '#f3cba5'].forEach((s, i) => { c.fillStyle = s; c.beginPath(); c.arc(50 + i * 52, 100 - (i > 1 ? -12 : 0), i > 1 ? 18 : 24, 0, 7); c.fill(); }); });
  const fr = group(sc, 3.4, 2.2, -3.88); box(fr, .9, .7, .05, mat('#8b5a3c')); mesh(new THREE.PlaneGeometry(.76, .56), mat('#fff', { map: photo }), { z: .03, parent: fr });
  const fl = lamp(sc, 3.0, 2.5, 1.7, '#ffbf80', 5);
  // sofá
  const sofa = group(sc, 0, 0, 1.75), sm = mat('#5a958d', { roughness: .95 }), sm2 = mat('#4c8279', { roughness: .95 });
  box(sofa, 3.9, .38, 1.0, sm2, { y: .22 }, .08);
  for (const x of [-1.25, 0, 1.25]) box(sofa, 1.22, .2, .86, sm, { x, y: .5, z: -.03 }, .09);
  box(sofa, 3.9, .8, .32, sm2, { y: .78, z: .4 }, .12);
  for (const sx of [-1, 1]) box(sofa, .34, .62, 1.0, sm2, { x: sx * 2.05, y: .45 }, .12);
  box(sofa, .5, .45, .16, mat('#f2c14e', { roughness: 1 }), { x: -1.65, y: .82, z: .2, rz: .2 }, .08);
  box(sofa, .5, .45, .16, mat('#e07a5f', { roughness: 1 }), { x: 1.65, y: .82, z: .2, rz: -.2 }, .08);
  box(sc, 1.3, .38, .7, mat('#a8774f'), { x: 0, y: .19, z: -.6 }, .05);
  mesh(cyl(.06, .05, .12, 16), mat('#fff'), { x: .3, y: .44, z: -.55, parent: sc });
  const tvLight = new THREE.PointLight('#9fd3ff', 0, 8, 1.4); tvLight.position.set(0, 1.4, -2.6); sc.add(tvLight);
  const fam = { leo: makePerson(LEO), dad: makePerson(DAD), mom: makePerson(MOM), sofi: makePerson(SOFI) };
  Object.values(fam).forEach(p => sc.add(p));
  const seats = { leo: -1.25, dad: -.42, mom: .42, sofi: 1.25 };
  const bangs = ['dad', 'mom', 'sofi'].map(() => { const s = surprise(); sc.add(s); return s; });
  const N = 260, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(.07, .04), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .5 }), N);
  const cr = rng(5), cd = Array.from({ length: N }, () => [cr() * 5 - 2.5, cr() * 3, cr() * 3 - .5, cr() * 6, cr()]);
  const palette = ['#e53935', '#ffd54a', '#2aa7e0', '#43a047', '#ff7eb9', '#ffffff'].map(c => new THREE.Color(c));
  cd.forEach((_, i) => conf.setColorAt(i, palette[i % palette.length])); sc.add(conf);
  const dummy = new THREE.Object3D();
  const sitAt = (p, k, q) => { p.position.set(seats[k], 0, 1.68); p.rotation.y = PI; p.pose({ sit: true, seat: .6, ...q }); };
  const shots = {
    wide: [v3(-4.7, 2.6, -2.3), v3(.5, .95, 1.1)],
    faces: [v3(0, 1.3, -1.75), v3(0, 1.0, 1.7)],
    tv: [v3(.4, 2.0, 3.55), v3(0, 1.45, -3.7)],
    dock: [v3(-2.4, 1.55, -.2), v3(1.6, .95, -2.8)],
  };
  const cam = (a, b, p, fov = 34) => { camera.fov = fov; const [pa, ta] = shots[a], [pb, tb] = shots[b]; camera.position.copy(pa).lerp(pb, p); const tg = ta.clone().lerp(tb, p); camera.lookAt(tg); return camera.position.distanceTo(tg); };
  return {
    scene: sc, exposure: 1.0, update(t, tg) {
      // tg = tiempo global
      Object.values(fam).forEach(p => p.visible = false); bangs.forEach(b => b.visible = false); conf.visible = false;
      let out = { aperture: .0016, maxblur: .007, warm: .9, vig: .38 };
      let tvMode = 'off', power = 1;
      const TV = (m) => tvMode = m;
      docked.visible = tg > 22.75;
      if (tg < 27) { // Leo conecta la consola
        const l = fam.leo; l.visible = true; const lt = tg - 20;
        if (lt < 2.6) { const p = ease(seg(lt, 0, 2.5)); l.position.set(lerp(4.6, 1.35, p), 0, lerp(.6, -2.75, p)); l.rotation.y = Math.atan2(1.35 - 4.6, -2.75 - .6); l.pose({ walk: lt, arms: 'front', device: 'console', mood: 'smile', t: lt }); }
        else if (lt < 3.2) { l.position.set(1.35, 0, -2.75); l.rotation.y = PI; l.pose({ arms: lt < 2.75 ? 'front' : 'down', device: lt < 2.75 ? 'console' : null, mood: 'smile', t: lt }); }
        else if (lt < 4.5) { const p = ease(seg(lt, 3.2, 4.4)); l.position.set(lerp(1.35, seats.leo, p), 0, lerp(-2.75, 1.0, p)); l.rotation.y = lt < 4.3 ? Math.atan2(seats.leo - 1.35, 3.75) : PI; l.pose({ walk: lt, device: 'controller', arms: 'front', mood: 'laugh', look: -.3, t: lt }); }
        else sitAt(l, 'leo', { arms: 'front', device: 'controller', mood: 'laugh', t: lt });
        if (lt > 2.9) TV(lt < 7 ? 'title' : 'race');
        power = lt > 2.9 ? Math.min(1.6, 1 + (1 - seg(lt, 2.9, 3.3)) * 3) : 1;
        out.focus = lt < 3.3 ? cam('dock', 'dock', 0, 36 - lt * 1.2) : cam('faces', 'faces', 0, lerp(36, 31, seg(lt, 3.3, 7)));
        if (lt < 3.3) { camera.position.lerp(v3(-1.2, 1.4, -1.2), ease(seg(lt, 0, 3.3)) * .6); camera.lookAt(lerp(2.2, 1.2, ease(seg(lt, 0, 2.6))), 1.0, -2.6); out.focus = camera.position.distanceTo(fam.leo.position); }
      } else if (tg < 34) { // la familia se une
        const lt = tg - 27; TV('race');
        sitAt(fam.leo, 'leo', { arms: 'front', device: 'controller', mood: 'laugh', look: lt > 3.5 ? 0 : .5, t: lt }); fam.leo.visible = true;
        [['dad', .3, 'smile'], ['mom', 1.3, 'smile'], ['sofi', 2.3, 'laugh']].forEach(([k, t0, mood], i) => {
          const p = fam[k], e = seg(lt, t0, t0 + 2), sx = seats[k]; if (lt < t0) return; p.visible = true;
          if (e < 1) {
            const pe = ease(e); p.position.set(lerp(6.2, sx, pe), 0, lerp(.6, .85, pe)); p.rotation.y = -PI / 2;
            p.pose({ walk: lt + i, mood: 'wow', look: -.4, t: lt });
            if (e < .55) { const b = bangs[i]; b.visible = true; b.position.set(p.position.x, 2.35 * (k === 'sofi' ? .82 : 1), p.position.z); b.scale.setScalar(.55 * back(clamp(e * 5))); }
          } else sitAt(p, k, { arms: 'front', device: 'controller', mood, look: (k === 'sofi' ? -.25 : .2) * Math.sin(lt * 2), t: lt });
        });
        out.focus = lt < 4.6 ? cam('wide', 'wide', 0, 34) : cam('faces', 'faces', 0, 32);
        if (lt < 4.6) { camera.position.x += lt * .08; out.focus = 5.5; }
        else { camera.position.z -= (lt - 4.6) * .05; }
      } else if (tg < 46) { // celebración
        const lt = tg - 42; TV('meta');
        const j = i => Math.abs(Math.sin(lt * 7 + i * 1.3)) * .06;
        sitAt(fam.leo, 'leo', { arms: 'up', mood: 'laugh', jump: j(0), t: lt });
        sitAt(fam.dad, 'dad', { arms: 'up', mood: 'laugh', jump: j(1), t: lt });
        sitAt(fam.mom, 'mom', { arms: 'front', device: 'controller', mood: 'laugh', look: -.3, jump: j(2), t: lt });
        sitAt(fam.sofi, 'sofi', { arms: 'up', mood: 'laugh', jump: j(3), t: lt });
        Object.values(fam).forEach(p => p.visible = true);
        out.focus = lt < 1.4 ? cam('tv', 'tv', 0, 36) : cam('faces', 'faces', 0, 33);
        if (lt < 1.4) { camera.position.z -= lt * .25; out.focus = 6; }
        conf.visible = lt > 1.0;
        cd.forEach(([x, y0, z, ph, sp], i) => { const y = 3.2 - ((lt * (.6 + sp * .5) + y0) % 3.4); dummy.position.set(x + Math.sin(lt * 2 + ph) * .2, y, z + 1.0); dummy.rotation.set(lt * 4 + ph, lt * 3 + i, ph); dummy.updateMatrix(); conf.setMatrixAt(i, dummy.matrix); });
        conf.instanceMatrix.needsUpdate = true;
      } else { // recuerdo cálido
        const lt = tg - 46; TV('race'); power = .8;
        Object.values(fam).forEach(p => p.visible = true);
        sitAt(fam.leo, 'leo', { arms: 'front', device: 'controller', mood: 'happy', tilt: .12, t: lt });
        sitAt(fam.dad, 'dad', { arms: 'front', device: 'controller', mood: 'happy', tilt: -.08, t: lt });
        sitAt(fam.mom, 'mom', { arms: 'front', device: 'controller', mood: 'happy', tilt: -.18, t: lt });
        sitAt(fam.sofi, 'sofi', { arms: 'front', device: 'controller', mood: 'laugh', tilt: -.12, t: lt });
        const p = ease(seg(lt, 0, 7));
        camera.fov = 33; camera.position.set(0, lerp(1.25, 1.7, p), lerp(-1.6, -2.8, p)); camera.lookAt(0, .95, 1.7);
        out = { focus: camera.position.distanceTo(v3(0, 1, 1.7)), aperture: .0012, maxblur: .006, warm: 1.2, vig: .55 + p * .1, sepia: .5 * ease(seg(lt, .5, 3.5)), photo: seg(lt, 1.6, 2.6) };
      }
      tv.set(tvMode, tg, power);
      tvLight.intensity = tvMode === 'off' ? 0 : 3.2 * power;
      tvLight.color.set(tvMode === 'meta' ? (Math.floor(tg * 6) % 2 ? '#ffd27a' : '#ff8f8f') : tvMode === 'title' ? '#a9dcff' : '#b4f0b0');
      return out;
    }
  };
})();

// ---------- set 4: carrera ----------
const RACE = (() => {
  const sc = new THREE.Scene(); sc.background = gradientBg(['#4da3ff', '#8fd0ff', '#d9f1ff']); sc.fog = new THREE.Fog('#cfeaff', 70, 260);
  sc.add(new THREE.HemisphereLight('#cfe9ff', '#5d8a3a', 1.1));
  const sun = new THREE.DirectionalLight('#fff0d0', 2.8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, far: 120 }); sun.shadow.bias = -.0006; sc.add(sun, sun.target);
  const grass = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#79c25a'; c.fillRect(0, 0, w, h); const r = rng(2); for (let i = 0; i < 900; i++) { c.fillStyle = r() > .5 ? 'rgba(60,140,50,.35)' : 'rgba(150,220,110,.35)'; c.fillRect(r() * w, r() * h, 3, 3); } }, [80, 80]);
  mesh(new THREE.PlaneGeometry(800, 800), mat('#fff', { map: grass, roughness: 1 }), { rx: -PI / 2, parent: sc, shadow: false }).receiveShadow = true;
  const pts = [[0, 0], [45, -12], [85, 5], [95, 45], [60, 75], [15, 70], [-25, 50], [-35, 15]].map(([x, z]) => v3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const L = curve.getLength(), N = 600, RW = 8;
  const ribbon = (w0, w1, y, tex, vRep) => {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, p = curve.getPointAt(u % 1), tg = curve.getTangentAt(u % 1), lt = v3(-tg.z, 0, tg.x);
      for (const [k, w] of [[0, w0], [1, w1]]) { const q = p.clone().addScaledVector(lt, w); pos.push(q.x, y, q.z); uv.push(k, u * L / vRep); }
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = mesh(g, mat('#fff', { map: tex, roughness: .9 }), { parent: sc, shadow: false }); m.receiveShadow = true; m.material.side = THREE.DoubleSide; return m;
  };
  const road = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#7a7a86'; c.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '0,0,0'},.06)`; c.fillRect(r() * w, r() * h, 2, 2); } c.fillStyle = '#fff'; c.fillRect(8, 0, 8, h); c.fillRect(w - 16, 0, 8, h); c.fillRect(w / 2 - 4, 0, 8, h / 2); });
  road.wrapS = road.wrapT = THREE.RepeatWrapping;
  ribbon(-RW / 2, RW / 2, .03, road, 6);
  const curb = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#e53935'; c.fillRect(0, 0, w, h / 2); c.fillStyle = '#fff'; c.fillRect(0, h / 2, w, h / 2); }); curb.wrapS = curb.wrapT = THREE.RepeatWrapping;
  ribbon(RW / 2, RW / 2 + .9, .06, curb, 2); ribbon(-RW / 2 - .9, -RW / 2, .06, curb, 2);
  // árboles, colinas, nubes
  const samples = curve.getSpacedPoints(200), r = rng(9);
  const farFromTrack = (x, z, m) => samples.every(p => (p.x - x) ** 2 + (p.z - z) ** 2 > m * m);
  const trunk = mat('#8a5a3a'), leaves = ['#4f9e4a', '#62b257', '#3f8a44', '#7cc66a'].map(c => mat(c, { roughness: .85 }));
  let n = 0; while (n < 110) { const x = -70 + r() * 200, z = -50 + r() * 170; if (!farFromTrack(x, z, 9)) continue; n++;
    const tg = group(sc, x, 0, z), s = .8 + r() * .9; tg.scale.setScalar(s);
    mesh(cyl(.25, .35, 1.6, 8), trunk, { y: .8, parent: tg });
    if (r() > .5) mesh(new THREE.ConeGeometry(1.5, 3.4, 10), leaves[n % 4], { y: 2.9, parent: tg });
    else { mesh(sph(1.4, 14, 10), leaves[n % 4], { y: 2.5, parent: tg }); mesh(sph(1.0, 12, 8), leaves[(n + 1) % 4], { x: .6, y: 3.3, parent: tg }); } }
  for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2, R = 170 + r() * 60; mesh(sph(40 + r() * 30, 24, 12), mat(['#6cb85a', '#88c86e', '#5aa64f'][i % 3], { roughness: 1 }), { x: 30 + Math.cos(a) * R, y: -18, z: 30 + Math.sin(a) * R, s: [1, .55, 1], parent: sc, shadow: false }); }
  const cloudM = mat('#ffffff', { roughness: 1, emissive: '#ffffff', emissiveIntensity: .25 });
  for (let i = 0; i < 16; i++) { const cg = group(sc, -80 + r() * 260, 35 + r() * 20, -90 + r() * 260); for (let k = 0; k < 4; k++) mesh(sph(4 + r() * 3, 14, 10), cloudM, { x: k * 4.5, y: Math.sin(k) * 1.5, parent: cg, shadow: false }); }
  // arco de meta
  const arch = group(sc); const p0 = curve.getPointAt(.06), t0 = curve.getTangentAt(.06); arch.position.copy(p0); arch.rotation.y = Math.atan2(t0.x, t0.z);
  for (const sx of [-1, 1]) box(arch, .6, 5, .6, phys('#e53935'), { x: sx * (RW / 2 + 1), y: 2.5 }, .2);
  const chk = canvasTex(512, 64, (c, w, h) => { for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#111' : '#fff'; c.fillRect(i * 16, j * 16, 16, 16); } rr(c, 176, 6, 160, 52, 26, '#e60012'); txt(c, 'NEXO', 256, 33, 34, '#fff', 900); });
  box(arch, RW + 2.8, 1.1, .3, mat('#fff', { map: chk }), { y: 5.2 }, .05);
  // cajas sorpresa
  const qTex = canvasTex(128, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); ['#ff5f6d', '#ffc371', '#47d16b', '#4fa3ff'].forEach((s, i) => g.addColorStop(i / 3, s)); c.fillStyle = g; c.fillRect(0, 0, w, h); txt(c, '?', 64, 70, 96, '#fff', 900); });
  const qMat = new THREE.MeshPhysicalMaterial({ map: qTex, emissive: '#ffffff', emissiveMap: qTex, emissiveIntensity: .35, transparent: true, opacity: .9, roughness: .15, clearcoat: 1 });
  const items = [];
  for (const u of [.22, .27, .32]) for (const l of [-2.4, 0, 2.4]) { const p = curve.getPointAt(u), tg = curve.getTangentAt(u); const b = mesh(rbox(1.1, 1.1, 1.1, .15), qMat, { parent: sc }); b.position.copy(p).addScaledVector(v3(-tg.z, 0, tg.x), l); b.userData.y = 1.1; items.push(b); }
  const karts = [
    makeKart('#e53935', { shirt: '#e53935', pants: '#2f5fb3', skin: '#f2c9a0', hair: '#3b2a20', capColor: '#e53935', mustache: true, seed: 1 }, 'PAPÁ'),
    makeKart('#ff7eb9', { shirt: '#ff7eb9', pants: '#fff', skin: '#f6d2b5', hair: '#ff8fc4', style: 'long', seed: 2 }, 'MAMÁ'),
    makeKart('#f4a53a', { shirt: '#7a4a2e', pants: '#7a4a2e', skin: '#6b4630', hair: '#6b4630', gorilla: true, seed: 3 }, 'LEO'),
    makeKart('#43a047', { shirt: '#43a047', pants: '#2f4f6f', skin: '#f2c9a0', hair: '#3b2a20', capColor: '#43a047', seed: 4 }, 'SOFI'),
  ];
  karts.forEach(k => sc.add(k));
  const kp = (i, t) => .065 + t * .0245 + .006 * Math.sin(t * .8 + i * 1.9) - i * .004;
  return {
    scene: sc, exposure: 1.05, curve, update(t) {
      const us = karts.map((k, i) => {
        const u = kp(i, t), p = curve.getPointAt(u % 1), tg = curve.getTangentAt(u % 1), lat = v3(-tg.z, 0, tg.x);
        k.position.copy(p).addScaledVector(lat, (i - 1.5) * 1.6 + Math.sin(t * 1.2 + i * 2) * .5);
        k.rotation.y = Math.atan2(tg.x, tg.z) + Math.sin(t * 2 + i) * .06; k.update(t, i); return u;
      });
      items.forEach((b, i) => { b.rotation.set(t * .8 + i, t * 1.2 + i, 0); b.position.y = b.userData.y + Math.sin(t * 3 + i) * .15; });
      const um = us.reduce((a, b) => a + b) / 4, uMax = Math.max(...us);
      let pos, tgt;
      if (t < 3.6) { // de frente, viendo a los pilotos
        const u = uMax + .017, p = curve.getPointAt(u % 1), tg = curve.getTangentAt(u % 1);
        pos = p.clone().add(v3(0, 1.5, 0)).addScaledVector(v3(-tg.z, 0, tg.x), Math.sin(t * .6) * 1.5);
        tgt = curve.getPointAt(um % 1).add(v3(0, 1.0, 0));
      } else { // persecución
        const u = um - .03, p = curve.getPointAt(u % 1);
        pos = p.add(v3(0, 3.6, 0)); tgt = curve.getPointAt((um + .02) % 1).add(v3(0, 1, 0));
      }
      camera.fov = 42; camera.position.copy(pos); camera.lookAt(tgt);
      sun.position.copy(tgt).add(v3(-20, 40, 15)); sun.target.position.copy(tgt);
      const lead = us.indexOf(Math.max(...us));
      return { focus: t < 3.6 ? pos.distanceTo(karts[lead].position) : 12, aperture: .0008, maxblur: .005, warm: .4, vig: .3, hud: true };
    }
  };
})();

// ---------- set 5: logo y cierre ----------
let LOGO;
function buildLogo(font) {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#2a1a10');
  const key = new THREE.DirectionalLight('#fff1dc', 1.5); key.position.set(3, 4, 6); sc.add(key);
  const rim = new THREE.DirectionalLight('#ffb36b', 1.3); rim.position.set(-5, 2, -3); sc.add(rim);
  sc.add(new THREE.AmbientLight('#ffe6c8', .5));
  const pill = (w, h) => { const s = new THREE.Shape(), r = h / 2; s.moveTo(-w / 2 + r, -r); s.lineTo(w / 2 - r, -r); s.absarc(w / 2 - r, 0, r, -PI / 2, PI / 2); s.lineTo(-w / 2 + r, r); s.absarc(-w / 2 + r, 0, r, PI / 2, PI * 1.5); return s; };
  const ext = (s, d) => new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 6, curveSegments: 48 });
  const logo = new THREE.Group();
  mesh(ext(pill(3.7, 1.55), .22), phys('#ffffff', { roughness: .25 }), { z: -.12, parent: logo });
  mesh(ext(pill(3.4, 1.25), .3), phys('#e60012', { roughness: .22, clearcoat: 1 }), { z: -.05, parent: logo });
  const tg = new TextGeometry('NEXO', { font, size: .62, depth: .14, curveSegments: 10, bevelEnabled: true, bevelThickness: .025, bevelSize: .018, bevelSegments: 4 });
  tg.computeBoundingBox(); const bb = tg.boundingBox; tg.translate(-(bb.max.x + bb.min.x) / 2, -(bb.max.y + bb.min.y) / 2, 0);
  mesh(tg, phys('#ffffff', { roughness: .2 }), { z: .3, parent: logo });
  sc.add(logo);
  const cons = makeConsole(); cons.userData.screen.emissiveIntensity = 1.3; sc.add(cons);
  const N = 70, r = rng(3), dots = Array.from({ length: N }, () => { const m = mesh(sph(.04 + r() * .06, 10, 8), glow('#ffd48a', 2 + r() * 2), { parent: sc, shadow: false }); m.userData = [r() * 14 - 7, r() * 8 - 4, -2 - r() * 6, r() * 6]; return m; });
  LOGO = {
    scene: sc, exposure: 1.0, update(t, tg) {
      const end = tg >= 53, lt = end ? tg - 53 : tg;
      sc.background.set(end ? '#f2a43a' : '#24160d');
      dots.forEach(d => { const [x, y, z, ph] = d.userData; d.position.set(x + Math.sin(lt * .3 + ph) * .4, y + ((lt * .25 + ph) % 2) - 1, z); });
      camera.fov = 32; camera.position.set(0, 0, 9 - lt * .12); camera.lookAt(0, 0, 0);
      if (!end) {
        const a = back(seg(lt, .2, 1.4)); logo.visible = true; cons.visible = false;
        logo.position.set(0, .45, 0); logo.scale.setScalar(Math.max(.001, a)); logo.rotation.set(0, (1 - seg(lt, .2, 1.6)) * -1.4 + Math.sin(lt * .8) * .08, 0);
        key.position.set(Math.sin(lt * 1.2) * 6, 4, 6);
        return { focus: 9, aperture: .002, maxblur: .01, warm: .8, vig: .55, title: lt, bloom: [.18, .95] };
      }
      const cA = back(seg(lt, 1.2, 2.3)), lA = back(seg(lt, 2.6, 3.6));
      cons.visible = cA > 0; cons.position.set(0, .55, 0); cons.scale.setScalar(1.7 * Math.max(.001, cA)); cons.rotation.set(-.1, Math.sin(lt * .7) * .35, 0);
      logo.visible = lA > 0; logo.position.set(0, -1.15, .5); logo.scale.setScalar(.55 * Math.max(.001, lA)); logo.rotation.set(0, Math.sin(lt * .9) * .1, 0);
      key.position.set(3, 4, 6);
      return { focus: 8.5, aperture: .002, maxblur: .01, warm: .6, vig: .4, end: lt, bloom: [.15, .97] };
    }
  };
}

// ---------- capa 2D (subtítulos, textos) ----------
const CAPTIONS = [
  [4.3, 11.8, 'Una familia como cualquiera… cada quien en su propio mundo.'],
  [12.3, 16.3, 'Hasta que Leo buscó su cargador en el armario…'],
  [16.6, 19.8, '…y encontró algo que todos habían olvidado.'],
  [20.4, 26.8, 'Un control, la pantalla grande… y la sala volvió a encenderse.'],
  [27.3, 33.8, 'Uno a uno, la curiosidad pudo más que el celular.'],
  [34.3, 41.8, 'Ahora todos corren en la misma pista.'],
  [42.2, 45.5, '¡Y las risas también cuentan como victoria!'],
  [46.1, 48.5, 'A veces vivimos dentro de nuestro propio mundo…'],
  [48.6, 53.0, '…pero un poco de imaginación y tiempo en familia nos regala una gran sonrisa.'],
];
const CUTS = [4, 12, 20, 34, 42, 46, 53];
function shadowText(s, x, y, size, color, w = 800, alpha = 1, glowC = 'rgba(0,0,0,.45)') {
  g2.save(); g2.globalAlpha = alpha; g2.font = `${w} ${size}px ${FONT}`; g2.textAlign = 'center'; g2.textBaseline = 'middle';
  g2.shadowColor = glowC; g2.shadowBlur = 18; g2.shadowOffsetY = 3; g2.fillStyle = color; g2.fillText(s, x, y); g2.restore();
}
function overlay(t, o) {
  g2.clearRect(0, 0, W, H);
  if (o.title != null) {
    shadowText('presenta', 640, 470, 26, 'rgba(255,240,220,.9)', 600, seg(o.title, 1.4, 2.2));
    const a = seg(o.title, 1.9, 2.8); g2.save(); g2.translate(640, 540); g2.scale(.9 + .1 * ease(a), .9 + .1 * ease(a));
    shadowText('Juntos', 0, 0, 72, '#ffd27a', 800, a, 'rgba(255,170,60,.6)'); g2.restore();
  }
  if (o.end != null) {
    shadowText('El tiempo en familia', 640, 92, 46, '#5a2e00', 800, seg(o.end, .2, 1.1), 'rgba(255,255,255,.35)');
    shadowText('vale oro.', 640, 150, 46, '#ffffff', 800, seg(o.end, .5, 1.4), 'rgba(140,70,0,.5)');
    shadowText('NEXO une familias.', 640, 652, 34, '#5a2e00', 800, seg(o.end, 3.6, 4.4), 'rgba(255,255,255,.35)');
    shadowText('Marca, consola, videojuego y personajes ficticios con fines académicos.', 640, 698, 14, 'rgba(70,35,0,.8)', 600, seg(o.end, 4.2, 5), 'rgba(0,0,0,0)');
  }
  if (o.hud) {
    g2.save(); rr(g2, 28, 24, 190, 50, 14, 'rgba(15,20,40,.45)'); g2.restore(); shadowText('VUELTA 3/3', 123, 50, 24, '#fff', 800);
    shadowText('SÚPER KART MUNDIAL', 1110, 50, 22, '#ffd54a', 900, 1, 'rgba(120,40,0,.6)');
  }
  if (o.battery) {
    const p = o.battery.userData.P.dev.phone, v = new THREE.Vector3(); p.getWorldPosition(v); v.y += .45; v.project(camera);
    const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
    if (Math.floor(t * 3) % 2 === 0) { rr(g2, x - 40, y - 18, 72, 36, 8, '#fff', '#e53935', 4); rr(g2, x + 32, y - 7, 7, 14, 2, '#e53935'); rr(g2, x - 35, y - 13, 12, 26, 3, '#e53935'); g2.font = `800 17px ${FONT}`; g2.fillStyle = '#e53935'; g2.textAlign = 'center'; g2.fillText('5%', x + 3, y + 1); }
  }
  if (o.photo > 0) { // marco de foto instantánea
    g2.save(); g2.globalAlpha = o.photo; g2.translate(640, 350); g2.rotate(-.02);
    g2.fillStyle = '#fbf6ea'; g2.beginPath(); g2.rect(-640, -380, 1280, 760); g2.roundRect(-520, -300, 1040, 520, 6); g2.fill('evenodd');
    g2.shadowColor = 'rgba(0,0,0,.25)'; g2.shadowBlur = 20;
    g2.font = `600 italic 30px ${FONT}`; g2.fillStyle = '#7a5532'; g2.textAlign = 'center'; g2.fillText('Noche de juegos ♥', 0, 268); g2.restore();
  }
  for (const [a, b, s] of CAPTIONS) if (t >= a && t <= b) {
    const al = Math.min(seg(t, a, a + .4), 1 - seg(t, b - .4, b)); g2.save(); g2.globalAlpha = al;
    g2.font = `600 ${s.length > 60 ? 24 : 27}px ${FONT}`; const w = g2.measureText(s).width + 56;
    rr(g2, 640 - w / 2, 628, w, 54, 27, 'rgba(25,14,6,.55)'); g2.fillStyle = '#fff8ee'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(s, 640, 656); g2.restore();
  }
  let fade = Math.max(1 - seg(t, 0, .7), seg(t, 59.2, 60));
  for (const c of CUTS) fade = Math.max(fade, 1 - Math.abs(t - c) / .3);
  if (fade > 0) { g2.fillStyle = `rgba(12,6,2,${fade})`; g2.fillRect(0, 0, W, H); }
}

// ---------- línea de tiempo ----------
function render(t) {
  const set = t < 4 ? LOGO : t < 12 ? HOUSE : t < 20 ? BED : t < 34 ? LIVING : t < 42 ? RACE : t < 53 ? LIVING : LOGO;
  const local = t < 4 ? t : t < 12 ? t - 4 : t < 20 ? t - 12 : t < 34 ? t - 20 : t < 42 ? t - 34 : t < 53 ? t - 42 : t - 53;
  const o = set.update(local, t);
  camera.updateProjectionMatrix();
  renderer.toneMappingExposure = set.exposure;
  renderPass.scene = bokeh.scene = set.scene; bokeh.camera = camera;
  bokeh.uniforms.focus.value = o.focus ?? 5; bokeh.uniforms.aperture.value = o.aperture ?? .002; bokeh.uniforms.maxblur.value = o.maxblur ?? .006;
  Object.assign(grade.uniforms.warm, { value: o.warm ?? 0 }); grade.uniforms.sepia.value = o.sepia ?? 0; grade.uniforms.vig.value = o.vig ?? .35; grade.uniforms.time.value = t;
  [bloom.strength, bloom.threshold] = o.bloom || [.35, .88];
  composer.render();
  overlay(t, o);
}

(async () => {
  for (const [name, src, w] of [['Inter', fontBoldWoff, 800], ['Inter', fontSemiWoff, 600]]) { const f = new FontFace(name, `url(${src})`, { weight: String(w) }); await f.load(); document.fonts.add(f); }
  // Las texturas dibujadas antes de cargar la fuente se vuelven a pintar
  TEXTURES.forEach(t => t.redraw());
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = async src => pmrem.fromEquirectangular(await new EXRLoader().loadAsync(src)).texture;
  const [apt, studio] = [await env(aptHDR), await env(studioHDR)];
  for (const s of [LIVING.scene, HOUSE.scene, BED.scene]) { s.environment = apt; s.environmentIntensity = .35; }
  HOUSE.scene.environmentIntensity = .12; BED.scene.environmentIntensity = .18;
  RACE.scene.environment = studio; RACE.scene.environmentIntensity = .25;
  buildLogo(new FontLoader().parse(await (await fetch(fontJSON)).json()));
  LOGO.scene.environment = studio; LOGO.scene.environmentIntensity = .35;
  window.render = render;
  render(0); window.ready = true;
  if (!navigator.webdriver) { const t0 = performance.now(); (function loop() { render(((performance.now() - t0) / 1000) % 60); requestAnimationFrame(loop); })(); }
})();
