'use strict';
/* Pelotazo · mundo: genera los clubes y sus jugadores, elige alineaciones, prepara equipos para el motor del partido,
   simula partidos que no juegas, hace calendarios y clasificaciones y hace evolucionar a los jugadores.
   Lo usan todos los modos de juego. Un "mundo" (M) es: { v, temporada, ligas: [], clubes: [], jug: [] } donde el id de
   cada club y de cada jugador es su posición en la lista. */
const MUNDO_VERSION = 1;
// azar con semilla propio del mundo (no toca el del partido en curso)
function crearAzar(s) {
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
let AZ = crearAzar(Date.now() % 1e9);              // azar de los modos (simulaciones, fichajes)
const azEntre = (a, b) => a + (b - a) * AZ();
const azElige = l => l[Math.floor(AZ() * l.length)];
const hexNum = h => parseInt(h, 16);
const colorCss = n => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
const PIEL_POR_NAC = { SN: [3, 4, 4], BR: [0, 1, 2, 3, 4], MX: [1, 2, 1, 5], AR: [0, 1, 5], PT: [0, 1, 5, 2], ES: [0, 5, 1], FR: [0, 5, 3, 4], EN: [0, 5, 3], DE: [0, 5], IT: [0, 5, 1], NL: [0, 5, 3] };
const ordenPuestos = ['POR', 'LD', 'DFC', 'LI', 'MCD', 'MC', 'MI', 'MD', 'MCO', 'EI', 'ED', 'DC'];

/* ---------- jugadores ---------- */
function atributosPara(pos, med, az = AZ) {
  const P = PERFIL_PUESTO[pos], at = {};
  for (const k in P) at[k] = Math.round(clamp(med + P[k] + (az() - .5) * 10, 10, 99));
  return at;
}
// la media se calcula con los atributos importantes de cada puesto
const PESOS_MEDIA = {
  POR: { par: .8, pas: .1, vel: .1 }, DFC: { def: .55, vel: .2, pas: .15, reg: .1 }, LD: { def: .35, vel: .3, pas: .2, reg: .15 }, LI: { def: .35, vel: .3, pas: .2, reg: .15 },
  MCD: { def: .4, pas: .35, vel: .1, reg: .15 }, MC: { pas: .45, reg: .2, def: .15, tir: .1, vel: .1 }, MCO: { pas: .35, reg: .3, tir: .25, vel: .1 },
  MI: { pas: .3, reg: .3, vel: .25, tir: .15 }, MD: { pas: .3, reg: .3, vel: .25, tir: .15 }, EI: { reg: .35, vel: .35, tir: .2, pas: .1 }, ED: { reg: .35, vel: .35, tir: .2, pas: .1 },
  DC: { tir: .5, reg: .2, vel: .2, pas: .1 },
};
function mediaDe(j) { const w = PESOS_MEDIA[j.pos]; let m = 0; for (const k in w) m += j.at[k] * w[k]; return Math.round(m); }
// cambia la media subiendo o bajando todos los atributos por igual (lo usa el editor y la evolución)
function fijarMedia(j, nueva) {
  nueva = Math.round(clamp(nueva, 30, 99));
  for (let i = 0; i < 6 && mediaDe(j) !== nueva; i++) { const d = nueva - mediaDe(j); for (const k in j.at) j.at[k] = Math.round(clamp(j.at[k] + d, 5, 99)); }
  j.med = mediaDe(j);
}
function salarioDe(j, riqueza = 1) { return Math.round(700 * Math.pow(1.125, j.med - 55) * riqueza / 100) * 100; }      // € por semana
function valorDe(j) {
  const edad = j.edad < 21 ? 1.6 : j.edad < 24 ? 1.35 : j.edad < 28 ? 1.1 : j.edad < 31 ? .8 : .45;
  const pot = 1 + Math.max(0, j.pot - j.med) * .025;
  return Math.round(60000 * Math.pow(1.19, j.med - 55) * edad * pot / 50000) * 50000;
}
function nombreCompleto(j) { return (j.nombre1 ? j.nombre1 + ' ' : '') + j.nombre; }
function crearJugador(M, { nac, pos, med, edad, club, num, az = AZ, riqueza = 1 }) {
  const N = NACIONES[nac] || NACIONES.ES;
  const pieles = PIEL_POR_NAC[nac] || [0, 1, 5];
  const j = {
    id: M.jug.length, nombre1: N.n[Math.floor(az() * N.n.length)], nombre: N.a[Math.floor(az() * N.a.length)], nac, pos,
    edad, med: 0, pot: 0, at: atributosPara(pos, med, az), forma: 55 + Math.floor(az() * 25), les: 0, san: 0, club, num,
    piel: PIEL[pieles[Math.floor(az() * pieles.length)]], pelo: PELO[Math.floor(az() * PELO.length)], foto: null,
    st: { pj: 0, g: 0, a: 0 }, sal: 0, val: 0,
  };
  j.med = mediaDe(j);
  j.pot = Math.round(clamp(j.med + Math.max(0, 27 - edad) * (1 + az() * 1.6), j.med, 95));
  j.sal = salarioDe(j, riqueza); j.val = valorDe(j);
  M.jug.push(j);
  return j;
}
const NUMEROS_PUESTO = { POR: [1, 13, 25], DFC: [4, 5, 3, 15, 24, 6], LD: [2, 12, 22], LI: [3, 21, 18], MCD: [6, 16, 5], MC: [8, 14, 6, 18], MCO: [10, 20], MI: [11, 17], MD: [7, 19], EI: [11, 17, 27], ED: [7, 19, 29], DC: [9, 19, 23, 30] };
function numeroLibre(M, club, pos) {
  const usados = new Set(club.plantilla.map(id => M.jug[id].num));
  for (const n of NUMEROS_PUESTO[pos] || []) if (!usados.has(n)) return n;
  for (let n = 2; n < 99; n++) if (!usados.has(n)) return n;
  return 99;
}

/* ---------- el mundo ---------- */
function generarMundo(sem = 2025) {
  const az = crearAzar(sem);
  const ga = () => { let u = 0; while (!u) u = az(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * az()); };
  const M = { v: MUNDO_VERSION, temporada: 2025, ligas: [], clubes: [], jug: [] };
  for (const L of LIGAS_BASE) {
    const liga = { id: L.id, nombre: L.nombre, pais: L.pais, nac: L.nac, riqueza: L.riqueza, clubes: [] };
    M.ligas.push(liga);
    for (const txt of L.clubes) {
      const [nombre, corto, rep, c1, c2, c3, estadio] = txt.split('|');
      const club = {
        id: M.clubes.length, liga: L.id, nombre, corto, rep: +rep, camiseta: hexNum(c1), pantalon: hexNum(c2), camiseta2: hexNum(c3), estadio, escudo: null,
        presupuesto: Math.round(1e6 * Math.pow(1.115, +rep - 50) * L.riqueza / 1e5) * 1e5, formacion: '4-3-3', estilo: { presion: 1, linea: 1, ritmo: 1 }, plantilla: [],
      };
      M.clubes.push(club); liga.clubes.push(club.id);
      const media = 38 + club.rep * .48, vistos = {};
      const extranjeros = (EXTRANJEROS[L.nac] || 'ES').split(' ');
      for (const pos of PLANTILLA_TIPO) {
        vistos[pos] = (vistos[pos] || 0) + 1;
        const titular = vistos[pos] <= ({ DFC: 2, MC: 2 }[pos] || 1);
        const edad = 18 + Math.floor(Math.pow(az(), 1.2) * 16);
        const med = clamp(media + ga() * 2.9 + (titular ? 3 : -3.5) - (edad < 21 ? 4 : 0), 42, 91);
        const nac = az() < .62 ? L.nac : extranjeros[Math.floor(az() * extranjeros.length)];
        const j = crearJugador(M, { nac, pos, med, edad, club: club.id, num: numeroLibre(M, club, pos), az, riqueza: L.riqueza });
        club.plantilla.push(j.id);
      }
    }
  }
  return M;
}
// arregla un mundo cargado de un guardado (campos que falten)
function arreglarMundo(M) {
  for (const c of M.clubes) { c.estilo = { presion: 1, linea: 1, ritmo: 1, ...(c.estilo || {}) }; if (!FORMACIONES[c.formacion]) c.formacion = '4-3-3'; if (!Array.isArray(c.plantilla)) c.plantilla = []; }
  for (const j of M.jug) { if (!j.st) j.st = { pj: 0, g: 0, a: 0 }; if (!j.at) j.at = atributosPara(j.pos, j.med || 60); j.les = j.les || 0; j.san = j.san || 0; if (j.forma == null) j.forma = 60; }
  return M;
}
function validarMundo(M) {
  const g = [];
  if (!M || !Array.isArray(M.ligas) || !Array.isArray(M.clubes) || !Array.isArray(M.jug)) return ['estructura del mundo'];
  if (M.clubes.length < 2) g.push('faltan clubes');
  for (const c of M.clubes) { if (!c || typeof c.nombre !== 'string') { g.push('club dañado'); break; } if (c.plantilla.some(id => !M.jug[id] || M.jug[id].club !== c.id)) { g.push('plantilla dañada: ' + c.nombre); break; } }
  for (const j of M.jug) if (!j || !Number.isFinite(j.med) || !j.at) { g.push('jugador dañado'); break; }
  return g;
}
const ligaDe = (M, id) => M.ligas.find(l => l.id === id);
const clubesDeLiga = (M, id) => ligaDe(M, id).clubes.map(c => M.clubes[c]);
const plantillaDe = (M, c) => (typeof c === 'number' ? M.clubes[c] : c).plantilla.map(id => M.jug[id]);
const disponible = j => j.les <= 0 && j.san <= 0;
function estrellas(rep) { return rep >= 88 ? 5 : rep >= 81 ? 4.5 : rep >= 77 ? 4 : rep >= 73 ? 3.5 : rep >= 70 ? 3 : 2.5; }

/* ---------- alineaciones ---------- */
// qué tal juega un jugador en un puesto que no es el suyo (1 = su puesto)
const PARECIDOS = { DFC: { MCD: .88, LD: .85, LI: .85 }, LD: { LI: .9, MD: .88, DFC: .85, ED: .8 }, LI: { LD: .9, MI: .88, DFC: .85, EI: .8 }, MCD: { MC: .94, DFC: .86 },
  MC: { MCD: .93, MCO: .93, MI: .9, MD: .9 }, MCO: { MC: .93, DC: .86, EI: .88, ED: .88 }, MI: { EI: .95, MC: .9, LI: .85, MD: .9 }, MD: { ED: .95, MC: .9, LD: .85, MI: .9 },
  EI: { MI: .95, ED: .93, DC: .88, MCO: .87 }, ED: { MD: .95, EI: .93, DC: .88, MCO: .87 }, DC: { EI: .88, ED: .88, MCO: .86 } };
function encaje(jPos, puesto) { if (jPos === puesto) return 1; if (jPos === 'POR' || puesto === 'POR') return .3; return (PARECIDOS[jPos] && PARECIDOS[jPos][puesto]) || .72; }
const mediaEn = (j, puesto) => j.med * encaje(j.pos, puesto) * (.97 + j.forma * .0006);
// elige el mejor once para una formación entre los disponibles (y los que no estén en "fuera")
function mejorOnce(M, club, formacion = club.formacion, fuera = []) {
  const form = FORMACIONES[formacion] || FORMACIONES['4-3-3'];
  const libres = plantillaDe(M, club).filter(j => disponible(j) && !fuera.includes(j.id));
  const once = new Array(form.length).fill(null);
  // primero los puestos más difíciles de cubrir
  const orden = form.map((f, k) => k).sort((a, b) => (form[a].p === 'POR' ? -1 : 0) - (form[b].p === 'POR' ? -1 : 0));
  for (const k of orden) {
    let mejor = null, mv = -1;
    for (const j of libres) { if (once.includes(j.id)) continue; const v = mediaEn(j, form[k].p); if (v > mv) { mv = v; mejor = j; } }
    once[k] = mejor ? mejor.id : null;
  }
  return once;
}
// alineación válida: la guardada por el usuario si sirve, si no la mejor posible
function alineacionDe(M, club) {
  const form = FORMACIONES[club.formacion] || FORMACIONES['4-3-3'];
  const a = club.alineacion;
  if (Array.isArray(a) && a.length === form.length && a.every(id => id != null && M.jug[id] && M.jug[id].club === club.id && disponible(M.jug[id])) && new Set(a).size === a.length) return a.slice();
  if (Array.isArray(a) && a.length === form.length) { // completa los huecos de la del usuario
    const r = a.map(id => (id != null && M.jug[id] && M.jug[id].club === club.id && disponible(M.jug[id]) ? id : null));
    const fuera = r.filter(x => x != null), auto = mejorOnce(M, club, club.formacion, fuera);
    let i = 0; return r.map((id, k) => id != null ? id : auto[k] != null ? auto[k] : (auto.filter(x => x != null)[i++] ?? null));
  }
  return mejorOnce(M, club);
}
function fuerzaDe(M, club, once = alineacionDe(M, club)) {
  const form = FORMACIONES[club.formacion] || FORMACIONES['4-3-3'];
  let s = 0, n = 0; once.forEach((id, k) => { if (id != null) { s += mediaEn(M.jug[id], form[k].p); n++; } });
  return n ? s / 11 - (11 - n) * 6 : 40;
}
const colorPortero = c => difColor(c.camiseta, 0x2bc46a) > 150 ? 0x2bc46a : difColor(c.camiseta, 0xffc928) > 150 ? 0xffc928 : 0x8a4bd6;
// definición de equipo para el motor (crearEquipo)
function equipoParaPartido(M, clubId, once) {
  const c = M.clubes[clubId]; once = once || alineacionDe(M, c);
  return {
    id: c.id, nombre: c.nombre, corto: c.corto, camiseta: c.camiseta, pantalon: c.pantalon, medias: c.camiseta, camiseta2: c.camiseta2,
    portero: colorPortero(c), formacion: c.formacion, estilo: { ...c.estilo }, escudo: c.escudo, estadio: c.estadio,
    jugadores: once.map(id => { const j = M.jug[id]; return j ? { id: j.id, nombre: j.nombre, nombre1: j.nombre1, num: j.num, atrib: j.at, piel: j.piel, pelo: j.pelo, forma: j.forma, foto: j.foto } : null; }),
  };
}

/* ---------- simulación rápida de un partido ---------- */
function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= AZ(); } while (p > L); return k - 1; }
function elegirPorPeso(lista, peso) { let t = 0; for (const x of lista) t += peso(x); let r = AZ() * t; for (const x of lista) { r -= peso(x); if (r <= 0) return x; } return lista[lista.length - 1]; }
const PESO_GOL = { DC: 5, EI: 3.4, ED: 3.4, MCO: 3, MI: 2, MD: 2, MC: 1.5, MCD: .8, LD: .6, LI: .6, DFC: .6, POR: .02 };
// devuelve lo mismo que el motor (resultadoPartido) para que los modos traten igual un partido jugado o simulado
function simularPartido(M, idL, idV, { neutral = false, onceL, onceV } = {}) {
  const cl = M.clubes[idL], cv = M.clubes[idV];
  onceL = onceL || alineacionDe(M, cl); onceV = onceV || alineacionDe(M, cv);
  const fl = fuerzaDe(M, cl, onceL) + (neutral ? 0 : 2), fv = fuerzaDe(M, cv, onceV);
  const gl = poisson(clamp(1.4 * Math.exp((fl - fv) / 12), .3, 3.4)), gv = poisson(clamp(1.1 * Math.exp((fv - fl) / 12), .25, 3));
  const goles = [], jug = {};
  const prep = (once, lado) => once.filter(id => id != null).forEach(id => { jug[id] = { g: 0, a: 0, nota: 0, lado }; });
  prep(onceL, 0); prep(onceV, 1);
  const anotar = (once, lado, n) => {
    const js = once.filter(id => id != null).map(id => M.jug[id]);
    for (let i = 0; i < n; i++) {
      const autor = elegirPorPeso(js, j => PESO_GOL[j.pos] * (j.at.tir / 70));
      const asis = AZ() < .7 ? elegirPorPeso(js.filter(j => j !== autor), j => (j.at.pas / 70) * (j.pos === 'POR' ? .05 : 1)) : null;
      jug[autor.id].g++; if (asis) jug[asis.id].a++;
      goles.push({ lado, id: autor.id, nombre: autor.nombre, asist: asis ? asis.id : null, min: 1 + Math.floor(AZ() * 90) });
    }
  };
  anotar(onceL, 0, gl); anotar(onceV, 1, gv);
  goles.sort((a, b) => a.min - b.min);
  for (const id in jug) { const r = jug[id], gf = r.lado ? gv : gl, gc = r.lado ? gl : gv; r.nota = Math.round(clamp(6.2 + (AZ() - .5) * 1.6 + r.g + r.a * .5 + (gf > gc ? .4 : gf < gc ? -.4 : 0), 3, 10) * 10) / 10; }
  return { gl, gv, goles, jug, simulado: true };
}
// aplica un resultado al mundo: estadísticas, forma, lesiones y sanciones. Devuelve las novedades (para las noticias)
function aplicarResultado(M, idL, idV, res) {
  const nov = [];
  for (const [cid, lado] of [[idL, 0], [idV, 1]]) {
    const club = M.clubes[cid], gf = lado ? res.gv : res.gl, gc = lado ? res.gl : res.gv;
    for (const j of plantillaDe(M, club)) { // los que estaban fuera cumplen un partido
      if (j.les > 0) { j.les--; if (!j.les) nov.push({ tipo: 'alta', j: j.id }); }
      if (j.san > 0) j.san--;
    }
    for (const id in res.jug) {
      const r = res.jug[id]; if (r.lado !== lado) continue;
      const j = M.jug[id]; if (!j || j.club !== cid) continue;
      j.st.pj++; j.st.g += r.g; j.st.a += r.a;
      j.forma = Math.round(clamp(j.forma * .7 + (40 + r.nota * 6) * .3 + (gf > gc ? 2 : gf < gc ? -2 : 0), 20, 100));
      if (AZ() < .018) { j.les = 1 + Math.floor(AZ() * AZ() * 8); nov.push({ tipo: 'lesion', j: j.id, n: j.les }); }
      else if (AZ() < .006) { j.san = 1; nov.push({ tipo: 'roja', j: j.id }); }
    }
  }
  return nov;
}

/* ---------- calendario y clasificación ---------- */
// liga a doble vuelta (método del círculo): lista de jornadas, cada una con [local, visitante]
function calendarioLiga(ids) {
  const e = ids.slice(); for (let i = e.length - 1; i > 0; i--) { const k = Math.floor(AZ() * (i + 1)); [e[i], e[k]] = [e[k], e[i]]; }
  if (e.length % 2) e.push(null);
  const n = e.length, ida = [];
  for (let r = 0; r < n - 1; r++) {
    const j = [];
    for (let i = 0; i < n / 2; i++) { const a = e[i], b = e[n - 1 - i]; if (a != null && b != null) j.push(r % 2 ? [b, a] : [a, b]); }
    ida.push(j); e.splice(1, 0, e.pop());
  }
  return [...ida, ...ida.map(j => j.map(([a, b]) => [b, a]))];
}
function tablaNueva(ids) { const t = {}; for (const id of ids) t[id] = { id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }; return t; }
function sumarATabla(t, idL, idV, gl, gv) {
  const a = t[idL], b = t[idV]; if (!a || !b) return;
  a.pj++; b.pj++; a.gf += gl; a.gc += gv; b.gf += gv; b.gc += gl;
  if (gl > gv) { a.g++; b.p++; a.pts += 3; } else if (gl < gv) { b.g++; a.p++; b.pts += 3; } else { a.e++; b.e++; a.pts++; b.pts++; }
}
const ordenarTabla = t => Object.values(t).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);

/* ---------- fin de temporada: edad, evolución, retiradas ---------- */
function evolucionarJugadores(M) {
  const retirados = [];
  for (const j of M.jug) {
    if (j.club == null || j.club < 0) continue;
    j.edad++;
    let d;
    if (j.edad <= 23) d = Math.min(j.pot - j.med, 1 + Math.floor(AZ() * 5));
    else if (j.edad <= 29) d = Math.min(Math.max(0, j.pot - j.med), Math.floor(AZ() * 3)) - (AZ() < .2 ? 1 : 0);
    else if (j.edad <= 32) d = -Math.floor(AZ() * 3);
    else d = -1 - Math.floor(AZ() * 4);
    if (j.st.pj > 25 && j.edad < 30) d++;
    fijarMedia(j, j.med + d);
    j.pot = Math.max(j.pot, j.med);
    j.val = valorDe(j);
    j.st = { pj: 0, g: 0, a: 0 };
    if (j.edad >= 35 || (j.edad >= 33 && AZ() < .35)) retirados.push(j);
  }
  // los que se retiran dejan sitio a un juvenil del mismo puesto
  for (const j of retirados) {
    if (j.usuario) continue; // el jugador de la carrera decide él cuándo retirarse
    const club = M.clubes[j.club]; if (!club) continue;
    const liga = ligaDe(M, club.liga);
    club.plantilla = club.plantilla.filter(id => id !== j.id); j.club = -1; j.retirado = true;
    const nuevo = crearJugador(M, { nac: AZ() < .7 ? liga.nac : 'BR', pos: j.pos, med: 48 + club.rep * .2 + AZ() * 8, edad: 17 + Math.floor(AZ() * 3), club: club.id, num: 0, riqueza: liga.riqueza });
    nuevo.num = numeroLibre(M, club, nuevo.pos); nuevo.pot = Math.round(clamp(nuevo.med + 10 + AZ() * 18, nuevo.med, 94));
    club.plantilla.push(nuevo.id);
  }
  M.temporada++;
  return retirados;
}
// mueve un jugador de club (fichajes)
function traspasar(M, jid, clubDestino) {
  const j = M.jug[jid], origen = M.clubes[j.club], destino = M.clubes[clubDestino];
  if (origen) { origen.plantilla = origen.plantilla.filter(id => id !== jid); if (Array.isArray(origen.alineacion)) origen.alineacion = origen.alineacion.map(x => x === jid ? null : x); }
  j.club = clubDestino; destino.plantilla.push(jid); j.num = numeroLibre(M, { plantilla: destino.plantilla.filter(id => id !== jid) }, j.pos);
}
const dinero = n => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.', ',') + ' M€' : Math.round(n / 1000) + ' mil €');
