'use strict';
/* =====================================================================
   PELOTAZO · fútbol de acción en 3D (capa 1: prototipo jugable)
   Secciones: utilidades · equipos · estado del partido · balón ·
   jugadores e IA · controles · reglas básicas · gráficos · interfaz ·
   guardado protegido · arranque
   ===================================================================== */
const JUEGO_VERSION = '0.12.0';

/* ---------- utilidades ---------- */
const PL = 105, PW = 68, HL = PL / 2, HW = PW / 2;     // campo en metros
const GW2 = 3.66, GH = 2.44, BR = 0.11;                // portería (media anchura, altura) y radio del balón
const AREA_D = 16.5, AREA_W2 = 20.16;
const DT = 1 / 60;                                     // paso fijo de la simulación
const GRAV = 9.8, ROCE = 0.6, AIRE = 0.08;             // rozamiento del balón en el suelo y en el aire
let semilla = 20261003;
function rng() { semilla = semilla + 0x6D2B79F5 | 0; let t = Math.imul(semilla ^ semilla >>> 15, 1 | semilla); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rnd = (a, b) => a + (b - a) * rng();
const gauss = () => { let u = 0; while (!u) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hyp = Math.hypot;
const angDif = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
// distancia de un punto a un segmento (para saber si un pase tiene la línea libre)
function distSeg(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / l2, 0, 1);
  return hyp(px - ax - vx * t, pz - az - vz * t);
}

/* ---------- equipos (nombres inventados) ---------- */
const NOMBRES = ['Teo', 'Bruno', 'Iker', 'Mateo', 'Dani', 'Leo', 'Hugo', 'Nico', 'Rafa', 'Tomás', 'Gael', 'Julián', 'Ciro', 'Elías', 'Fausto', 'Lalo', 'Remo', 'Simón', 'Uriel', 'Valen', 'Ximo', 'Yago', 'Abel', 'Íñigo', 'Pau', 'Quique', 'Saúl', 'Tobías'];
const APELLIDOS = ['Arrieta', 'Bustamante', 'Cendoya', 'Duarte', 'Escalona', 'Ferraz', 'Galindo', 'Herrán', 'Ibargüen', 'Jaramillo', 'Lozada', 'Montiel', 'Nájera', 'Olmedo', 'Pizarro', 'Quiroga', 'Robledo', 'Salcedo', 'Tovar', 'Urbina', 'Valdés', 'Zamora', 'Barragán', 'Corvalán', 'Echeverri', 'Fonseca', 'Gamarra', 'Larrea', 'Medrano', 'Ocampo', 'Peñalver', 'Riquelme', 'Sotomayor', 'Taboada', 'Villamil', 'Zubiri'];
const EQUIPOS = [
  { id: 'HAL', nombre: 'Halcones del Norte', camiseta: 0x2f7bff, pantalon: 0xf2f4f8, medias: 0x2f7bff, portero: 0x2bc46a },
  { id: 'TOR', nombre: 'Toros del Valle', camiseta: 0xe8463a, pantalon: 0x20222b, medias: 0xe8463a, portero: 0xffc928 },
];
// Formaciones. fx: de la portería propia (0) a la rival (1); fz: de una banda (-1) a la otra (1).
// p = puesto (para elegir jugadores): POR, LI, DFC, LD, MCD, MC, MCO, MI, MD, EI, DC, ED. El orden es siempre
// portero, defensas, medios, delanteros; el delantero más adelantado saca de centro.
const ROL_DE_PUESTO = { POR: 'POR', LI: 'DEF', DFC: 'DEF', LD: 'DEF', MCD: 'MED', MC: 'MED', MCO: 'MED', MI: 'MED', MD: 'MED', EI: 'DEL', DC: 'DEL', ED: 'DEL' };
const F = (p, fx, fz, n) => ({ p, r: ROL_DE_PUESTO[p], fx, fz, n });
const FORMACIONES = {
  '4-3-3': [F('POR', .03, 0, 1), F('LI', .2, -.72, 3), F('DFC', .17, -.26, 4), F('DFC', .17, .26, 5), F('LD', .2, .72, 2),
    F('MCD', .35, 0, 6), F('MC', .42, -.45, 8), F('MC', .42, .45, 10), F('EI', .6, -.7, 11), F('DC', .66, 0, 9), F('ED', .6, .7, 7)],
  '4-4-2': [F('POR', .03, 0, 1), F('LI', .2, -.72, 3), F('DFC', .17, -.26, 4), F('DFC', .17, .26, 5), F('LD', .2, .72, 2),
    F('MI', .4, -.74, 11), F('MC', .37, -.24, 8), F('MC', .37, .24, 6), F('MD', .4, .74, 7), F('DC', .63, -.2, 9), F('DC', .63, .2, 10)],
  '4-2-3-1': [F('POR', .03, 0, 1), F('LI', .2, -.72, 3), F('DFC', .17, -.26, 4), F('DFC', .17, .26, 5), F('LD', .2, .72, 2),
    F('MCD', .33, -.22, 6), F('MCD', .33, .22, 8), F('EI', .52, -.68, 11), F('MCO', .52, 0, 10), F('ED', .52, .68, 7), F('DC', .66, 0, 9)],
  '3-5-2': [F('POR', .03, 0, 1), F('DFC', .18, -.5, 4), F('DFC', .16, 0, 5), F('DFC', .18, .5, 2),
    F('MI', .4, -.8, 3), F('MC', .35, -.28, 6), F('MCO', .46, 0, 10), F('MC', .35, .28, 8), F('MD', .4, .8, 7), F('DC', .64, -.2, 9), F('DC', .64, .2, 11)],
  '5-3-2': [F('POR', .03, 0, 1), F('LI', .24, -.82, 3), F('DFC', .17, -.42, 4), F('DFC', .15, 0, 5), F('DFC', .17, .42, 6), F('LD', .24, .82, 2),
    F('MC', .4, -.45, 8), F('MCD', .36, 0, 16), F('MC', .4, .45, 10), F('DC', .62, -.2, 9), F('DC', .62, .2, 11)],
};
const FORMACION = FORMACIONES['4-3-3'];
// estilo de juego del equipo: presión (0 baja, 1 media, 2 alta), línea defensiva (0 baja, 1 media, 2 alta) y
// ritmo (0 posesión, 1 mixto, 2 directo). Lo leen puestoEnBloque, planEquipos y mejorPase.
const ESTILO_DEF = { presion: 1, linea: 1, ritmo: 1 };
const PIEL = [0xf1c9a5, 0xd9a27b, 0xb47a4f, 0x8a5636, 0x5e3a24, 0xe8b894];
const PELO = [0x1d1510, 0x3b2516, 0x6b4423, 0xc99b4d, 0x0f0f12, 0x8a2f1a, 0xd8d0c0];

// def (opcional): { id, nombre, corto, camiseta, pantalon, medias, portero, formacion, estilo, jugadores: [11] }
// cada jugador: { id, nombre, nombre1, num, atrib: { vel, pas, tir, def, reg, par } (1-99), piel, pelo, forma }
function crearEquipo(i, def) {
  const E = def ? { id: def.corto || 'EQU', nombre: def.nombre, camiseta: def.camiseta, pantalon: def.pantalon, medias: def.medias, portero: def.portero } : EQUIPOS[i];
  const form = (def && FORMACIONES[def.formacion]) || FORMACION;
  const eq = { i, ...E, dir: i === 0 ? 1 : -1, pl: [], goles: 0, formacion: (def && FORMACIONES[def.formacion]) ? def.formacion : '4-3-3', estilo: { ...ESTILO_DEF, ...(def && def.estilo) }, ref: def || null };
  form.forEach((f, k) => {
    const st = r => clamp(r + rnd(-.12, .12), .3, .98);
    const d = def && def.jugadores && def.jugadores[k];
    const at = d && d.atrib, fm = d ? .95 + clamp(d.forma == null ? 50 : d.forma, 0, 100) * .001 : 1;
    const v = (k2, base) => at ? clamp(at[k2] / 100 * fm, .25, .99) : st(base);
    const p = {
      eq, k, rol: f.r, puesto: f.p, num: d ? d.num : f.n, por: f.r === 'POR', id: d ? d.id : null,
      nombre: d ? d.nombre : APELLIDOS[Math.floor(rng() * APELLIDOS.length)], nombre1: d ? (d.nombre1 || '') : NOMBRES[Math.floor(rng() * NOMBRES.length)],
      vel: v('vel', f.r === 'DEL' ? .78 : f.r === 'DEF' ? .62 : .68), pas: v('pas', f.r === 'MED' ? .8 : .66), tir: v('tir', f.r === 'DEL' ? .78 : f.r === 'MED' ? .64 : .45),
      def: v('def', f.r === 'DEF' ? .8 : f.r === 'MED' ? .64 : .45), reg: v('reg', f.r === 'DEL' ? .75 : .62), par: v('par', .72),
      st: { g: 0, a: 0, tiros: 0, pases: 0, pasesOk: 0, rob: 0 }, pasador: null,
      base: f, x: 0, z: 0, vx: 0, vz: 0, cara: 0, fase: rng() * 6,
      tx: 0, tz: 0, prisa: false,
      entrada: null, entT: 0, entCD: 0, entHecha: false, suelo: 0, tropiezo: 0, protegido: 0, patadaCD: 0, patadaT: 0,
      golpe: null, pie: 1, toqueT: 0, toqueCD: 0, inclLat: 0, frenado: 0, dvx: 0, dvz: 0, qx: 0, qz: 0, energia: 1,
      decT: rng() * .4, desT: rng() * 2, desX: 0, desZ: 0, desmarque: false, retener: 0, estirada: null, celebra: 0,
      piel: d && d.piel != null ? d.piel : PIEL[Math.floor(rng() * PIEL.length)], pelo: d && d.pelo != null ? d.pelo : PELO[Math.floor(rng() * PELO.length)],
    };
    eq.pl.push(p);
  });
  return eq;
}
function posFormacion(eq, fx, fz) { return { x: eq.dir * (-HL + fx * PL), z: fz * HW * .82 * eq.dir }; }
// diferencia entre dos colores (0-441): para cambiar a la segunda equipación si se parecen
function difColor(a, b) { const c = x => [(x >> 16) & 255, (x >> 8) & 255, x & 255], p = c(a), q = c(b); return hyp(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }

/* ---------- estado del partido ---------- */
const G = {
  listo: false, fase: 'menu', pausa: true, t: 0, reloj: 0, eqs: [], todos: [], ctrl: null, posesion: null,
  balon: null, saque: null, muerto: 0, golT: 0, idPatada: 0, buffer: null, carga: null, cambioT: 0, presion: false,
  usuario: 0, autoplay: false, stats: null, pasosPorFrame: 0, frames: 0, ultimoAviso: '',
};
function nuevoBalon() { return { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, dueno: null, tipo: null, destino: null, ultimo: null, pateador: null, id: 0, paraPor: null, batido: null, rotX: 0, rotZ: 0 }; }

/* nuevoPartido(cfg): prepara un partido. cfg puede ser solo una semilla (número) o:
   { semilla, local, visita (definiciones de crearEquipo), usuario: 0 local | 1 visita | -1 nadie (la computadora juega sola),
     jugadorId: id del único jugador que controlas (carrera de jugador), dur (minutos reales), alTerminar(resultado), titulo } */
function nuevoPartido(cfg) {
  if (typeof cfg !== 'object' || cfg === null) cfg = { semilla: cfg };
  if (cfg.semilla != null) semilla = cfg.semilla;
  G.cfg = cfg;
  if ('usuario' in cfg) { G.autoplay = cfg.usuario < 0; G.usuario = cfg.usuario < 0 ? 0 : cfg.usuario; }
  G.eqs = [crearEquipo(0, cfg.local), crearEquipo(1, cfg.visita)];
  const [a, v] = G.eqs; // si las camisetas se parecen, el visitante usa su segunda equipación
  if (difColor(a.camiseta, v.camiseta) < 120 && cfg.visita && cfg.visita.camiseta2 != null) { v.camiseta = cfg.visita.camiseta2; v.pantalon = cfg.visita.pantalon2 ?? v.pantalon; v.medias = cfg.visita.camiseta2; }
  if (difColor(a.camiseta, v.camiseta) < 90) { v.camiseta = difColor(a.camiseta, 0xf4f4f4) > 160 ? 0xf4f4f4 : 0x1b1d24; v.medias = v.camiseta; }
  G.eqs[0].rival = G.eqs[1]; G.eqs[1].rival = G.eqs[0];
  G.todos = [...G.eqs[0].pl, ...G.eqs[1].pl];
  G.unJugador = cfg.jugadorId != null ? G.todos.find(p => p.id === cfg.jugadorId && p.eq.i === G.usuario) || null : null;
  G.balon = nuevoBalon();
  G.reloj = 0; G.t = 0; G.fase = 'juego'; G.parte = 1; G.buffer = null; G.carga = null; G.pidePase = 0; G.goles = [];
  G.stats = { tiros: [0, 0], aPuerta: [0, 0], pos: [0, 0], pases: [0, 0], pasesOk: [0, 0], faltas: [0, 0], amarillas: [0, 0], rojas: [0, 0] };
  G.ctrl = null;
  saqueInicial(G.eqs[0]);
  // empezar a mitad de partido (p. ej. sales del banquillo): { min, gl, gv, goles }
  if (cfg.inicio) {
    const I = cfg.inicio;
    if (I.min >= 45) { G.parte = 2; for (const e of G.eqs) e.dir *= -1; saqueInicial(G.eqs[1]); }
    G.reloj = I.min * 60; G.eqs[0].goles = I.gl || 0; G.eqs[1].goles = I.gv || 0; G.goles = (I.goles || []).slice();
  }
  if (typeof alCambiarEquipos === 'function') alCambiarEquipos();
}
const minutoActual = () => Math.min(90, Math.floor(G.reloj / 60) + 1);
// resultado del partido para los modos de juego
function resultadoPartido(simulado) {
  const nota = (p, eq) => {
    const s = p.st, gf = eq.goles, gc = eq.rival.goles;
    let n = 6 + s.g * 1.1 + s.a * .7 + s.pasesOk * .025 - (s.pases - s.pasesOk) * .07 + s.rob * .18 + s.tiros * .05 + (gf > gc ? .5 : gf < gc ? -.4 : 0);
    if (p.por) n += .5 - gc * .35 + G.stats.aPuerta[1 - eq.i] * .1;
    return Math.round(clamp(n, 3, 10) * 10) / 10;
  };
  const jug = {};
  for (const p of G.todos) if (p.id != null) jug[p.id] = { g: p.st.g, a: p.st.a, nota: nota(p, p.eq), lado: p.eq.i, am: p.am || 0, ro: p.exp ? 1 : 0 };
  return { gl: G.eqs[0].goles, gv: G.eqs[1].goles, goles: G.goles.slice(), stats: JSON.parse(JSON.stringify(G.stats)), jug, simulado: !!simulado };
}
const eqUsuario = () => G.eqs[G.usuario];
// el delantero más adelantado (saca de centro y es el primero que controlas)
const delanteroDe = eq => eq.pl.reduce((m, p) => (!m || p.base.fx > m.base.fx ? p : m), null);
const esUsuario = p => !G.autoplay && p.eq.i === G.usuario;
const porteriaPropiaX = eq => -eq.dir * HL;
const enAreaPropia = (p, x, z) => Math.abs(z) < AREA_W2 && x * p.eq.dir < -HL + AREA_D + .5 && x * p.eq.dir > -HL - 1;
const DIF = [ // fácil, normal, difícil (afecta a la computadora rival)
  { decision: .6, errPase: 1.6, entrada: .65, errTiro: 1.4, parada: -.15, reaccion: .2 },
  { decision: .4, errPase: 1, entrada: 1, errTiro: 1, parada: 0, reaccion: .1 },
  { decision: .25, errPase: .7, entrada: 1.25, errTiro: .8, parada: .08, reaccion: .03 },
];
const dif = eq => (esUsuarioEq(eq) ? DIF[1] : DIF[DATOS.ajustes.dif] || DIF[1]);
const esUsuarioEq = eq => !G.autoplay && eq.i === G.usuario;

/* ---------- balón: predicción de trayectoria ---------- */
const NP = 60, PH = .05;               // 3 s de predicción en pasos de 0,05 s
const PX = new Float32Array(NP), PY = new Float32Array(NP), PZ = new Float32Array(NP);
function predecirBalon() {
  const b = G.balon;
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
  if (b.dueno) { for (let i = 0; i < NP; i++) { PX[i] = b.x; PY[i] = b.y; PZ[i] = b.z; } return; }
  const kS = Math.exp(-ROCE * PH);
  for (let i = 0; i < NP; i++) {
    if (y > BR + .01 || vy > 0) {
      vy -= GRAV * PH; x += vx * PH; y += vy * PH; z += vz * PH;
      if (y < BR) { y = BR; if (vy < -1.2) { vy = -vy * .5; vx *= .88; vz *= .88; } else vy = 0; }
    } else { x += vx * PH; z += vz * PH; vx *= kS; vz *= kS; }
    PX[i] = x; PY[i] = y; PZ[i] = z;
  }
}
// tiempo que tarda un jugador en llegar al balón (y en qué punto)
function intercepcion(p) {
  const sp = velMax(p, true) * .9;
  for (let i = 0; i < NP; i++) {
    if (PY[i] > 1.3) continue;
    const d = Math.max(0, hyp(PX[i] - p.x, PZ[i] - p.z) - .6);
    if (d / sp + .12 <= (i + 1) * PH) return { t: (i + 1) * PH, x: PX[i], z: PZ[i] };
  }
  const d = hyp(PX[NP - 1] - p.x, PZ[NP - 1] - p.z);
  return { t: NP * PH + d / sp, x: PX[NP - 1], z: PZ[NP - 1] };
}

/* ---------- balón: física sencilla ---------- */
function pasoBalon(dt) {
  const b = G.balon;
  if (b.dueno) {
    const o = b.dueno;
    if (o.por && o.retener > 0) { // el portero lo lleva en las manos
      b.x = o.x + Math.cos(o.cara) * .35; b.z = o.z + Math.sin(o.cara) * .35; b.y = 1.05; b.vx = b.vy = b.vz = 0; return;
    }
    conducir(b, o, dt);
    return;
  }
  const ox = b.x;
  b.px = b.x; b.pz = b.z;
  if (!Number.isFinite(b.x + b.y + b.z + b.vx + b.vy + b.vz)) { // red de seguridad: nunca dejar el balón con valores rotos
    console.warn('balón con valores no válidos: se corrige');
    Object.assign(b, { x: Number.isFinite(b.x) ? b.x : 0, y: BR, z: Number.isFinite(b.z) ? b.z : 0, vx: 0, vy: 0, vz: 0, tipo: null, destino: null });
  }
  if (b.destino && (b.tipo === 'pase' || (b.tipo === 'largo' && b.vy < 0))) guiarPase(b, dt);
  if (b.y > BR + .01 || b.vy > 0) {
    b.vy -= GRAV * dt; const k = Math.exp(-AIRE * dt); b.vx *= k; b.vz *= k;
  } else {
    const k = Math.exp(-ROCE * dt); b.vx *= k; b.vz *= k;
    if (hyp(b.vx, b.vz) < .2) { b.vx = 0; b.vz = 0; }
  }
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.y < BR) { b.y = BR; if (b.vy < -1.2) { suena('bote', -b.vy); b.vy = -b.vy * .5; b.vx *= .88; b.vz *= .88; } else b.vy = 0; }
  b.rotX += b.vz * dt / BR; b.rotZ -= b.vx * dt / BR;
  // postes y larguero
  if (Math.abs(b.x) > HL - .3 && Math.abs(b.x) < HL + .3 && Math.abs(ox) <= HL) {
    const az = Math.abs(b.z);
    if (b.y < GH + BR && Math.abs(az - GW2) < BR + .07) { b.vx *= -.55; b.vz += (b.z > 0 ? 1 : -1) * (az > GW2 ? 1.5 : -1.5); b.x = Math.sign(b.x) * (HL - .3); aviso('¡Al palo!', '', 1, true); suena('palo'); }
    else if (az < GW2 && Math.abs(b.y - GH) < BR + .06) { b.vx *= -.5; b.vy = Math.abs(b.vy) * .6 + 1; b.x = Math.sign(b.x) * (HL - .3); aviso('¡Al larguero!', '', 1, true); suena('palo'); }
  }
  // dentro de la red: se frena
  if (G.fase === 'gol') {
    const s = Math.sign(b.x);
    if (Math.abs(b.x) > HL + 1.7) { b.x = s * (HL + 1.7); b.vx *= -.15; }
    if (Math.abs(b.z) > GW2 - .1 && Math.abs(b.x) > HL) { b.z = Math.sign(b.z) * (GW2 - .1); b.vz *= -.2; }
    if (b.y > GH - .1 && Math.abs(b.x) > HL) { b.y = GH - .1; b.vy = -Math.abs(b.vy) * .2; }
  }
}

// asistencia: gira un poco la dirección del pase hacia el compañero (como en las consolas, sin que se note mucho)
const GUIA_PASE = { pase: .9, largo: .45 };   // radianes por segundo que puede girar
function guiarPase(b, dt) {
  const m = b.destino, v = hyp(b.vx, b.vz);
  if (v < 2) return;
  const tx = m.x + m.vx * .15, tz = m.z + m.vz * .15, d = hyp(tx - b.x, tz - b.z);
  if (d < 1.2) return;
  const dif = angDif(Math.atan2(b.vz, b.vx), Math.atan2(tz - b.z, tx - b.x));
  if (Math.abs(dif) > .7) return; // si el pase salió muy desviado, no se corrige
  const g = clamp(dif, -GUIA_PASE[b.tipo] * dt, GUIA_PASE[b.tipo] * dt), a = Math.atan2(b.vz, b.vx) + g;
  b.vx = Math.cos(a) * v; b.vz = Math.sin(a) * v;
}

// patear el balón
// sonidos del partido (solo durante un partido de verdad, no con el estadio de fondo de los menús)
function suena(nombre, ...a) { if (typeof SFX !== 'undefined' && !document.body.classList.contains('en-menu')) SFX[nombre](...a); }
function patear(p, vx, vy, vz, tipo, destino) {
  suena('patada', clamp(hyp(vx, vy, vz) / 30, .15, 1));
  const b = G.balon;
  if (b.dueno && b.dueno !== p) return;
  b.dueno = null; b.vx = vx; b.vy = vy; b.vz = vz; b.tipo = tipo; b.destino = destino || null;
  b.ultimo = p; b.pateador = p; b.id = ++G.idPatada; b.paraPor = null; b.batido = null;
  if (b.y < BR) b.y = BR;
  p.patadaCD = .28; p.retener = 0;
  if (p.patadaT <= 0) { p.patadaT = DUR_PATADA * .7; p.pie = ladoBalon(p); }   // golpeo sin preparación (de primera)
  for (const q of G.todos) q.recibe = null;
  if (G.saque) G.saque = null;
  if (esUsuario(p)) vibrar(12);
}
function tomar(p) {
  const b = G.balon;
  const cambio = G.posesion !== p.eq;
  b.dueno = p; b.tipo = null; b.ultimo = p; b.paraPor = null; b.batido = null;
  if (b.destino === p && b.pateador && b.pateador.eq === p.eq) { G.stats.pasesOk[p.eq.i]++; b.pateador.st.pasesOk++; }
  if (b.pateador && b.pateador.eq === p.eq && b.pateador !== p && (b.tipo === 'pase' || b.tipo === 'largo')) { p.pasador = b.pateador; p.pasadorT = G.t; }
  else if (b.pateador !== p) p.pasador = null;
  b.destino = null; p.recibe = null; p.protegido = .4;
  if (hyp(b.x - p.x, b.z - p.z) > 1.2) { b.x = p.x + Math.cos(p.cara) * .45; b.z = p.z + Math.sin(p.cara) * .45; b.vx = b.vz = 0; } // por si se le da el balón a distancia
  else { // primer toque: amortigua el balón; queda algo de su velocidad (más si llega fuerte o el jugador controla peor)
    const rvx = b.vx - p.vx, rvz = b.vz - p.vz, llega = hyp(rvx, rvz);
    const resto = clamp(.22 - p.reg * .18 + llega / 90, .03, .3);
    b.vx = p.vx + rvx * resto; b.vz = p.vz + rvz * resto; b.vy = 0; if (b.y > BR) b.y = BR;
  }
  p.toqueCD = .12;
  if (cambio && p.eq !== eqUsuario()) G.perdidaT = G.t;
  G.posesion = p.eq;
  if (p.por && enAreaPropia(p, b.x, b.z) && (cambio || b.pateador?.eq !== p.eq)) { p.retener = 1.1; b.y = 1.05; }
  if (esUsuarioEq(p.eq) && !p.por) controlar(p);
  // acción preparada antes de recibir (pase o tiro de primera)
  if (G.ctrl === p && G.buffer && G.t - G.buffer.t < .7) {
    const a = G.buffer; G.buffer = null;
    // tiro de primera: si ya soltaste el botón sale con la fuerza cargada (mínimo media); si no, sigue cargando
    if (a.a === 'shot') { if (!ENT.shot) disparar(p, a.pot || .45, a.ax || 0, a.az || 0); else G.carga = { t: a.carga || 0 }; }
    else pasar(p, a.dx, a.dz, a.a === 'long' ? 'largo' : 'corto');
  } else if (G.ctrl === p) G.buffer = null;
}

/* ---------- pases y tiros ---------- */
function lineaLibre(ax, az, bx, bz, rivales, vBalon = 0) {
  // margen (en metros) que le queda al rival mejor colocado para cortar el pase; con vBalon tiene en cuenta
  // cuánto tarda el balón en llegar a la altura de cada rival
  let m = 6;
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1, L = Math.sqrt(l2);
  for (const o of rivales.pl) {
    const t = clamp(((o.x - ax) * vx + (o.z - az) * vz) / l2, 0, 1);
    let d = hyp(o.x - ax - vx * t, o.z - az - vz * t);
    if (vBalon > 0) d -= (t * L / vBalon) * 3.2;
    if (d < m) m = d;
  }
  return m;
}
// asistencia de pase: busca al compañero que mejor encaja con la dirección del control.
// Gana sobre todo el que está más cerca de esa dirección (ángulo); la distancia y la línea libre desempatan.
const CONO_PASE = 1.45;       // radianes (~83°) a cada lado de donde apuntas en los que se busca compañero
function elegirReceptor(p, dx, dz, tipo) {
  let mejor = null, ms = -1e9;
  for (const m of p.eq.pl) {
    if (m === p || (m.por && tipo === 'largo')) continue;
    const lx = m.x + m.vx * .3, lz = m.z + m.vz * .3, vx = lx - p.x, vz = lz - p.z, d = hyp(vx, vz);
    if (d < 2.5 || d > (tipo === 'largo' ? 75 : 48)) continue;
    const ang = Math.acos(clamp((vx * dx + vz * dz) / d, -1, 1));
    if (ang > CONO_PASE) continue;
    const libre = Math.min(3, lineaLibre(p.x, p.z, lx, lz, p.eq.rival, tipo === 'largo' ? 0 : 16));
    const s = -ang * 2.8 - d * (tipo === 'largo' ? .008 : .022) + libre * .22 - (m.por ? .8 : 0);
    if (s > ms) { ms = s; mejor = m; }
  }
  return mejor;
}
function pasar(p, dx, dz, tipo) {
  const l = hyp(dx, dz);
  if (l < .2) { dx = Math.cos(p.cara); dz = Math.sin(p.cara); } else { dx /= l; dz /= l; }
  const m = elegirReceptor(p, dx, dz, tipo);
  if (m) pasarA(p, m, tipo);
  else { // pase al espacio
    const d = tipo === 'largo' ? 30 : 14;
    lanzarPase(p, clamp(p.x + dx * d, -HL + 1, HL - 1), clamp(p.z + dz * d, -HW + 1, HW - 1), tipo, null);
  }
}
function pasarA(p, m, tipo) {
  // adelantar el pase a donde va a estar el compañero
  let ax = m.x, az = m.z, t = .5;
  // adelanto pequeño: el pase va al pie, salvo el pase largo a un compañero que se desmarca
  const adelanto = tipo === 'largo' ? (m.desmarque ? 1.05 : .8) : .45;
  for (let it = 0; it < 3; it++) {
    const d = hyp(ax - p.x, az - p.z);
    t = tipo === 'largo' ? .9 + d * .03 : Math.log((d * ROCE + llegada(p)) / llegada(p)) / ROCE;
    ax = m.x + m.vx * t * adelanto; az = m.z + m.vz * t * adelanto;
  }
  ax = clamp(ax, -HL + .8, HL - .8); az = clamp(az, -HW + .8, HW - .8);
  lanzarPase(p, ax, az, tipo, m);
}
const llegada = p => 6.5 + p.pas * 2.5;           // velocidad con la que llega un pase raso
function lanzarPase(p, tx, tz, tipo, m) {
  const b = G.balon, d = hyp(tx - b.x, tz - b.z);
  const err = (.015 + (1 - p.pas) * .06) * dif(p.eq).errPase * (hyp(p.vx, p.vz) > 7 ? 1.4 : 1);
  const ang = Math.atan2(tz - b.z, tx - b.x) + gauss() * err;
  G.stats.pases[p.eq.i]++; p.st.pases++;
  if (tipo === 'largo') {
    const T = .9 + d * .03, dd = d * (1 + gauss() * err * .5);
    const vh = dd / T * (1 + AIRE * T * .5);
    patear(p, Math.cos(ang) * vh, GRAV * T / 2, Math.sin(ang) * vh, 'largo', m);
  } else {
    const v0 = Math.min(32, llegada(p) + ROCE * d);
    patear(p, Math.cos(ang) * v0, 0, Math.sin(ang) * v0, 'pase', m);
  }
  p.cara = ang;
  if (m) { m.recibe = { x: tx, z: tz }; if (esUsuarioEq(p.eq)) { controlar(m); G.recepcion = G.t; } }
}
// potencia de 0 a 1; (ax, az) = dirección del control para apuntar (puede ser 0)
function disparar(p, pot, ax, az) {
  const eq = p.eq, gx = eq.dir * HL, gk = eq.rival.pl[0], b = G.balon;
  let zt;
  if (Math.abs(az) > .3) zt = Math.sign(az) * (GW2 - .75) * Math.min(1, Math.abs(az) * 1.25);
  else zt = (gk.z > 0 ? -1 : 1) * (GW2 - 1.1);
  let yt = .3 + pot * 1.35 + (pot > .86 ? (pot - .86) * 9 : 0);
  const d = hyp(gx - b.x, zt - b.z);
  const err = (.2 + d * .03) * (1.25 - p.tir) * (hyp(p.vx, p.vz) > 7 ? 1.3 : 1) * dif(eq).errTiro;
  zt += gauss() * err; yt = Math.max(.2, yt + gauss() * err * .5);
  const sp = 17 + pot * 13 + p.tir * 3, T = d / sp;
  const vy = (yt - BR) / T + GRAV * T / 2, c = 1 + AIRE * T * .5;
  p.cara = Math.atan2(zt - b.z, gx - b.x);
  patear(p, (gx - b.x) / T * c, vy, (zt - b.z) / T * c, 'tiro', null);
  G.stats.tiros[eq.i]++; p.st.tiros++;
  reaccionPortero(eq.rival);
}
// el portero decide si llega al tiro
// Se calcula dónde pasa el balón por la altura del portero (no por la línea de gol) y si le da tiempo a llegar.
// Siempre hay algo de suerte: a veces para uno imposible y a veces se le escapa uno fácil.
function reaccionPortero(eq) {
  const gk = eq.pl[0], b = G.balon, s = Math.sign(porteriaPropiaX(eq));
  predecirBalon();
  let cg = -1, ck = -1;
  for (let i = 0; i < NP; i++) {
    if (ck < 0 && (PX[i] - gk.x) * s >= 0) ck = i;
    if (PX[i] * s >= HL - .05) { cg = i; break; }
  }
  if (cg < 0) return;
  if (Math.abs(PZ[cg]) > GW2 + .2 || PY[cg] > GH + .2) return; // va fuera: no hace falta pararlo
  G.stats.aPuerta[1 - eq.i]++;
  if (ck < 0) ck = cg;
  const zk = PZ[ck], yk = PY[ck], Tk = (ck + 1) * PH;
  const reac = .13 + (1 - gk.par) * .1 + rnd(0, .07);
  const lat = Math.abs(zk - gk.z), cuerpo = .85;
  // alcance = cuerpo + lo que se desplaza tras reaccionar + el estirón final de la estirada
  const alcance = cuerpo + Math.max(0, Tk - reac) * 9 + (Tk > reac ? .8 : 0);
  const vel = hyp(b.vx, b.vz);
  let prob;
  if (lat <= cuerpo && yk < 2.1) prob = .82;                                  // le pega casi al cuerpo
  else if (lat <= alcance) prob = .74 - .42 * (lat - cuerpo) / Math.max(.1, alcance - cuerpo);
  else prob = .06;                                                            // imposible... casi siempre
  if (yk > 1.6 && lat > 1.3) prob -= .14;                                     // arriba, a la escuadra
  if (yk < .45 && lat > 1.6) prob -= .06;                                     // raso y ajustado al palo
  prob += -Math.max(0, vel - 22) * .012 + (gk.par - .7) * .35 + dif(eq).parada + rnd(-.1, .1);
  const para = rng() < clamp(prob, .03, .93);
  const lado = Math.sign(zk - gk.z) || 1;
  let llegaZ = para ? zk : gk.z + (zk - gk.z) * rnd(.35, .7);
  if (!para && lat <= cuerpo) llegaZ = gk.z - lado * rnd(.6, 1.2);          // se lanzó al otro lado
  gk.estirada = { z: clamp(llegaZ, -GW2 - .6, GW2 + .6), y: yk, t: 0, reac, T: Tk, lado: Math.sign(llegaZ - gk.z) || lado, para };
  if (para) b.paraPor = gk; else b.batido = gk;
}

/* ---------- jugadores: movimiento ---------- */
// velocidad máxima: el sprint depende de la energía que le quede (resistencia: ver moverJugador)
function velMax(p, sprint) {
  const e = p.energia == null ? 1 : p.energia;
  return (5.6 + p.vel * 1.6) * (sprint ? 1 + .3 * (.35 + .65 * e) : 1) * (G.balon && G.balon.dueno === p ? .9 : 1) * (p.tropiezo > 0 ? .5 : 1);
}
function moverHacia(p, tx, tz, sprint, frenar = true) {
  const dx = tx - p.x, dz = tz - p.z, d = hyp(dx, dz);
  if (d < .25) return [0, 0];
  const v = Math.min(velMax(p, sprint), frenar ? d * 2.4 : 99);
  return [dx / d * v, dz / d * v];
}
function moverJugador(p, dvx, dvz, dt) {
  let giroV = 0, frena = 0;
  if (p.suelo > 0) { dvx = dvz = 0; }
  if (p.entrada) { const k = Math.exp(-(p.entrada === 'barrida' ? 2.2 : 5) * dt); p.vx *= k; p.vz *= k; }
  else if (p.suelo > 0) { p.vx *= Math.exp(-8 * dt); p.vz *= Math.exp(-8 * dt); }
  else {
    const b = G.balon, conduce = b.dueno === p && !(p.por && p.retener > 0) && !(G.saque && G.saque.tomador === p);
    let ds = hyp(dvx, dvz);
    // hacia dónde QUIERE ir el jugador (el control o la IA). Se guarda aparte porque abajo la dirección de carrera
    // puede desviarse para ir a buscar el balón; el toque siguiente tiene que ir hacia aquí (ver conducir)
    p.qx = dvx; p.qz = dvz;
    if (conduce && ds > .3 && hyp(b.x - p.x, b.z - p.z) > .9) {
      // el balón se le adelantó: va a buscarlo colocándose detrás de él respecto a donde quiere ir
      // (si lo tiene al alcance del pie no hace falta: el toque lo lleva hacia el nuevo lado, ver conducir)
      const ux = dvx / ds, uz = dvz / ds;
      const ax = b.x + b.vx * .12 - ux * .42 - p.x, az = b.z + b.vz * .12 - uz * .42 - p.z, d = hyp(ax, az);
      if (d > .25) {
        const m = clamp((d - .25) / .8, 0, .85), nx = ux * (1 - m) + ax / d * m, nz = uz * (1 - m) + az / d * m, l = hyp(nx, nz) || 1;
        dvx = nx / l * ds; dvz = nz / l * ds;
      }
    }
    p.dvx = dvx; p.dvz = dvz;
    const sp = hyp(p.vx, p.vz); ds = hyp(dvx, dvz);
    if (sp < .8 || ds < .2) {
      // parado o casi parado: los primeros pasos son rápidos en cualquier dirección
      const ax = dvx - p.vx, az = dvz - p.vz, a = hyp(ax, az), acel = 20 * dt;
      if (a > acel) { p.vx += ax / a * acel; p.vz += az / a * acel; } else { p.vx = dvx; p.vz = dvz; }
      frena = Math.max(0, sp - ds) * 4;
    } else {
      // en carrera: cuanto más rápido, más abierto el giro; un cambio de dirección brusco obliga a frenar antes
      const ang = Math.atan2(p.vz, p.vx), dif = angDif(ang, Math.atan2(dvz, dvx));
      const giroMax = 13 / (1 + sp * .32) * (conduce ? .85 : 1) * dt;
      // media vuelta corriendo: primero clava los pies y frena en línea recta, luego gira
      const g = Math.abs(dif) > 2.2 && sp > 2.5 ? 0 : clamp(dif, -giroMax, giroMax);
      let objetivo = ds * clamp(1 - (Math.abs(dif) - .5) / 1.6, .12, 1);
      if (conduce) { // con el balón, un giro cerrado obliga a frenar para tocarlo hacia el nuevo lado...
        const difQ = Math.abs(angDif(ang, Math.atan2(p.qz, p.qx))), db = hyp(b.x - p.x, b.z - p.z);
        // ...pero solo cuando ya casi lo toca: si el balón se le adelantó, primero corre más que él para alcanzarlo
        if (difQ > .45) {
          const alcance = .75 + sp * .045, vb = b.vx * Math.cos(ang) + b.vz * Math.sin(ang);
          const frenar = ds * clamp(1 - (difQ - .45) / 1.7, .32, 1);
          objetivo = Math.min(objetivo, db < alcance ? frenar : Math.max(frenar, vb + 1.6));
        }
      }
      // acelerar cuesta más cerca de la velocidad máxima (el sprint se nota como un cambio de ritmo)
      // frenar también cuesta: más cuanto más rápido va (unos 0,4 s para pararse desde el sprint)
      const vmax = velMax(p, true), acel = objetivo > sp ? 6 + 16 * Math.max(0, 1 - sp / vmax) : 30 - 13 * Math.min(1, sp / vmax);
      const nsp = objetivo > sp ? Math.min(objetivo, sp + acel * dt) : Math.max(objetivo, sp - acel * dt);
      p.vx = Math.cos(ang + g) * nsp; p.vz = Math.sin(ang + g) * nsp;
      giroV = g / dt; frena = (sp - nsp) / dt;
    }
  }
  // inclinaciones del cuerpo para la animación: hacia dentro en las curvas y hacia atrás al frenar
  const spn = hyp(p.vx, p.vz), kk = Math.min(1, dt * 9);
  p.inclLat += (clamp(giroV * spn * .035, -.38, .38) - p.inclLat) * kk;
  p.frenado += (clamp(frena * .018, 0, .22) - p.frenado) * kk;
  p.x += p.vx * dt; p.z += p.vz * dt;
  p.x = clamp(p.x, -HL - 4, HL + 4); p.z = clamp(p.z, -HW - 3, HW + 3);
  const sp = hyp(p.vx, p.vz);
  if (!p.entrada && p.suelo <= 0) {
    let objetivo = null;
    if (sp > .5) objetivo = Math.atan2(p.vz, p.vx);
    else if (p.mirar != null) objetivo = p.mirar;
    if (objetivo != null) {
      const giro = (G.balon.dueno === p ? 11 : 14) * dt, d = angDif(p.cara, objetivo);
      p.cara += clamp(d, -giro, giro);
    }
  }
  p.mirar = null;
  p.fase += sp * dt * 2.1;
  // resistencia: esprintar gasta energía y trotar o estar quieto la recupera
  const trote = 5.6 + p.vel * 1.6;
  if (p.energia == null) p.energia = 1;
  p.energia = clamp(p.energia + (sp > trote * 1.04 ? -.055 * (1.3 - p.vel * .4) : sp > trote * .7 ? .02 : .05) * dt, 0, 1);
}
function separar() {
  const T = G.todos;
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    const a = T[i], b = T[j], dx = b.x - a.x, dz = b.z - a.z, d = hyp(dx, dz);
    if (a.exp || b.exp) continue;
    if (d > 0 && d < .75) { const e = (.75 - d) / 2 / d; a.x -= dx * e; a.z -= dz * e; b.x += dx * e; b.z += dz * e; }
  }
}

/* ---------- conducción: el balón rueda de verdad y el jugador lo empuja con toques ----------
   Despacio: toques cortos, el balón cerca del pie. Corriendo: toques largos, el balón se adelanta (y un rival
   puede quitártelo, ver robarToque). Para girar, el jugador rodea el balón y lo toca hacia el nuevo lado. */
function ladoBalon(p) { // 1 = el balón está a su derecha (golpea con la derecha), 0 = izquierda
  const b = G.balon, fx = Math.cos(p.cara), fz = Math.sin(p.cara);
  return ((b.x - p.x) * -fz + (b.z - p.z) * fx) >= 0 ? 1 : 0;
}
function conducir(b, o, dt) {
  b.px = b.x; b.pz = b.z;
  const sp = hyp(o.vx, o.vz), fx = Math.cos(o.cara), fz = Math.sin(o.cara);
  const rx = b.x - o.x, rz = b.z - o.z, dist = hyp(rx, rz);
  o.toqueCD -= dt;
  const quieto = sp < .9 && hyp(o.qx, o.qz) < .5;
  if (quieto || (G.saque && G.saque.tomador === o)) {
    // parado: lo sujeta con la suela delante del pie
    b.vx = (o.x + fx * .42 - b.x) * 8; b.vz = (o.z + fz * .42 - b.z) * 8;
  } else {
    const dd = hyp(o.qx, o.qz);
    let ux = dd > .1 ? o.qx / dd : fx, uz = dd > .1 ? o.qz / dd : fz;
    // cerca de las líneas el toque se da hacia dentro para no regalar el balón (salvo que vaya hacia la portería)
    if (Math.abs(b.z) > HW - 6 && uz * Math.sign(b.z) > 0) { uz *= clamp((HW - 1.5 - Math.abs(b.z)) / 4.5, 0, 1); const l = hyp(ux, uz) || 1; ux /= l; uz /= l; }
    if (Math.abs(b.x) > HL - 6 && ux * Math.sign(b.x) > 0 && Math.abs(b.z) > GW2 + 2) { ux *= clamp((HL - 1.5 - Math.abs(b.x)) / 4.5, 0, 1); const l = hyp(ux, uz) || 1; ux /= l; uz /= l; }
    const bv = hyp(b.vx, b.vz), mismaDir = bv < .3 ? -1 : (b.vx * ux + b.vz * uz) / bv;
    const delante = rx * ux + rz * uz;
    const hace = (b.vx * ux + b.vz * uz) < sp * 1.02 || delante < .3 || mismaDir < .8;
    if (dist < .75 + sp * .06 && o.toqueCD <= 0 && hace) {
      // toque para cambiar de dirección: el balón iba hacia otro lado, o está quieto pero no delante (arrastre con la suela)
      const giro = bv > .3 ? mismaDir < .7 : delante < .2;
      const sprint = sp > velMax(o, false) * 1.05;
      // media vuelta corriendo: pisa el balón para frenarlo y se da la vuelta con él (no lo manda lejos hacia atrás)
      const pisa = giro && sp > 3.2 && (bv > .3 ? mismaDir < -.2 : delante < -.2);
      const v = pisa ? .8 : giro ? clamp(sp, 2.5, 4.5) + 1.2 : sp * (sprint ? 1.12 : 1.15) + (sprint ? .7 : .45);
      b.vx = ux * v; b.vz = uz * v;
      o.toqueCD = giro ? .26 : clamp(.36 - sp * .02, .18, .36);
      o.toqueT = .2; o.pie = ladoBalon(o); b.toque = (b.toque || 0) + 1;
      if (giro) { o.vx *= .8; o.vz *= .8; }
    }
  }
  const k = Math.exp(-ROCE * dt); b.vx *= k; b.vz *= k;
  b.x += b.vx * dt; b.z += b.vz * dt; b.y = BR; b.vy = 0;
  b.rotX += b.vz * dt / BR; b.rotZ -= b.vx * dt / BR;
  if (dist > 3.5) { b.dueno = null; b.tipo = 'suelto'; if (G.ctrl === o) G.carga = null; } // se le escapó
}
// un rival se mete entre el jugador y un balón que se le adelantó
function robarToque() {
  const b = G.balon, o = b.dueno;
  if ((o.por && o.retener > 0) || o.protegido > 0) return;
  const dDueno = hyp(o.x - b.x, o.z - b.z);
  if (dDueno < .6) return; // pegado al pie: para quitárselo hace falta una entrada
  for (const r of o.eq.rival.pl) {
    if (r.suelo > 0 || r.entrada || (r.por && !enAreaPropia(r, b.x, b.z))) continue;
    const d = hyp(r.x - b.x, r.z - b.z);
    if (d > .75 || d > dDueno - .15 || r.fallo === 't' + b.toque) continue;
    r.fallo = 't' + b.toque;
    if (rng() < .35 + r.def * .35 + (dDueno - .6) * .15) { o.tropiezo = .3; b.dueno = null; tomar(r); return; }
  }
}
// golpeo con el pie: la pierna se prepara y el balón sale cuando el pie llega a él
const DUR_PATADA = .3, PREPARA_GOLPE = .08;
function golpear(p, fn, espera = PREPARA_GOLPE) {
  if (p.golpe || G.balon.dueno !== p) return false;
  p.golpe = { t: 0, espera, fn }; p.patadaT = DUR_PATADA; p.pie = ladoBalon(p);
  return true;
}
function pasoGolpe(p, dt) {
  const g = p.golpe, b = G.balon;
  if (!g) return;
  if (b.dueno !== p) { p.golpe = null; return; }
  g.t += dt;
  const enManos = p.por && p.retener > 0;
  if (g.t >= g.espera && (enManos || hyp(b.x - p.x, b.z - p.z) < 1.15)) { p.golpe = null; g.fn(); }
  else if (g.t > 1.2) p.golpe = null;                  // no llegó a alcanzar el balón
  else if (g.t >= g.espera) p.patadaT = Math.max(p.patadaT, DUR_PATADA * .72); // espera con la pierna preparada
}

/* ---------- entradas ---------- */
function hacerEntrada(p, tipo) {
  if (p.entrada || p.entCD > 0 || p.suelo > 0 || p.por) return;
  const b = G.balon;
  p.entrada = tipo; p.entT = 0; p.entHecha = false; p.entCD = tipo === 'barrida' ? 1.2 : .55;
  let a = p.cara;
  if (hyp(b.x - p.x, b.z - p.z) < 5) a = Math.atan2(b.z - p.z, b.x - p.x);
  p.cara = a;
  const s = tipo === 'barrida' ? 9.5 : 6.5;
  p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s;
}
function pasoEntrada(p, dt) {
  if (!p.entrada) return;
  p.entT += dt;
  const barr = p.entrada === 'barrida', dur = barr ? .55 : .3;
  const b = G.balon, o = b.dueno;
  if (!p.entHecha && b.y < .8) {
    const pie = barr ? .85 : .6, fx = p.x + Math.cos(p.cara) * pie, fz = p.z + Math.sin(p.cara) * pie;
    const d = hyp(b.x - fx, b.z - fz);
    if (d < (barr ? 1.05 : .8)) {
      p.entHecha = true;
      if (!o) { // balón suelto: lo toca
        if (barr) { patear(p, Math.cos(p.cara) * 7, .5, Math.sin(p.cara) * 7, 'rechace'); }
        else if (p.patadaCD <= 0) tomar(p);
      } else if (o.eq !== p.eq && !(o.por && o.retener > 0) && o.protegido <= 0) {
        const f = dif(p.eq).entrada;
        const prob = (barr ? .72 + p.def * .22 - o.reg * .2 : .5 + p.def * .35 - o.reg * .25) * f;
        const gana = rng() < prob;
        // ¿falta? Por detrás es casi siempre falta; la barrida fallida también; una entrada limpia casi nunca
        const ax = o.x - p.x, az = o.z - p.z, ll = hyp(ax, az) || 1, detras = (Math.cos(o.cara) * ax + Math.sin(o.cara) * az) / ll > .5;
        let pf = detras ? (barr ? .85 : gana ? .3 : .65) : barr ? (gana ? .1 : .55) : (gana ? .025 : .2);
        pf *= (1.2 - p.def * .4) * 1.6;
        if (G.muerto <= 0 && G.fase === 'juego' && rng() < pf) { cometerFalta(p, o, barr, detras); return; }
        if (gana) {
          o.tropiezo = .45; G.carga = G.ctrl === o ? null : G.carga; p.st.rob++;
          if (!barr && rng() < .55) { b.dueno = null; tomar(p); }
          else { b.dueno = null; patear(p, Math.cos(p.cara) * rnd(4, 7), .3, Math.sin(p.cara) * rnd(4, 7), 'rechace'); p.patadaCD = .35; }
        }
      }
    }
  }
  if (p.entT >= dur) { p.entrada = null; if (barr) p.suelo = .5; }
}

/* ---------- faltas, tarjetas y expulsiones ---------- */
const TARJ = { am: '<i class="tarj"></i>', ro: '<i class="tarj rj"></i>' };
// p derriba a o: el árbitro pita, quizá saca tarjeta y se cobra tiro libre (o penalti si fue en el área)
function cometerFalta(p, o, barr, detras) {
  G.stats.faltas[p.eq.i]++;
  o.tropiezo = .6; p.entrada = null; p.suelo = Math.max(p.suelo, barr ? .5 : 0);
  G.carga = G.ctrl === o ? null : G.carga;
  const penalti = enAreaPropia(p, o.x, o.z);
  const grave = detras && barr ? 1 : detras || barr ? .5 : .15;
  const r = rng();
  let tarjeta = null;
  if (r < grave * .04) tarjeta = 'ro'; else if (r < grave * .04 + grave * .5 + .05) tarjeta = 'am';
  const x = clamp(o.x, -HL + .5, HL - .5), z = clamp(o.z, -HW + .5, HW - .5);
  fueraDeJuego(penalti ? 'penalti' : 'falta', o.eq, x, z, penalti ? 'Penalti' : 'Falta');
  G.muerto = tarjeta ? 2.4 : 1.5;
  if (tarjeta) sacarTarjeta(p, tarjeta);
}
function sacarTarjeta(p, tarjeta) {
  const nom = `${p.num} · ${p.nombre}`;
  if (tarjeta === 'am') { p.am = (p.am || 0) + 1; G.stats.amarillas[p.eq.i]++; }
  if (tarjeta === 'ro' || p.am >= 2) {
    if (tarjeta !== 'ro') G.stats.amarillas[p.eq.i]--; // la segunda amarilla cuenta como roja
    G.stats.rojas[p.eq.i]++;
    aviso(TARJ.ro + 'Tarjeta roja', (tarjeta === 'ro' ? '' : 'Doble amarilla · ') + nom, 2.2);
    expulsar(p);
  } else aviso(TARJ.am + 'Tarjeta amarilla', nom, 1.8);
  suena('silbato', 'corto');
}
// el expulsado se va del campo: sale de la plantilla en juego pero sigue en G.todos (para los gráficos y las estadísticas)
function expulsar(p) {
  p.exp = true; p.golpe = null; p.entrada = null;
  const eq = p.eq, i = eq.pl.indexOf(p);
  if (i >= 0) eq.pl.splice(i, 1);
  if (G.ctrl === p && !G.unJugador) {
    const b = G.balon, c = eq.pl.filter(q => !q.por).sort((q, w) => hyp(q.x - b.x, q.z - b.z) - hyp(w.x - b.x, w.z - b.z))[0];
    if (c) { G.ctrl = null; controlar(c); }
  }
}
// barrera y cobrador de un tiro libre; se colocan al reanudar
function prepararFalta(t, eq, x, z) {
  const gx = eq.dir * HL, d = hyp(gx - x, -z);
  if (d > 34 || (x - gx) * eq.dir > -3) return null;
  const n = d < 20 ? 4 : d < 28 ? 3 : 2, ux = (gx - x) / d, uz = -z / d;
  const rival = eq.rival, cand = rival.pl.filter(q => !q.por).sort((q, w) => hyp(q.x - x - ux * 9.4, q.z - z - uz * 9.4) - hyp(w.x - x - ux * 9.4, w.z - z - uz * 9.4)).slice(0, n);
  const muro = cand.map((q, k) => ({ p: q, x: x + ux * 9.4 - uz * ((k - (n - 1) / 2) * .78), z: z + uz * 9.4 + ux * ((k - (n - 1) / 2) * .78) }));
  for (const m of muro) { m.p.x = m.x; m.p.z = m.z; m.p.vx = m.p.vz = 0; m.p.cara = Math.atan2(-uz, -ux); }
  return muro;
}

/* ---------- inteligencia artificial ---------- */
// posición del bloque del equipo según dónde esté el balón
function puestoEnBloque(p) {
  const eq = p.eq, propio = G.posesion === eq, b = G.balon;
  const bx = (eq.dir * b.x + HL) / PL;
  const es = eq.estilo || ESTILO_DEF;
  let fx = p.base.fx + (bx - .5) * .6 + (propio ? .1 : -.04) + (es.linea - 1) * .05;
  if (!propio && p.rol !== 'DEL') fx = Math.min(fx, bx - .05);
  if (!propio && p.rol === 'DEL') fx = Math.max(fx, .4);
  if (propio && p.rol === 'DEF') fx = Math.min(fx, bx + .02);
  fx = clamp(fx, .06, propio ? .9 : .8);
  const fz = p.base.fz * (propio ? 1 : .75);
  const z = fz * HW * .82 * eq.dir + b.z * (propio ? .15 : .3);
  return [eq.dir * (-HL + fx * PL), clamp(z, -HW + 1.5, HW - 1.5)];
}
// busca un hueco libre cerca del puesto (para ofrecerse al pase)
function buscarHueco(p, bx0, bz0) {
  const dueno = G.balon.dueno;
  let mx = bx0, mz = bz0, ms = -1e9;
  for (let i = -1; i < 7; i++) {
    const a = i * Math.PI / 3.5, r = i < 0 ? 0 : 5.5;
    const x = clamp(bx0 + Math.cos(a) * r, -HL + 2, HL - 2), z = clamp(bz0 + Math.sin(a) * r, -HW + 1.5, HW - 1.5);
    let libre = 8;
    for (const o of p.eq.rival.pl) { const d = hyp(o.x - x, o.z - z); if (d < libre) libre = d; }
    let s = libre - hyp(x - bx0, z - bz0) * .15;
    if (dueno && dueno.eq === p.eq) s += lineaLibre(dueno.x, dueno.z, x, z, p.eq.rival) * .3;
    if (s > ms) { ms = s; mx = x; mz = z; }
  }
  return [mx, mz];
}
// línea defensiva rival (el penúltimo defensor)
function lineaDefensa(eq) {
  const xs = eq.rival.pl.map(o => o.x * eq.dir).sort((a, b) => b - a);
  return xs[1] * eq.dir;
}
function planEquipos() {
  const b = G.balon;
  for (const eq of G.eqs) {
    eq.persigue = null; eq.presiona = null; eq.presiona2 = null; eq.cubre = null;
    const tiene = b.dueno && b.dueno.eq === eq, rivalTiene = b.dueno && b.dueno.eq !== eq;
    if (tiene) continue;
    const campo = eq.pl.filter(p => !p.por && p.suelo <= 0);
    if (!b.dueno && !(G.saque)) {
      if (b.destino && b.destino.eq === eq) eq.persigue = b.destino;
      else {
        let mt = 1e9;
        for (const p of eq.pl) {
          if (p.por) { const ip = intercepcion(p); if (!enAreaPropia(p, ip.x, ip.z)) continue; }
          const ip = intercepcion(p); p.ip = ip;
          if (ip.t < mt) { mt = ip.t; eq.persigue = p; }
        }
      }
      for (const p of eq.pl) if (!p.ip) p.ip = intercepcion(p);
    }
    if (rivalTiene) {
      const orden = campo.slice().sort((p, q) => hyp(p.x - b.x, p.z - b.z) - hyp(q.x - b.x, q.z - b.z));
      if (esUsuarioEq(eq)) {
        const c = G.ctrl, dc = c ? hyp(c.x - b.x, c.z - b.z) : 99;
        const otros = orden.filter(p => p !== c);
        if (G.presion || dc > 5) { eq.presiona = otros[0]; eq.cubre = otros[1]; }
        else eq.cubre = otros[0];
      } else {
        // presión según el estilo: baja = espera en su campo; alta = dos jugadores presionan casi en todo el campo
        const es = eq.estilo || ESTILO_DEF, dg = hyp(porteriaPropiaX(eq) - b.x, b.z);
        if (es.presion > 0 || dg < 55) eq.presiona = orden[0];
        eq.cubre = orden[1];
        if (dg < [22, 30, 60][es.presion]) { eq.presiona2 = orden[1]; eq.cubre = orden[2]; }
      }
    }
  }
}
function iaJugador(p, dt) {
  const b = G.balon, eq = p.eq;
  if (p.por && G.saque && G.saque.tipo === 'penalti' && G.saque.tomador.eq !== p.eq) return moverHacia(p, porteriaPropiaX(p.eq) + p.eq.dir * .5, clamp(b.z * .1, -1, 1), false);
  if (p.por) return iaPortero(p, dt);
  if (b.dueno === p) return iaConBalon(p, dt);
  let [tx, tz] = puestoEnBloque(p), prisa = false;
  if (G.saque && G.saque.tomador === p) return [0, 0];
  if (G.saque && G.saque.muro) { const m = G.saque.muro.find(w => w.p === p); if (m) return moverHacia(p, m.x, m.z, true); }
  if (!b.dueno && eq.persigue === p && G.fase === 'juego' && !G.saque && G.muerto <= 0) {
    const ip = p.ip || intercepcion(p);
    return moverHacia(p, ip.x, ip.z, true, b.destino === p);
  }
  if (b.dueno && b.dueno.eq === eq) { // atacando sin balón
    p.desT -= dt;
    if (p.desT <= 0) {
      p.desT = rnd(1.2, 2.6); p.desmarque = false;
      const bx = (eq.dir * b.x + HL) / PL;
      if ((p.rol === 'DEL' || (p.rol === 'MED' && rng() < .3)) && bx > .35 && rng() < .5) {
        p.desmarque = true;
        const lx = lineaDefensa(eq) + eq.dir * rnd(2, 6);
        p.desX = clamp(lx, -HL + 6, HL - 6) - tx; p.desZ = rnd(-4, 4);
      } else {
        const [hx, hz] = buscarHueco(p, tx, tz);
        p.desX = hx - tx; p.desZ = hz - tz;
      }
    }
    tx += p.desX; tz += p.desZ; prisa = p.desmarque;
    // los dos más cercanos al que lleva el balón se acercan para dar una opción corta
    const d = hyp(b.dueno.x - p.x, b.dueno.z - p.z);
    if (d > 16 && p.cercano) { tx = (tx + b.dueno.x) / 2; tz = (tz + b.dueno.z) / 2; }
  } else if (b.dueno) { // defendiendo
    const o = b.dueno, gx = porteriaPropiaX(eq);
    if (eq.presiona === p || eq.presiona2 === p) {
      // se pone entre el rival y la portería y le sigue el paso (el segundo cierra por el otro lado)
      const dg = hyp(gx - o.x, -o.z) || 1, lado = eq.presiona2 === p ? 1.6 : 0;
      tx = o.x + (gx - o.x) / dg * 1.1 + o.vx * .25 - (-o.z) / dg * lado; tz = o.z + (-o.z) / dg * 1.1 + o.vz * .25 + (gx - o.x) / dg * lado; prisa = true;
      const d = hyp(o.x - p.x, o.z - p.z);
      p.decT -= dt;
      if (d < 1.6 && p.decT <= 0 && !G.saque) {
        p.decT = rnd(.5, 1.3) / dif(eq).entrada;
        if (rng() < .6) hacerEntrada(p, d > 1.2 && rng() < .2 ? 'barrida' : 'pie');
      }
    } else if (eq.cubre === p) {
      const dg = hyp(gx - o.x, -o.z) || 1;
      tx = o.x + (gx - o.x) / dg * 6; tz = o.z + (-o.z) / dg * 6;
    } else { // marcar al rival más cercano a su puesto
      let m = null, md = 10;
      for (const r of eq.rival.pl) { if (r.por || r === o) continue; const d = hyp(r.x - tx, r.z - tz); if (d < md) { md = d; m = r; } }
      if (m) { const s = Math.sign(gx - m.x); tx = tx * .6 + (m.x + s * 1.2) * .4; tz = tz * .6 + m.z * .4; }
    }
  }
  if (G.saque) { // los rivales guardan distancia en los saques
    const r = G.saque.tipo === 'inicial' || G.saque.tipo === 'falta' ? 9.3 : 7;
    if (G.saque.tomador.eq !== eq) { const d = hyp(tx - b.x, tz - b.z); if (d < r) { const k = r / (d || 1); tx = b.x + (tx - b.x) * k; tz = b.z + (tz - b.z) * k; } }
    if (G.saque.tipo === 'inicial') tx = eq.dir > 0 ? Math.min(tx, -.5) : Math.max(tx, .5);
  }
  if (G.saque && G.saque.tipo === 'penalti' && G.saque.tomador !== p) { // todos fuera del área menos el portero y el que tira
    const dir = G.saque.tomador.eq.dir, lim = dir * (HL - AREA_D - 2);
    if (Math.abs(tz) < AREA_W2 + 2 && tx * dir > lim * dir) tx = lim;
  }
  return moverHacia(p, tx, tz, prisa);
}
function iaConBalon(p, dt) {
  const eq = p.eq, b = G.balon, gx = eq.dir * HL;
  if (G.saque && G.saque.tomador === p) {
    p.mirar = Math.atan2(-p.z, eq.dir * 10);
    const tl = G.saque.tipo === 'falta', pn = G.saque.tipo === 'penalti';
    if ((pn || tl) && G.saque.plan == null) {
      const dg = hyp(gx - p.x, p.z);
      G.saque.plan = pn || (G.saque.muro && rng() < (dg < 24 ? .8 : .45)) ? 'tiro' : 'pase';
    }
    if (G.saque.t > (pn ? 1.7 : tl ? 2 : 1.1)) {
      if (G.saque.plan === 'tiro') {
        const az = (rng() < .5 ? -1 : 1) * rnd(.55, 1), pot = pn ? rnd(.6, .9) : rnd(.55, .85);
        golpear(p, () => disparar(p, pot, 0, az));
        return [0, 0];
      }
      const m = mejorPase(p, true);
      golpear(p, () => { if (m) pasarA(p, m.p, m.tipo); else pasar(p, eq.dir, 0, 'largo'); });
    }
    return [0, 0];
  }
  const dGol = hyp(gx - p.x, -p.z);
  let presion = 99;
  for (const o of eq.rival.pl) { const d = hyp(o.x - p.x, o.z - p.z); if (d < presion) presion = d; }
  const yo = G.unJugador;
  if (yo && yo.eq === eq && yo !== p && G.t - (G.pidePase || 0) < 1.2 && !p.golpe && hyp(yo.x - p.x, yo.z - p.z) < 45) {
    G.pidePase = 0; golpear(p, () => pasarA(p, yo, hyp(yo.x - p.x, yo.z - p.z) > 26 ? 'largo' : 'corto')); return [p.vx, p.vz];
  }
  p.decT -= dt;
  if (p.decT <= 0) {
    p.decT = dif(eq).decision * rnd(.7, 1.3) * (dGol < 30 ? .6 : 1); // cerca del área decide más rápido
    // ¿tirar?
    const angulo = Math.abs(p.z) / Math.max(1, Math.abs(gx - p.x));
    if (dGol < 30 && angulo < 1.5 && !p.golpe) {
      const libre = lineaLibre(p.x, p.z, gx, 0, eq.rival);
      const prob = dGol < 16 ? .95 : (32 - dGol) / 32 * 1.2 + (libre > 1.5 ? .3 : 0) - (presion < 2 ? 0 : .1);
      if (rng() < prob) { const gk = eq.rival.pl[0], pot = dGol > 16 ? rnd(.7, .9) : rnd(.45, .8); golpear(p, () => disparar(p, pot, 0, gk.z > 0 ? -1 : 1)); return [p.vx, p.vz]; }
    }
    const m = mejorPase(p, false);
    // espacio libre por delante para conducir
    let espacio = 12;
    for (const o of eq.rival.pl) { const rx = (o.x - p.x) * eq.dir, rz = o.z - p.z, d = hyp(rx, rz); if (rx > 0 && Math.abs(rz) < rx * 1.2 + 1 && d < espacio) espacio = d; }
    const valorConducir = .3 + espacio * .13 + (presion < 1.8 ? -.7 : 0) + (dGol < 30 ? .3 : 0);
    if (m && m.s > valorConducir + rnd(-.3, .3)) { golpear(p, () => pasarA(p, m.p, m.tipo)); return [p.vx, p.vz]; }
  }
  // conducir hacia la portería esquivando rivales
  let dx = eq.dir, dz = -p.z / 60;
  if (dGol < 20) { dx = (gx - p.x) / dGol; dz = -p.z / dGol; }
  else if ((gx - p.x) * eq.dir < 32) { // en el último tercio: corta hacia dentro, hacia la frontal del área
    const tx = gx - eq.dir * 12 - p.x, tz = p.z * .25 - p.z, l = hyp(tx, tz) || 1; dx = tx / l; dz = tz / l;
  }
  for (const o of eq.rival.pl) {
    const rx = o.x - p.x, rz = o.z - p.z, d = hyp(rx, rz);
    if (d < 7 && d > 0 && rx * eq.dir > -1) { const f = (7 - d) / 7 * 1.6; dz -= Math.sign(rz || (rng() - .5)) * f; dx -= rx / d * f * .3; }
  }
  // las líneas pesan más que los rivales: cerca de la banda nunca conduce hacia fuera
  const bordeZ = Math.abs(p.z) - (HW - 6);
  if (bordeZ > 0) { dz -= Math.sign(p.z) * (.4 + bordeZ * .45); if (Math.abs(p.z) > HW - 2.5 && dz * Math.sign(p.z) > 0) dz = 0; }
  const bordeX = Math.abs(p.x) - (HL - 5);
  if (bordeX > 0 && Math.abs(p.z) > AREA_W2) { dx -= Math.sign(p.x) * bordeX * .5; if (dx * Math.sign(p.x) > 0 && Math.abs(p.x) > HL - 2) dx = 0; }
  const l = hyp(dx, dz) || 1, sp = velMax(p, presion > 3);
  return [dx / l * sp, dz / l * sp];
}
// mejor compañero para pasar (s = puntuación)
function mejorPase(p, seguro) {
  const eq = p.eq; let mejor = null;
  for (const m of eq.pl) {
    if (m === p || (m.por && !seguro)) continue;
    const d = hyp(m.x - p.x, m.z - p.z); if (d < 4 || d > 55) continue;
    const avance = (m.x - p.x) * eq.dir, libre = lineaLibre(p.x, p.z, m.x, m.z, eq.rival, 16);
    let cerca = 8; for (const o of eq.rival.pl) { const e = hyp(o.x - m.x, o.z - m.z); if (e < cerca) cerca = e; }
    const tipo = d > 28 || (libre < .8 && d > 14) ? 'largo' : 'corto';
    const ritmo = (eq.estilo || ESTILO_DEF).ritmo;
    let s = avance * [.04, .06, .085][ritmo] - (avance < -6 ? .3 : 0) + Math.min(libre, 3) * [.45, .35, .28][ritmo] + (tipo === 'largo' && ritmo === 2 ? .25 : 0) + Math.min(cerca, 6) * .15 - (d > 30 ? (d - 30) * .04 : 0) + (m.desmarque ? .4 : 0) + rnd(-.25, .25);
    if (tipo === 'corto' && libre < .8) s -= 2.5;
    if (tipo === 'largo' && cerca < 2.5) s -= 1.5;
    if (seguro) s += avance < 0 ? .2 : 0;
    if (!mejor || s > mejor.s) mejor = { p: m, s, tipo };
  }
  return mejor;
}
function iaPortero(p, dt) {
  const eq = p.eq, b = G.balon, gx = porteriaPropiaX(eq);
  if (b.dueno === p) {
    p.retener -= dt;
    p.mirar = Math.atan2(-p.z * .3, eq.dir);
    if (p.retener <= 0 && (!G.saque || G.saque.t > 1)) sacarPortero(p);
    return [0, 0];
  }
  if (p.estirada) {
    const e = p.estirada; e.t += dt;
    if (e.t > 1.1 || b.dueno) { p.estirada = null; return [0, 0]; }
    if (e.t < e.reac) { p.vx *= .8; p.vz *= .8; return null; }
    const resto = Math.max(.04, e.T - e.t), dz = e.z - p.z;
    const v = e.para ? Math.abs(dz) / resto : 7.5;
    p.vx = 0; p.vz = Math.sign(dz) * Math.min(Math.abs(dz) / dt, v);
    return null; // movimiento propio de la estirada
  }
  if (!b.dueno && eq.persigue === p) { const ip = p.ip || intercepcion(p); return moverHacia(p, ip.x, ip.z, true, false); }
  // colocarse entre el balón y el centro de la portería
  const dx = b.x - gx, dz = b.z, d = hyp(dx, dz) || 1;
  let dist = clamp(d * .09 + .8, .8, 5.5);
  const o = b.dueno;
  if (o && o.eq !== eq && d < 18 && Math.abs(dz) < 14) {
    // mano a mano: sale a achicar el ángulo y, si lo tiene encima, se tira a sus pies
    dist = clamp(d * .4, 1.2, 7);
    p.decT -= dt;
    if (hyp(b.x - p.x, b.z - p.z) < 1.7 && p.decT <= 0 && o.protegido <= 0) {
      p.decT = .45;
      if (rng() < .3 + (p.par - .7) * .5 + dif(eq).parada) { b.dueno = null; o.tropiezo = .5; tomar(p); p.retener = 1.2; aviso('¡Salida del portero!', '', 1, true); return [0, 0]; }
    }
  }
  const tx = gx + dx / d * dist, tz = clamp(dz / d * dist, -GW2 + .4, GW2 - .4);
  p.mirar = Math.atan2(b.z - p.z, b.x - p.x);
  return moverHacia(p, tx, tz, d < 30);
}
function sacarPortero(p) {
  const eq = p.eq;
  let mejor = null;
  for (const m of eq.pl) {
    if (m === p) continue;
    const d = hyp(m.x - p.x, m.z - p.z); let cerca = 10;
    for (const o of eq.rival.pl) cerca = Math.min(cerca, hyp(o.x - m.x, o.z - m.z));
    const libre = lineaLibre(p.x, p.z, m.x, m.z, eq.rival);
    const s = (m.rol === 'DEF' ? .6 : 0) + Math.min(cerca, 8) * .25 + Math.min(libre, 4) * .3 - d * .02 + rnd(-.3, .3);
    if (!mejor || s > mejor.s) mejor = { m, s, d, libre };
  }
  p.retener = 0;
  if (mejor) pasarA(p, mejor.m, mejor.d > 25 || mejor.libre < 2 ? 'largo' : 'corto');
}

/* ---------- controles: estado combinado de teclado, pantalla táctil y mando ---------- */
const BOTONES = ['pass', 'long', 'shot', 'tackle', 'sprint', 'swap'];
const ENT = { mx: 0, mz: 0, sprint: false, pass: false, long: false, shot: false, tackle: false, swap: false };
const PREV = {};
const BORDE = {};   // pulsado en este fotograma
const SUELTO = {};  // soltado en este fotograma
const TECLAS = {}, TACT = { mx: 0, mz: 0, sprint: false }, PRUEBA = { activo: false };
const PULSO = {};   // botones pulsados desde el último fotograma (aunque ya se hayan soltado)
const MAPA_TECLAS = {
  KeyJ: 'pass', KeyX: 'pass', KeyK: 'shot', KeyC: 'shot', KeyL: 'long', KeyZ: 'long', Space: 'tackle', KeyV: 'tackle',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyQ: 'swap',
};
let mandoConectado = false;
function atacando() { const b = G.balon; return !!b && ((b.dueno && b.dueno.eq.i === G.usuario) || (!b.dueno && b.destino && b.destino === G.ctrl)); }
function leerControles() {
  let mx = 0, mz = 0;
  const v = {};
  BOTONES.forEach(k => v[k] = false);
  // teclado
  if (TECLAS.KeyA || TECLAS.ArrowLeft) mx -= 1; if (TECLAS.KeyD || TECLAS.ArrowRight) mx += 1;
  if (TECLAS.KeyW || TECLAS.ArrowUp) mz -= 1; if (TECLAS.KeyS || TECLAS.ArrowDown) mz += 1;
  for (const c in MAPA_TECLAS) if (TECLAS[c]) v[MAPA_TECLAS[c]] = true;
  if (mx || mz) { const l = hyp(mx, mz); mx /= l; mz /= l; }
  // táctil
  if (hyp(TACT.mx, TACT.mz) > hyp(mx, mz)) { mx = TACT.mx; mz = TACT.mz; }
  if (TACT.sprint) v.sprint = true;
  for (const k of BOTONES) if (TACT[k]) v[k] = true;
  // mando (Xbox / PlayStation, distribución estándar)
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  mandoConectado = false;
  for (const gp of pads || []) {
    if (!gp || !gp.connected) continue;
    mandoConectado = true;
    const bt = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .4));
    let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (bt(14)) ax = -1; if (bt(15)) ax = 1; if (bt(12)) ay = -1; if (bt(13)) ay = 1;
    const l = hyp(ax, ay);
    if (l > .18) { const k = Math.min(1, (l - .18) / .72) / l; if (l * k > hyp(mx, mz)) { mx = ax * k; mz = ay * k; } }
    const at = atacando();
    if (bt(0)) v.pass = true;                       // A / X(PS): pase · cambiar
    if (bt(1)) v[at ? 'shot' : 'tackle'] = true;    // B / Círculo: tiro · entrada
    if (bt(2)) v[at ? 'long' : 'shot'] = true;      // X / Cuadrado: pase largo · barrida
    if (bt(3)) v.long = true;                       // Y / Triángulo: pase largo · presión
    if (bt(4)) v.swap = true;                       // LB / L1: cambiar jugador
    if (bt(5) || bt(7)) v.sprint = true;            // RB-RT / R1-R2: sprint
    if (bt(9) && !PREV.pausa) { PREV.pausa = true; setTimeout(abrirPausa, 0); } else if (!bt(9)) PREV.pausa = false;
  }
  if (PRUEBA.activo) { mx = PRUEBA.mx || 0; mz = PRUEBA.mz || 0; for (const k of BOTONES) v[k] = !!PRUEBA[k]; }
  ENT.mx = mx; ENT.mz = mz;
  for (const k of BOTONES) {
    const ahora = v[k] || !!PULSO[k]; PULSO[k] = false;
    // los bordes se acumulan hasta que un paso de la simulación los usa
    BORDE[k] = BORDE[k] || (ahora && !PREV[k]);
    SUELTO[k] = SUELTO[k] || (!ahora && PREV[k]);
    PREV[k] = ahora; ENT[k] = ahora;
  }
}
function consumirBordes() { for (const k of BOTONES) { BORDE[k] = false; SUELTO[k] = false; } }

// el jugador que controlas
function controlar(p) { if (!p || p === G.ctrl || p.por || (G.unJugador && p !== G.unJugador)) return; G.ctrl = p; G.cambioT = G.t; G.carga = null; actualizarQuien(); }
// el mejor defensor para tomar el control: cerca del balón y, mejor aún, entre el balón y nuestra portería
function puntuarDefensor(p) {
  const b = G.balon, eq = p.eq, d = hyp(p.x - b.x, p.z - b.z);
  const detras = (b.x - p.x) * eq.dir > -1;       // está más cerca de su portería que el balón
  return d + (detras ? 0 : 6);
}
function ordenDefensores() { return eqUsuario().pl.filter(p => !p.por && p.suelo <= 0).sort((p, q) => puntuarDefensor(p) - puntuarDefensor(q)); }
function cambiarJugador() {
  if (G.unJugador) return;
  const orden = ordenDefensores();
  controlar(orden[0] === G.ctrl ? orden[1] : orden[0]);
}
function controlUsuario(p, dt) {
  const b = G.balon, tiene = b.dueno === p, mag = hyp(ENT.mx, ENT.mz);
  const dx = mag > .2 ? ENT.mx / mag : Math.cos(p.cara), dz = mag > .2 ? ENT.mz / mag : Math.sin(p.cara);
  const quieto = G.saque && G.saque.tomador === p;
  if (G.muerto > 0 || G.fase !== 'juego') { return [0, 0]; }
  if (tiene && !(p.por)) {
    const mx = ENT.mx, mz = ENT.mz;
    if (p.golpe) { /* ya está golpeando */ }
    else if (BORDE.pass) golpear(p, () => pasar(p, mx, mz, 'corto'));
    else if (BORDE.long) golpear(p, () => pasar(p, mx, mz, 'largo'));
    else if (BORDE.shot) G.carga = { t: 0 };
    if (G.carga && b.dueno === p) {
      G.carga.t += dt;
      if (!ENT.shot || G.carga.t >= .95) {
        const pot = .2 + .8 * Math.min(1, G.carga.t / .85); G.carga = null;
        const tiroSaque = G.saque && (G.saque.tipo === 'penalti' || (G.saque.tipo === 'falta' && G.saque.muro));
        if (G.saque && !tiroSaque) golpear(p, () => pasar(p, mx, mz, 'largo')); else golpear(p, () => disparar(p, pot, mx, mz));
      }
    }
  } else if (!b.dueno && b.destino === p) {
    // preparar un pase o tiro de primera mientras llega el balón
    if (BORDE.pass) G.buffer = { a: 'pass', t: G.t, dx: ENT.mx, dz: ENT.mz };
    else if (BORDE.long) G.buffer = { a: 'long', t: G.t, dx: ENT.mx, dz: ENT.mz };
    else if (BORDE.shot) G.buffer = { a: 'shot', t: G.t, ax: ENT.mx, az: ENT.mz, inicio: G.t, carga: 0, pot: .45 };
    if (G.buffer && G.buffer.a === 'shot' && ENT.shot) { // mantener el tiro cargando mientras llega el balón
      G.buffer.carga = G.t - G.buffer.inicio; G.buffer.pot = Math.max(.45, .2 + .8 * Math.min(1, G.buffer.carga / .85)); G.buffer.t = G.t;
      G.buffer.ax = ENT.mx; G.buffer.az = ENT.mz;
    }
  } else if (!(b.dueno && b.dueno.eq === p.eq)) {
    if (BORDE.pass || BORDE.swap) cambiarJugador();
    if (BORDE.tackle) hacerEntrada(p, 'pie');
    if (BORDE.shot) hacerEntrada(p, 'barrida');
    G.presion = ENT.long;
  } else if (G.unJugador && (BORDE.pass || BORDE.long)) { G.pidePase = G.t; aviso('¡Pásala!', '', .8, true); } // pedir el balón
  else if (BORDE.swap) cambiarJugador();
  if (!(b.dueno && b.dueno.eq !== p.eq)) G.presion = false;
  if (G.ctrl !== p) return [0, 0];
  if (quieto) { if (mag > .2) p.mirar = Math.atan2(dz, dx); return [0, 0]; }
  if (!b.dueno && b.destino === p && G.fase === 'juego' && !G.saque && hyp(b.x - p.x, b.z - p.z) > 1) {
    // recepción asistida: va al encuentro del balón; el control solo corrige un poco
    // (al recibir el pase sueles seguir empujando hacia donde pasaste: eso no debe alejarte del balón)
    const ip = p.ip || intercepcion(p);
    let [vx, vz] = moverHacia(p, ip.x, ip.z, hyp(ip.x - p.x, ip.z - p.z) > 4, true);
    if (mag > .3 && G.t - (G.recepcion || 0) > .45) { const v = velMax(p, ENT.sprint) * Math.min(1, mag); vx = vx * .65 + ENT.mx / mag * v * .35; vz = vz * .65 + ENT.mz / mag * v * .35; }
    return [vx, vz];
  }
  if (mag > .15) { const v = velMax(p, ENT.sprint) * Math.min(1, mag * 1.15); return [ENT.mx / mag * v, ENT.mz / mag * v]; }
  // sin tocar el control: va solo al balón suelto si es el que llega antes
  if (!b.dueno && p.eq.persigue === p && G.fase === 'juego' && !G.saque) {
    const ip = p.ip || intercepcion(p);
    return moverHacia(p, ip.x, ip.z, false, false);
  }
  return [0, 0];
}
function autoCambio() {
  const b = G.balon, eq = eqUsuario(), c = G.ctrl;
  if (G.autoplay || !c || c.entrada || G.unJugador) return;
  const desdeCambio = G.t - G.cambioT, moviendo = hyp(ENT.mx, ENT.mz) > .3;
  if (!b.dueno && !(b.destino && b.destino.eq === eq) && eq.persigue && eq.persigue !== c && !eq.persigue.por) {
    // balón suelto: el que llega antes
    if (desdeCambio < .7 || (moviendo && desdeCambio < 1.5)) return;
    const ic = c.ip || intercepcion(c), ip = eq.persigue.ip || intercepcion(eq.persigue);
    if (ic.t > ip.t + .45) controlar(eq.persigue);
  } else if (b.dueno && b.dueno.eq !== eq) {
    // el rival tiene el balón: pasar al mejor defensor si el tuyo quedó lejos o mal colocado
    const m = ordenDefensores()[0];
    if (!m || m === c || desdeCambio < .3) return;
    const dc = puntuarDefensor(c), dm = puntuarDefensor(m);
    const recienPerdido = G.t - (G.perdidaT || 0) < .35;
    if ((recienPerdido && dc > dm + 2) || (desdeCambio > 1.2 && dc > dm + 6 && dc > 9)) controlar(m);
  }
}

/* ---------- reglas básicas: saques, gol y final ---------- */
function saqueInicial(eq) {
  G.fase = 'juego'; G.muerto = 0; G.golT = 0;
  for (const e of G.eqs) e.pl.forEach(p => {
    const f = p.base, pos = posFormacion(e, Math.min(f.fx, .45), f.fz);
    Object.assign(p, { x: pos.x, z: pos.z, vx: 0, vz: 0, cara: e.dir > 0 ? 0 : Math.PI, entrada: null, suelo: 0, tropiezo: 0, estirada: null, celebra: 0, retener: 0, recibe: null, desmarque: false, desX: 0, desZ: 0, golpe: null, toqueT: 0, inclLat: 0, frenado: 0 });
  });
  const t = delanteroDe(eq), comp = eq.pl.filter(p => p !== t && !p.por).sort((p, q) => q.base.fx - p.base.fx)[0];
  t.x = -eq.dir * .4; t.z = 0; comp.x = -eq.dir * 6; comp.z = -eq.dir * 5;
  const b = G.balon; Object.assign(b, nuevoBalon());
  b.x = 0; b.z = 0;
  G.posesion = eq; tomar(t);
  t.protegido = 0;
  G.saque = { tipo: 'inicial', tomador: t, t: 0 };
  if (!G.autoplay) controlar(G.unJugador || (eq.i === G.usuario ? t : delanteroDe(G.eqs[G.usuario])));
}
function fueraDeJuego(tipo, eq, x, z, texto) {
  suena('silbato', 'corto');
  // el balón salió: pequeña pausa y se reanuda con el equipo que corresponde
  G.muerto = 1; G.pendiente = { tipo, eq, x, z };
  const b = G.balon; b.dueno = null; b.vx = b.vy = b.vz = 0; b.tipo = null; b.destino = null;
  G.carga = null; G.buffer = null;
  aviso(texto, '', 1.2, true);
}
function reanudar() {
  let { tipo, eq, x, z } = G.pendiente; G.pendiente = null;
  const b = G.balon;
  let t, muro = null;
  if (tipo === 'penalti') {
    const gx = eq.dir * HL; x = gx - eq.dir * 11; z = 0;
    t = eq.pl.filter(q => !q.por).sort((q, w) => w.tir - q.tir)[0];
    const gk = eq.rival.pl[0]; gk.x = gx - eq.dir * .5; gk.z = 0; gk.vx = gk.vz = 0;
    t.x = x - eq.dir * .5; t.z = 0; t.vx = t.vz = 0; t.cara = eq.dir > 0 ? 0 : Math.PI;
    Object.assign(b, { x, y: BR, z, vx: 0, vy: 0, vz: 0 });
    tomar(t); t.protegido = 2;
    G.saque = { tipo, tomador: t, t: 0 };
    if (esUsuarioEq(eq)) { controlar(t); aviso('Penalti', 'Mantén Tiro y suelta para chutar', 1.6, true); }
    return;
  }
  if (tipo === 'puerta') t = eq.pl[0];
  else if (tipo === 'falta') {
    // el que cobra: de los cuatro más cercanos, el que mejor tira si está a tiro; si no, el más cercano
    const gx = eq.dir * HL, cerca = eq.pl.filter(q => !q.por).sort((q, w) => hyp(q.x - x, q.z - z) - hyp(w.x - x, w.z - z)).slice(0, 4);
    t = hyp(gx - x, z) < 34 ? cerca.sort((q, w) => w.tir - q.tir)[0] : cerca[0];
    muro = prepararFalta(t, eq, x, z);
    t.x = x - eq.dir * .42; t.z = z;
    t.vx = t.vz = 0; t.cara = Math.atan2(-z, gx - x);
    Object.assign(b, { x, y: BR, z, vx: 0, vy: 0, vz: 0 });
    tomar(t); t.protegido = 2;
    G.saque = { tipo, tomador: t, t: 0, muro };
    if (esUsuarioEq(eq)) { controlar(t); aviso('Tiro libre', muro ? 'Mantén Tiro y suelta para chutar' : '', 1.6, true); }
    return;
  }
  else { let md = 1e9; for (const p of eq.pl) { if (p.por) continue; const d = hyp(p.x - x, p.z - z); if (d < md) { md = d; t = p; } } }
  const px = tipo === 'puerta' ? -eq.dir * (HL - 5) : x, pz = tipo === 'puerta' ? 0 : z;
  t.x = px + (tipo === 'corner' ? Math.sign(px) * .4 : 0); t.z = pz + (tipo === 'banda' || tipo === 'corner' ? Math.sign(pz) * .4 : 0);
  t.vx = t.vz = 0; t.cara = Math.atan2(-t.z, -t.x * .5 + eq.dir * 5);
  Object.assign(b, { x: px, y: BR, z: pz, vx: 0, vy: 0, vz: 0 });
  tomar(t);
  if (t.por) t.retener = .8;
  t.protegido = 2;
  G.saque = { tipo, tomador: t, t: 0 };
  if (esUsuarioEq(eq) && !t.por) controlar(t);
}
function revisarLimites(ox) {
  const b = G.balon;
  if (G.fase !== 'juego' || G.muerto > 0) return;
  const ult = b.ultimo ? b.ultimo.eq : G.posesion;
  if (Math.abs(b.x) > HL + BR) {
    const lado = Math.sign(b.x);
    const def = G.eqs.find(e => porteriaPropiaX(e) * lado > 0), atq = def.rival;
    if (Math.abs(b.z) < GW2 - BR && b.y < GH - BR && Math.abs(ox) <= HL + BR) return gol(atq);
    if (ult === atq) fueraDeJuego('puerta', def, lado * (HL - 5), 0, 'Saque de puerta');
    else fueraDeJuego('corner', atq, lado * HL, Math.sign(b.z || 1) * HW, 'Córner');
    return;
  }
  if (Math.abs(b.z) > HW + BR) {
    const eq = ult === G.eqs[0] ? G.eqs[1] : G.eqs[0];
    fueraDeJuego('banda', eq, clamp(b.x, -HL + 1, HL - 1), Math.sign(b.z) * HW, 'Saque de banda');
  }
}
function gol(eq) {
  suena('gol');
  const b = G.balon, autor = b.ultimo;
  eq.goles++; G.fase = 'gol'; G.golT = 0; G.carga = null; G.buffer = null;
  if (b.dueno) { b.dueno = null; }
  const propia = autor && autor.eq !== eq;
  if (autor && !propia) autor.celebra = 3;
  const asist = autor && !propia && autor.pasador && autor.pasador !== autor && autor.pasador.eq === eq && G.t - autor.pasadorT < 12 ? autor.pasador : null;
  if (autor && !propia) autor.st.g++;
  if (asist) asist.st.a++;
  G.goles.push({ lado: eq.i, id: autor && !propia ? autor.id : null, nombre: autor ? autor.nombre : '', propia: !!propia, asist: asist ? asist.id : null, min: minutoActual() });
  aviso('¡GOOOL!', autor ? (propia ? 'En propia puerta de ' + autor.nombre : autor.num + ' · ' + autor.nombre1 + ' ' + autor.nombre) : '', 2.6);
  actualizarMarcador();
  vibrar([30, 40, 30]);
}
// medio tiempo: los equipos cambian de campo y saca el visitante
function descanso() {
  suena('silbato', 'largo');
  G.parte = 2; G.reloj = 2700;
  for (const e of G.eqs) { e.dir *= -1; for (const p of e.pl) p.energia = Math.min(1, (p.energia ?? 1) + .5); }
  saqueInicial(G.eqs[1]);
  aviso('Descanso', 'Cambio de campo · empieza la segunda parte', 2.2);
}
function finPartido() {
  suena('silbato', 'final'); suena('ambiente', false);
  G.fase = 'fin'; G.carga = null;
  if (G.cfg && G.cfg.alTerminar) { G.cfg.alTerminar(resultadoPartido()); return; }
  const [a, b] = [G.eqs[0].goles, G.eqs[1].goles];
  const u = G.usuario, gf = u === 0 ? a : b, gc = u === 0 ? b : a;
  if (!G.autoplay) registrarPartido(gf, gc);
  if (!G.autoplay) mostrarFinal();
}

/* ---------- un paso de simulación ---------- */
function paso(dt) {
  if (G.fase === 'fin' || G.fase === 'menu') return;
  G.t += dt;
  const b = G.balon;
  if (G.fase === 'juego' && G.muerto <= 0 && !G.saque) { // el reloj se para mientras se prepara un saque
    G.reloj += dt * 5400 / (Math.max(1, DATOS.ajustes.dur) * 60);
    if (G.posesion) G.stats.pos[G.posesion.i] += dt;
    if (G.reloj >= 2700 && G.parte === 1) { descanso(); return; }
    if (G.reloj >= 5400) { G.reloj = 5400; finPartido(); return; }
  }
  if (G.saque) G.saque.t += dt;
  predecirBalon();
  for (const p of G.todos) { p.ip = null; p.cercano = false; }
  if (b.dueno) { // los dos compañeros más cercanos se ofrecen
    const c = b.dueno.eq.pl.filter(p => p !== b.dueno && !p.por).sort((p, q) => hyp(p.x - b.x, p.z - b.z) - hyp(q.x - b.x, q.z - b.z));
    if (c[0]) c[0].cercano = true; if (c[1]) c[1].cercano = true;
  }
  planEquipos();
  autoCambio();
  for (const p of G.todos) {
    if (p.exp) { // el expulsado camina fuera del campo
      const v = moverHacia(p, p.x * .9, Math.sign(p.z || 1) * (HW + 7), false); moverJugador(p, v[0], v[1], dt); continue;
    }
    p.entCD -= dt; p.suelo -= dt; p.tropiezo -= dt; p.protegido -= dt; p.patadaCD -= dt; p.patadaT -= dt; p.celebra -= dt; p.toqueT -= dt;
    if (p.golpe && G.fase === 'juego' && G.muerto <= 0) pasoGolpe(p, dt);
    let v;
    if (G.fase === 'gol') v = p.celebra > 0 ? moverHacia(p, p.x + p.eq.dir * 3, p.z * .9, false) : moverHacia(p, ...posFormacionAlto(p), false);
    else if (G.muerto > 0) v = moverHacia(p, ...puestoEnBloque(p), false);
    else if (p === G.ctrl && !G.autoplay) v = controlUsuario(p, dt);
    else v = iaJugador(p, dt);
    pasoEntrada(p, dt);
    if (v) moverJugador(p, v[0], v[1], dt);
    else { p.x += p.vx * dt; p.z += p.vz * dt; p.fase += hyp(p.vx, p.vz) * dt * 2.1; } // estirada del portero
    if (G.saque && G.saque.tomador === p) { p.vx = 0; p.vz = 0; }
  }
  consumirBordes();
  separar();
  if (G.saque && G.saque.tomador.eq !== eqUsuario() && G.saque.t > 6) G.saque = null;
  const ox = b.x;
  pasoBalon(dt);
  if (G.fase === 'juego' && G.muerto <= 0) { contacto(); revisarLimites(ox); }
  if (G.muerto > 0) { G.muerto -= dt; if (G.muerto <= 0 && G.pendiente) reanudar(); }
  if (G.fase === 'gol') { G.golT += dt; if (G.golT > 3.2) { saqueInicial(golRecibido()); suena('silbato', 'corto'); } }
}
function golRecibido() { // saca el equipo que recibió el último gol
  const b = G.balon; return b.x > 0 ? G.eqs.find(e => e.dir === -1) : G.eqs.find(e => e.dir === 1);
}
function posFormacionAlto(p) { const f = p.base, q = posFormacion(p.eq, Math.min(f.fx, .45), f.fz); return [q.x, q.z]; }
// quién toca el balón suelto
function contacto() {
  const b = G.balon;
  if (b.dueno) { robarToque(); return; }
  if (b.y > 2.4) return;
  // parada del portero: cuando el balón llega a su altura (ya se decidió en reaccionPortero que la para)
  const gk = b.paraPor;
  const cruza = gk && b.px != null && (b.px - gk.x) * (b.x - gk.x) <= 0;
  if (gk && (cruza || hyp(b.x - gk.x, b.z - gk.z) < 1) && b.y < 2.8) {
    const vel = hyp(b.vx, b.vz);
    gk.z = b.z - (gk.estirada ? gk.estirada.lado * .4 : 0);
    if (vel < 21 && b.y < 1.8 && rng() < (Math.abs(b.z - (gk.estirada ? gk.estirada.z : gk.z)) < .9 ? .7 : .4)) { b.dueno = null; tomar(gk); gk.retener = 1.2; aviso('¡Atrapada!', '', .9, true); suena('ocasion'); }
    else { // rechace hacia un lado
      const ld = Math.sign(b.z - gk.z) || (rng() < .5 ? -1 : 1); b.vx = -b.vx * rnd(.15, .35); b.vz = ld * rnd(3, 9); b.vy = rnd(2, 5); b.tipo = 'rechace'; b.paraPor = null; b.ultimo = gk; b.pateador = gk; b.id = ++G.idPatada; gk.patadaCD = .5; aviso('¡Paradón!', '', 1, true); suena('ocasion'); suena('patada', .7); }
    return;
  }
  let mejor = null, md = 1e9;
  for (const p of G.todos) {
    if (p.exp || p.suelo > 0 || p.patadaCD > 0 || p.entrada || p === b.batido) continue;
    const porArea = p.por && enAreaPropia(p, b.x, b.z);
    if (p.por && !porArea && b.y > 1.15) continue;
    const alcance = porArea ? 1.3 : b.destino === p ? 1.3 : .85;
    const d = hyp(p.x - b.x, p.z - b.z);
    if (d > alcance || b.y > (porArea ? 2.4 : 1.15)) continue;
    if (d < md) { md = d; mejor = p; }
  }
  if (!mejor) return;
  const vel = hyp(b.vx, b.vz);
  if (b.destino !== mejor && !mejor.por && vel > 6) {
    if (mejor.fallo === b.id) return;
    if (b.tipo === 'tiro' && vel > 13) { // bloqueo de un tiro
      mejor.fallo = b.id; b.vx *= -.3; b.vz += rnd(-5, 5); b.vy = rnd(1, 4); b.tipo = 'rechace'; b.ultimo = mejor; b.paraPor = null; b.batido = null; b.id = ++G.idPatada; return;
    }
    // cortar un pase que no iba para ti no siempre sale: depende de la velocidad del balón
    const prob = (b.tipo === 'pase' || b.tipo === 'largo') ? .45 + mejor.def * .35 - (vel - 6) * .025 : .8;
    if (rng() > prob) { mejor.fallo = b.id; if (md < .6) { b.vz += rnd(-1.5, 1.5); b.vx += rnd(-1.5, 1.5); } return; }
  }
  tomar(mejor);
}

/* =====================================================================
   gráficos (three.js, estilo de pocos polígonos)
   ===================================================================== */
const ESTILOS = {
  dia: { cielo: 0x8fd0ff, niebla: 0xbfe6ff, hemi: [0xffffff, 0x6d8f4e, .62], sol: [0xfff1d6, .6], cesped: ['#4c9c43', '#42903b'], fuera: '#3a7a34', focos: false },
  tarde: { cielo: 0xff9e6b, niebla: 0xffc49a, hemi: [0xffe0c4, 0x5b5a34, .55], sol: [0xffa860, .75], cesped: ['#4f9440', '#468838'], fuera: '#3a7232', focos: false },
  noche: { cielo: 0x0b1630, niebla: 0x0b1630, hemi: [0xbcd3ff, 0x24321f, .5], sol: [0xdfe9ff, .62], cesped: ['#3f9645', '#36873c'], fuera: '#244e27', focos: true },
};
let R = null; // todo lo gráfico
function iniciarGraficos() {
  const canvas = document.getElementById('cv');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { mostrarError('Tu navegador no pudo iniciar los gráficos 3D (WebGL).'); return false; }
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, .5, 400);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x446622, 1); scene.add(hemi);
  const sol = new THREE.DirectionalLight(0xffffff, .8); sol.position.set(-30, 60, 25); scene.add(sol);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  sol.shadow.mapSize.set(1024, 1024); sol.shadow.bias = -.0006; sol.shadow.normalBias = .02;
  Object.assign(sol.shadow.camera, { near: 5, far: 160, left: -32, right: 32, top: 32, bottom: -32 }); sol.shadow.camera.updateProjectionMatrix();
  scene.add(sol.target);
  R = { renderer, scene, cam, hemi, sol, camX: 0, camZ: 0, calidad: 1, fpsT: 0, fpsN: 0, autoBajado: 0, sombrasAuto: true };
  construirEstadio();
  construirJugadores();
  construirReal();
  construirBalon();
  construirMenu3D();
  aplicarEstilo();
  aplicarModelo();
  ajustarTamano();
  return true;
}
function texturaCanvas(w, h, dibujar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = R.renderer.capabilities.getMaxAnisotropy ? Math.min(4, R.renderer.capabilities.getMaxAnisotropy()) : 1;
  return t;
}
function construirEstadio() {
  const S = R.scene;
  // césped a franjas
  R.matCesped = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const cesped = new THREE.Mesh(new THREE.PlaneGeometry(PL + 8, PW + 8), R.matCesped);
  cesped.rotation.x = -Math.PI / 2; cesped.receiveShadow = true; S.add(cesped);
  R.matFuera = new THREE.MeshLambertMaterial({ color: 0x3f8a3a });
  const fuera = new THREE.Mesh(new THREE.PlaneGeometry(PL + 70, PW + 70), R.matFuera);
  fuera.rotation.x = -Math.PI / 2; fuera.position.y = -.02; S.add(fuera);
  // líneas
  const pos = [], W = .12;
  const seg = (x1, z1, x2, z2) => {
    const dx = x2 - x1, dz = z2 - z1, l = hyp(dx, dz) || 1, nx = -dz / l * W / 2, nz = dx / l * W / 2;
    pos.push(x1 + nx, 0, z1 + nz, x2 + nx, 0, z2 + nz, x2 - nx, 0, z2 - nz, x1 + nx, 0, z1 + nz, x2 - nx, 0, z2 - nz, x1 - nx, 0, z1 - nz);
  };
  const arco = (cx, cz, r, a0, a1, n = 40) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n, b = a0 + (a1 - a0) * (i + 1) / n; seg(cx + Math.cos(a) * r, cz + Math.sin(a) * r, cx + Math.cos(b) * r, cz + Math.sin(b) * r); } };
  const rect = (x1, z1, x2, z2) => { seg(x1, z1, x2, z1); seg(x2, z1, x2, z2); seg(x2, z2, x1, z2); seg(x1, z2, x1, z1); };
  rect(-HL, -HW, HL, HW); seg(0, -HW, 0, HW);
  arco(0, 0, 9.15, 0, Math.PI * 2, 64); arco(0, 0, .12, 0, Math.PI * 2, 8);
  const th = Math.acos(5.5 / 9.15);
  for (const s of [-1, 1]) {
    rect(s * HL, -AREA_W2, s * (HL - AREA_D), AREA_W2);
    rect(s * HL, -9.16, s * (HL - 5.5), 9.16);
    arco(s * (HL - 11), 0, .12, 0, Math.PI * 2, 8);
    if (s > 0) arco(HL - 11, 0, 9.15, Math.PI - th, Math.PI + th, 24); else arco(-HL + 11, 0, 9.15, -th, th, 24);
    for (const t of [-1, 1]) arco(s * HL, t * HW, 1, s > 0 ? (t > 0 ? Math.PI : Math.PI / 2) : (t > 0 ? -Math.PI / 2 : 0), s > 0 ? (t > 0 ? 1.5 * Math.PI : Math.PI) : (t > 0 ? 0 : Math.PI / 2), 10);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const lineas = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xf4f7f0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
  lineas.position.y = .012; S.add(lineas);
  // porterías
  const blanco = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const red = texturaCanvas(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; for (let i = 0; i <= 64; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 64); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(64, i); c.stroke(); } });
  red.wrapS = red.wrapT = THREE.RepeatWrapping;
  const matRed = new THREE.MeshBasicMaterial({ map: red, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const poste = new THREE.CylinderGeometry(.06, .06, GH, 8), larguero = new THREE.CylinderGeometry(.06, .06, GW2 * 2 + .12, 8);
  const P = 1.9;
  for (const s of [-1, 1]) {
    const grupo = new THREE.Group();
    for (const z of [-GW2, GW2]) { const m = new THREE.Mesh(poste, blanco); m.position.set(0, GH / 2, z); grupo.add(m); }
    const l = new THREE.Mesh(larguero, blanco); l.rotation.x = Math.PI / 2; l.position.set(0, GH, 0); grupo.add(l);
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(GW2 * 2, GH * .85), matRed.clone()); fondo.material.map = red.clone(); fondo.material.map.needsUpdate = true; fondo.material.map.repeat.set(9, 3);
    fondo.rotation.y = Math.PI / 2; fondo.position.set(s * P, GH * .85 / 2, 0); grupo.add(fondo);
    const techo = new THREE.Mesh(new THREE.PlaneGeometry(hyp(P, GH * .15), GW2 * 2), matRed); techo.material.map.repeat.set(3, 9);
    techo.rotation.x = -Math.PI / 2;
    techo.position.set(s * P / 2, GH * .925, 0); grupo.add(techo);
    for (const z of [-GW2, GW2]) { const lado = new THREE.Mesh(new THREE.PlaneGeometry(P, GH), matRed); lado.position.set(s * P / 2, GH / 2, z); grupo.add(lado); }
    grupo.position.x = s * HL; S.add(grupo);
  }
  // vallas publicitarias (marcas inventadas)
  const vallas = texturaCanvas(1024, 64, (c, w, h) => {
    const marcas = [['Refrescos PUM', '#ff4d6d'], ['Zapatillas BRINCO', '#2f7bff'], ['Banco Alcancía', '#22b573'], ['Tacos Don Gol', '#ffb020'], ['Telefonía Ring', '#8f5bff']];
    marcas.forEach(([t, col], i) => { const x = i * w / marcas.length; c.fillStyle = col; c.fillRect(x, 0, w / marcas.length, h); c.fillStyle = '#fff'; c.font = 'bold 30px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x + w / marcas.length / 2, h / 2 + 2); });
  });
  vallas.wrapS = THREE.RepeatWrapping;
  const valla = (largo, x, z, ry) => { const t = vallas.clone(); t.needsUpdate = true; t.repeat.set(largo / 40, 1); const m = new THREE.Mesh(new THREE.BoxGeometry(largo, .9, .15), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, .45, z); m.rotation.y = ry; S.add(m); };
  valla(PL + 6, 0, -HW - 3.5, 0); valla(PL + 6, 0, HW + 3.5, Math.PI);
  valla(PW - 10, -HL - 4.5, 0, Math.PI / 2); valla(PW - 10, HL + 4.5, 0, -Math.PI / 2);
  // gradas con público
  R.texPublico = texturaCanvas(512, 128, (c, w, h) => {
    c.fillStyle = '#1d2733'; c.fillRect(0, 0, w, h);
    const cols = ['#2f7bff', '#e8463a', '#ffd23f', '#f3f6ee', '#7fd1ff', '#ff8a65', '#9ccc65', '#ce93d8'];
    for (let y = 2; y < h; y += 6) { for (let x = 1; x < w; x += 4) { if (rng() < .85) { c.fillStyle = cols[Math.floor(rng() * cols.length)]; c.fillRect(x, y + rng() * 1.5, 3, 4); } } c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, y + 4, w, 1); }
  });
  R.texPublico.wrapS = R.texPublico.wrapT = THREE.RepeatWrapping;
  R.matGrada = new THREE.MeshLambertMaterial({ map: R.texPublico });
  const grada = (largo, x, z, ry) => {
    const t = R.texPublico.clone(); t.needsUpdate = true; t.repeat.set(largo / 30, 3);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(largo, 22), new THREE.MeshLambertMaterial({ map: t }));
    const g = new THREE.Group(); m.rotation.x = -Math.PI / 2 + .55; m.position.set(0, 5.5, -9.3); g.add(m);
    const muro = new THREE.Mesh(new THREE.BoxGeometry(largo, 1.4, .5), new THREE.MeshLambertMaterial({ color: 0x1a222c })); muro.position.set(0, .7, 0); g.add(muro);
    g.position.set(x, 0, z); g.rotation.y = ry; S.add(g); return g;
  };
  R.gradas = [grada(PL + 30, 0, -HW - 6, 0), grada(PL + 30, 0, HW + 6, Math.PI), grada(PW + 20, -HL - 7, 0, Math.PI / 2), grada(PW + 20, HL + 7, 0, -Math.PI / 2)];
  // torres de focos (se encienden de noche)
  R.focos = new THREE.Group();
  const matTorre = new THREE.MeshLambertMaterial({ color: 0x5b6470 }), matLuz = new THREE.MeshBasicMaterial({ color: 0xfff8e0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, 30, 6), matTorre); t.position.set(sx * (HL + 14), 15, sz * (HW + 14)); R.focos.add(t);
    const l = new THREE.Mesh(new THREE.BoxGeometry(5, 3, .6), matLuz); l.position.set(sx * (HL + 14), 30.5, sz * (HW + 14)); l.lookAt(0, 0, 0); R.focos.add(l);
  }
  S.add(R.focos);
}
function texturaCesped(cols) {
  return texturaCanvas(1024, 512, (c, w, h) => {
    const n = 18;
    for (let i = 0; i < n; i++) { c.fillStyle = cols[i % 2]; c.fillRect(i * w / n, 0, w / n + 1, h); }
    for (let i = 0; i < 9000; i++) { c.fillStyle = rng() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; c.fillRect(rng() * w, rng() * h, 2, 2); }
  });
}
function aplicarEstilo() {
  const E = ESTILOS[DATOS.ajustes.estilo] || ESTILOS.dia;
  R.scene.background = new THREE.Color(E.cielo);
  R.scene.fog = new THREE.Fog(E.niebla, 120, 260);
  R.hemi.color.set(E.hemi[0]); R.hemi.groundColor.set(E.hemi[1]); R.hemi.intensity = E.hemi[2];
  R.sol.color.set(E.sol[0]); R.sol.intensity = E.sol[1];
  const semillaGuardada = semilla; semilla = 7;
  if (R.matCesped.map) R.matCesped.map.dispose();
  R.matCesped.map = texturaCesped(E.cesped); R.matCesped.needsUpdate = true;
  semilla = semillaGuardada;
  R.matFuera.color.set(E.fuera);
  R.focos.visible = E.focos;
}

// jugadores: una malla por pieza del cuerpo para los 22 (pocas llamadas de dibujo = fluido en el móvil)
function construirJugadores() {
  const S = R.scene, N = 22;
  const lam = () => new THREE.MeshLambertMaterial({ color: 0xffffff });
  const inst = (geo, n, mat = lam()) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; S.add(m); return m; };
  R.torso = inst(new THREE.CylinderGeometry(.27, .22, .6, 8), N);
  R.short = inst(new THREE.CylinderGeometry(.235, .25, .24, 8), N);
  R.pierna = inst(new THREE.BoxGeometry(.14, .58, .15), N * 2);
  R.bota = inst(new THREE.BoxGeometry(.24, .09, .14), N * 2);
  R.brazo = inst(new THREE.BoxGeometry(.11, .5, .11), N * 2);
  R.cabeza = inst(new THREE.SphereGeometry(.21, 9, 7), N);
  R.pelo = inst(new THREE.SphereGeometry(.225, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2), N);
  const sombra = texturaCanvas(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const geoS = new THREE.PlaneGeometry(1.1, 1.1); geoS.rotateX(-Math.PI / 2);
  R.sombra = inst(geoS, N + 1, new THREE.MeshBasicMaterial({ map: sombra, transparent: true, depthWrite: false }));
  // indicador del jugador controlado
  const anillo = new THREE.Mesh(new THREE.RingGeometry(.55, .75, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide, transparent: true, opacity: .95, depthWrite: false }));
  anillo.rotation.x = -Math.PI / 2; S.add(anillo); R.anillo = anillo;
  const flecha = new THREE.Mesh(new THREE.ConeGeometry(.22, .4, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f })); flecha.rotation.x = Math.PI; S.add(flecha); R.flecha = flecha;
  const marca = new THREE.Mesh(new THREE.RingGeometry(.5, .62, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: .7, depthWrite: false }));
  marca.rotation.x = -Math.PI / 2; S.add(marca); R.marca = marca;
  R.M = new THREE.Matrix4(); R.L = new THREE.Matrix4(); R.W = new THREE.Matrix4(); R.Q = new THREE.Quaternion(); R.E = new THREE.Euler(0, 0, 0, 'YZX'); R.V = new THREE.Vector3(); R.U = new THREE.Vector3(1, 1, 1);
}
function colorearJugadores() {
  const c = new THREE.Color();
  G.todos.forEach((p, i) => {
    const E = p.eq;
    c.set(p.por ? E.portero : E.camiseta); R.torso.setColorAt(i, c); R.brazo.setColorAt(i * 2, c); R.brazo.setColorAt(i * 2 + 1, c);
    c.set(p.por ? 0x222222 : E.pantalon); R.short.setColorAt(i, c);
    c.set(p.por ? E.portero : E.medias); R.pierna.setColorAt(i * 2, c); R.pierna.setColorAt(i * 2 + 1, c);
    c.set(0x15161a); R.bota.setColorAt(i * 2, c); R.bota.setColorAt(i * 2 + 1, c);
    c.set(p.piel); R.cabeza.setColorAt(i, c);
    c.set(p.pelo); R.pelo.setColorAt(i, c);
  });
  for (const m of [R.torso, R.short, R.pierna, R.bota, R.brazo, R.cabeza, R.pelo]) m.instanceColor.needsUpdate = true;
}
function construirBalon() {
  const geo = new THREE.IcosahedronGeometry(.17, 1);
  const cols = [], n = geo.attributes.position.count;
  for (let f = 0; f < n / 3; f++) { const k = (f % 5 === 0) ? .12 : 1; for (let j = 0; j < 3; j++) cols.push(k, k, k); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  R.balonC = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  R.scene.add(R.balonC);
  // balón realista: pentágonos negros alrededor de los 12 vértices de un icosaedro
  const g2 = new THREE.IcosahedronGeometry(.15, 3), base = new THREE.IcosahedronGeometry(1, 0).attributes.position, P = g2.attributes.position;
  const vs = []; for (let i = 0; i < base.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(base, i).normalize(); if (!vs.some(w => w.distanceTo(v) < .01)) vs.push(v); }
  const c2 = [], cen = new THREE.Vector3(), a = new THREE.Vector3();
  for (let f = 0; f < P.count / 3; f++) {
    cen.set(0, 0, 0); for (let j = 0; j < 3; j++) cen.add(a.fromBufferAttribute(P, f * 3 + j)); cen.normalize();
    const negro = vs.some(v => v.angleTo(cen) < .3), k = negro ? .08 : .96;
    for (let j = 0; j < 3; j++) c2.push(k, k, k);
  }
  g2.setAttribute('color', new THREE.Float32BufferAttribute(c2, 3));
  R.balonR = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, metalness: 0 }));
  R.balonR.castShadow = true; R.scene.add(R.balonR);
  R.balon = R.balonR;
}
function parte(mesh, idx, lx, ly, lz, rz, rx = 0) {
  R.E.set(rx, 0, rz); R.Q.setFromEuler(R.E); R.V.set(lx, ly, lz);
  R.L.compose(R.V, R.Q, R.U);
  R.W.multiplyMatrices(R.M, R.L);
  mesh.setMatrixAt(idx, R.W);
}
function dibujarJugadores(cuerpos = true) {
  G.todos.forEach((p, i) => {
    R.V.set(p.x, .02, p.z); R.Q.identity(); R.U.set(1, 1, 1); R.M.compose(R.V, R.Q, R.U); R.sombra.setMatrixAt(i, R.M);
    if (!cuerpos) return;
    const sp = hyp(p.vx, p.vz);
    let lean = Math.min(.28, sp * .03), roll = 0, y = 0;
    let amp = Math.min(1, sp / 6) * .9, sw = Math.sin(p.fase) * amp, brazos = -sw * .9, brazoArriba = 0;
    if (p.entrada === 'barrida' || (p.suelo > 0 && !p.por)) { lean = -1.25; y = -.55; sw = .9; }
    else if (p.entrada === 'pie') { lean = .35; sw = 1; }
    if (p.patadaT > 0) sw = Math.sin((1 - p.patadaT / DUR_PATADA) * Math.PI) * 1.3 * (p.pie ? 1 : -1);
    if (p.estirada && p.estirada.t > p.estirada.reac) { const k = Math.min(1, (p.estirada.t - p.estirada.reac) / .25); roll = p.estirada.lado * p.eq.dir * 1.25 * k; y = .35 * Math.sin(k * Math.PI * .8); brazoArriba = 2.6 * k; }
    if (p.celebra > 0 && G.fase === 'gol') { y = Math.abs(Math.sin(p.celebra * 7)) * .45; brazoArriba = 2.8; }
    if (p.por && G.balon.dueno === p && p.retener > 0) brazoArriba = 1.4;
    if (lean > -1 && !p.estirada) { roll += p.inclLat; lean -= p.frenado; }
    R.E.set(roll, -p.cara, -lean); R.Q.setFromEuler(R.E); R.V.set(p.x, y, p.z);
    R.M.compose(R.V, R.Q, R.U);
    parte(R.torso, i, 0, 1.08, 0, 0); parte(R.short, i, 0, .72, 0, 0);
    parte(R.cabeza, i, 0, 1.6, 0, 0); parte(R.pelo, i, -.02, 1.63, 0, 0);
    for (let s = 0; s < 2; s++) {
      const lado = s ? 1 : -1, a = (s ? sw : -sw);
      parte(R.pierna, i * 2 + s, Math.sin(a) * .29, .66 - Math.cos(a) * .29, lado * .11, a);
      parte(R.bota, i * 2 + s, .05 * Math.cos(a) + .6 * Math.sin(a), .66 + .05 * Math.sin(a) - .6 * Math.cos(a), lado * .11, a);
      const b = (s ? brazos : -brazos) + (brazoArriba ? brazoArriba : 0);
      parte(R.brazo, i * 2 + s, Math.sin(b) * .24, 1.33 - Math.cos(b) * .24, lado * .34, b, lado * -.12);
    }
  });
  const b = G.balon;
  const k = Math.max(.4, 1 - b.y * .15); R.V.set(b.x, .015, b.z); R.Q.identity(); R.U.set(k * .45, 1, k * .45); R.M.compose(R.V, R.Q, R.U); R.sombra.setMatrixAt(22, R.M); R.U.set(1, 1, 1);
  for (const m of [R.torso, R.short, R.pierna, R.bota, R.brazo, R.cabeza, R.pelo, R.sombra]) m.instanceMatrix.needsUpdate = true;
  const yb = R.balon === R.balonR ? .04 : .06;
  R.balon.position.set(b.x, b.y + yb, b.z); R.balon.rotation.set(b.rotX, 0, b.rotZ);
  const c = G.ctrl;
  const ver = !!c && !G.autoplay && G.fase !== 'fin';
  R.anillo.visible = R.flecha.visible = ver;
  if (ver) {
    R.anillo.position.set(c.x, .03, c.z);
    R.flecha.position.set(c.x, 2.35 + Math.sin(G.t * 6) * .08, c.z); R.flecha.rotation.y = G.t * 2;
  }
  const d = b.destino;
  R.marca.visible = !!(d && !b.dueno && d.eq.i === G.usuario && d !== c);
  if (R.marca.visible) R.marca.position.set(d.x, .03, d.z);
}
/* ---------- jugadores realistas ----------
   Proporciones humanas (1,80 m), articulaciones en hombros, codos, caderas, rodillas y tobillos, número en la
   espalda y sombras de verdad. Igual que el modelo de caricatura: una malla por pieza para los 22 jugadores. */
const MODELO_REAL = () => DATOS.ajustes.modelo !== 'caricatura';
function unirGeos(geos) { // une varias piezas sencillas en una sola geometría
  const pos = [], nor = [];
  for (const g0 of geos) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
function construirReal() {
  const S = R.scene, N = 22;
  const mat = rough => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: rough, metalness: 0 });
  const tela = mat(.85), piel = mat(.62), cuero = mat(.4);
  const inst = (geo, n, m) => { const x = new THREE.InstancedMesh(geo, m, n); x.instanceMatrix.setUsage(THREE.DynamicDrawUsage); x.frustumCulled = false; x.castShadow = true; S.add(x); return x; };
  const cil = (rt, rb, h, sg = 10) => new THREE.CylinderGeometry(rt, rb, h, sg).translate(0, -h / 2, 0); // cuelga de su articulación
  const esf = (r, a = 10, b = 8) => new THREE.SphereGeometry(r, a, b);
  // tronco (camiseta) con hombros; las coordenadas son las del cuerpo de pie: x adelante, y arriba, z a los lados
  R.rTorso = inst(unirGeos([
    new THREE.CylinderGeometry(.215, .16, .46, 14).scale(.6, 1, 1).translate(0, 1.24, 0),
    new THREE.CylinderGeometry(.162, .168, .1, 14).scale(.62, 1, 1).translate(0, 1.02, 0),
    esf(.072).scale(1, .9, 1).translate(0, 1.4, -.19), esf(.072).scale(1, .9, 1).translate(0, 1.4, .19),
  ]), N, tela);
  R.rShort = inst(new THREE.CylinderGeometry(.165, .18, .2, 14).scale(.7, 1, 1).translate(0, .965, 0), N, tela);
  R.rMusloS = inst(cil(.093, .087, .21), N * 2, tela);
  R.rMuslo = inst(cil(.07, .05, .42, 9), N * 2, piel);
  R.rTibia = inst(unirGeos([cil(.056, .039, .42, 9), esf(.05, 9, 6).scale(1, 1.9, .95).translate(-.008, -.14, 0)]), N * 2, tela);
  R.rBota = inst(unirGeos([new THREE.BoxGeometry(.24, .075, .1).translate(.05, -.04, 0), esf(.05, 8, 6).scale(1, .75, 1).translate(.16, -.042, 0)]), N * 2, cuero);
  R.rCabeza = inst(unirGeos([
    new THREE.CylinderGeometry(.05, .057, .13, 9).translate(0, 1.51, 0),
    esf(.112, 16, 12).scale(1.05, 1.12, .94).translate(.005, 1.655, 0),
    new THREE.BoxGeometry(.035, .05, .03).translate(.118, 1.64, 0),
    esf(.028, 6, 5).translate(0, 1.655, .106), esf(.028, 6, 5).translate(0, 1.655, -.106),
  ]), N, piel);
  R.rPelo = inst(new THREE.SphereGeometry(.121, 16, 8, 0, Math.PI * 2, 0, Math.PI * .52).scale(1.08, 1, .98).translate(-.015, 1.672, 0), N, tela);
  R.rBrazo = inst(cil(.043, .036, .28, 9), N * 2, piel);
  R.rManga = inst(cil(.061, .055, .13, 9), N * 2, tela);
  R.rAntebrazo = inst(unirGeos([cil(.037, .03, .24, 9), esf(.043, 8, 6).scale(1, 1.25, .7).translate(0, -.28, 0)]), N * 2, piel);
  // números en la espalda: una textura con los números 0-31 y cada jugador elige su casilla
  const tex = texturaCanvas(512, 256, c => {
    c.font = 'bold 46px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 7; c.strokeStyle = 'rgba(0,0,0,.5)'; c.fillStyle = '#fff';
    for (let n = 0; n < 32; n++) { const x = (n % 8) * 64 + 32, y = Math.floor(n / 8) * 64 + 34; c.strokeText(String(n), x, y); c.fillText(String(n), x, y); }
  });
  const geoN = new THREE.PlaneGeometry(.2, .2).rotateY(-Math.PI / 2).translate(-.124, 1.27, 0);
  geoN.setAttribute('aNum', new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
  const matN = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: .35 });
  matN.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aNum;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n\tvUv = vUv * vec2(.125, .25) + vec2(mod(aNum, 8.) * .125, (3. - floor(aNum / 8.)) * .25);');
  };
  R.rNum = inst(geoN, N, matN); R.rNum.castShadow = false;
  R.real = [R.rTorso, R.rShort, R.rMusloS, R.rMuslo, R.rTibia, R.rBota, R.rCabeza, R.rPelo, R.rBrazo, R.rManga, R.rAntebrazo, R.rNum];
  R.E2 = new THREE.Euler(0, 0, 0, 'YZX'); R.Q2 = new THREE.Quaternion(); R.V2 = new THREE.Vector3(); R.L2 = new THREE.Matrix4(); R.U1 = new THREE.Vector3(1, 1, 1);
  R.Mt = new THREE.Matrix4(); R.Ma = new THREE.Matrix4(); R.Mb = new THREE.Matrix4(); R.Mc = new THREE.Matrix4(); R.T1 = new THREE.Matrix4().makeTranslation(0, -1, 0);
}
function colorearReal() {
  const c = new THREE.Color(), pon = (m, i, col) => { c.set(col); m.setColorAt(i, c); };
  G.todos.forEach((p, i) => {
    const E = p.eq, cam = p.por ? E.portero : E.camiseta, pan = p.por ? 0x24262c : E.pantalon;
    pon(R.rTorso, i, cam); pon(R.rShort, i, pan); pon(R.rCabeza, i, p.piel); pon(R.rPelo, i, p.pelo);
    for (let s = 0; s < 2; s++) {
      const j = i * 2 + s;
      pon(R.rMusloS, j, pan); pon(R.rMuslo, j, p.piel); pon(R.rTibia, j, p.por ? E.portero : E.medias); pon(R.rBota, j, 0x17181c);
      pon(R.rManga, j, cam); pon(R.rBrazo, j, p.por ? cam : p.piel); pon(R.rAntebrazo, j, p.por ? 0xe9edf2 : p.piel); // el portero lleva manga larga y guantes
    }
    R.rNum.geometry.attributes.aNum.array[i] = p.num;
  });
  R.real.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  R.rNum.geometry.attributes.aNum.needsUpdate = true;
}
// articulación: out = padre · trasladar(px,py,pz) · girar(rx, ry, rz)
function junta(out, padre, px, py, pz, rz, rx = 0, ry = 0) {
  R.E2.set(rx, ry, rz); R.Q2.setFromEuler(R.E2); R.V2.set(px, py, pz); R.L2.compose(R.V2, R.Q2, R.U1);
  return out.multiplyMatrices(padre, R.L2);
}
// dibuja jugadores con el modelo realista. K: juego de mallas (R para el partido, R.menu.K para el menú)
function dibujarReal(K = R, lista = G.todos) {
  const b = G.balon;
  const th = [0, 0], kn = [0, 0], ua = [0, 0], ab = [0, 0], co = [0, 0];
  lista.forEach((p, i) => {
    const sp = hyp(p.vx, p.vz), A = Math.min(1, sp / 7.5), f = p.fase;
    // ciclo de carrera: la rodilla se dobla sobre todo cuando la pierna va hacia delante
    let lean = .04 + A * .2, giro = A * .12 * Math.sin(f), y = A * .05 * Math.abs(Math.cos(f)), roll = 0, atras = 0, arriba = 0;
    for (let s = 0; s < 2; s++) {
      const fs = f + s * Math.PI;
      th[s] = A * .85 * Math.sin(fs); kn[s] = .06 + A * (.2 + 1.25 * Math.max(0, Math.cos(fs)));
      ua[s] = -A * .7 * Math.sin(fs); ab[s] = .1; co[s] = .25 + A * .9;
    }
    if (sp < .3) { th[0] = .05; th[1] = -.05; kn[0] = kn[1] = .12; co[0] = co[1] = .3; lean = .06 + Math.sin(G.t * 2 + i) * .012; giro = 0; y = 0; }
    if (p.toqueT > 0 && (sp > .9 || p.malabar)) { // toque de conducción: la pierna se adelanta un poco
      const k = p.pie, w = Math.sin((1 - p.toqueT / .2) * Math.PI);
      th[k] = th[k] * (1 - w) + .55 * w; kn[k] = kn[k] * (1 - w) + .25 * w;
    }
    if (p.patadaT > 0) { // golpeo: pierna atrás, contacto con el balón (u = 0,3) y acompañamiento
      const k = p.pie, o = 1 - k, u = 1 - p.patadaT / DUR_PATADA;
      if (u < .15) { th[k] = -.6 * u / .15; kn[k] = 1.2 * u / .15; }
      else if (u < .3) { th[k] = -.6 + .85 * (u - .15) / .15; kn[k] = 1.2 - .8 * (u - .15) / .15; }
      else { const v = Math.min(1, (u - .3) / .3); th[k] = .25 + .9 * v; kn[k] = .4 * (1 - v); }
      th[o] = -.1; kn[o] = .3; ab[0] = ab[1] = .5; lean = .1 + (u > .3 ? .1 : 0); giro = (k ? -1 : 1) * .2 * Math.sin(u * Math.PI);
    }
    if (p.entrada === 'pie') { th[1] = 1.1; kn[1] = .25; th[0] = -.2; kn[0] = .5; lean = .3; }
    if (p.entrada === 'barrida' || (p.suelo > 0 && !p.por)) { atras = 1.2; y = -.08; th[1] = .35; kn[1] = .05; th[0] = 0; kn[0] = 1; ab[0] = ab[1] = .9; lean = 0; giro = 0; }
    if (p.tropiezo > 0 && !p.entrada) lean = .45;
    if (p.estirada && p.estirada.t > p.estirada.reac) { const k = Math.min(1, (p.estirada.t - p.estirada.reac) / .25); roll = p.estirada.lado * p.eq.dir * 1.3 * k; y = .4 * Math.sin(k * Math.PI * .8); arriba = 2.7 * k; th[0] = th[1] = .15; }
    if (p.celebra > 0 && G.fase === 'gol') { y = Math.abs(Math.sin(p.celebra * 7)) * .45; arriba = 2.7; }
    const enManos = p.por && b.dueno === p && p.retener > 0;
    // estaturas algo distintas; todos un 12 % más grandes que en la realidad para que se vean bien en el celular
    const alto = 1.12 * (.95 + ((p.num * 7 + p.eq.i * 5) % 11) * .01);
    if (!atras && !p.estirada) { roll += p.inclLat; lean -= p.frenado; }
    R.E.set(roll, -p.cara, atras); R.Q.setFromEuler(R.E); R.V.set(p.x, y, p.z); R.U.set(alto, alto, alto);
    R.M.compose(R.V, R.Q, R.U); R.U.set(1, 1, 1);
    // tronco: gira e inclina desde la cintura
    junta(R.Mt, R.M, 0, 1, 0, -lean, 0, giro); R.Mt.multiply(R.T1);
    K.rTorso.setMatrixAt(i, R.Mt); K.rCabeza.setMatrixAt(i, R.Mt); K.rPelo.setMatrixAt(i, R.Mt); K.rNum.setMatrixAt(i, R.Mt);
    K.rShort.setMatrixAt(i, R.M);
    for (let s = 0; s < 2; s++) {
      const lado = s ? 1 : -1, j = i * 2 + s;
      junta(R.Ma, R.M, 0, .93, lado * .095, th[s], -lado * .03);
      K.rMuslo.setMatrixAt(j, R.Ma); K.rMusloS.setMatrixAt(j, R.Ma);
      junta(R.Mb, R.Ma, 0, -.42, 0, -kn[s]); K.rTibia.setMatrixAt(j, R.Mb);
      junta(R.Mc, R.Mb, 0, -.42, 0, -(th[s] - kn[s]) * .8); K.rBota.setMatrixAt(j, R.Mc);
      let za = ua[s], xa = -lado * ab[s], codo = co[s];
      if (arriba) { za = 0; xa = -lado * arriba; codo = .15; }
      if (enManos) { za = 1.1; xa = -lado * .2; codo = .9; }
      junta(R.Ma, R.Mt, 0, 1.41, lado * .2, za, xa);
      K.rBrazo.setMatrixAt(j, R.Ma); K.rManga.setMatrixAt(j, R.Ma);
      junta(R.Mb, R.Ma, 0, -.28, 0, codo); K.rAntebrazo.setMatrixAt(j, R.Mb);
    }
  });
  K.real.forEach(m => { m.instanceMatrix.needsUpdate = true; });
}
/* ---------- escena del menú: un jugador haciendo toques bajo un foco, en un estadio de noche ---------- */
function construirMenu3D() {
  const S = new THREE.Scene();
  S.background = texturaCanvas(1024, 576, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#071425'); g.addColorStop(.55, '#0b2236'); g.addColorStop(1, '#04080c');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // haces de luz de los focos
    for (const [x, ang] of [[.12, .5], [.88, -.5], [.35, .2], [.65, -.2]]) {
      c.save(); c.translate(x * w, 30); c.rotate(ang); const lg = c.createLinearGradient(0, 0, 0, h * .9); lg.addColorStop(0, 'rgba(190,220,255,.22)'); lg.addColorStop(1, 'rgba(190,220,255,0)');
      c.fillStyle = lg; c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); c.lineTo(130, h); c.lineTo(-130, h); c.closePath(); c.fill(); c.restore();
      const rg = c.createRadialGradient(x * w, 30, 2, x * w, 30, 70); rg.addColorStop(0, 'rgba(255,255,245,.95)'); rg.addColorStop(.25, 'rgba(200,225,255,.45)'); rg.addColorStop(1, 'rgba(200,225,255,0)');
      c.fillStyle = rg; c.fillRect(x * w - 80, 0, 160, 110);
    }
    // gradas con el público desenfocado (puntitos de colores)
    const cols = ['255,210,63', '47,123,255', '232,70,58', '243,246,238', '127,209,255', '255,138,101'];
    for (let i = 0; i < 2600; i++) { const y = h * (.42 + Math.random() * .36), x = Math.random() * w, r = 1 + Math.random() * 2.6; c.fillStyle = `rgba(${cols[Math.floor(Math.random() * cols.length)]},${.12 + Math.random() * .28})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    const v = c.createLinearGradient(0, h * .7, 0, h); v.addColorStop(0, 'rgba(4,8,12,0)'); v.addColorStop(1, 'rgba(4,8,12,.95)'); c.fillStyle = v; c.fillRect(0, h * .7, w, h * .3);
  });
  S.fog = new THREE.Fog(0x05101a, 9, 30);
  S.add(new THREE.HemisphereLight(0xa9c4ff, 0x0b1a10, .5));
  const foco = new THREE.SpotLight(0xfff1d8, 2.2, 40, .42, .6, 1); foco.position.set(2.5, 11, 4); foco.castShadow = true; foco.shadow.mapSize.set(1024, 1024); foco.shadow.bias = -.0005;
  S.add(foco, foco.target);
  const contra = new THREE.DirectionalLight(0x7fd3ff, .9); contra.position.set(-5, 4, -7); S.add(contra);
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(18, 64), new THREE.MeshLambertMaterial({ map: texturaCesped(['#2a6e31', '#235f29']) }));
  suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; S.add(suelo);
  const K = { real: [] };
  for (const k of ['rTorso', 'rShort', 'rMusloS', 'rMuslo', 'rTibia', 'rBota', 'rCabeza', 'rPelo', 'rBrazo', 'rManga', 'rAntebrazo']) {
    const m = new THREE.InstancedMesh(R[k].geometry, R[k].material, k === 'rTorso' || k === 'rShort' || k === 'rCabeza' || k === 'rPelo' ? 1 : 2);
    m.castShadow = true; m.frustumCulled = false; S.add(m); K[k] = m; K.real.push(m);
  }
  const gN = R.rNum.geometry.clone(); gN.setAttribute('aNum', new THREE.InstancedBufferAttribute(new Float32Array([10]), 1));
  K.rNum = new THREE.InstancedMesh(gN, R.rNum.material, 1); K.rNum.frustumCulled = false; S.add(K.rNum); K.real.push(K.rNum);
  const col = new THREE.Color(), pon = (m, i, c) => { col.set(c); m.setColorAt(i, col); };
  const cam = 0xf2b51c, pan = 0x0e1520, piel = 0xc98d63;
  pon(K.rTorso, 0, cam); pon(K.rShort, 0, pan); pon(K.rCabeza, 0, piel); pon(K.rPelo, 0, 0x1d1510);
  for (let s = 0; s < 2; s++) { pon(K.rMusloS, s, pan); pon(K.rMuslo, s, piel); pon(K.rTibia, s, cam); pon(K.rBota, s, 0x111317); pon(K.rManga, s, cam); pon(K.rBrazo, s, piel); pon(K.rAntebrazo, s, piel); }
  K.real.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  const balon = new THREE.Mesh(R.balonR.geometry, R.balonR.material); balon.castShadow = true; S.add(balon);
  const p = { x: 0, z: 0, vx: 0, vz: 0, cara: 0, fase: 0, patadaT: 0, pie: 0, toqueT: 0, num: 10, eq: { i: 0, dir: 1 }, inclLat: 0, frenado: 0, malabar: true, por: false, celebra: 0, suelo: 0, tropiezo: 0 };
  R.menu = { S, K, balon, p, t: 0, foco };
}
// toques con los dos pies (el balón sube y baja al ritmo de la pierna) y cámara que gira despacio alrededor
function animarMenu3D(dt) {
  const E = R.menu, p = E.p, b = E.balon; E.t += dt;
  const per = .64, n = Math.floor(E.t / per), fase = (E.t % per) / per, desde = fase * per, hasta = per - desde;
  if (desde < .1) { p.pie = n % 2; p.toqueT = .1 - desde; } else if (hasta < .1) { p.pie = (n + 1) % 2; p.toqueT = .1 + hasta; } else p.toqueT = 0;
  const lado = k => (k ? 1 : -1) * .12, z0 = lado(n % 2), z1 = lado((n + 1) % 2);
  b.position.set(.42, .3 + 4.4 * fase * (1 - fase) * 1.05, z0 + (z1 - z0) * fase);
  b.rotation.x += dt * 5; b.rotation.z -= dt * 3;
  dibujarReal(E.K, [p]);
  const a = .55 + Math.sin(E.t * .12) * .5, cam = R.cam, ancho = innerWidth, alto = innerHeight;
  // en vertical la cámara se aleja para que el jugador quepa entre el título y los botones
  const vertical = ancho <= alto * 1.1, dist = vertical ? 6.4 : 4.6, portada = typeof APP !== 'undefined' && APP.enPortada;
  cam.fov = 36; cam.position.set(Math.cos(a) * dist, 1.35 + Math.sin(E.t * .2) * .1, Math.sin(a) * dist); cam.lookAt(0, 1.05, 0);
  // en pantallas anchas el jugador queda a la derecha y los menús a la izquierda; en vertical, arriba (menú) o abajo (portada)
  if (!vertical) cam.setViewOffset(ancho, alto, -ancho * .2, 0, ancho, alto);
  else cam.setViewOffset(ancho, alto, 0, alto * (portada ? -.1 : .13), ancho, alto);
  cam.updateProjectionMatrix();
}

function aplicarModelo() {
  const real = MODELO_REAL();
  R.real.forEach(m => m.visible = real);
  [R.torso, R.short, R.pierna, R.bota, R.brazo, R.cabeza, R.pelo].forEach(m => m.visible = !real);
  R.balonR.visible = real; R.balonC.visible = !real; R.balon = real ? R.balonR : R.balonC;
  actualizarSombras();
}
// sombras de verdad solo con el modelo realista; en "Automático" se quitan primero si el juego va lento
function actualizarSombras() {
  const q = DATOS.ajustes.calidad;
  const on = MODELO_REAL() && (q === 'alta' || (q === 'auto' && R.sombrasAuto));
  R.sol.castShadow = on;
  R.sombra.visible = !on;
}

// cámara: sigue al balón
function moverCamara(dt) {
  const b = G.balon, cam = R.cam, modo = DATOS.ajustes.cam;
  if (cam.view && cam.view.enabled) cam.clearViewOffset();
  const aspecto = window.innerWidth / Math.max(1, window.innerHeight);
  const vertical = aspecto < 1;
  const lead = G.autoplay ? 0 : eqUsuario().dir * 4;
  // en la carrera de jugador la cámara mira entre el balón y tu jugador
  const yo = G.unJugador, fx = yo ? b.x * .6 + yo.x * .4 : b.x, fz = yo ? b.z * .6 + yo.z * .4 : b.z;
  const objX = clamp(fx + lead, -HL + (modo === 'arriba' ? 10 : 14), HL - (modo === 'arriba' ? 10 : 14));
  const objZ = clamp(fz * .7, -HW + 10, HW - 8);
  const k = 1 - Math.exp(-dt * 4.5);
  R.camX += (objX - R.camX) * k; R.camZ += (objZ - R.camZ) * k;
  let h, d, fov;
  if (modo === 'arriba') { h = 44; d = 8; fov = 40; }
  else if (modo === 'lejos') { h = 30; d = 36; fov = 34; }
  else { h = 21; d = 25; fov = 38; }
  if (vertical) { const f = 1 + (1 / aspecto - 1) * .55; h *= f; d *= f; }
  else if (window.innerHeight < 520 && modo !== 'arriba') { h *= .86; d *= .86; } // celular en horizontal: un poco más cerca
  cam.fov = fov; cam.position.set(R.camX, h, R.camZ + d); cam.lookAt(R.camX, 0, R.camZ - (modo === 'arriba' ? 0 : 3)); cam.updateProjectionMatrix();
  if (R.sol.castShadow) {
    const ancho = modo === 'lejos' ? 44 : 34, sc = R.sol.shadow.camera;
    if (sc.right !== ancho) { sc.left = sc.bottom = -ancho; sc.right = sc.top = ancho; sc.updateProjectionMatrix(); }
    R.sol.position.set(R.camX - 30, 60, R.camZ + 25); R.sol.target.position.set(R.camX, 0, R.camZ);
  }
}
function ajustarTamano() {
  if (!R) return;
  const q = DATOS.ajustes.calidad;
  const dpr = window.devicePixelRatio || 1;
  let ratio = q === 'alta' ? Math.min(dpr, 2) : q === 'media' ? Math.min(dpr, 1.5) : q === 'baja' ? Math.min(dpr, 1) * .75 : Math.min(dpr, 2) * R.calidad;
  R.renderer.setPixelRatio(Math.max(.5, ratio));
  R.renderer.setSize(window.innerWidth, window.innerHeight, false);
  R.cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); R.cam.updateProjectionMatrix();
  document.body.classList.toggle('vertical', window.innerHeight > window.innerWidth);
  const gr = q === 'baja' || (q === 'auto' && R.calidad < .6);
  if (R.gradas) R.gradas.forEach((g, i) => g.visible = !gr || i === 0);
  if (R.real) actualizarSombras();
}
// calidad automática: si va lento, baja la resolución
function medirFps(dt) {
  if (DATOS.ajustes.calidad !== 'auto' || G.pausa) return;
  R.fpsT += dt; R.fpsN++;
  if (R.fpsT >= 3) {
    const fps = R.fpsN / R.fpsT; R.fpsT = 0; R.fpsN = 0; G.fps = Math.round(fps);
    if (fps < 45 && R.sombrasAuto && R.sol.castShadow) { R.sombrasAuto = false; actualizarSombras(); }
    else if (fps < 45 && R.calidad > .5) { R.calidad = Math.max(.5, R.calidad - .2); ajustarTamano(); }
    else if (fps > 58 && R.calidad < 1 && R.autoBajado++ > 3) { R.calidad = Math.min(1, R.calidad + .1); R.autoBajado = 0; ajustarTamano(); }
  }
}
