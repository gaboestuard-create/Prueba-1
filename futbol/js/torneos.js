'use strict';
/* Pelotazo · torneos: liga (de cualquiera de las 8 ligas), copa por eliminatorias y Copa de Campeones (grupos +
   eliminatorias). Se guarda en DATOS.torneo y usa la base de datos (APP.mundo) sin cambiar a sus jugadores.
   T = { tipo, nombre, equipos, usuario (club que controlas o null), fase, ronda, terminado, campeon, goleadores,
         liga: { calendario, jornada, tabla },  grupos: [{ equipos, calendario, jornada, tabla }],  rondas: [[{ a, b, gl, gv, pen, ganador }]] } */
const NOMBRE_RONDA = n => ({ 2: 'Final', 4: 'Semifinales', 8: 'Cuartos de final', 16: 'Octavos de final', 32: 'Dieciseisavos de final' }[n] || 'Ronda de ' + n);
const mejoresClubes = (M, n) => M.clubes.slice().sort((a, b) => fuerzaDe(M, b) - fuerzaDe(M, a)).slice(0, n).map(c => c.id);

function crearTorneo(tipo, equipos, usuario, nombre) {
  const T = { tipo, nombre, equipos: equipos.slice(), usuario, creado: Date.now(), terminado: false, campeon: null, goleadores: {}, ronda: 0, ultimos: [] };
  if (tipo === 'liga') { T.fase = 'liga'; T.liga = { calendario: calendarioLiga(equipos), jornada: 0, tabla: tablaNueva(equipos) }; }
  else if (tipo === 'campeones') {
    T.fase = 'grupos';
    const bombos = equipos.slice(); // por fuerza: un cabeza de serie por grupo
    T.grupos = [0, 1, 2, 3].map(() => ({ equipos: [] }));
    for (let b = 0; b < 4; b++) { const bombo = bombos.slice(b * 4, b * 4 + 4).sort(() => AZ() - .5); bombo.forEach((id, g) => T.grupos[g].equipos.push(id)); }
    T.grupos.forEach(g => { g.calendario = calendarioLiga(g.equipos); g.jornada = 0; g.tabla = tablaNueva(g.equipos); });
  } else { T.fase = 'ko'; T.rondas = [emparejar(equipos.slice().sort(() => AZ() - .5))]; }
  return T;
}
function emparejar(ids) { const r = []; for (let i = 0; i < ids.length; i += 2) r.push({ a: ids[i], b: ids[i + 1], gl: null, gv: null, pen: null, ganador: null }); return r; }
// partidos pendientes de la jornada/ronda actual: [{ a, b, ref }] (ref apunta a donde se apunta el resultado)
function partidosPendientes(T) {
  if (T.terminado) return [];
  if (T.fase === 'liga') return (T.liga.calendario[T.liga.jornada] || []).map(([a, b]) => ({ a, b }));
  if (T.fase === 'grupos') return T.grupos.flatMap((g, gi) => (g.calendario[g.jornada] || []).map(([a, b]) => ({ a, b, grupo: gi })));
  return T.rondas[T.ronda].filter(p => p.ganador == null).map(p => ({ a: p.a, b: p.b, ko: p }));
}
const nombreJornada = T => T.fase === 'liga' ? `Jornada ${T.liga.jornada + 1} de ${T.liga.calendario.length}` : T.fase === 'grupos' ? `Fase de grupos · jornada ${T.grupos[0].jornada + 1} de ${T.grupos[0].calendario.length}` : NOMBRE_RONDA(T.rondas[T.ronda].length * 2);
function penaltis() { let a = 0, b = 0; for (let i = 0; i < 5; i++) { if (AZ() < .76) a++; if (AZ() < .76) b++; } while (a === b) { if (AZ() < .76) a++; if (AZ() < .76) b++; } return [a, b]; }
function apuntarResultado(T, p, res) {
  for (const g of res.goles) if (g.id != null && !g.propia) T.goleadores[g.id] = (T.goleadores[g.id] || 0) + 1;
  T.ultimos.push({ a: p.a, b: p.b, gl: res.gl, gv: res.gv });
  if (T.fase === 'liga') sumarATabla(T.liga.tabla, p.a, p.b, res.gl, res.gv);
  else if (T.fase === 'grupos') sumarATabla(T.grupos[p.grupo].tabla, p.a, p.b, res.gl, res.gv);
  else {
    const k = p.ko; k.gl = res.gl; k.gv = res.gv;
    if (res.gl === res.gv) { k.pen = penaltis(); k.ganador = k.pen[0] > k.pen[1] ? k.a : k.b; }
    else k.ganador = res.gl > res.gv ? k.a : k.b;
  }
}
// cuando ya no quedan partidos de la jornada: avanza de jornada, de fase o termina
function cerrarJornada(T) {
  if (T.fase === 'liga') {
    T.liga.jornada++;
    if (T.liga.jornada >= T.liga.calendario.length) { T.terminado = true; T.campeon = ordenarTabla(T.liga.tabla)[0].id; }
  } else if (T.fase === 'grupos') {
    T.grupos.forEach(g => g.jornada++);
    if (T.grupos[0].jornada >= T.grupos[0].calendario.length) { // pasan los dos primeros: 1º de un grupo contra 2º de otro
      const c = T.grupos.map(g => ordenarTabla(g.tabla).slice(0, 2).map(x => x.id));
      T.fase = 'ko'; T.ronda = 0; T.rondas = [emparejar([c[0][0], c[1][1], c[1][0], c[0][1], c[2][0], c[3][1], c[3][0], c[2][1]])];
    }
  } else {
    const r = T.rondas[T.ronda];
    if (r.length === 1) { T.terminado = true; T.campeon = r[0].ganador; }
    else { T.rondas.push(emparejar(r.map(p => p.ganador))); T.ronda++; }
  }
}
// simula todos los partidos pendientes que no son del usuario
function simularResto_T(T, salvo) {
  const M = APP.mundo;
  for (const p of partidosPendientes(T)) { if (salvo && p.a === salvo.a && p.b === salvo.b) continue; apuntarResultado(T, p, simularPartido(M, p.a, p.b, { neutral: T.tipo !== 'liga' })); }
}
function partidoDelUsuario(T) { return T.usuario == null ? null : partidosPendientes(T).find(p => p.a === T.usuario || p.b === T.usuario) || null; }
function guardarTorneo() { DATOS.torneo = APP.torneo; return guardarAhora(); }

/* ---------- pantallas ---------- */
function menuTorneos() {
  APP.torneo = DATOS.torneo;
  if (APP.torneo) return hubTorneo();
  pantalla(`<p class="intro">Crea una competición. Juegas los partidos de tu club (o los simulas) y el resto se juega solo.</p>
    <div class="modos">
      <button class="modo modo-torneos" data-acc="liga"><b>Liga</b><span>Cualquiera de las 8 ligas, a doble vuelta</span></button>
      <button class="modo modo-dt" data-acc="copa"><b>Copa</b><span>Eliminatorias a partido único, con penaltis</span></button>
      <button class="modo modo-estrella" data-acc="campeones"><b>Copa de Campeones</b><span>Los 16 mejores clubes: grupos y eliminatorias</span></button>
    </div>`, {
    titulo: 'Torneos', atras: menuPrincipal, acciones: {
      liga: () => elegirLigaTorneo(),
      copa: () => elegirTamCopa(),
      campeones: () => { const eq = mejoresClubes(APP.mundo, 16); elegirMiClub('campeones', eq, 'Copa de Campeones'); },
    },
  });
}
function elegirLigaTorneo() {
  const M = APP.mundo;
  pantalla(`<div class="clubes">${M.ligas.map(l => `<button class="club" data-acc="l" data-id="${l.id}"><span><b>${esc(l.nombre)}</b><small>${esc(l.pais)} · ${l.clubes.length} clubes</small></span></button>`).join('')}</div>`, {
    titulo: 'Elige la liga', atras: menuTorneos, acciones: { l: d => { const L = ligaDe(M, d.id); elegirMiClub('liga', L.clubes, L.nombre); } },
  });
}
function elegirTamCopa() {
  pantalla(`<div class="etq">Número de equipos</div><div class="seg">${[8, 16, 32].map(n => `<button data-acc="n" data-n="${n}">${n} equipos</button>`).join('')}</div>
    <p class="nota">Entran los mejores clubes de todas las ligas.</p>`, {
    titulo: 'Copa', atras: menuTorneos, acciones: { n: d => elegirMiClub('copa', mejoresClubes(APP.mundo, +d.n), `Copa de ${d.n}`) },
  });
}
function elegirMiClub(tipo, equipos, nombre) {
  const M = APP.mundo;
  const lista = equipos.map(id => M.clubes[id]).sort((a, b) => b.rep - a.rep);
  pantalla(`<p class="intro">¿Con qué club juegas? También puedes no elegir ninguno y ver cómo se simula todo.</p>
    <div class="clubes">${lista.map(c => `<button class="club" data-acc="c" data-id="${c.id}">${escudoHTML(c, 40)}<span><b>${esc(c.nombre)}</b><small>${estrellasHTML(c.rep)}</small></span></button>`).join('')}</div>
    <div class="acciones"><button class="btn" data-acc="ninguno">Ninguno, solo simular</button></div>`, {
    titulo: nombre, atras: menuTorneos, acciones: {
      c: d => empezarTorneo(tipo, equipos, +d.id, nombre),
      ninguno: () => empezarTorneo(tipo, equipos, null, nombre),
    },
  });
}
function empezarTorneo(tipo, equipos, usuario, nombre) { APP.torneo = crearTorneo(tipo, equipos, usuario, nombre); guardarTorneo(); hubTorneo(); }

function tablaHTML(M, tabla, resaltar, n = 99) {
  const filas = ordenarTabla(tabla).slice(0, n);
  return `<div class="tabla-w"><table class="t"><thead><tr><th>#</th><th>Club</th><th class="n">PJ</th><th class="n">G</th><th class="n">E</th><th class="n">P</th><th class="n">GF</th><th class="n">GC</th><th class="n">Pts</th></tr></thead><tbody>
    ${filas.map((f, i) => `<tr class="${f.id === resaltar ? 'yo' : ''}"><td>${i + 1}</td><td><span class="celda-club">${escudoHTML(M.clubes[f.id], 22)}${esc(M.clubes[f.id].nombre)}</span></td><td class="n">${f.pj}</td><td class="n">${f.g}</td><td class="n">${f.e}</td><td class="n">${f.p}</td><td class="n">${f.gf}</td><td class="n">${f.gc}</td><td class="n"><b>${f.pts}</b></td></tr>`).join('')}
    </tbody></table></div>`;
}
function rondasHTML(M, T) {
  return T.rondas.map(r => `<div class="panel"><h3>${NOMBRE_RONDA(r.length * 2)}</h3>${r.map(p => {
    const A = M.clubes[p.a], B = M.clubes[p.b];
    const res = p.gl == null ? '–' : `${p.gl} - ${p.gv}${p.pen ? ` <small>(pen. ${p.pen[0]}-${p.pen[1]})</small>` : ''}`;
    return `<div class="fila-j"><span class="info"><b class="${p.ganador === p.a ? '' : p.ganador != null ? 'nota' : ''}">${escudoHTML(A, 20)} ${esc(A.nombre)}</b><b class="${p.ganador === p.b ? '' : p.ganador != null ? 'nota' : ''}">${escudoHTML(B, 20)} ${esc(B.nombre)}</b></span><span>${res}</span></div>`;
  }).join('')}</div>`).reverse().join('');
}
function goleadoresHTML(M, gol, n = 8) {
  const L = Object.entries(gol).sort((a, b) => b[1] - a[1]).slice(0, n);
  if (!L.length) return '';
  return `<div class="panel"><h3>Goleadores</h3>${L.map(([id, g]) => { const j = M.jug[id]; return `<div class="fila-j">${fotoHTML(j, 30)}<span class="info"><b>${esc(nombreCompleto(j))}</b><small>${esc(M.clubes[j.club] ? M.clubes[j.club].nombre : '')}</small></span><b>${g}</b></div>`; }).join('')}</div>`;
}
function hubTorneo() {
  const T = APP.torneo, M = APP.mundo;
  const mio = partidoDelUsuario(T);
  let prox = '';
  if (T.terminado) {
    const C = M.clubes[T.campeon];
    prox = `<div class="panel centro">${escudoHTML(C, 80)}<h3>Campeón: ${esc(C.nombre)}</h3>${T.usuario === T.campeon ? '<p class="min">¡Lo lograste!</p>' : ''}<div class="acciones" style="justify-content:center"><button class="btn prin" data-acc="nuevo">Nuevo torneo</button></div></div>`;
  } else if (mio) {
    const A = M.clubes[mio.a], B = M.clubes[mio.b];
    prox = `<div class="panel"><h3>${nombreJornada(T)}</h3><div class="vs">
      <div class="equipo-vs">${escudoHTML(A, 56)}<b>${esc(A.nombre)}</b></div><span class="vs-x">VS</span><div class="equipo-vs">${escudoHTML(B, 56)}<b>${esc(B.nombre)}</b></div></div>
      <div class="acciones"><button class="btn prin grande" data-acc="jugar">Jugar</button><button class="btn" data-acc="simular">Simular</button></div></div>`;
  } else {
    prox = `<div class="panel"><h3>${nombreJornada(T)}</h3><p class="nota">${T.usuario == null ? 'Sin club: todo se simula.' : 'Tu club ya no juega en esta fase.'}</p><div class="acciones"><button class="btn prin" data-acc="simular">Simular jornada</button>${!T.terminado ? '<button class="btn" data-acc="todo">Simular hasta el final</button>' : ''}</div></div>`;
  }
  const ult = T.ultimos.length ? `<div class="panel"><h3>Últimos resultados</h3>${T.ultimos.slice(-10).map(r => `<div class="fila-j"><span class="info"><b>${esc(M.clubes[r.a].nombre)} ${r.gl} - ${r.gv} ${esc(M.clubes[r.b].nombre)}</b></span></div>`).join('')}</div>` : '';
  const clasif = T.fase === 'liga' || (T.tipo === 'liga') ? tablaHTML(M, T.liga.tabla, T.usuario)
    : (T.rondas ? rondasHTML(M, T) : '') + (T.grupos ? T.grupos.map((g, i) => `<div class="etq">Grupo ${'ABCD'[i]}</div>${tablaHTML(M, g.tabla, T.usuario)}`).join('') : '');
  pantalla(`${prox}${clasif}${goleadoresHTML(M, T.goleadores)}${ult}
    <div class="acciones"><button class="btn" data-acc="abandonar">Abandonar torneo</button></div>`, {
    titulo: T.nombre, atras: menuPrincipal, acciones: {
      jugar: () => jugarTorneo(mio),
      simular: () => { if (mio) apuntarResultado(T, mio, simularPartido(M, mio.a, mio.b, { neutral: T.tipo !== 'liga' })); simularResto_T(T); cerrarJornada(T); guardarTorneo(); hubTorneo(); },
      todo: () => { let n = 0; while (!T.terminado && n++ < 200) { simularResto_T(T); cerrarJornada(T); } guardarTorneo(); hubTorneo(); },
      nuevo: () => { DATOS.torneo = APP.torneo = null; guardarAhora(); menuTorneos(); },
      abandonar: () => confirmar('¿Abandonar el torneo? Se perderá su progreso.', () => { DATOS.torneo = APP.torneo = null; guardarAhora(); menuTorneos(); }, hubTorneo),
    },
  });
}
function jugarTorneo(p) {
  const T = APP.torneo, M = APP.mundo, lado = p.a === T.usuario ? 0 : 1;
  jugarPartido({
    local: equipoParaPartido(M, p.a), visita: equipoParaPartido(M, p.b), usuario: lado, modo: 'torneo', titulo: T.nombre,
    alTerminar: res => {
      apuntarResultado(T, p, res);
      const pen = p.ko && p.ko.pen ? `<p class="centro"><b>Penaltis: ${p.ko.pen[0]} - ${p.ko.pen[1]}</b></p>` : '';
      simularResto_T(T); cerrarJornada(T); guardarTorneo();
      mostrarResultado(res, { local: M.clubes[p.a], visita: M.clubes[p.b], titulo: T.nombre, extra: pen, botones: [{ t: 'Continuar', prin: true, f: hubTorneo }] });
    },
  });
}
// confirmación dentro de la página (el visor no muestra confirm())
function confirmar(texto, si, no) {
  pantalla(`<div class="panel"><p>${esc(texto)}</p><div class="acciones"><button class="btn prin" data-acc="si">Sí</button><button class="btn" data-acc="no">No</button></div></div>`, { titulo: 'Confirmar', acciones: { si, no } });
}
