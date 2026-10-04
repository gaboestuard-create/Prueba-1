// Crea tests/fixtures/maniqui.glb: un muñeco con esqueleto estilo Mixamo (en T, mirando a +z) para probar los modelos propios.
import { serve, launch, openGame } from './harness.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const srv = await serve(); const br = await launch();
const { page } = await openGame(await br.newContext(), srv.url);
await page.addScriptTag({ path: path.join(AQUI, '../node_modules/three/examples/js/exporters/GLTFExporter.js') });
const b64 = await page.evaluate(async () => {
  const T = THREE, bones = [], por = {};
  const hueso = (nombre, padre, x, y, z) => { const b = new T.Bone(); b.name = 'mixamorig:' + nombre; b.position.set(x, y, z); (padre ? por[padre] : null)?.add(b); por[nombre] = b; bones.push(b); return b; };
  hueso('Hips', null, 0, 1.0, 0); hueso('Spine', 'Hips', 0, .1, 0); hueso('Spine1', 'Spine', 0, .15, 0); hueso('Spine2', 'Spine1', 0, .15, 0);
  hueso('Neck', 'Spine2', 0, .12, 0); hueso('Head', 'Neck', 0, .1, 0); hueso('HeadTop_End', 'Head', 0, .2, 0);
  for (const [L, sg] of [['Left', 1], ['Right', -1]]) {
    hueso(L + 'UpLeg', 'Hips', sg * .1, -.05, 0); hueso(L + 'Leg', L + 'UpLeg', 0, -.45, 0); hueso(L + 'Foot', L + 'Leg', 0, -.45, 0); hueso(L + 'ToeBase', L + 'Foot', 0, -.06, .14); hueso(L + 'Toe_End', L + 'ToeBase', 0, 0, .08);
    hueso(L + 'Shoulder', 'Spine2', sg * .08, .08, 0); hueso(L + 'Arm', L + 'Shoulder', sg * .15, 0, 0); hueso(L + 'ForeArm', L + 'Arm', sg * .28, 0, 0); hueso(L + 'Hand', L + 'ForeArm', sg * .26, 0, 0); hueso(L + 'HandEnd', L + 'Hand', sg * .1, 0, 0);
  }
  // en el modelo, "Left" está a +x cuando mira a +z? (mirando a +z, su izquierda es +x)
  const pos = [], nor = [], si = [], sw = [];
  const caja = (cx, cy, cz, w, h, d, nombre) => {
    const g = new T.BoxGeometry(w, h, d).toNonIndexed(), i = bones.indexOf(por[nombre]);
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let k = 0; k < p.length; k += 3) { pos.push(p[k] + cx, p[k + 1] + cy, p[k + 2] + cz); nor.push(n[k], n[k + 1], n[k + 2]); si.push(i, 0, 0, 0); sw.push(1, 0, 0, 0); }
  };
  caja(0, 1.0, 0, .3, .2, .18, 'Hips'); caja(0, 1.3, 0, .34, .4, .2, 'Spine1'); caja(0, 1.62, 0, .18, .2, .2, 'Head');
  for (const [L, sg] of [['Left', 1], ['Right', -1]]) {
    caja(sg * .1, .77, 0, .13, .42, .14, L + 'UpLeg'); caja(sg * .1, .32, 0, .1, .42, .11, L + 'Leg'); caja(sg * .1, .04, .05, .1, .08, .26, L + 'Foot');
    caja(sg * .33, 1.4, 0, .26, .09, .09, L + 'Arm'); caja(sg * .6, 1.4, 0, .26, .08, .08, L + 'ForeArm'); caja(sg * .8, 1.4, 0, .12, .07, .07, L + 'Hand');
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
  const mat = new T.MeshStandardMaterial({ color: 0xdddddd, name: 'camiseta' });
  const malla = new T.SkinnedMesh(g, mat); malla.name = 'Maniqui';
  const raiz = new T.Group(); raiz.name = 'Scene'; raiz.add(por.Hips); raiz.add(malla);
  raiz.updateMatrixWorld(true);
  malla.bind(new T.Skeleton(bones));
  const buf = await new Promise(ok => new T.GLTFExporter().parse(raiz, ok, { binary: true }));
  let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
  return btoa(s);
});
fs.mkdirSync(path.join(AQUI, 'fixtures'), { recursive: true });
fs.writeFileSync(path.join(AQUI, 'fixtures/maniqui.glb'), Buffer.from(b64, 'base64'));
console.log('maniqui.glb', Buffer.from(b64, 'base64').length, 'bytes');
await br.close(); await srv.close();
