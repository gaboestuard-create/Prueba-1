#!/usr/bin/env node
/* WORLD LEADER · build
   Une src/ en un único HTML y genera el mapa de países:
   - rasteriza world-atlas (50m) a un PNG en escala de grises donde cada píxel = índice de país
   - saca nombre en español, capital, región, coordenadas y fronteras de world-countries
   - reparte cada país en provincias reales con Natural Earth admin-1 (npm run data lo descarga, 40 MB)
   Uso: npm install && npm run data && node build.js   → world-leader.html (independiente) y dist/artifact.html (fragmento) */
const fs = require('fs'), path = require('path'), zlib = require('zlib'), vm = require('vm');
const SRC = path.join(__dirname, 'src');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const topo = require('world-atlas/countries-50m.json');
const wc = require('world-countries');

// Lista de países del juego (se lee de data.js, sin metadatos todavía)
const sandbox = { globalThis: {} }; sandbox.globalThis = sandbox;
const DATAFILES = ['data.js'].concat(fs.readdirSync(SRC).filter(f => /^data-.*\.js$/.test(f)).sort());
for (const f of DATAFILES) vm.runInNewContext(read(f), sandbox);
const DATA = sandbox.WL.DATA;
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
function fill(rings, put, verts) {
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
      for (let x = Math.ceil(xs[k] - .5); x <= Math.floor(xs[k + 1] - .5); x++) put(y * W + ((x % W) + W) % W);
  }
  // los vértices garantizan que las islas más pequeñas existan en el mapa
  if (verts) for (const r of px) for (const p of r) { const i = Math.min(H - 1, Math.floor(p[1])) * W + ((Math.floor(p[0]) % W) + W) % W; verts(i); }
}
const unassigned = [];
for (const g of topo.objects.countries.geometries) {
  const c = byNum[g.id];
  let iso = BYNAME[g.properties.name] || (c && c.cca2);
  if (iso && !idxOf[iso]) iso = TERR[iso];
  const val = idxOf[iso] || NEUTRAL;
  if (val === NEUTRAL) unassigned.push(g.properties.name);
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
  for (const p of polys) fill(p.map(ring), i => { map[i] = val; }, i => { if (!map[i]) map[i] = val; });
}
const pxCount = new Uint32Array(256);
for (let i = 0; i < map.length; i++) pxCount[map[i]]++;

// --- PROVINCIAS: Natural Earth admin-1 (dominio público), recortadas a la máscara de cada país.
// Los 7 países con subdivisiones (D.SUBS) conservan cada estado; el resto agrupa sus provincias
// en N regiones por cercanía (k-medias) y cada región toma el nombre de su provincia más grande.
const NEFILE = path.join(__dirname, 'data', 'ne_10m_admin_1_states_provinces.geojson');
if (!fs.existsSync(NEFILE)) throw new Error('Falta data/ne_10m_admin_1_states_provinces.geojson. Descárgalo con:\n  curl -L -o ' + NEFILE + ' https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson');
const A3 = { KOS: 'XK', SOL: 'SO', CYN: 'CY' }, pmap = new Uint16Array(W * H), provs = [null];
for (const f of JSON.parse(fs.readFileSync(NEFILE, 'utf8')).features) {
  const q = f.properties; let iso = /^[A-Z]{2}$/.test(q.iso_a2) ? q.iso_a2 : A3[q.adm0_a3]; const src = iso;
  if (iso && !idxOf[iso]) iso = TERR[iso]; if (!idxOf[iso] || !f.geometry) continue;
  const id = provs.length, ci = idxOf[iso];
  provs.push({ iso, src, reg: q.region, n: q.name_es || q.name || 'Región', alt: [q.name_es, q.name, q.name_en, q.woe_name].filter(Boolean), lat: q.latitude, lon: q.longitude, px: 0 });
  for (const rings of f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) fill(rings, i => { if (map[i] === ci) pmap[i] = id; });
}
{ // relleno de huecos: cada píxel de país sin provincia toma la del vecino más cercano del mismo país
  const q = new Int32Array(W * H); let h = 0, t = 0;
  for (let i = 0; i < pmap.length; i++) if (pmap[i]) q[t++] = i;
  while (h < t) { const i = q[h++], x = i % W, y = (i - x) / W;
    for (const j of [y * W + (x + 1) % W, y * W + (x + W - 1) % W, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && !pmap[j] && map[j] === map[i]) { pmap[j] = pmap[i]; q[t++] = j; } }
}
for (let i = 0; i < pmap.length; i++) if (pmap[i]) provs[pmap[i]].px++;
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(estado|krai|oblast|republica|provincia|region|territorio|ciudad|de|del|la|el|state|of)\b/g, '').replace(/[^a-z0-9]/g, '');
const v3 = (lat, lon) => { const a = lat * Math.PI / 180, o = lon * Math.PI / 180; return [Math.cos(a) * Math.cos(o), Math.sin(a), Math.cos(a) * Math.sin(o)]; };
const ll = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [+(Math.asin(v[1] / l) * 180 / Math.PI).toFixed(2), +(Math.atan2(v[2], v[0]) * 180 / Math.PI).toFixed(2)]; };
const ALIAS = { US: { 'Distrito de Columbia': ['district of columbia', 'washington d. c.'] }, MX: { 'Ciudad de México': ['distrito federal', 'mexico city'], 'Estado de México': ['méxico', 'mexico'] }, BR: { 'Distrito Federal': ['distrito federal'], 'Mato Grosso del Sur': ['mato grosso do sul'] },
  IN: { Delhi: ['nct of delhi', 'delhi', 'territorio de la capital nacional de delhi'], 'Punyab': ['punjab'], 'Guyarat': ['gujarat'], 'Rajastán': ['rajasthan'], 'Bengala Occidental': ['west bengal'], 'Odisha': ['orissa', 'odisha'] },
  RU: { 'Moscú': ['moscow', 'moskva', 'ciudad de moscu'], 'San Petersburgo': ['city of st. petersburg', 'saint petersburg'], 'Óblast de Moscú': ['moskovskaya', 'moscow oblast', 'oblast de moscu'], 'Tartaristán': ['tatarstan'], 'Baskortostán': ['bashkortostan'], 'Chechenia': ['chechnya'], 'Daguestán': ['dagestan'], 'Jabárovsk': ['khabarovsk'], 'Primorie': ["primor'ye", 'primorsky'], 'Sajalín': ['sakhalin'], 'Jakasia': ['khakass'], 'Oriol': ['orel'], 'Uliánovsk': ["ul'yanovsk"], 'Chuvasia': ['chuvash'], 'Yakutia': ['sakha (yakutia)', 'sakha'], 'Nizhni Nóvgorod': ['nizhegorod'], 'Cheliábinsk': ['chelyabinsk'], 'Tiumén': ["tyumen'"], 'Múrmansk': ['murmansk'], 'Kaliningrado': ['kaliningrad'] },
  CN: { 'Pekín': ['beijing'], 'Cantón': ['guangdong'], 'Tíbet': ['xizang'], 'Mongolia Interior': ['inner mongol'], 'Shanghái': ['shanghai'], 'Xinjiang': ['sinkiang', 'xinjiang'] }, DE: { 'Mecklemburgo-Pomerania': ['mecklenburg-vorpommern'] } };
const SUBS = sandbox.WL.DATA.SUBS, RUL = sandbox.WL.DATA.SUB_RULING, TERRS = {}, local = new Uint8Array(provs.length), subWarn = [];
for (const iso of GAME) {
  const c = by2[iso], list = provs.map((p, id) => p && p.iso === iso && p.px ? id : 0).filter(Boolean), cv = v3(c.latlng[0], c.latlng[1]);
  let groups;
  if (SUBS[iso]) {
    // Nivel A. Las provincias pequeñas van primero: así "Ciudad de X" se queda con la capital y no con el estado homónimo.
    const used = new Set(), RO = (DATA.REGION_OF || {})[iso], home = list.filter(id => provs[id].src === iso).sort((a, b) => provs[a].px - provs[b].px);
    const dep = {}; list.filter(id => provs[id].src !== iso).forEach(id => { (dep[provs[id].src] = dep[provs[id].src] || []).push(id); });
    const bySub = new Map(), orphan = [], cen = ids => [0, 1, 2].map(j => ids.reduce((a, id) => a + v3(provs[id].lat, provs[id].lon)[j] * (provs[id].px + 1), 0));
    for (const id of home) {
      const p = provs[id], keys = p.alt.map(norm);
      const sub = RO ? SUBS[iso].find(x => x.n === RO[p.reg]) : SUBS[iso].find(x => !used.has(x) && (keys.includes(norm(x.n)) || ((ALIAS[iso] || {})[x.n] || []).some(a => keys.includes(norm(a)))));
      if (!sub) { orphan.push(id); continue; } used.add(sub); if (!bySub.has(sub)) bySub.set(sub, []); bySub.get(sub).push(id);
    }
    groups = [...bySub].map(([sub, ids]) => ({ ids, n: sub.n, p: sub.p, gob: sub.g || '', cap: sub === SUBS[iso][0], px: ids.reduce((a, id) => a + provs[id].px, 0), v: cen(ids) }));
    const d3 = (a, b) => { const la = Math.hypot(...a) || 1, lb = Math.hypot(...b) || 1; return (a[0] / la - b[0] / lb) ** 2 + (a[1] / la - b[1] / lb) ** 2 + (a[2] / la - b[2] / lb) ** 2; };
    for (const id of orphan) { // sin correspondencia: lo diminuto se une a la entidad más cercana; lo demás queda como entidad propia
      const p = provs[id], v = v3(p.lat, p.lon);
      if ((p.px < 40 || RO) && groups.length) { const g = groups.slice().sort((a, b) => d3(a.v, v) - d3(b.v, v))[0]; g.ids.push(id); g.px += p.px; }
      else groups.push({ ids: [id], n: p.n, p: iso === 'RU' || iso === 'CN' ? RUL[iso] : 'Adm. central', gob: '', px: p.px, v });
    }
    for (const k in dep) { const m = dep[k]; groups.push({ ids: m, n: (by2[k] && by2[k].translations.spa.common) || provs[m[0]].n, p: 'Adm. central', gob: '', px: m.reduce((a, id) => a + provs[id].px, 0), v: cen(m) }); }
    SUBS[iso].filter(x => !used.has(x)).forEach(x => subWarn.push(iso + ':' + x.n));
  } else if (list.length) {
    const area = c.area; let N = Math.min(list.length, area < 2000 ? 1 : Math.max(3, Math.min(8, Math.round(Math.log10(area) * 1.3 - 2)))); // nivel B: 3 a 8 regiones
    const all = list.map(id => ({ id, v: v3(provs[id].lat, provs[id].lon), w: provs[id].px })), d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    const isFar = p => provs[p.id].src !== iso || (area < 3e6 && d2(p.v, cv) > .18); // ~25° del centro del país
    let P = all.filter(p => !isFar(p)); if (!P.length) P = all; const far = all.filter(p => !P.includes(p)), d2x = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    N = Math.min(N, P.length); let cen = [P.slice().sort((a, b) => b.w - a.w)[0].v];
    while (cen.length < N) cen.push(P.map(p => [Math.min(...cen.map(k => d2(k, p.v))) * Math.sqrt(p.w), p]).sort((a, b) => b[0] - a[0])[0][1].v);
    for (let it = 0; it < 14; it++) {
      P.forEach(p => { p.g = cen.map((k, i) => [d2(k, p.v), i]).sort((a, b) => a[0] - b[0])[0][1]; });
      cen = cen.map((k, i) => { const m = P.filter(p => p.g === i); if (!m.length) return k; const s = [0, 1, 2].map(j => m.reduce((a, p) => a + p.v[j] * p.w, 0)), l = Math.hypot(...s) || 1; return s.map(x => x / l); });
    }
    const capN = norm((c.capital || [''])[0] || 'x');
    groups = cen.map((k, i) => { const m = P.filter(p => p.g === i).sort((a, b) => b.w - a.w); if (!m.length) return null; const cp = m.find(p => provs[p.id].alt.some(a => norm(a) === capN));
      return { ids: m.map(p => p.id), n: provs[(cp || m[0]).id].n, px: m.reduce((a, p) => a + p.w, 0), v: k, cap: !!cp }; }).filter(Boolean);
    far.forEach(p => { groups.slice().sort((a, b) => d2(a.v, p.v) - d2(b.v, p.v))[0].ids.push(p.id); });
  } else groups = [{ ids: [], n: (c.capital || [''])[0] || 'Capital', px: 0, v: cv, cap: true }];
  if (!groups.some(g => g.cap)) groups.slice().sort((a, b) => b.px - a.px)[0].cap = true;
  groups.sort((a, b) => (b.cap ? 1 : 0) - (a.cap ? 1 : 0) || b.px - a.px);
  if (groups.length > 255) throw new Error('Demasiadas provincias en ' + iso);
  // partido aproximado de las regiones de nivel B: mayoría oficialista, resto para la principal oposición
  const rulName = DATA.C[iso].partido, opp = ((DATA.PARTIES[iso] || []).find(x => !x[3]) || ['Oposición'])[0], hfrac = t => { let h = 2166136261; for (const ch of t) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };
  groups.forEach(g => { if (g.p == null) g.p = g.cap || hfrac(iso + g.n) < .65 ? rulName : opp; });
  // peso demográfico (w) y económico (e) de cada región
  const W8 = (DATA.SUBW || {})[iso] || {}, fixed = groups.reduce((a, g) => a + (W8[g.n] || 0), 0) / 100, free = groups.filter(g => W8[g.n] == null), fsum = free.reduce((a, g) => a + Math.sqrt(g.px + 1), 0) || 1;
  groups.forEach(g => { g.w = W8[g.n] != null ? W8[g.n] / 100 : Math.max(.02, 1 - fixed) * Math.sqrt(g.px + 1) / fsum; });
  const sw = groups.reduce((a, g) => a + g.w, 0); groups.forEach(g => { g.w /= sw; });
  const se = groups.reduce((a, g) => a + g.w * (g.cap ? 1.5 : 1), 0); groups.forEach(g => { g.e = g.w * (g.cap ? 1.5 : 1) / se; });
  // recursos locales: los indicados en D.SUBREC o, si no, las regiones más extensas por turnos
  const REC = DATA.C[iso].rec, SR = (DATA.SUBREC || {})[iso] || {}, big = groups.slice().sort((a, b) => b.px - a.px); let rix = 0;
  for (const k in REC) {
    let names = (SR[k] || '').split(',').filter(n => groups.some(g => g.n === n));
    if (!names.length) { const cnt = Math.min(3, Math.max(1, Math.round(REC[k] / 2)), big.length); for (let q = 0; q < cnt; q++) names.push(big[(rix + q) % big.length].n); rix++; }
    names.forEach(n => { const g = groups.find(x => x.n === n); (g.r = g.r || []).push(k); });
  }
  TERRS[iso] = groups.map((g, i) => { g.ids.forEach(id => { local[id] = i + 1; }); const [la, lo] = ll(g.v); const t = { n: g.n, la, lo, p: g.p, w: +g.w.toFixed(4), e: +g.e.toFixed(4) }; if (g.gob) t.gob = g.gob; if (g.r) t.r = g.r; return t; });
}
if (subWarn.length) console.log('AVISO · subdivisiones de data.js sin geometría:', subWarn.join(', '));
// canal 2 del mapa: índice local de provincia (1..n) dentro de su país
const rgb = new Uint8Array(W * H * 3);
for (let i = 0; i < map.length; i++) { rgb[i * 3] = map[i]; rgb[i * 3 + 1] = map[i] && map[i] !== NEUTRAL ? (local[pmap[i]] || 1) : 0; }

// --- PNG RGB de 8 bits: R = país, G = provincia
function png(w, h, data) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(data.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const chunk = (type, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const td = Buffer.concat([Buffer.from(type), body]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const pngBuf = png(W, H, rgb);

// --- Metadatos por país
const REG = c => c.region === 'Europe' ? 'EUR' : c.region === 'Africa' ? 'AFR' : c.region === 'Oceania' ? 'OCE'
  : c.region === 'Asia' ? (c.subregion === 'Western Asia' ? 'MOR' : 'ASI')
  : c.subregion === 'South America' ? 'AMS' : c.subregion === 'North America' ? 'AMN' : 'AMC';
const META = {};
for (const iso of GAME) {
  const c = by2[iso]; if (!c) throw new Error('País desconocido en data.js: ' + iso);
  META[iso] = { n: NAMES[iso] || c.translations.spa.common, cap: (c.capital || [''])[0], reg: REG(c), lat: c.latlng[0], lon: c.latlng[1], area: Math.round(c.area),
    land: !!c.landlocked, bord: (c.borders || []).map(b => by3[b] && by3[b].cca2).filter(b => idxOf[b]), px: pxCount[idxOf[iso]], idx: idxOf[iso], terr: TERRS[iso] };
}
const geo = 'globalThis.WL=globalThis.WL||{};WL.META=' + JSON.stringify(META) + ';WL.GEO=' + JSON.stringify({ W, H, png: 'data:image/png;base64,' + pngBuf.toString('base64'), iso: [''].concat(GAME) }) + ';';

// --- Ensamblado
const dir = d => fs.readdirSync(path.join(SRC, d)).sort().map(f => `\n/* ---------- ${d}/${f} ---------- */\n` + read(d + '/' + f)).join('\n');
const parts = {
  CSS: read('styles.css'), GEO: geo, DATA: DATAFILES.map(read).join('\n'),
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
