// Interior en 3D cenital (three.js): el local por dentro, con sus muebles, anaqueles que se vacían,
// clientes que recorren pasillos y hacen fila, cajeros y reponedores. Solo lee el estado y manda acciones al motor.
const Interior = (function () {
  const D = DATOS, M = Motor, I = D.interior;
  const PIEL = ['#F1C7A6', '#D9A07B', '#B07A55', '#8D5A3B'], ROPA = ['#E07A5F', '#3D405B', '#81B29A', '#F2CC8F', '#5E6BAF', '#D1495B', '#2A9D8F', '#7D5BA6'];
  let S = null, N = null, op = {}, listo = false, abierto = false;
  let renderer, escena, camara, raiz, suelo, lienzo, fantasma = null, ray, puntero;
  let angulo = Math.PI / 4, angMeta = angulo, zoom = 1, zoomMeta = 1, prev = 0;
  let modo = 'ver', colocar = null, seleccion = null, pestana = 'resumen', confirma = false, casillaHover = null;
  const mallas = new Map(), gente = [], monedas = [], tex = {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const din = (x, dec) => (x < 0 ? '−' : '') + '$' + Math.abs(x).toLocaleString('es-MX', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });
  const r = (a, b) => a + Math.random() * (b - a);
  const elige = l => l[Math.floor(Math.random() * l.length)];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Materiales y piezas ----------
  const matCache = new Map();
  const mat = (color, extra = {}) => {
    const k = color + JSON.stringify(extra);
    if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color, ...extra }));
    return matCache.get(k);
  };
  function caja3(w, h, d, color, x = 0, y = 0, z = 0, extra) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra));
    m.position.set(x, y + h / 2, z);
    return m;
  }
  function cilindro(rad, h, color, x = 0, y = 0, z = 0, lados = 10) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, lados), mat(color));
    m.position.set(x, y + h / 2, z);
    return m;
  }
  function esfera(rad, color, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), mat(color));
    m.position.set(x, y, z);
    return m;
  }
  function textura(texto, fondo, color) { // letreros y globos de diálogo pintados en canvas
    const k = texto + fondo + color;
    if (tex[k]) return tex[k];
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = fondo; x.strokeStyle = '#1B1A2E'; x.lineWidth = 10;
    x.beginPath(); x.arc(64, 60, 50, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = color; x.font = '800 64px "Bricolage Grotesque", "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texto, 64, 64);
    return (tex[k] = new THREE.CanvasTexture(c));
  }
  function globo(texto, fondo = '#F4B41A', color = '#1B1A2E', tam = 0.55) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura(texto, fondo, color), depthTest: false, transparent: true }));
    s.scale.set(tam, tam, tam);
    s.renderOrder = 10;
    return s;
  }
  function letrero(texto, ancho, fondo, color) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = fondo; x.fillRect(0, 0, 512, 96);
    x.fillStyle = color; x.font = '800 54px "Bricolage Grotesque", "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texto, 256, 50);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * 96 / 512), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
    return m;
  }

  // ---------- Muebles ----------
  const centro = m => { const [w, h] = m.rot ? [I.muebles[m.tipo].tam[1], I.muebles[m.tipo].tam[0]] : I.muebles[m.tipo].tam; return [m.x + w / 2, m.y + h / 2, w, h]; };
  function construirMueble(m, fantasmal) {
    const g = new THREE.Group(), X = I.muebles[m.tipo], marca = S.color || '#E4572E';
    const [, , w, h] = centro(m), largo = Math.max(w, h), giro = w >= h ? 0 : Math.PI / 2;
    const cuerpo = new THREE.Group();
    cuerpo.rotation.y = giro;
    g.add(cuerpo);
    if (m.tipo === 'caja') {
      cuerpo.add(caja3(largo - 0.15, 0.55, 0.7, marca, 0, 0, -0.05));
      cuerpo.add(caja3(largo - 0.05, 0.06, 0.78, '#2D2F45', 0, 0.55, -0.05));
      cuerpo.add(caja3(0.36, 0.22, 0.3, '#2D2F45', -0.35, 0.61, -0.12));
      cuerpo.add(caja3(0.3, 0.2, 0.03, '#9EE6FF', -0.35, 0.86, -0.02));
      if (m.nivel > 1) { cuerpo.add(caja3(0.7, 0.02, 0.5, '#1B1A2E', 0.35, 0.61, -0.05)); cuerpo.add(caja3(0.12, 0.18, 0.12, '#D7392F', 0.65, 0.61, -0.15)); }
    } else if (m.tipo === 'anaquel') {
      const alto = m.nivel > 1 ? 1.5 : 1.1, pisos = m.nivel > 1 ? 4 : 3;
      cuerpo.add(caja3(0.06, alto, 0.62, '#5B4636', -largo / 2 + 0.1, 0, 0));
      cuerpo.add(caja3(0.06, alto, 0.62, '#5B4636', largo / 2 - 0.1, 0, 0));
      cuerpo.add(caja3(largo - 0.2, alto, 0.04, '#8A6F55', 0, 0, 0));
      for (let p = 0; p < pisos; p++) cuerpo.add(caja3(largo - 0.2, 0.04, 0.62, '#A58A6C', 0, 0.05 + p * (alto / pisos), 0));
      const prod = m.prod && I.productos[m.prod], lleno = prod ? m.stock / M.capMueble(m) : 0, huecos = pisos * 2 * 6;
      for (let i = 0; i < Math.round(lleno * huecos); i++) { // cajitas del producto, de abajo hacia arriba
        const piso = Math.floor(i / 12), lado = Math.floor(i / 6) % 2, col = i % 6;
        cuerpo.add(caja3(0.2, 0.2, 0.22, prod.color, -largo / 2 + 0.3 + col * ((largo - 0.6) / 5), 0.09 + piso * (alto / pisos), lado ? 0.16 : -0.16));
      }
    } else if (m.tipo === 'refri') {
      const alto = m.nivel > 1 ? 1.75 : 1.5;
      cuerpo.add(caja3(0.86, alto, 0.7, '#F4F6F8', 0, 0, -0.05));
      cuerpo.add(caja3(0.74, alto - 0.3, 0.04, '#B8E4F5', 0, 0.12, 0.31, { transparent: true, opacity: 0.55 }));
      cuerpo.add(caja3(0.86, 0.14, 0.72, m.nivel > 1 ? '#2E86AB' : '#D7392F', 0, alto - 0.14, -0.05));
      const prod = m.prod && I.productos[m.prod], lleno = prod ? m.stock / M.capMueble(m) : 0;
      for (let i = 0; i < Math.round(lleno * 15); i++) cuerpo.add(cilindro(0.06, 0.24, prod.color, -0.26 + (i % 5) * 0.13, 0.18 + Math.floor(i / 5) * 0.4, 0.12, 6));
    } else if (m.tipo === 'planta') {
      cuerpo.add(cilindro(0.2, 0.32, '#B5533E'));
      cuerpo.add(esfera(0.3, '#4F8A3C', 0, 0.6, 0));
      cuerpo.add(esfera(0.22, '#6BAA4F', 0.12, 0.85, 0.05));
    }
    if (!fantasmal && X.para && (!m.prod || m.stock === 0)) { // aviso de anaquel vacío
      const s = globo(m.prod ? '!' : '?', m.prod ? '#FF7A6E' : '#F4EFE4');
      s.position.set(0, 2, 0);
      g.add(s);
    }
    if (fantasmal) g.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; } });
    return g;
  }
  function colocarMalla(g, m) { const [cx, cz] = centro(m); g.position.set(cx, 0, cz); }

  // ---------- Gente ----------
  function figura(ropa, piel, delantal) {
    const g = new THREE.Group();
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18 }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.01;
    g.add(sombra);
    const cuerpo = new THREE.Group();
    cuerpo.add(cilindro(0.15, 0.42, ropa, 0, 0.18));
    cuerpo.add(cilindro(0.05, 0.2, '#2F3E46', -0.07, 0));
    cuerpo.add(cilindro(0.05, 0.2, '#2F3E46', 0.07, 0));
    if (delantal) cuerpo.add(caja3(0.22, 0.3, 0.04, delantal, 0, 0.22, 0.14));
    cuerpo.add(esfera(0.13, piel, 0, 0.75, 0));
    g.add(cuerpo);
    g.userData.cuerpo = cuerpo;
    return g;
  }
  function libreEn(x, y, g) { return x >= 0 && y >= 0 && x < I.ancho && y < I.fondo && !g[y][x]; }
  function ruta(de, a) { // A* en la cuadrícula; las casillas con muebles no se pisan
    const g = mapa(), k = (x, y) => x + ',' + y, abiertos = [[de[0], de[1]]], vino = {}, costo = { [k(...de)]: 0 };
    while (abiertos.length) {
      abiertos.sort((p, q) => (costo[k(...p)] + Math.abs(p[0] - a[0]) + Math.abs(p[1] - a[1])) - (costo[k(...q)] + Math.abs(q[0] - a[0]) + Math.abs(q[1] - a[1])));
      const [x, y] = abiertos.shift();
      if (x === a[0] && y === a[1]) { const out = [[x, y]]; let c = k(x, y); while (vino[c]) { out.unshift(vino[c]); c = k(...vino[c]); } return out; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nk = k(nx, ny), c = costo[k(x, y)] + 1;
        if (!libreEn(nx, ny, g) && !(nx === a[0] && ny === a[1])) continue;
        if (costo[nk] == null || c < costo[nk]) { costo[nk] = c; vino[nk] = [x, y]; abiertos.push([nx, ny]); }
      }
    }
    return [de, a];
  }
  let cacheMapa = null;
  function mapa() {
    if (cacheMapa) return cacheMapa;
    const g = Array.from({ length: I.fondo }, () => Array(I.ancho).fill(null));
    for (const m of N.interior.muebles) for (const [x, y] of M.casillas(m)) if (g[y]) g[y][x] = m.id;
    return (cacheMapa = g);
  }
  function junto(m) { // casillas libres alcanzables pegadas al mueble (la caja: solo enfrente)
    const vis = M.estadoInterior(N).vis, out = [];
    for (const [x, y] of M.casillas(m)) {
      const lados = m.tipo === 'caja' ? [[0, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of lados) if (vis.has((x + dx) + ',' + (y + dy))) out.push([x + dx, y + dy]);
    }
    return out;
  }
  function cliente(falto, monto) {
    const E = M.estadoInterior(N), estantes = E.ok.filter(m => m.prod && (falto ? m.prod === falto || m.stock === 0 : m.stock > 0));
    const cajas = E.ok.filter(m => m.tipo === 'caja').slice(0, E.cajeros);
    const destino = estantes.length && elige(estantes), caja = cajas.length && elige(cajas);
    if (!destino || !caja) return;
    const puerta = [elige(I.puerta), I.fondo - 1], ante = elige(junto(destino)), fila = elige(junto(caja));
    if (!ante || !fila) return;
    const f = figura(elige(ROPA), elige(PIEL));
    f.position.set(puerta[0] + 0.5, 0, I.fondo + 0.6);
    raiz.add(f);
    gente.push({ f, pasos: [[puerta[0], I.fondo], ...ruta(puerta, ante)], tareas: [
      { tipo: 'mira', t: 0.7, globo: falto && destino.prod === falto ? '?' : null },
      { tipo: 'ir', a: fila }, { tipo: 'paga', t: 0.8, monto },
      { tipo: 'ir', a: puerta }, { tipo: 'sale' },
    ], vel: r(2, 2.6), fase: r(0, 6) });
  }
  function avanzarGente(dt) {
    for (let i = gente.length - 1; i >= 0; i--) {
      const p = gente[i];
      if (p.pasos && p.pasos.length) {
        const [tx, ty] = p.pasos[0], dx = tx + 0.5 - p.f.position.x, dz = ty + 0.5 - p.f.position.z, d = Math.hypot(dx, dz);
        if (d < 0.05) { p.pasos.shift(); continue; }
        const v = Math.min(d, p.vel * dt);
        p.f.position.x += dx / d * v; p.f.position.z += dz / d * v;
        p.f.rotation.y = Math.atan2(dx, dz);
        p.fase += dt * 12;
        p.f.userData.cuerpo.position.y = Math.abs(Math.sin(p.fase)) * 0.05;
        continue;
      }
      const T = p.tareas[0];
      if (!T) continue;
      if (T.tipo === 'ir') { const de = [Math.floor(p.f.position.x), Math.floor(p.f.position.z)]; p.pasos = ruta(de, T.a); p.tareas.shift(); continue; }
      if (T.tipo === 'mira' || T.tipo === 'paga') {
        if (T.globo && !T.s) { T.s = globo(T.globo, '#F4EFE4'); T.s.position.y = 1.35; p.f.add(T.s); }
        T.t -= dt;
        if (T.t <= 0) {
          if (T.s) p.f.remove(T.s);
          if (T.tipo === 'paga' && T.monto) moneda(p.f.position.x, p.f.position.z, T.monto);
          p.tareas.shift();
        }
        continue;
      }
      if (T.tipo === 'sale') { p.pasos = [[p.f.position.x - 0.5, I.fondo + 1]]; p.tareas = [{ tipo: 'fin' }]; continue; }
      if (T.tipo === 'fin') { raiz.remove(p.f); gente.splice(i, 1); }
    }
    for (let i = monedas.length - 1; i >= 0; i--) {
      const m = monedas[i];
      m.t += dt; m.s.position.y = 1.2 + m.t * 0.8; m.s.material.opacity = Math.max(0, 1 - m.t / 1.2);
      if (m.t > 1.2) { raiz.remove(m.s); monedas.splice(i, 1); }
    }
  }
  function moneda(x, z, texto) {
    const s = globo('$', '#F4B41A', '#1B1A2E', 0.45);
    s.position.set(x, 1.2, z);
    s.material = s.material.clone(); s.material.transparent = true;
    raiz.add(s);
    monedas.push({ s, t: 0 });
  }
  // Personal: cajeros detrás de sus cajas y reponedores que van de la bodega a los anaqueles.
  const personal = [];
  function sincronizarPersonal() {
    for (const p of personal) raiz.remove(p.f);
    personal.length = 0;
    const In = N.interior, E = M.estadoInterior(N), marca = S.color;
    E.ok.filter(m => m.tipo === 'caja').slice(0, E.cajeros).forEach(m => {
      const [cx, cz, w, h] = centro(m), f = figura('#F6F1E7', elige(PIEL), marca);
      f.position.set(w >= h ? cx - 0.3 : cx - 0.6, 0, w >= h ? cz - 0.55 : cz);
      f.rotation.y = w >= h ? 0 : Math.PI / 2;
      raiz.add(f);
      personal.push({ f, fijo: true });
    });
    for (let i = 0; i < In.reponedores; i++) {
      const f = figura('#3D405B', elige(PIEL), marca);
      f.position.set(1.5 + i, 0, 0.6);
      raiz.add(f);
      personal.push({ f, pasos: [], espera: r(0, 2), vel: 1.6, fase: 0 });
    }
  }
  function moverPersonal(dt) {
    const E = M.estadoInterior(N);
    for (const p of personal) {
      if (p.fijo) continue;
      if (p.pasos.length) {
        const [tx, ty] = p.pasos[0], dx = tx + 0.5 - p.f.position.x, dz = ty + 0.5 - p.f.position.z, d = Math.hypot(dx, dz);
        if (d < 0.05) { p.pasos.shift(); continue; }
        const v = Math.min(d, p.vel * dt);
        p.f.position.x += dx / d * v; p.f.position.z += dz / d * v;
        p.f.rotation.y = Math.atan2(dx, dz);
        p.fase += dt * 10; p.f.userData.cuerpo.position.y = Math.abs(Math.sin(p.fase)) * 0.04;
        continue;
      }
      p.espera -= dt;
      if (p.espera > 0) continue;
      const estantes = E.ok.filter(m => m.prod), m = estantes.length && elige(estantes), a = m && elige(junto(m));
      if (a) p.pasos = ruta([Math.floor(p.f.position.x), Math.floor(p.f.position.z)], a);
      p.espera = r(1, 2.5);
    }
  }

  // ---------- Escena ----------
  function montar() {
    lienzo = $('int-lienzo');
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    escena = new THREE.Scene();
    escena.background = new THREE.Color('#24233D');
    camara = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    escena.add(new THREE.HemisphereLight('#ffffff', '#5a5f80', 0.7));
    const sol = new THREE.DirectionalLight('#fff4e0', 0.6);
    sol.position.set(6, 12, 4);
    escena.add(sol);
    ray = new THREE.Raycaster();
    puntero = new THREE.Vector2();
    new ResizeObserver(medir).observe(lienzo.parentElement);
    lienzo.addEventListener('pointermove', e => { casillaHover = casillaEn(e); actualizarFantasma(); });
    lienzo.addEventListener('pointerleave', () => { casillaHover = null; actualizarFantasma(); });
    lienzo.addEventListener('click', e => tocar(casillaEn(e)));
    lienzo.addEventListener('wheel', e => { e.preventDefault(); zoomMeta = Math.max(0.6, Math.min(2.2, zoomMeta * (e.deltaY > 0 ? 0.9 : 1.1))); }, { passive: false });
    let pinza = null;
    lienzo.addEventListener('touchmove', e => {
      if (e.touches.length !== 2) return;
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinza) zoomMeta = Math.max(0.6, Math.min(2.2, zoomMeta * d / pinza));
      pinza = d;
      e.preventDefault();
    }, { passive: false });
    lienzo.addEventListener('touchend', () => { pinza = null; });
    listo = true;
  }
  function medir() {
    const caja = lienzo.parentElement.getBoundingClientRect();
    renderer.setSize(caja.width, caja.height, false);
    lienzo.style.width = caja.width + 'px'; lienzo.style.height = caja.height + 'px';
    encuadre();
  }
  function encuadre() {
    const caja = lienzo.parentElement.getBoundingClientRect(), asp = caja.width / Math.max(1, caja.height), v = 7.2 / zoom;
    camara.left = -v * asp; camara.right = v * asp; camara.top = v; camara.bottom = -v;
    const cx = I.ancho / 2, cz = I.fondo / 2, dist = 30;
    camara.position.set(cx + Math.sin(angulo) * dist * 0.6, dist * 0.8, cz + Math.cos(angulo) * dist * 0.6);
    camara.lookAt(cx, 0, cz);
    camara.updateProjectionMatrix();
  }
  function construirCuarto() {
    if (raiz) escena.remove(raiz);
    raiz = new THREE.Group();
    escena.add(raiz);
    suelo = new THREE.Group();
    for (let x = 0; x < I.ancho; x++) for (let y = 0; y < I.fondo; y++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat((x + y) % 2 ? '#D6CFC0' : '#C8BFAE'));
      t.rotation.x = -Math.PI / 2; t.position.set(x + 0.5, 0, y + 0.5);
      t.userData.casilla = [x, y];
      suelo.add(t);
    }
    raiz.add(suelo);
    const marca = S.color, pared = '#F4EFE4', zocalo = '#C9C0B0', alto = 1.3, bajo = 0.35;
    raiz.add(caja3(I.ancho + 0.3, alto, 0.15, pared, I.ancho / 2, 0, -0.08));
    raiz.add(caja3(0.15, alto, I.fondo, pared, -0.08, 0, I.fondo / 2));
    raiz.add(caja3(0.15, alto, I.fondo, pared, I.ancho + 0.08, 0, I.fondo / 2));
    raiz.add(caja3(I.ancho + 0.3, 0.25, 0.17, marca, I.ancho / 2, alto - 0.25, -0.08));
    const [p0, p1] = [Math.min(...I.puerta), Math.max(...I.puerta) + 1];
    raiz.add(caja3(p0, bajo, 0.15, zocalo, p0 / 2, 0, I.fondo + 0.08));
    raiz.add(caja3(I.ancho - p1, bajo, 0.15, zocalo, (p1 + I.ancho) / 2, 0, I.fondo + 0.08));
    const tapete = new THREE.Mesh(new THREE.PlaneGeometry(p1 - p0, 0.9), mat('#2D2F45'));
    tapete.rotation.x = -Math.PI / 2; tapete.position.set((p0 + p1) / 2, 0.005, I.fondo - 0.45);
    raiz.add(tapete);
    const banqueta = new THREE.Mesh(new THREE.PlaneGeometry(I.ancho + 1, 1.3), mat('#7E7A74'));
    banqueta.rotation.x = -Math.PI / 2; banqueta.position.set(I.ancho / 2, -0.01, I.fondo + 0.75);
    raiz.add(banqueta);
    raiz.add(caja3(1, 1.05, 0.06, '#5B4636', 1.0, 0, 0.02)); // puerta de bodega
    const lb = letrero('BODEGA', 1.1, '#1B1A2E', '#F4B41A'); lb.position.set(1.0, 1.15, 0.03); raiz.add(lb);
    const nombre = letrero(D.negocios[N.tipo].corto.toUpperCase() + ' · ' + (S.empresa || '').toUpperCase().slice(0, 16), 3.6, marca, '#F6F1E7');
    nombre.position.set(4.2, 0.78, 0.01); raiz.add(nombre);
    mallas.clear();
    gente.length = 0;
    sincronizarMuebles(true);
    sincronizarPersonal();
  }
  function firma(m) { const X = I.muebles[m.tipo]; return [m.x, m.y, m.rot, m.nivel, m.prod, X.para ? Math.round(m.stock / M.capMueble(m) * (m.tipo === 'refri' ? 15 : 24)) : 0, m.stock === 0, seleccion === m.id].join('|'); }
  function sincronizarMuebles(forzar) {
    cacheMapa = null;
    const vivos = new Set();
    for (const m of N.interior.muebles) {
      vivos.add(m.id);
      const f = firma(m), prev = mallas.get(m.id);
      if (prev && prev.firma === f && !forzar) continue;
      if (prev) raiz.remove(prev.g);
      const g = construirMueble(m);
      colocarMalla(g, m);
      if (seleccion === m.id) {
        const [, , w, h] = centro(m), aro = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.1, h + 0.1), new THREE.MeshBasicMaterial({ color: '#F4B41A', transparent: true, opacity: 0.45 }));
        aro.rotation.x = -Math.PI / 2; aro.position.y = 0.01; g.add(aro);
      }
      raiz.add(g);
      mallas.set(m.id, { g, firma: f });
    }
    for (const [id, v] of mallas) if (!vivos.has(id)) { raiz.remove(v.g); mallas.delete(id); }
  }

  // ---------- Colocar y seleccionar ----------
  function casillaEn(e) {
    const caja = lienzo.getBoundingClientRect();
    puntero.x = ((e.clientX - caja.left) / caja.width) * 2 - 1;
    puntero.y = -((e.clientY - caja.top) / caja.height) * 2 + 1;
    ray.setFromCamera(puntero, camara);
    const hit = ray.intersectObjects(suelo.children)[0];
    return hit ? hit.object.userData.casilla : null;
  }
  function piezaEn(c) {
    if (!colocar || !c) return null;
    const X = I.muebles[colocar.tipo], [w, h] = colocar.rot ? [X.tam[1], X.tam[0]] : X.tam;
    return { id: colocar.mid || 'fantasma', tipo: colocar.tipo, x: c[0] - Math.floor((w - 1) / 2), y: c[1] - Math.floor((h - 1) / 2), rot: colocar.rot, nivel: colocar.nivel || 1, prod: null, stock: 0 };
  }
  function actualizarFantasma() {
    if (fantasma) { raiz.remove(fantasma); fantasma = null; }
    const m = piezaEn(casillaHover);
    if (!m) return;
    const malo = M.lugarInvalido(N.interior, m, colocar.mid);
    fantasma = construirMueble(m, true);
    const [, , w, h] = centro(m), base = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: malo ? '#D7392F' : '#1C8F4E', transparent: true, opacity: 0.45 }));
    base.rotation.x = -Math.PI / 2; base.position.y = 0.02;
    fantasma.add(base);
    colocarMalla(fantasma, m);
    raiz.add(fantasma);
    const pista = $('int-pista');
    if (pista) pista.textContent = malo || 'Toca para colocar. Gira la pieza con el botón Girar.';
  }
  function tocar(c) {
    if (!c) return;
    if (colocar) {
      const m = piezaEn(c), r = colocar.mid ? M.hacer(S, 'moverMueble', { id: N.id, mid: colocar.mid, x: m.x, y: m.y, rot: m.rot }) : M.hacer(S, 'mueble', { id: N.id, tipo: m.tipo, x: m.x, y: m.y, rot: m.rot });
      if (!r.ok) { op.aviso(r.msg, 'mal'); return; }
      if (r.msg) op.aviso(r.msg, 'bien', 'tienda');
      if (!colocar.mid && r.mid) seleccion = r.mid;
      colocar = null;
      cambio();
      return;
    }
    const g = mapa();
    seleccion = g[c[1]][c[0]] || null;
    confirma = false;
    if (seleccion) pestana = 'muebles';
    sincronizarMuebles();
    pintarPanel();
  }
  function cambio() { // después de cualquier acción: refresca todo
    if (fantasma) { raiz.remove(fantasma); fantasma = null; }
    sincronizarMuebles();
    sincronizarPersonal();
    op.despues();
    pintarPanel();
  }

  // ---------- Panel ----------
  const bt = (html, a, args, cls = 'btn', extra = '') => `<button class="${cls}" data-int="${a}" data-args="${esc(JSON.stringify(args || {}))}" ${extra}>${html}</button>`;
  const kpi = (et, val, cls = '') => `<div class="kpi"><span class="eti">${et}</span><b class="${cls}">${val}</b></div>`;
  const paso = (menos, mas, valor, deshMenos) => `<div class="paso">${bt('−', menos[0], menos[1], '', `aria-label="Menos" ${deshMenos ? 'disabled' : ''}`)}<output>${valor}</output>${bt('+', mas[0], mas[1], '', 'aria-label="Más"')}</div>`;
  function pintarPanel() {
    const p = $('int-panel');
    if (!p || !abierto) return;
    if (p.contains(document.activeElement) && document.activeElement.matches('input')) return;
    const In = N.interior, E = M.estadoInterior(N), a = N.ayer;
    $('int-titulo').textContent = D.negocios[N.tipo].nombre;
    $('int-sub').textContent = `${M.lote(N.lote).nombre} · día ${M.dia(S)} · ${String(M.hh(S)).padStart(2, '0')}:00 · ${din(S.dinero)}`;
    const tabs = [['resumen', 'Resumen'], ['muebles', 'Muebles'], ['surtido', 'Surtido'], ['personal', 'Personal']];
    let cuerpo = '';
    if (pestana === 'resumen') {
      cuerpo = `<div class="kpis">${kpi('Clientes ayer', a.clientes)}${kpi('Se fueron', a.perdidos, a.perdidos ? 'neg' : '')}${kpi('Sin producto', a.sinProducto || 0, a.sinProducto ? 'neg' : '')}${kpi('Utilidad ayer', a.utilidad == null ? '—' : din(a.utilidad), a.utilidad < 0 ? 'neg' : 'pos')}</div>
        <div class="lista">
          <div class="renglon"><span class="crece">Cajas atendiendo</span><span class="cifra">${E.cajeros} de ${E.cajas} · ${Math.round(E.cap)} clientes/h</span></div>
          <div class="renglon"><span class="crece">Espacio libre</span><span class="cifra ${E.apretado ? 'neg' : ''}">${Math.round(E.libre * 100)}%${E.apretado ? ' · apretado' : ''}</span></div>
          <div class="renglon"><span class="crece">Bodega</span><span class="cifra">${M.enBodega(In)} de ${I.bodega}</span></div>
          <div class="renglon"><span class="crece">Reputación</span><span class="cifra">${Math.round(N.rep)}</span></div></div>
        ${E.bloqueados ? `<div class="consejo">${'!'}<span>${E.bloqueados} mueble${E.bloqueados > 1 ? 's' : ''} sin paso: nadie puede llegar a ellos y no cuentan.</span></div>` : ''}
        ${E.apretado ? '<div class="consejo"><span>Los pasillos están apretados: la gente se estorba y las cajas rinden 20% menos.</span></div>' : ''}
        <div class="control"><span class="eti">Calidad del surtido</span><div class="seg">${Object.entries(I.calidades).map(([k, q]) => bt(`${q.nombre}<small>costo ×${q.costo}</small>`, 'calidad', { nivel: k }, In.calidad === k ? 'on' : '')).join('')}</div>
          <p class="tenue">Premium cuesta más pero la gente acepta precios más altos y sube la reputación. Básico al revés.</p></div>
        ${bt('Reponer anaqueles ahora', 'reponer', {}, 'btn ancho')}`;
    } else if (pestana === 'muebles') {
      const m = seleccion && In.muebles.find(x => x.id === seleccion);
      if (m) {
        const X = I.muebles[m.tipo], ops = X.para ? Object.entries(I.productos).filter(([, p]) => p.para === X.para) : [];
        cuerpo = `<div class="cab"><div><p class="eti">Seleccionado</p><h3>${m.nivel > 1 && X.mejora ? X.mejora.nombre : X.nombre}</h3><p class="tenue">${X.desc}</p></div></div>
          ${X.para ? `<div class="control"><div class="fila"><span class="eti crece">Exhibe</span><span class="tenue">${m.prod ? `${m.stock} de ${M.capMueble(m)}` : 'vacío'}</span></div>
            <div class="progreso"><i style="width:${m.prod ? m.stock / M.capMueble(m) * 100 : 0}%"></i></div>
            <div class="fila">${ops.map(([k, p]) => bt(`<span class="punto-color" style="background:${p.color}"></span>${p.nombre}`, 'surtir', { mid: m.id, prod: k }, 'btn chico' + (m.prod === k ? ' on' : ''))).join('')}</div></div>` : ''}
          ${m.tipo === 'caja' ? `<p class="tenue">Atiende ${m.nivel > 1 ? X.mejora.cap : X.cap} clientes por hora si tiene cajero.</p>` : ''}
          ${X.mejora && m.nivel < 2 ? bt(`Mejorar a ${X.mejora.nombre.toLowerCase()} <small>${din(X.mejora.costo)}</small>`, 'mejorar', { mid: m.id }, 'btn pri ancho') : ''}
          <div class="fila">${bt('Mover', 'mover', { mid: m.id })}${bt('Girar', 'girarSel', { mid: m.id })}${confirma ? bt(`Sí, vender por ${din(X.costo / 2)}`, 'vender', { mid: m.id }, 'btn peligro armado') : bt('Vender', 'confirma', {}, 'btn peligro')}${bt('Listo', 'deseleccionar', {})}</div>`;
      } else {
        cuerpo = `${colocar ? `<div class="consejo"><span id="int-pista">Toca el piso para colocar.</span></div><div class="fila">${bt('Girar', 'girar', {}, 'btn')}${bt('Cancelar', 'cancelar', {}, 'btn')}</div>` : '<p class="tenue">Elige un mueble y tócalo en el piso. Toca un mueble para surtirlo, mejorarlo, moverlo o venderlo.</p>'}
          <div class="opciones">${Object.entries(I.muebles).map(([k, X]) => bt(`<b>${X.nombre}</b><p>${X.desc}</p><span class="datos"><span><em>Costo</em> ${din(X.costo)}</span><span><em>Tamaño</em> ${X.tam.join('×')}</span></span>`, 'colocar', { tipo: k }, 'opcion' + (colocar && colocar.tipo === k && !colocar.mid ? ' activa' : ''), S.dinero < X.costo ? 'disabled' : '')).join('')}</div>`;
      }
    } else if (pestana === 'surtido') {
      cuerpo = `<p class="tenue">Cada noche llega el pedido automático y completa la bodega hasta tu meta. Los reponedores pasan la mercancía a los anaqueles.</p>
        <div class="lista">${Object.entries(I.productos).map(([k, P]) => {
          const est = E.ok.filter(m => m.prod === k), enAnaq = est.reduce((t, m) => t + m.stock, 0), cap = est.reduce((t, m) => t + M.capMueble(m), 0), pr = In.precios[k], pasoP = P.precioRef < 2 ? 0.05 : 0.1;
          return `<div class="surtido"><div class="fila"><span class="punto-color" style="background:${P.color}"></span><b class="crece">${P.nombre}</b><span class="tenue">${est.length ? `${enAnaq}/${cap} en anaqueles` : `<span class="neg">sin ${P.para === 'frio' ? 'refri' : 'anaquel'}</span>`}</span></div>
            <div class="fila"><span class="eti crece">Precio · zona ${din(P.precioRef, true)}</span>${paso(['precio', { prod: k, valor: Math.round((pr - pasoP) * 100) / 100 }], ['precio', { prod: k, valor: Math.round((pr + pasoP) * 100) / 100 }], din(pr, true), pr - pasoP < 0.05)}</div>
            <div class="fila"><span class="eti crece">Meta de bodega · hay ${In.bodega[k]}</span>${paso(['pedido', { prod: k, objetivo: In.pedidos[k] - 20 }], ['pedido', { prod: k, objetivo: In.pedidos[k] + 20 }], In.pedidos[k], In.pedidos[k] <= 0)}</div>
            ${bt(`Pedir 50 para ya <small>${din(50 * P.costo * I.calidades[In.calidad].costo * I.express)}</small>`, 'pedirYa', { prod: k, cant: 50 }, 'btn chico')}</div>`;
        }).join('')}</div>`;
    } else {
      const T = D.negocios[N.tipo], total = In.cajeros + In.reponedores;
      cuerpo = `<p class="tenue">${din(T.sueldo)} al día por persona · ${total} de ${T.empMax} lugares.</p>
        <div class="control"><div class="fila"><span class="eti crece">Cajeros</span>${paso(['personal', { rol: 'cajeros', cambio: -1 }], ['personal', { rol: 'cajeros', cambio: 1 }], In.cajeros, In.cajeros <= 1)}</div>
          <p class="tenue">Cada caja necesita su cajero. Tienes ${E.cajas} caja${E.cajas === 1 ? '' : 's'}: ${In.cajeros > E.cajas ? `te sobra${In.cajeros - E.cajas > 1 ? 'n' : ''} ${In.cajeros - E.cajas}.` : In.cajeros < E.cajas ? `${E.cajas - In.cajeros} sin atender.` : 'todas atendidas.'}</p></div>
        <div class="control"><div class="fila"><span class="eti crece">Reponedores</span>${paso(['personal', { rol: 'reponedores', cambio: -1 }], ['personal', { rol: 'reponedores', cambio: 1 }], In.reponedores, In.reponedores <= 0)}</div>
          <p class="tenue">Cada uno pasa ${I.reponerHora} piezas por hora de la bodega a los anaqueles, desde dos horas antes de abrir. Sin reponedores, tendrás que reponer tú.</p></div>`;
    }
    p.innerHTML = `<div class="int-tabs">${tabs.map(([k, n]) => bt(n, 'tab', { t: k }, pestana === k ? 'on' : '')).join('')}</div><div class="int-cuerpo-panel">${cuerpo}</div>`;
    if (colocar) actualizarFantasma();
  }
  const ACC = {
    tab({ t }) { pestana = t; },
    colocar({ tipo }) { colocar = { tipo, rot: 0 }; seleccion = null; },
    girar() { if (colocar) colocar.rot = colocar.rot ? 0 : 1; },
    cancelar() { colocar = null; },
    mover({ mid }) { const m = N.interior.muebles.find(x => x.id === mid); colocar = { tipo: m.tipo, rot: m.rot, mid, nivel: m.nivel }; seleccion = null; },
    girarSel({ mid }) { const m = N.interior.muebles.find(x => x.id === mid), r = M.hacer(S, 'moverMueble', { id: N.id, mid, x: m.x, y: m.y, rot: m.rot ? 0 : 1 }); if (!r.ok) op.aviso(r.msg, 'mal'); },
    deseleccionar() { seleccion = null; },
    confirma() { confirma = true; },
    vender({ mid }) { const r = M.hacer(S, 'venderMueble', { id: N.id, mid }); op.aviso(r.msg, r.ok ? 'bien' : 'mal'); seleccion = null; confirma = false; },
    mejorar({ mid }) { const r = M.hacer(S, 'mejorarMueble', { id: N.id, mid }); op.aviso(r.msg, r.ok ? 'bien' : 'mal'); },
    surtir({ mid, prod }) { const r = M.hacer(S, 'surtir', { id: N.id, mid, prod }); if (!r.ok) op.aviso(r.msg, 'mal'); },
    calidad({ nivel }) { M.hacer(S, 'calidadSurtido', { id: N.id, nivel }); },
    reponer() { const r = M.hacer(S, 'reponerYa', { id: N.id }); op.aviso(r.msg, r.ok ? 'bien' : 'mal'); },
    precio({ prod, valor }) { M.hacer(S, 'precioTienda', { id: N.id, prod, valor }); },
    pedido({ prod, objetivo }) { M.hacer(S, 'pedido', { id: N.id, prod, objetivo }); },
    pedirYa({ prod, cant }) { const r = M.hacer(S, 'pedirYa', { id: N.id, prod, cant }); op.aviso(r.msg, r.ok ? 'bien' : 'mal'); },
    personal({ rol, cambio }) { const r = M.hacer(S, 'personalTienda', { id: N.id, rol, cambio }); if (!r.ok) op.aviso(r.msg, 'mal'); },
  };

  // ---------- Bucle ----------
  function bucle(t) {
    if (!abierto) return;
    const dt = Math.min(0.05, (t - prev) / 1000 || 0);
    prev = t;
    angulo += (angMeta - angulo) * Math.min(1, dt * 8);
    zoom += (zoomMeta - zoom) * Math.min(1, dt * 8);
    encuadre();
    avanzarGente(dt);
    moverPersonal(dt);
    renderer.render(escena, camara);
    requestAnimationFrame(bucle);
  }

  function abrir(estado, id, opciones) {
    S = estado; N = S.negocios.find(n => n.id === id); op = opciones;
    if (!N || !N.interior) return;
    if (typeof THREE === 'undefined') { op.aviso('No se pudo cargar el motor 3D. Revisa tu conexión.', 'mal'); return; }
    $('interior').hidden = false;
    document.body.classList.add('dentro');
    abierto = true;
    if (!listo) montar();
    medir();
    seleccion = null; colocar = null; pestana = 'resumen';
    construirCuarto();
    pintarPanel();
    prev = performance.now();
    requestAnimationFrame(bucle);
  }
  function cerrar() {
    abierto = false;
    $('interior').hidden = true;
    document.body.classList.remove('dentro');
    for (const p of gente) raiz.remove(p.f);
    gente.length = 0;
    op.despues && op.despues();
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-int]');
    if (!b || b.disabled || !abierto) return;
    const a = b.dataset.int, args = JSON.parse(b.dataset.args || '{}');
    if (a !== 'confirma') confirma = false;
    ACC[a](args);
    cambio();
  });
  document.addEventListener('keydown', e => {
    if (!abierto) return;
    if (e.key === 'Escape') { if (colocar || seleccion) { colocar = null; seleccion = null; cambio(); } else cerrar(); }
    if ((e.key === 'r' || e.key === 'R') && colocar && !e.target.matches('input')) { colocar.rot = colocar.rot ? 0 : 1; actualizarFantasma(); }
  });

  return {
    abrir, cerrar,
    get abierto() { return abierto; },
    girarCamara(lados) { angMeta += lados * Math.PI / 2; },
    acercar(f) { zoomMeta = Math.max(0.6, Math.min(2.2, zoomMeta * f)); },
    actualizar() { if (!abierto) return; if (!S.negocios.includes(N)) { cerrar(); return; } sincronizarMuebles(); pintarPanel(); },
    ventas(lista, msHora) {
      if (!abierto) return;
      const v = lista.find(x => x.lote === N.lote);
      if (!v) return;
      const k = Math.min(v.n, msHora < 500 ? 1 : msHora < 1000 ? 2 : 4);
      for (let j = 0; j < k; j++) setTimeout(() => abierto && cliente(j === 0 ? v.falto : null, v.monto / k), (j / k) * msHora * 0.8);
    },
  };
})();
