/* Pelotazo · modelos de jugador propios (.glb), etapa 2.
   Cargas un personaje 3D con esqueleto (por ejemplo uno de Mixamo o de Sketchfab, en formato .glb) y el juego lo usa
   para los 22 jugadores. El juego no trae animaciones del archivo: mueve los huesos él mismo con la misma pose que
   usa el modelo realista (carrera, golpeo, barrida, estirada del portero, celebración), apuntando cada hueso
   en una dirección. Por eso sirve con cualquier esqueleto humano, sin importar cómo esté colocado de fábrica.
   Reglas: aquí no se usa rng() (solo visual); el modelo se guarda en IndexedDB ('modelo_glb'); si falta o no se
   reconoce el esqueleto, el juego sigue con el modelo realista de siempre. */
const GLB = { plantilla: null, nombre: '', error: '', alto: 1, minY: 0, huesos: null, tintes: null };

// reconoce huesos humanos por su nombre (Mixamo "mixamorig:LeftUpLeg", Blender "thigh.L", "Left_Arm"...)
function glbClasificar(nombre) {
  const n = String(nombre).replace(/^.*[:|]/, '');
  const l = n.toLowerCase().replace(/^(mixamorig|armature|rig|def|bip\d*)[_.\-]?/, ''); // el lector quita los ":" del nombre
  let lado = null;
  if (/left/.test(l) || /(^|[^a-z])l([^a-z]|$)/.test(l) || /[a-z]_l$/.test(l)) lado = 0;
  else if (/right/.test(l) || /(^|[^a-z])r([^a-z]|$)/.test(l) || /[a-z]_r$/.test(l)) lado = 1;
  const t = l.replace(/left|right/g, '').replace(/(^|[^a-z])[lr]([^a-z]|$)/g, '$1$2').replace(/[^a-z]/g, '');
  let parte = null;
  if (/^(hips|pelvis)$/.test(t)) parte = 'caderas';
  else if (/^(spine|chest|torso|abdomen|upperchest)$/.test(t)) parte = 'columna';
  else if (/^neck$/.test(t)) parte = 'cuello';
  else if (/^head$/.test(t)) parte = 'cabeza';
  else if (lado !== null) {
    if (/^(upleg|upperleg|thigh|legupper|femur)$/.test(t)) parte = 'muslo';
    else if (/^(leg|lowerleg|calf|shin|legcalf|leglower)$/.test(t)) parte = 'tibia';
    else if (/^(foot|ankle)$/.test(t)) parte = 'pie';
    else if (/^(toe|toebase|toes|ball)$/.test(t)) parte = 'punta';
    else if (/^(arm|upperarm|armupper)$/.test(t)) parte = 'brazo';
    else if (/^(forearm|lowerarm|armlower|armfore)$/.test(t)) parte = 'antebrazo';
    else if (/^hand$/.test(t)) parte = 'mano';
  }
  return parte ? { parte, lado } : null;
}

const _V1 = new THREE.Vector3(), _V2 = new THREE.Vector3(), _Q1 = new THREE.Quaternion(), _Q2 = new THREE.Quaternion();
const glbProfundidad = o => { let d = 0; while (o.parent) { d++; o = o.parent; } return d; };

// prepara el modelo cargado: mide su altura, busca los huesos, guarda la posición de descanso de cada uno
function glbPreparar(raiz) {
  const pivote = new THREE.Group(); pivote.rotation.y = Math.PI / 2; // los .glb miran hacia +z; el juego usa +x
  const jug = new THREE.Group(); jug.add(pivote); pivote.add(raiz);
  jug.updateMatrixWorld(true);
  const caja = new THREE.Box3();
  let mallas = 0;
  raiz.traverse(o => { if (o.isMesh || o.isSkinnedMesh) { mallas++; if (o.isSkinnedMesh) o.skeleton.update(); } });
  if (!mallas) throw new Error('El archivo no tiene ningún modelo 3D.');
  raiz.traverse(o => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); caja.union(b); } });
  const h = caja.max.y - caja.min.y;
  if (!(h > 0.0001) || !isFinite(h)) throw new Error('No se pudo medir el tamaño del modelo.');
  // busca huesos: por parte y lado
  const hallados = {}, todos = []; let i = 0;
  jug.traverse(o => { todos.push(o); if (o.isBone) { const c = glbClasificar(o.name); if (c) { const k = c.parte + (c.lado === null ? '' : c.lado); (hallados[k] = hallados[k] || []).push(o); } } });
  const falta = ['muslo0', 'muslo1', 'tibia0', 'tibia1', 'brazo0', 'brazo1', 'antebrazo0', 'antebrazo1'].filter(k => !hallados[k]);
  if (falta.length) throw new Error('No reconozco el esqueleto (faltan: ' + falta.join(', ') + '). Necesita huesos de humano: muslos, piernas, brazos y antebrazos.');
  const primero = k => hallados[k] ? hallados[k].slice().sort((a, b) => glbProfundidad(a) - glbProfundidad(b))[0] : null;
  const columna = (hallados.columna || []).slice().sort((a, b) => glbProfundidad(a) - glbProfundidad(b));
  const hijoDe = (o, pref) => { // el hijo hacia el que apunta un hueso
    if (!o) return null;
    for (const k of pref) { const c = o.children.find(x => x.isBone && x === primero(k.parte + (k.lado === null ? '' : k.lado))); if (c) return c; }
    return o.children.find(x => x.isBone) || null;
  };
  const defs = [];
  const poner = (obj, hijo, tipo, lado) => { if (obj && hijo) defs.push({ obj, hijo, tipo, lado }); };
  for (let s = 0; s < 2; s++) {
    const mu = primero('muslo' + s), ti = primero('tibia' + s), pi = primero('pie' + s), pu = primero('punta' + s), br = primero('brazo' + s), an = primero('antebrazo' + s), ma = primero('mano' + s);
    poner(mu, ti, 'muslo', s); poner(ti, pi || ti.children.find(x => x.isBone), 'tibia', s);
    if (pi) poner(pi, pu || pi.children.find(x => x.isBone), 'pie', s);
    poner(br, an, 'brazo', s); poner(an, ma || an.children.find(x => x.isBone), 'antebrazo', s);
  }
  columna.forEach((c, k) => poner(c, columna[k + 1] || primero('cuello') || primero('cabeza') || c.children.find(x => x.isBone), 'columna', null));
  if (defs.length < 8) throw new Error('El esqueleto está incompleto.');
  // posición de descanso: dirección hacia el hijo y orientación en el mundo del jugador
  const huesos = defs.map(d => {
    const a = d.obj.getWorldPosition(new THREE.Vector3()), b = d.hijo.getWorldPosition(new THREE.Vector3());
    const dir = b.sub(a); if (dir.lengthSq() < 1e-10) return null;
    const q = d.obj.getWorldQuaternion(new THREE.Quaternion());
    return { idx: todos.indexOf(d.obj), tipo: d.tipo, lado: d.lado, dir: dir.normalize(), q, prof: glbProfundidad(d.obj) };
  }).filter(Boolean).sort((a, b) => a.prof - b.prof);
  pivote.position.y = -caja.min.y;
  jug.updateMatrixWorld(true);
  return { raiz: jug, huesos, alto: h, minY: caja.min.y, todos: todos.length };
}

// carga un .glb desde su contenido (ArrayBuffer); devuelve una promesa
function glbCargar(buffer, nombre) {
  return new Promise((ok, mal) => {
    if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return mal(new Error('Falta el lector de modelos.'));
    const noValido = () => { const m = new Error('El archivo no es un .glb válido.'); GLB.error = m.message; mal(m); };
    try { new THREE.GLTFLoader().parse(buffer, '', gltf => {
      try {
        const r = glbPreparar(gltf.scene);
        GLB.plantilla = r.raiz; GLB.huesos = r.huesos; GLB.alto = r.alto; GLB.minY = r.minY; GLB.nombre = nombre || 'modelo.glb'; GLB.error = ''; GLB.version = (GLB.version || 0) + 1;
        if (R) { glbLimpiar(); }
        ok(r);
      } catch (e) { GLB.error = e.message; mal(e); }
    }, noValido); } catch (e) { noValido(); }
  });
}
function glbQuitar() { GLB.plantilla = null; GLB.huesos = null; GLB.nombre = ''; GLB.error = ''; if (R) glbLimpiar(); }
const MODELO_GLB = () => DATOS.ajustes.modelo === 'glb' && !!GLB.plantilla;

function glbLimpiar() {
  if (R.glb) { R.glb.forEach(g => { if (g.parent) g.parent.remove(g); g.traverse(o => { if (o.isMesh && o.material) [].concat(o.material).forEach(m => m.dispose()); }); }); }
  R.glb = null;
  if (R.menu && R.menu.glb) { const g = R.menu.glb; if (g.parent) g.parent.remove(g); R.menu.glb = null; }
}

const GLB_CAMISA = /shirt|jersey|top|torso|cloth|camis|kit|body|chest|upper/i;
// copia del modelo para un jugador, con materiales propios (para pintar la camiseta de su equipo)
function glbClonar(escena) {
  const c = THREE.SkeletonUtils.clone(GLB.plantilla);
  const todos = []; c.traverse(o => todos.push(o));
  const mats = [];
  c.traverse(o => {
    if (o.isMesh) {
      o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false;
      const lista = [].concat(o.material).map(m => { const n = m.clone(); n.userData = { color: n.color ? n.color.clone() : null, camisa: GLB_CAMISA.test(m.name || '') || GLB_CAMISA.test(o.name || '') }; mats.push(n); return n; });
      o.material = Array.isArray(o.material) ? lista : lista[0];
    }
  });
  c.userData = { todos, mats, huesos: GLB.huesos.map(h => ({ o: todos[h.idx], h })), version: GLB.version };
  escena.add(c);
  return c;
}
// pinta la camiseta con el color del equipo (si el modelo tiene varias partes, solo las que parecen camiseta)
function glbColorear(g, cam) {
  const mats = g.userData.mats, hay = mats.some(m => m.userData.camisa), col = new THREE.Color(cam);
  mats.forEach(m => {
    if (!m.color || !m.userData.color) return;
    if (m.userData.camisa) m.color.copy(col);
    else if (!hay) m.color.copy(m.userData.color).lerp(col, mats.length > 1 ? 0 : .35);
    else m.color.copy(m.userData.color);
  });
}
function glbColorearTodos() {
  if (!R || !R.glb) return;
  G.todos.forEach((p, i) => { if (R.glb[i]) glbColorear(R.glb[i], p.por ? p.eq.portero : p.eq.camiseta); });
}

// camino hacia arriba hasta el jugador: orientación en el mundo del jugador de un hueso
function glbMundoQ(o, raiz, out) {
  out.identity();
  const cadena = []; for (let x = o; x && x !== raiz; x = x.parent) cadena.push(x);
  for (let k = cadena.length - 1; k >= 0; k--) out.multiply(cadena[k].quaternion);
  return out;
}
// gira el hueso para que apunte en la dirección dada (en el sistema del jugador: x delante, y arriba, z lado derecho)
function glbApuntar(g, e, dx, dy, dz) {
  _V1.set(dx, dy, dz).normalize();
  _Q1.setFromUnitVectors(e.h.dir, _V1).multiply(e.h.q); // orientación deseada en el mundo del jugador
  glbMundoQ(e.o.parent, g, _Q2).invert();
  e.o.quaternion.copy(_Q2.multiply(_Q1));
}
function glbPose(g, P) {
  const E = g.userData.huesos, th = P.th, kn = P.kn, ua = P.ua, ab = P.ab, co = P.co;
  const incl = P.lean * .85, sI = Math.sin(incl), cI = Math.cos(incl);
  for (const e of E) {
    const s = e.h.lado, lado = s ? 1 : -1, tipo = e.h.tipo;
    switch (tipo) {
      case 'columna': glbApuntar(g, e, sI, cI, 0); break;
      case 'muslo': glbApuntar(g, e, Math.sin(th[s]), -Math.cos(th[s]), lado * .05); break;
      case 'tibia': { const a = th[s] - kn[s]; glbApuntar(g, e, Math.sin(a), -Math.cos(a), lado * .04); break; }
      case 'pie': { const a = .2 * (th[s] - kn[s]) - .3; glbApuntar(g, e, Math.cos(a), Math.sin(a), 0); break; }
      case 'brazo': case 'antebrazo': {
        let za = ua[s], ba = ab[s], codo = co[s];
        if (P.arriba) { za = 0; ba = P.arriba; codo = .15; }
        if (P.enManos) { za = 1.1; ba = .2; codo = .9; }
        const ux = Math.sin(za) * Math.cos(ba), uy = -Math.cos(za) * Math.cos(ba), uz = lado * Math.sin(ba);
        if (tipo === 'brazo') { glbApuntar(g, e, ux, uy, uz); break; }
        const c = uy > 0 ? -codo : codo, cs = Math.cos(c), sn = Math.sin(c);
        glbApuntar(g, e, ux * cs - uy * sn, ux * sn + uy * cs, uz);
      }
    }
  }
}
function glbCuerpo(g, p, P, escala) {
  g.position.set(p.x, P.y, p.z);
  R_E_glb.set(P.roll, -p.cara, P.atras); g.quaternion.setFromEuler(R_E_glb);
  g.scale.setScalar(escala);
}
const R_E_glb = new THREE.Euler();

// dibuja los 22 jugadores con el modelo propio
function dibujarGLB() {
  if (!R.glb || R.glb.length !== G.todos.length || R.glb[0].userData.version !== GLB.version) {
    glbLimpiar();
    R.glb = G.todos.map(() => glbClonar(R.scene));
    glbColorearTodos();
  }
  const b = G.balon, k = 1.8 / GLB.alto;
  G.todos.forEach((p, i) => {
    const P = calcularPose(p, i, b), g = R.glb[i];
    g.visible = true;
    glbPose(g, P);
    glbCuerpo(g, p, P, k * P.alto);
  });
}
// el jugador del menú principal también usa el modelo propio
function menuGLB(E, p) {
  if (!E.glb || E.glb.userData.version !== GLB.version) { if (E.glb && E.glb.parent) E.glb.parent.remove(E.glb); E.glb = glbClonar(E.S); glbColorear(E.glb, 0xf2b51c); }
  E.K.real.forEach(m => m.visible = false); E.glb.visible = true;
  const P = calcularPose(p, 0, G.balon); glbPose(E.glb, P); glbCuerpo(E.glb, p, P, 1.8 / GLB.alto * P.alto);
}
function glbOcultar() { if (R && R.glb) R.glb.forEach(g => g.visible = false); }

// guardar y recuperar el archivo (IndexedDB)
async function glbGuardar(buffer, nombre) { try { await KV.set('modelo_glb', { buffer, nombre }); return true; } catch (e) { return false; } }
async function glbBorrarGuardado() { try { await KV.del('modelo_glb'); } catch (e) { } }
async function glbRestaurar() {
  try {
    const d = await KV.get('modelo_glb');
    if (d && d.buffer) { await glbCargar(d.buffer, d.nombre); if (R) aplicarModelo(); }
  } catch (e) { /* si falla se queda con el modelo realista */ }
}
// el jugador elige un archivo en Ajustes
async function glbDesdeArchivo(archivo) {
  if (!archivo) return { ok: false, error: 'No se eligió ningún archivo.' };
  if (archivo.size > 40 * 1024 * 1024) return { ok: false, error: 'El archivo pesa demasiado (máximo 40 MB). Busca uno más ligero.' };
  try {
    const buf = await archivo.arrayBuffer();
    await glbCargar(buf, archivo.name);
    const guardado = await glbGuardar(buf, archivo.name);
    DATOS.ajustes.modelo = 'glb'; if (R) aplicarModelo();
    if (typeof guardarPronto === 'function') guardarPronto();
    return { ok: true, guardado };
  } catch (e) { return { ok: false, error: e.message || 'No se pudo leer el archivo.' }; }
}
