'use strict';
/* Pelotazo · Equipo Estrella: modo de cartas sin conexión. Solo monedas del juego (nunca dinero real).
   Abres sobres con jugadores de la base de datos, armas tu once (con química por liga, club y nacionalidad) y subes de
   división ganando a la computadora. Se guarda en DATOS.estrella (guardado principal).
   E = { monedas, cartas: [carta], once: [uid x11], formacion, nombre, camiseta, pantalon, division, temp: { pj, pts, g, e, p }, sig } */
// prob: probabilidad de cada carta del sobre de ser [estrella, Figura, Leyenda]; el resto son jugadores de la base de datos
// prob: probabilidad de cada carta del sobre de ser de cada tipo especial; el resto son jugadores de la base de datos
const SOBRES = [
  { id: 'bronce', t: 'Sobre bronce', precio: 750, n: 5, min: 55, max: 64, clase: 'bronce', prob: {}, d: '5 jugadores de bronce' },
  { id: 'plata', t: 'Sobre plata', precio: 2000, n: 5, min: 65, max: 74, clase: 'plata', prob: {}, d: '5 jugadores de plata' },
  { id: 'oro', t: 'Sobre oro', precio: 5000, n: 5, min: 75, max: 99, clase: 'oro', prob: { normal: .14, promesa: .012, figura: .015, flashback: .005, leyenda: .005, cumbre: .0004 }, d: '5 de oro · puede salir una estrella' },
  { id: 'estrella', t: 'Sobre estrellas', precio: 15000, n: 3, min: 80, max: 99, clase: 'figura', prob: { normal: .76, promesa: .06, figura: .09, flashback: .045, leyenda: .04, cumbre: .005 }, d: '3 estrellas conocidas · cartas especiales' },
  { id: 'flashback', t: 'Sobre Flashback', precio: 30000, n: 1, min: 84, max: 99, clase: 'flashback', prob: { flashback: .7, figura: .14, leyenda: .14, cumbre: .02 }, d: '1 carta · 70 % Flashback' },
  { id: 'leyenda', t: 'Sobre leyenda', precio: 40000, n: 1, min: 86, max: 99, clase: 'leyenda', prob: { leyenda: .55, flashback: .2, figura: .1, normal: .12, cumbre: .03 }, d: '1 carta 86+ · 55 % Leyenda' },
];
const PARTIDOS_DIVISION = 10;
const claseCarta = m => m >= 75 ? 'oro' : m >= 65 ? 'plata' : 'bronce';
const ventaRapida = c => Math.round(40 * Math.pow(1.13, c.med - 55) * ({ cumbre: 6, leyenda: 2.5, flashback: 2.2, figura: 1.6, promesa: 1.4 }[c.tipo] || (c.s ? 1.2 : 1)) / 10) * 10 + 20;
const nombreCarta = c => c.completo || ((c.nombre1 ? c.nombre1 + ' ' : '') + c.nombre);
const premioVictoria = div => 250 + (10 - div) * 120;

function nuevaEstrella() {
  const E = { monedas: 5000, cartas: [], once: [], formacion: '4-3-3', nombre: 'Mi Equipo Estrella', camiseta: 0x7a3cff, pantalon: 0x111111, division: 10, temp: { pj: 0, pts: 0, g: 0, e: 0, p: 0 }, sig: 1 };
  // sobre de bienvenida: un once completo de nivel bajo
  for (const pos of ['POR', 'LD', 'DFC', 'DFC', 'LI', 'MCD', 'MC', 'MC', 'EI', 'DC', 'ED', 'POR', 'DFC', 'MC', 'DC']) darCarta(E, elegirJugadorCarta(56, 66, pos));
  autoOnce(E);
  return E;
}
function elegirJugadorCarta(min, max, pos) {
  const M = APP.mundo;
  const ok = M.jug.filter(j => j.club >= 0 && j.med >= min && j.med <= max && (!pos || j.pos === pos));
  if (!ok.length) return azElige(M.jug.filter(j => j.club >= 0));
  // las cartas muy buenas salen menos
  return elegirPorPeso(ok, j => Math.pow(.86, j.med - min));
}
function darCarta(E, j) {
  const M = APP.mundo, club = M.clubes[j.club];
  const c = { uid: E.sig++, j: j.id, nombre: j.nombre, nombre1: j.nombre1, pos: j.pos, med: j.med, nac: j.nac, club: club ? club.nombre : '', liga: club ? club.liga : '', at: { ...j.at }, piel: j.piel, pelo: j.pelo, num: j.num };
  completarCarta(c);
  E.cartas.push(c);
  return c;
}
function darCartaEstrella(E, e) {
  const c = { uid: E.sig++, ...cartaDeEstrella(e) };
  E.cartas.push(c);
  return c;
}
// una carta de la base de estrellas: las de media alta salen menos
function elegirEstrella(tipo, min = 0) {
  const L = CARTAS_ESTRELLA.filter(e => e.tipo === tipo && e.med >= min);
  return elegirPorPeso(L.length ? L : CARTAS_ESTRELLA.filter(e => e.tipo === tipo), e => Math.pow(.88, e.med - 75));
}
const yaTiene = (E, x) => x.e ? E.cartas.some(c => c.s === x.e.clave) : E.cartas.some(c => c.j === x.j.id);
const cartaPorUid = (E, uid) => E.cartas.find(c => c.uid === uid);
// la persona detrás de la carta (un mismo jugador no puede estar dos veces en el once, aunque sea con otra versión)
function personaCarta(c) {
  if (!c.s) return 'j' + c.j;
  const e = CARTAS_ESTRELLA.find(x => x.clave === c.s);
  return e ? (e.base || e.sid) : c.s.replace(/f$/, '');
}
// ¿puede ir esta carta en el hueco k sin repetir jugador?
const repiteEnOnce = (E, uid, k) => { const c = cartaPorUid(E, uid), p = c && personaCarta(c); return E.once.some((u, i) => i !== k && u !== uid && u != null && cartaPorUid(E, u) && personaCarta(cartaPorUid(E, u)) === p); };
// química: cada jugador del once suma por compartir liga, club o nacionalidad con sus compañeros
// química de cada jugador del once (0-10): suma por compartir club, liga o país con sus compañeros
function quimicaCarta(E, c) {
  const once = E.once.map(u => cartaPorUid(E, u)).filter(Boolean), ley = t => t === 'leyenda' || t === 'cumbre';
  let v = 0;
  for (const o of once) { if (o === c) continue; if (o.club === c.club && c.liga !== 'leyenda') v += 2; else if (o.liga === c.liga || ley(o.tipo) || ley(c.tipo)) v += 1; if (o.nac === c.nac) v += 1; }
  return Math.min(10, v);
}
function quimica(E) {
  const once = E.once.map(u => cartaPorUid(E, u)).filter(Boolean);
  if (!once.length) return 0;
  return Math.round(once.reduce((s, c) => s + quimicaCarta(E, c), 0) / (once.length * 10) * 100);
}
function autoOnce(E) {
  const form = FORMACIONES[E.formacion], usadas = new Set(), once = [];
  const orden = form.map((f, k) => k).sort((a, b) => (form[a].p === 'POR' ? -1 : 0) - (form[b].p === 'POR' ? -1 : 0));
  for (const k of orden) {
    let mejor = null, mv = -1;
    for (const c of E.cartas) { if (usadas.has(c.uid) || usadas.has(personaCarta(c))) continue; const v = c.med * encaje(c.pos, form[k].p); if (v > mv) { mv = v; mejor = c; } }
    once[k] = mejor ? mejor.uid : null; if (mejor) { usadas.add(mejor.uid); usadas.add(personaCarta(mejor)); }
  }
  E.once = once;
}
function fuerzaEstrella(E) {
  const form = FORMACIONES[E.formacion]; let s = 0;
  E.once.forEach((u, k) => { const c = cartaPorUid(E, u); if (c) s += c.med * encaje(c.pos, form[k].p); });
  return s / 11 + (quimica(E) - 50) * .06;
}
function equipoEstrella(E) {
  const q = quimica(E);
  return {
    id: 'estrella', nombre: E.nombre, corto: 'EST', camiseta: E.camiseta, pantalon: E.pantalon, medias: E.camiseta, camiseta2: 0xf4f4f4, portero: difColor(E.camiseta, 0x2bc46a) > 150 ? 0x2bc46a : 0xffc928,
    formacion: E.formacion, estilo: { presion: 1, linea: 1, ritmo: 1 },
    jugadores: E.once.map(u => { const c = cartaPorUid(E, u); return c ? { id: 'c' + c.uid, nombre: c.nombre, nombre1: c.nombre1, num: c.num, atrib: c.at, piel: c.piel, pelo: c.pelo, forma: q } : null; }),
  };
}
// nivel de los rivales de cada división (media): de 60 en la 10 a 87 en la 1
const nivelDivision = div => 60 + (10 - div) * 3;
// rival de la división: un club de fuerza parecida; si es más fuerte que el nivel, juega rebajado a ese nivel
function rivalDivision(E) {
  const M = APP.mundo, objetivo = nivelDivision(E.division);
  const cerca = M.clubes.map(c => ({ c, d: Math.abs(fuerzaDe(M, c) - objetivo) })).sort((a, b) => a.d - b.d).slice(0, 8);
  return azElige(cerca).c;
}
function nivelRival(E, club) { return Math.min(fuerzaDe(APP.mundo, club), nivelDivision(E.division) + 2); }
function equipoRivalEst(E, club) {
  const def = equipoParaPartido(APP.mundo, club.id), k = nivelRival(E, club) / fuerzaDe(APP.mundo, club);
  def.jugadores = def.jugadores.map(j => j && { ...j, atrib: Object.fromEntries(Object.entries(j.atrib).map(([a, v]) => [a, Math.round(v * k)])) });
  return def;
}
const guardarEstrella = () => guardarAhora();

function menuEstrella() {
  if (!DATOS.estrella) { DATOS.estrella = nuevaEstrella(); DATOS.estrella.regalo08 = true; DATOS.estrella.monedas += 15000; guardarEstrella(); toast('¡Bienvenido! Recibes un equipo inicial y 20.000 monedas: ¡abre un sobre de estrellas!', 6000); }
  // regalo único al llegar las estrellas y leyendas (también para los equipos ya empezados)
  else if (!DATOS.estrella.regalo08) { DATOS.estrella.regalo08 = true; DATOS.estrella.monedas += 15000; guardarEstrella(); toast('¡Llegaron las estrellas y las leyendas! Regalo: 15.000 monedas para un sobre de estrellas.', 6000); }
  hubEstrella(APP.pestEst || 'inicio');
}
function hubEstrella(p) {
  APP.pestEst = p;
  const E = DATOS.estrella;
  const tabs = `<div class="chips">${[['inicio', 'Partidos'], ['equipo', 'Mi equipo'], ['sobres', 'Sobres'], ['album', 'Álbum'], ['club', 'Club'], ['editor', 'Editor']].map(([id, t]) => `<button class="chip ${id === p ? 'sel' : ''}" data-acc="tab" data-id="${id}">${t}</button>`).join('')}</div>`;
  const v = { inicio: vistaPartidosEst, equipo: vistaEquipoEst, sobres: vistaSobresEst, album: vistaAlbumEst, club: vistaClubEst, editor: vistaEditorEst }[p]();
  pantalla(tabs + v, { titulo: 'Equipo Estrella', atras: menuPrincipal, extra: `<span class="med m-oro">${E.monedas.toLocaleString('es')} monedas</span>`, acciones: ACC_EST });
}
const ACC_EST = {
  tab: d => hubEstrella(d.id),
  alb: d => { APP.albumEst = d.id; hubEstrella('album'); },
  // editor de Equipo Estrella (aquí sí hay monedas)
  edEst: (d, el) => {
    const E = DATOS.estrella, v = Math.round(clamp(+el.value || 0, +d.min, +d.max));
    if (d.k === 'monedas') E.monedas = v; if (d.k === 'division') E.division = v; if (d.k === 'pts') E.temp.pts = v;
    guardarEstrella(); hubEstrella('editor');
  },
  edMas: d => { DATOS.estrella.monedas += +d.n; guardarEstrella(); toast('+' + (+d.n).toLocaleString('es') + ' monedas'); hubEstrella('editor'); },
  edTemp: () => { DATOS.estrella.temp = { pj: 0, pts: 0, g: 0, e: 0, p: 0 }; guardarEstrella(); toast('Temporada reiniciada.'); hubEstrella('editor'); },
  edBuscar: (d, el) => { APP.edBusca = el.value.trim(); hubEstrella('editor'); },
  edTipo: d => { APP.edTipo = d.id; hubEstrella('editor'); },
  edAnadir: d => {
    const E = DATOS.estrella;
    const c = d.clave ? darCartaEstrella(E, CARTAS_ESTRELLA.find(e => e.clave === d.clave)) : darCarta(E, APP.mundo.jug[+d.j]);
    guardarEstrella(); toast('Añadida: ' + nombreCarta(c)); hubEstrella('editor');
  },
  jugar: () => partidoEstrella(false), simular: () => partidoEstrella(true),
  sobre: d => abrirSobre(d.id),
  carta: d => fichaCarta(+d.uid),
  auto: () => { autoOnce(DATOS.estrella); guardarEstrella(); hubEstrella('equipo'); },
  form: d => { APP.selHueco = null; DATOS.estrella.formacion = d.f; autoOnce(DATOS.estrella); guardarEstrella(); hubEstrella('equipo'); },
  hueco: d => tocarHueco(+d.k),
  reserva: d => tocarReserva(+d.uid),
  cambiar: () => { const k = APP.selHueco; APP.selHueco = null; elegirCartaHueco(k); },
  soltar: () => { APP.selHueco = null; hubEstrella('equipo'); },
  color: (d, el) => { DATOS.estrella[d.k] = parseInt(el.value.slice(1), 16); guardarEstrella(); },
  nombre: (d, el) => { DATOS.estrella.nombre = el.value.trim().slice(0, 28) || 'Mi Equipo Estrella'; guardarEstrella(); },
  reiniciar: () => confirmar('¿Empezar de cero en Equipo Estrella? Perderás tus cartas y monedas (queda una copia de seguridad).', () => { DATOS.estrella = null; bakCurrent('reemplazo').then(() => { menuEstrella(); }); }, () => hubEstrella('club')),
};
function vistaPartidosEst() {
  const E = DATOS.estrella, t = E.temp;
  if (!APP.rivalEst) APP.rivalEst = rivalDivision(E).id;
  const R = APP.mundo.clubes[APP.rivalEst];
  return `<div class="panel"><h3>División ${E.division}</h3><p class="nota">${t.pj} de ${PARTIDOS_DIVISION} partidos · ${t.pts} puntos · ${t.g} G ${t.e} E ${t.p} P. Con 16 puntos subes de división; con menos de 8 bajas.</p></div>
    <div class="panel"><h3>Próximo rival</h3><div class="vs">
      <div class="equipo-vs">${escudoHTML({ corto: 'EST', camiseta: E.camiseta, camiseta2: E.pantalon, pantalon: E.pantalon }, 56)}<b>${esc(E.nombre)}</b><small>media ${Math.round(fuerzaEstrella(E))} · química ${quimica(E)}</small></div><span class="vs-x">VS</span>
      <div class="equipo-vs">${escudoHTML(R, 56)}<b>${esc(R.nombre)}</b><small>media ${Math.round(nivelRival(E, R))}</small></div></div>
      <p class="nota centro">Victoria: ${premioVictoria(E.division)} monedas · empate: ${Math.round(premioVictoria(E.division) * .4)} · derrota: ${Math.round(premioVictoria(E.division) * .2)} · +50 por gol</p>
      <div class="acciones"><button class="btn prin grande" data-acc="jugar">Jugar</button><button class="btn" data-acc="simular">Simular</button></div></div>`;
}
// la plantilla en el campo: cada carta en su puesto de la formación. Toca una y luego otra para cambiarlas de sitio;
// toca dos veces la misma (o "Cambiar") para elegir otra carta; con una seleccionada, toca una reserva para meterla.
const posHueco = f => ({ x: 50 + f.fz * 43, y: 91 - f.fx * 118 });
function vistaEquipoEst() {
  const E = DATOS.estrella, form = FORMACIONES[E.formacion], sel = APP.selHueco;
  const enOnce = new Set(E.once), csel = sel != null ? cartaPorUid(E, E.once[sel]) : null;
  const huecos = form.map((f, k) => {
    const c = cartaPorUid(E, E.once[k]), { x, y } = posHueco(f);
    const q = c ? quimicaCarta(E, c) : 0, fuera = c && encaje(c.pos, f.p) < 1;
    return `<div class="hueco ${sel === k ? 'sel' : ''}" style="left:${x}%;top:${y}%">
      ${c ? cartaHTML(c, '', false, false, `data-acc="hueco" data-k="${k}"`, true) : `<button class="hueco-vacio" data-acc="hueco" data-k="${k}">+</button>`}
      <span class="hueco-pos ${fuera ? 'mal' : ''}">${f.p}</span>${c ? `<span class="quim q${Math.round(q / 10 * 3)}" title="Química ${q}/10"><i></i><i></i><i></i></span>` : ''}</div>`;
  }).join('');
  const reservas = E.cartas.filter(c => !enOnce.has(c.uid)).sort((a, b) => b.med - a.med);
  const ayuda = sel == null ? 'Toca una carta del campo para moverla o cambiarla.'
    : `<b>${esc(csel ? nombreCarta(csel) : form[sel].p)}</b> seleccionado: toca otra carta del campo para intercambiarlos, una reserva para meterla, o <button class="btn chico" data-acc="cambiar">Elegir de mis cartas</button> <button class="btn chico" data-acc="soltar">Cancelar</button>`;
  return `<div class="plantilla">
    <div class="pl-izq"><div class="cancha-est">${huecos}</div></div>
    <div class="pl-der">
      <div class="pl-datos"><span><b>${Math.round(fuerzaEstrella(E))}</b>Media</span><span><b>${quimica(E)}</b>Química</span><span><b>${E.formacion}</b>Formación</span></div>
      <div class="seg">${Object.keys(FORMACIONES).map(f => `<button class="${E.formacion === f ? 'sel' : ''}" data-acc="form" data-f="${f}">${f}</button>`).join('')}</div>
      <p class="nota pl-ayuda">${ayuda}</p>
      <div class="acciones"><button class="btn" data-acc="auto">Once automático</button></div>
      <p class="nota">Química: jugadores del mismo club, liga o país juntos rinden más (las Leyendas conectan con todos). Un puesto en rojo es que la carta juega fuera de su posición.</p>
    </div></div>
    <div class="etq">Reservas (${reservas.length})</div>
    <div class="tarjetas">${reservas.map(c => cartaHTML(c, '', false, false, `data-acc="reserva" data-uid="${c.uid}"`)).join('')}</div>`;
}
function tocarHueco(k) {
  const E = DATOS.estrella, sel = APP.selHueco;
  if (sel == null) APP.selHueco = k;
  else if (sel === k) { APP.selHueco = null; return elegirCartaHueco(k); }
  else { const n = E.once.slice(); [n[k], n[sel]] = [n[sel], n[k]]; E.once = n; APP.selHueco = null; guardarEstrella(); }
  hubEstrella('equipo');
}
function tocarReserva(uid) {
  const E = DATOS.estrella, sel = APP.selHueco;
  if (sel == null) return fichaCarta(uid);
  if (repiteEnOnce(E, uid, sel)) return toast('Ese jugador ya está en tu once con otra carta.');
  const n = E.once.slice(); n[sel] = uid; E.once = n; APP.selHueco = null; guardarEstrella(); hubEstrella('equipo');
}
function vistaSobresEst() {
  const E = DATOS.estrella;
  return `<p class="intro">Los sobres solo se compran con monedas del juego, que ganas jugando partidos.</p>
    <div class="sobres">${SOBRES.map(s => `<button class="sobre sb-${s.clase}" data-acc="sobre" data-id="${s.id}" ${E.monedas < s.precio ? 'disabled' : ''}><span class="sb-logo">${LOGO_SVG}</span><b>${s.t}</b><small>${s.d}</small><span class="sb-precio moneda">${s.precio.toLocaleString('es')}</span></button>`).join('')}</div>
    <p class="nota">${CARTAS_ESTRELLA.length} cartas por coleccionar: ${CARTAS_ESTRELLA.filter(e => e.tipo === 'normal').length} estrellas, ${CARTAS_ESTRELLA.filter(e => e.tipo === 'leyenda').length} Leyendas, ${CARTAS_ESTRELLA.filter(e => e.tipo === 'flashback').length} Flashback, ${CARTAS_ESTRELLA.filter(e => e.tipo === 'figura').length} Figuras, ${CARTAS_ESTRELLA.filter(e => e.tipo === 'promesa').length} Promesas y ${CARTAS_ESTRELLA.filter(e => e.tipo === 'cumbre').length} Cumbre.</p>`;
}
// álbum: todas las cartas de estrellas; las que no tienes se ven tapadas (solo media, puesto y país)
function vistaAlbumEst() {
  const E = DATOS.estrella, tipo = APP.albumEst || 'normal';
  const mias = new Map(E.cartas.filter(c => c.s).map(c => [c.s, c]));
  const L = CARTAS_ESTRELLA.filter(e => e.tipo === tipo).sort((a, b) => b.med - a.med);
  const n = t => CARTAS_ESTRELLA.filter(e => e.tipo === t && mias.has(e.clave)).length + '/' + CARTAS_ESTRELLA.filter(e => e.tipo === t).length;
  return `<div class="chips">${[['normal', 'Estrellas'], ['figura', 'Figuras'], ['promesa', 'Promesas'], ['flashback', 'Flashback'], ['leyenda', 'Leyendas'], ['cumbre', 'Cumbre']].map(([id, t]) => `<button class="chip ${id === tipo ? 'sel' : ''}" data-acc="alb" data-id="${id}">${t} ${n(id)}</button>`).join('')}</div>
    <div class="tarjetas">${L.map(e => mias.has(e.clave) ? cartaHTML(mias.get(e.clave)) : `<div class="fc fc-oculta fc-${tipo === 'normal' ? 'oro' : tipo}"><span class="fc-brillo"></span><span class="fc-izq"><b class="fc-med">${e.med}</b><span class="fc-pos">${e.pos}</span>${banderaSVG(e.nac)}</span><span class="fc-int">?</span></div>`).join('')}</div>`;
}
const sinAcentos = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// editor: monedas, división y temporada; buscar cualquier carta (estrellas, especiales o jugadores de la base de datos) y añadirla
function vistaEditorEst() {
  const E = DATOS.estrella, q = sinAcentos(APP.edBusca || ''), tipo = APP.edTipo || 'todas';
  const tiene = new Set(E.cartas.map(c => c.s).filter(Boolean)), tieneJ = new Set(E.cartas.map(c => c.j).filter(x => x != null));
  let estrellas = CARTAS_ESTRELLA.filter(e => (tipo === 'todas' || e.tipo === tipo) && (!q || sinAcentos(e.corto + ' ' + e.nombre + ' ' + e.club).includes(q)));
  estrellas = estrellas.sort((a, b) => b.med - a.med).slice(0, 24);
  const base = q.length >= 3 && (tipo === 'todas' || tipo === 'base') ? APP.mundo.jug.filter(j => j.club >= 0 && sinAcentos(nombreCompleto(j)).includes(q)).slice(0, 12) : [];
  const num = (t, k, v, min, max) => `<label class="campo-txt">${t}<input type="number" inputmode="numeric" value="${v}" min="${min}" max="${max}" data-cambio="edEst" data-k="${k}" data-min="${min}" data-max="${max}"></label>`;
  const tipos = [['todas', 'Todas'], ['normal', 'Estrellas'], ['figura', 'Figuras'], ['promesa', 'Promesas'], ['flashback', 'Flashback'], ['leyenda', 'Leyendas'], ['cumbre', 'Cumbre'], ['base', 'Base de datos']];
  return `<div class="panel"><h3>Monedas y temporada</h3><div class="form-grid">${num('Monedas', 'monedas', E.monedas, 0, 99999999)}${num('División (1 la mejor, 10 la última)', 'division', E.division, 1, 10)}${num('Puntos de esta temporada', 'pts', E.temp.pts, 0, 30)}</div>
      <div class="acciones">${[5000, 50000, 500000].map(n => `<button class="btn chico" data-acc="edMas" data-n="${n}">+${n.toLocaleString('es')}</button>`).join('')}<button class="btn chico" data-acc="edTemp">Reiniciar temporada</button></div></div>
    <div class="panel"><h3>Añadir cartas</h3><p class="nota">Busca por nombre o club y toca "Añadir". Para cambiar una carta que ya tienes (media, habilidad…) ábrela en Mi equipo.</p>
      <label class="campo-txt">Buscar<input type="search" value="${esc(APP.edBusca || '')}" placeholder="Ej.: Messio, Real Madrid, Pelié…" data-cambio="edBuscar" enterkeyhint="search"></label>
      <div class="chips">${tipos.map(([id, t]) => `<button class="chip ${id === tipo ? 'sel' : ''}" data-acc="edTipo" data-id="${id}">${t}</button>`).join('')}</div></div>
    <div class="tarjetas">${tipo !== 'base' ? estrellas.map(e => { const c = { uid: 0, ...cartaDeEstrella(e) }; return cartaHTML(c, `<span class="fc-marca ${tiene.has(e.clave) ? 'rep' : ''}">${tiene.has(e.clave) ? 'Ya la tienes · ' : ''}Añadir</span>`, false, false, `data-acc="edAnadir" data-clave="${e.clave}"`); }).join('') : ''}
      ${base.map(j => { const club = APP.mundo.clubes[j.club]; const c = completarCarta({ uid: 0, j: j.id, nombre: j.nombre, nombre1: j.nombre1, pos: j.pos, med: j.med, nac: j.nac, club: club.nombre, liga: club.liga, at: { ...j.at }, piel: j.piel, pelo: j.pelo }); return cartaHTML(c, `<span class="fc-marca ${tieneJ.has(j.id) ? 'rep' : ''}">${tieneJ.has(j.id) ? 'Ya la tienes · ' : ''}Añadir</span>`, false, false, `data-acc="edAnadir" data-j="${j.id}"`); }).join('')}</div>
    ${!estrellas.length && !base.length ? '<p class="nota">No hay cartas con esa búsqueda.</p>' : ''}`;
}
function vistaClubEst() {
  const E = DATOS.estrella;
  return `<div class="panel"><div class="form-grid">
      <label class="campo-txt">Nombre del equipo<input value="${esc(E.nombre)}" maxlength="28" data-cambio="nombre"></label>
      <label class="campo-txt">Camiseta<input type="color" value="${colorCss(E.camiseta)}" data-cambio="color" data-k="camiseta"></label>
      <label class="campo-txt">Pantalón<input type="color" value="${colorCss(E.pantalon)}" data-cambio="color" data-k="pantalon"></label>
    </div></div>
    <div class="acciones"><button class="btn" data-acc="reiniciar">Empezar de cero</button></div>`;
}
function sacarDelSobre(S) {
  let r = AZ();
  for (const [tipo, p] of Object.entries(S.prob)) { if (r < p) return { e: elegirEstrella(tipo, S.min) }; r -= p; }
  const max = S.id === 'oro' && AZ() > .12 ? 84 : S.max;
  return { j: elegirJugadorCarta(S.min, max) };
}
function abrirSobre(id) {
  const E = DATOS.estrella, S = SOBRES.find(s => s.id === id);
  if (E.monedas < S.precio) return toast('No tienes monedas suficientes.');
  E.monedas -= S.precio;
  const nuevas = [];
  for (let i = 0; i < S.n; i++) {
    const x = sacarDelSobre(S);
    if (yaTiene(E, x)) { const c = x.e ? cartaDeEstrella(x.e) : completarCarta({ ...x.j, uid: 0, at: { ...x.j.at }, club: '' }); const v = ventaRapida(c); E.monedas += v; nuevas.push({ rep: true, c, v }); }
    else nuevas.push({ c: x.e ? darCartaEstrella(E, x.e) : darCarta(E, x.j) });
  }
  guardarEstrella();
  // la mejor carta del sobre, primero
  nuevas.sort((a, b) => valorSorpresa(b.c) - valorSorpresa(a.c));
  const mejor = nuevas[0].c, especial = mejor.tipo !== 'normal' || (mejor.s && mejor.med >= 85) || mejor.med >= 88;
  const verSobre = () => pantalla(`<div class="tarjetas cartas-sobre">${nuevas.map((n, i) => n.rep ? `<div class="rep-carta">${cartaHTML({ ...n.c, uid: -1 }, `<span class="fc-marca rep">Repetida +${n.v}</span>`)}</div>` : `<div style="--i:${i}">${cartaHTML(n.c, '<span class="fc-marca">¡Nueva!</span>')}</div>`).join('')}</div>
    <div class="acciones"><button class="btn prin" data-acc="ok">Seguir</button><button class="btn" data-acc="otro" ${E.monedas < S.precio ? 'disabled' : ''}>Abrir otro (${S.precio.toLocaleString('es')})</button></div>`, {
    titulo: S.t, extra: `<span class="med m-oro">${E.monedas.toLocaleString('es')} monedas</span>`, acciones: { ok: () => hubEstrella('equipo'), otro: () => abrirSobre(id), carta: d => +d.uid > 0 && fichaCarta(+d.uid) },
  });
  if (especial) presentarCarta(mejor, verSobre); else { SFX.aceptar(); verSobre(); }
}
// cuánto emociona una carta (para el orden y para la presentación)
const valorSorpresa = c => c.med + ({ cumbre: 40, leyenda: 20, flashback: 16, figura: 12, promesa: 8 }[c.tipo] || (c.s ? 6 : 0));
// presentación de una carta buena: bandera, puesto, club y la carta (toca para saltar)
function presentarCarta(c, despues) {
  const club = clubCarta(c.club), clase = claseDeCarta(c);
  pantalla(`<div class="walk walk-${clase}">
      <div class="walk-rayos"></div>
      <div class="walk-paso w1">${banderaSVG(c.nac)}<span>${esc(nombrePais(c.nac))}</span></div>
      <div class="walk-paso w2"><b>${c.pos}</b><span>${{ POR: 'Portero', DFC: 'Defensa central', LD: 'Lateral derecho', LI: 'Lateral izquierdo', MCD: 'Mediocentro defensivo', MC: 'Mediocentro', MCO: 'Mediapunta', MI: 'Interior izquierdo', MD: 'Interior derecho', EI: 'Extremo izquierdo', ED: 'Extremo derecho', DC: 'Delantero centro' }[c.pos] || ''}</span></div>
      <div class="walk-paso w3">${escudoHTML(club, 96)}<span>${esc(club.nombre)}</span></div>
      <div class="walk-carta">${cartaHTML({ ...c }, '', false, true)}<p class="walk-nombre">${esc(nombreCarta(c))}</p></div>
      <button class="btn walk-saltar" data-acc="saltar">Saltar</button></div>`, { clase: 'pant-walk', sinBarra: true, acciones: { saltar: () => fin(), carta: () => fin() } });
  let hecho = false; const tt = [];
  const fin = () => { if (hecho) return; hecho = true; tt.forEach(clearTimeout); despues(); };
  tt.push(setTimeout(() => SFX.ocasion(), 300), setTimeout(() => SFX.ocasion(), 1500), setTimeout(() => SFX.ocasion(), 2700));
  tt.push(setTimeout(() => { if (c.tipo === 'leyenda' || c.tipo === 'cumbre' || c.med >= 90) SFX.gol(); else SFX.inicio(); }, 3900));
  tt.push(setTimeout(() => { const b = document.querySelector('.walk-saltar'); if (b) b.textContent = 'Seguir'; }, 4400));
}
function fichaCarta(uid) {
  const E = DATOS.estrella, c = cartaPorUid(E, uid); if (!c) return;
  completarCarta(c);
  const S = c.pos === 'POR' ? STATS_POR : STATS_CAMPO, club = clubCarta(c.club);
  const barra = v => `<span class="barra-at"><i style="width:${v}%;background:${v >= 85 ? '#2bc46a' : v >= 70 ? '#9fd84a' : v >= 55 ? '#f5c542' : '#ef7a3a'}"></i></span>`;
  pantalla(`<div class="ficha-carta">${cartaHTML(c, '', false, true)}
    <div class="panel"><h3>${esc(nombreCarta(c))}</h3>
      <div class="kv"><span>País</span><b>${banderaSVG(c.nac)} ${esc(nombrePais(c.nac))}</b><span>Club</span><b>${esc(club.nombre)}</b><span>Puesto</span><b>${c.pos}</b>
        <span>Pie bueno</span><b>${c.pie === 'I' ? 'Izquierdo' : 'Derecho'}</b><span>Habilidad</span><b class="estrellas">${estrellitas(c.hab)}</b><span>Pie malo</span><b class="estrellas">${estrellitas(c.pm)}</b>
        ${TIPOS_CARTA[c.tipo] ? `<span>Carta</span><b>${TIPOS_CARTA[c.tipo]}</b>` : ''}</div>
      <div class="ats">${S.map(([k, t]) => `<span>${t}</span><b>${c.st[k]}</b>${barra(c.st[k])}`).join('')}</div></div></div>
    <div class="acciones"><button class="btn" data-acc="vender" ${E.once.includes(uid) || E.cartas.length <= 11 ? 'disabled' : ''}>Vender por ${ventaRapida(c).toLocaleString('es')} monedas</button></div>
    ${E.once.includes(uid) ? '<p class="nota">Está en tu once: sácalo antes de venderlo.</p>' : ''}
    <div class="panel"><h3>Editar esta carta</h3><p class="nota">Al cambiar la media, todos los atributos suben o bajan lo mismo.</p><div class="form-grid">
      ${[['Media', 'med', c.med, 40, 99], ['Habilidad (estrellas)', 'hab', c.hab, 1, 5], ['Pie malo (estrellas)', 'pm', c.pm, 1, 5]].map(([t, k, v, mn, mx]) => `<label class="campo-txt">${t}<input type="number" inputmode="numeric" value="${v}" min="${mn}" max="${mx}" data-cambio="edCarta" data-k="${k}" data-min="${mn}" data-max="${mx}"></label>`).join('')}
      <label class="campo-txt">Posición<select data-cambio="edPos">${PUESTOS.map(p => `<option value="${p}" ${p === c.pos ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
      <label class="campo-txt">Pie bueno<select data-cambio="edPie"><option value="D" ${c.pie !== 'I' ? 'selected' : ''}>Derecho</option><option value="I" ${c.pie === 'I' ? 'selected' : ''}>Izquierdo</option></select></label></div>
      <div class="acciones"><button class="btn chico" data-acc="quitar" ${E.once.includes(uid) || E.cartas.length <= 11 ? 'disabled' : ''}>Quitar carta (sin monedas)</button></div></div>`, {
    titulo: esc(nombreCarta(c)), atras: () => hubEstrella('equipo'), acciones: {
      carta: () => { },
      edCarta: (d, el) => {
        const v = Math.round(clamp(+el.value || 0, +d.min, +d.max));
        if (d.k === 'med') { const dif = v - c.med; for (const k in c.st) c.st[k] = Math.round(clamp(c.st[k] + dif, 15, 99)); c.med = v; c.at = atribMotor(c.pos, c.st); }
        else c[d.k] = v;
        guardarEstrella(); fichaCarta(uid);
      },
      edPos: (d, el) => {
        const nueva = el.value; if (nueva === c.pos) return;
        // de portero a jugador de campo (o al revés) los atributos se rehacen con la fórmula
        if ((nueva === 'POR') !== (c.pos === 'POR')) c.st = statsCarta(nueva, c.med, '', c.nombre);
        c.pos = nueva; c.med = mediaCarta(nueva, c.st); c.at = atribMotor(nueva, c.st); guardarEstrella(); fichaCarta(uid);
      },
      edPie: (d, el) => { c.pie = el.value; guardarEstrella(); fichaCarta(uid); },
      quitar: () => confirmar('¿Quitar ' + nombreCarta(c) + ' de tu club? No recibes monedas.', () => { E.cartas = E.cartas.filter(x => x.uid !== uid); guardarEstrella(); toast('Carta quitada.'); hubEstrella('equipo'); }, () => fichaCarta(uid)),
      vender: () => { E.cartas = E.cartas.filter(x => x.uid !== uid); E.monedas += ventaRapida(c); guardarEstrella(); toast('Carta vendida.'); hubEstrella('equipo'); },
    },
  });
}
function elegirCartaHueco(k) {
  const E = DATOS.estrella, form = FORMACIONES[E.formacion], puesto = form[k].p;
  const cs = E.cartas.filter(c => c.uid !== E.once[k]).sort((a, b) => b.med * encaje(b.pos, puesto) - a.med * encaje(a.pos, puesto));
  pantalla(`<p class="nota">Las primeras son las que mejor encajan de ${puesto}. Si eliges una que ya juega, se intercambian.</p>
    <div class="tarjetas">${cs.map(c => { const en = E.once.indexOf(c.uid), m = Math.round(c.med * encaje(c.pos, puesto));
      return cartaHTML(c, `<span class="fc-marca ${m < c.med ? 'rep' : ''}">${en >= 0 ? 'Juega de ' + form[en].p + ' · ' : ''}${m} de ${puesto}</span>`, en >= 0, false, `data-acc="poner" data-uid="${c.uid}"`); }).join('')}</div>`, {
    titulo: 'Elegir ' + puesto, atras: () => hubEstrella('equipo'), acciones: {
      poner: d => { const uid = +d.uid, n = E.once.slice(), antes = n.indexOf(uid); if (antes < 0 && repiteEnOnce(E, uid, k)) return toast('Ese jugador ya está en tu once con otra carta.'); if (antes >= 0) n[antes] = n[k]; n[k] = uid; E.once = n; guardarEstrella(); hubEstrella('equipo'); },
    },
  });
}
function partidoEstrella(simular) {
  const E = DATOS.estrella, M = APP.mundo;
  if (APP.rivalEst == null) APP.rivalEst = rivalDivision(E).id;
  const R = M.clubes[APP.rivalEst];
  if (E.once.filter(u => cartaPorUid(E, u)).length < 11) { toast('Te faltan jugadores en el once.'); return hubEstrella('equipo'); }
  const yo = equipoEstrella(E), rival = equipoRivalEst(E, R);
  const terminar = res => {
    const gf = res.gl, gc = res.gv, t = E.temp, base = premioVictoria(E.division);
    const premio = (gf > gc ? base : gf === gc ? Math.round(base * .4) : Math.round(base * .2)) + gf * 50;
    E.monedas += premio; t.pj++;
    if (gf > gc) { t.g++; t.pts += 3; } else if (gf === gc) { t.e++; t.pts++; } else t.p++;
    let fin = '';
    if (t.pj >= PARTIDOS_DIVISION) {
      const antes = E.division;
      if (t.pts >= 16 && E.division > 1) E.division--; else if (t.pts < 8 && E.division < 10) E.division++;
      const bonus = (11 - E.division) * 400; E.monedas += bonus;
      fin = `<div class="panel centro"><h3>${E.division < antes ? '¡Ascenso!' : E.division > antes ? 'Descenso' : 'Te mantienes'}</h3><p>Ahora juegas en la división ${E.division}. Premio de temporada: ${bonus} monedas.</p></div>`;
      E.temp = { pj: 0, pts: 0, g: 0, e: 0, p: 0 };
    }
    APP.rivalEst = null; guardarEstrella();
    if (!simular) registrarPartido(gf, gc);
    mostrarResultado(res, { local: { nombre: E.nombre, corto: 'EST', camiseta: E.camiseta, camiseta2: E.pantalon, pantalon: E.pantalon }, visita: R, titulo: 'Equipo Estrella', extra: `<p class="centro"><b class="min">+${premio} monedas</b></p>${fin}`, botones: [{ t: 'Continuar', prin: true, f: () => hubEstrella('inicio') }] });
  };
  if (simular) {
    const fl = fuerzaEstrella(E) + 1, fv = nivelRival(E, R);
    const gl = poisson(clamp(1.35 * Math.exp((fl - fv) / 12), .3, 3.4)), gv = poisson(clamp(1.1 * Math.exp((fv - fl) / 12), .25, 3));
    const goles = [];
    const mios = E.once.map(u => cartaPorUid(E, u)), suyos = alineacionDe(M, R).map(id => M.jug[id]);
    for (let i = 0; i < gl; i++) { const a = elegirPorPeso(mios, c => PESO_GOL[c.pos]); goles.push({ lado: 0, id: 'c' + a.uid, nombre: a.nombre, min: 1 + Math.floor(AZ() * 90) }); }
    for (let i = 0; i < gv; i++) { const a = elegirPorPeso(suyos, j => PESO_GOL[j.pos]); goles.push({ lado: 1, id: a.id, nombre: a.nombre, min: 1 + Math.floor(AZ() * 90) }); }
    goles.sort((a, b) => a.min - b.min);
    return terminar({ gl, gv, goles, jug: {}, simulado: true });
  }
  jugarPartido({ local: yo, visita: rival, usuario: 0, modo: 'estrella', titulo: 'Equipo Estrella', alTerminar: terminar });
}
