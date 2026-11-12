#!/usr/bin/env node
/* WORLD LEADER · build
   Une src/ en un único HTML y genera el mapa de países:
   - rasteriza world-atlas (50m) a un PNG en escala de grises donde cada píxel = índice de país
   - saca nombre en español, capital, región, coordenadas y fronteras de world-countries
   Uso: npm install && node build.js   → world-leader.html (independiente) y dist/artifact.html (fragmento) */
const fs = require('fs'), path = require('path'), zlib = require('zlib'), vm = require('vm');
const SRC = path.join(__dirname, 'src');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const topo = require('world-atlas/countries-50m.json');
const wc = require('world-countries');

// Lista de países del juego (se lee de data.js, sin metadatos todavía)
const sandbox = { globalThis: {} }; sandbox.globalThis = sandbox;
vm.runInNewContext(read('data.js'), sandbox);
const GAME = Object.keys(sandbox.WL.DATA.C);
const missing = wc.filter(c => c.unMember && !GAME.includes(c.cca2)).map(c => c.cca2);
if (missing.length) throw new Error('Faltan países miembros de la ONU en data.js: ' + missing);
if (GAME.length > 254) throw new Error('Demasiados países para un mapa de 8 bits');

// Territorios dependientes → país soberano (se pintan y se clican como su soberano)
const TERR = { GL: 'DK', FO: 'DK', PR: 'US', GU: 'US', VI: 'US', AS: 'US', MP: 'US', NC: 'FR', PF: 'FR', TF: 'FR', PM: 'FR', WF: 'FR', BL: 'FR', MF: 'FR', GF: 'FR', GP: 'FR', MQ: 'FR', RE: 'FR', YT: 'FR',
  FK: 'GB', GS: 'GB', BM: 'GB', KY: 'GB', TC: 'GB', VG: 'GB', AI: 'GB', MS: 'GB', SH: 'GB', IO: 'GB', PN: 'GB', JE: 'GB', GG: 'GB', IM: 'GB', GI: 'GB',
  AW: 'NL', CW: 'NL', SX: 'NL', BQ: 'NL', HK: 'CN', MO: 'CN', AX: 'FI', CK: 'NZ', NU: 'NZ', TK: 'NZ', NF: 'AU', HM: 'AU', CX: 'AU', CC: 'AU', SJ: 'NO', BV: 'NO' };
const BYNAME = { Kosovo: 'XK', 'N. Cyprus': 'CY', Somaliland: 'SO' };
const NAMES = { CD: 'RD del Congo', CG: 'Congo', CF: 'Rep. Centroafricana', DO: 'Rep. Dominicana', AE: 'Emiratos Árabes Unidos', GB: 'Reino Unido', US: 'Estados Unidos', BA: 'Bosnia y Herzegovina', VC: 'San Vicente y las Granadinas', KN: 'San Cristóbal y Nieves', ST: 'Santo Tomé y Príncipe', TT: 'Trinidad y Tobago', AG: 'Antigua y Barbuda', PG: 'Papúa Nueva Guinea', CZ: 'Chequia', MK: 'Macedonia del Norte', KP: 'Corea del Norte', KR: 'Corea del Sur', TL: 'Timor Oriental', VA: 'Ciudad del Vaticano', SZ: 'Esuatini', CI: 'Costa de Marfil', FM: 'Micronesia', XK: 'Kosovo', TW: 'Taiwán', PS: 'Palestina' };
const byNum = {}, by2 = {}, by3 = {};
wc.forEach(c => { if (c.ccn3) byNum[c.ccn3] = c; by2[c.cca2] = c; by3[c.cca3] = c; });
const idxOf = {}; GAME.forEach((iso, i) => idxOf[iso] = i + 1);
const NEUTRAL = 255;

// --- TopoJSON → anillos lon/lat
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
const arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const ring = ids => { let pts = []; for (const i of ids) { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; pts = pts.concat(pts.length ? a.slice(1) : a); } return pts; };

// --- Rasterizado por líneas de barrido (sin antialias: cada píxel es un índice exacto)
const W = 4096, H = 2048, map = new Uint8Array(W * H);
function fill(rings, val) {
  // se "desenrolla" cada anillo para que los polígonos que cruzan el antimeridiano sean continuos
  const px = rings.map(r => { let prev = null, off = 0; return r.map(([lon, lat]) => {
    if (prev !== null) { if (lon + off - prev > 180) off -= 360; else if (lon + off - prev < -180) off += 360; }
    prev = lon + off; return [(prev + 180) / 360 * W, (90 - lat) / 180 * H]; }); });
  let y0 = H, y1 = 0;
  px.forEach(r => r.forEach(p => { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }));
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) {
    const cy = y + .5, xs = [];
    for (const r of px) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[j], b = r[i];
      if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) xs.push(a[0] + (cy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.ceil(xs[k] - .5); x <= Math.floor(xs[k + 1] - .5); x++) map[y * W + ((x % W) + W) % W] = val;
  }
  // los vértices garantizan que las islas más pequeñas existan en el mapa
  for (const r of px) for (const p of r) { const i = Math.min(H - 1, Math.floor(p[1])) * W + ((Math.floor(p[0]) % W) + W) % W; if (!map[i]) map[i] = val; }
}
const unassigned = [];
for (const g of topo.objects.countries.geometries) {
  const c = byNum[g.id];
  let iso = BYNAME[g.properties.name] || (c && c.cca2);
  if (iso && !idxOf[iso]) iso = TERR[iso];
  const val = idxOf[iso] || NEUTRAL;
  if (val === NEUTRAL) unassigned.push(g.properties.name);
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
  for (const p of polys) fill(p.map(ring), val);
}
const pxCount = new Uint32Array(256);
for (let i = 0; i < map.length; i++) pxCount[map[i]]++;

// --- PNG de 8 bits en gris
function png(w, h, data) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; Buffer.from(data.buffer, y * w, w).copy(raw, y * (w + 1) + 1); }
  const chunk = (type, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const td = Buffer.concat([Buffer.from(type), body]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const pngBuf = png(W, H, map);

// --- Metadatos por país
const REG = c => c.region === 'Europe' ? 'EUR' : c.region === 'Africa' ? 'AFR' : c.region === 'Oceania' ? 'OCE'
  : c.region === 'Asia' ? (c.subregion === 'Western Asia' ? 'MOR' : 'ASI')
  : c.subregion === 'South America' ? 'AMS' : c.subregion === 'North America' ? 'AMN' : 'AMC';
const META = {};
for (const iso of GAME) {
  const c = by2[iso]; if (!c) throw new Error('País desconocido en data.js: ' + iso);
  META[iso] = { n: NAMES[iso] || c.translations.spa.common, cap: (c.capital || [''])[0], reg: REG(c), lat: c.latlng[0], lon: c.latlng[1], area: Math.round(c.area),
    land: !!c.landlocked, bord: (c.borders || []).map(b => by3[b] && by3[b].cca2).filter(b => idxOf[b]), px: pxCount[idxOf[iso]], idx: idxOf[iso] };
}
const geo = 'globalThis.WL=globalThis.WL||{};WL.META=' + JSON.stringify(META) + ';WL.GEO=' + JSON.stringify({ W, H, png: 'data:image/png;base64,' + pngBuf.toString('base64'), iso: [''].concat(GAME) }) + ';';

// --- Ensamblado
const dir = d => fs.readdirSync(path.join(SRC, d)).sort().map(f => `\n/* ---------- ${d}/${f} ---------- */\n` + read(d + '/' + f)).join('\n');
const parts = {
  CSS: read('styles.css'), GEO: geo, DATA: read('data.js'),
  ENGINE: "(function(){'use strict';\nconst WL=globalThis.WL;\n" + dir('engine') + '\n})();',
  GLOBE: read('globe.js'), UI: "(function(){'use strict';\nconst WL=globalThis.WL;\n" + dir('ui') + '\n})();'
};
let body = read('index.html');
for (const k in parts) body = body.split('%%' + k + '%%').join(parts[k]);
if (/<\/script>/i.test(Object.values(parts).join(''))) throw new Error('Un módulo contiene </script>');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'artifact.html'), body);
fs.writeFileSync(path.join(__dirname, 'dist', 'core.js'), parts.GEO + '\n' + parts.DATA + '\n' + parts.ENGINE); // para test.js
fs.writeFileSync(path.join(__dirname, 'world-leader.html'),
  '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n</head>\n<body>\n' + body + '\n</body>\n</html>\n');
if (process.argv.includes('--debug')) fs.writeFileSync(path.join(__dirname, 'dist', 'ids.png'), pngBuf);
console.log(`OK · ${GAME.length} países · mapa ${(pngBuf.length / 1024) | 0} KB · html ${(body.length / 1024) | 0} KB`);
console.log('Sin píxeles (solo marcador):', GAME.filter(i => !META[i].px).join(',') || '—');
console.log('Territorio neutral:', unassigned.join(', '));
