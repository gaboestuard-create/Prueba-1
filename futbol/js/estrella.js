'use strict';
/* Pelotazo · Equipo Estrella: modo de cartas sin conexión. Solo monedas del juego (nunca dinero real).
   Abres sobres con jugadores de la base de datos, armas tu once (con química por liga, club y nacionalidad) y subes de
   división ganando a la computadora. Se guarda en DATOS.estrella (guardado principal).
   E = { monedas, cartas: [carta], once: [uid x11], formacion, nombre, camiseta, pantalon, division, temp: { pj, pts, g, e, p }, sig } */
const SOBRES = [
  { id: 'bronce', t: 'Sobre bronce', precio: 750, n: 5, min: 55, max: 66, clase: 'bronce' },
  { id: 'plata', t: 'Sobre plata', precio: 2000, n: 5, min: 65, max: 74, clase: 'plata' },
  { id: 'oro', t: 'Sobre oro', precio: 5000, n: 5, min: 75, max: 99, clase: 'oro' },
  { id: 'estrella', t: 'Sobre estrella', precio: 12000, n: 3, min: 83, max: 99, clase: 'oro' },
];
const PARTIDOS_DIVISION = 10;
const claseCarta = m => m >= 75 ? 'oro' : m >= 65 ? 'plata' : 'bronce';
const ventaRapida = c => Math.round(40 * Math.pow(1.13, c.med - 55) / 10) * 10 + 20;
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
  E.cartas.push(c);
  return c;
}
const cartaPorUid = (E, uid) => E.cartas.find(c => c.uid === uid);
// química: cada jugador del once suma por compartir liga, club o nacionalidad con sus compañeros
function quimica(E) {
  const once = E.once.map(u => cartaPorUid(E, u)).filter(Boolean);
  if (!once.length) return 0;
  let s = 0;
  for (const c of once) { let v = 0; for (const o of once) { if (o === c) continue; if (o.club === c.club) v += 2; else if (o.liga === c.liga) v += 1; if (o.nac === c.nac) v += 1; } s += Math.min(10, v); }
  return Math.round(s / (once.length * 10) * 100);
}
function autoOnce(E) {
  const form = FORMACIONES[E.formacion], usadas = new Set(), once = [];
  const orden = form.map((f, k) => k).sort((a, b) => (form[a].p === 'POR' ? -1 : 0) - (form[b].p === 'POR' ? -1 : 0));
  for (const k of orden) {
    let mejor = null, mv = -1;
    for (const c of E.cartas) { if (usadas.has(c.uid)) continue; const v = c.med * encaje(c.pos, form[k].p); if (v > mv) { mv = v; mejor = c; } }
    once[k] = mejor ? mejor.uid : null; if (mejor) usadas.add(mejor.uid);
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
  if (!DATOS.estrella) { DATOS.estrella = nuevaEstrella(); guardarEstrella(); toast('¡Bienvenido! Recibes un equipo inicial y 5.000 monedas.', 5000); }
  hubEstrella(APP.pestEst || 'inicio');
}
function hubEstrella(p) {
  APP.pestEst = p;
  const E = DATOS.estrella;
  const tabs = `<div class="chips">${[['inicio', 'Partidos'], ['equipo', 'Mi equipo'], ['sobres', 'Sobres'], ['club', 'Club']].map(([id, t]) => `<button class="chip ${id === p ? 'sel' : ''}" data-acc="tab" data-id="${id}">${t}</button>`).join('')}</div>`;
  const v = { inicio: vistaPartidosEst, equipo: vistaEquipoEst, sobres: vistaSobresEst, club: vistaClubEst }[p]();
  pantalla(tabs + v, { titulo: 'Equipo Estrella', atras: menuPrincipal, extra: `<span class="med m-oro">${E.monedas.toLocaleString('es')} monedas</span>`, acciones: ACC_EST });
}
const ACC_EST = {
  tab: d => hubEstrella(d.id),
  jugar: () => partidoEstrella(false), simular: () => partidoEstrella(true),
  sobre: d => abrirSobre(d.id),
  carta: d => fichaCarta(+d.uid),
  auto: () => { autoOnce(DATOS.estrella); guardarEstrella(); hubEstrella('equipo'); },
  form: d => { DATOS.estrella.formacion = d.f; autoOnce(DATOS.estrella); guardarEstrella(); hubEstrella('equipo'); },
  hueco: d => elegirCartaHueco(+d.k),
  color: (d, el) => { DATOS.estrella[d.k] = parseInt(el.value.slice(1), 16); guardarEstrella(); },
  nombre: (d, el) => { DATOS.estrella.nombre = el.value.trim().slice(0, 28) || 'Mi Equipo Estrella'; guardarEstrella(); },
  reiniciar: () => confirmar('¿Empezar de cero en Equipo Estrella? Perderás tus cartas y monedas (queda una copia de seguridad).', () => { DATOS.estrella = null; bakCurrent('reemplazo').then(() => { menuEstrella(); }); }, () => hubEstrella('club')),
};
function cartaHTML(c, extra = '', sel = false) {
  return `<button class="carta ${claseCarta(c.med)} ${sel ? 'sel' : ''}" data-acc="carta" data-uid="${c.uid}"><span class="c-med">${c.med}</span><span class="c-pos">${c.pos}</span>${fotoHTML({ nombre: c.nombre, nombre1: c.nombre1, piel: c.piel, foto: (APP.mundo.jug[c.j] || {}).foto }, 44)}<b>${esc(c.nombre)}</b><small>${esc(c.club)}</small><small>${NACIONES[c.nac] ? NACIONES[c.nac].nombre : ''}</small>${extra}</button>`;
}
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
function vistaEquipoEst() {
  const E = DATOS.estrella, form = FORMACIONES[E.formacion];
  const enOnce = new Set(E.once);
  return `<p class="nota">Media ${Math.round(fuerzaEstrella(E))} · química ${quimica(E)} (jugadores de la misma liga, club o país juntos rinden más).</p>
    <div class="etq">Formación</div><div class="seg">${Object.keys(FORMACIONES).map(f => `<button class="${E.formacion === f ? 'sel' : ''}" data-acc="form" data-f="${f}">${f}</button>`).join('')}</div>
    <div class="etq">Once (toca un puesto para cambiarlo)</div>
    <div class="panel">${form.map((f, k) => { const c = cartaPorUid(E, E.once[k]); return `<button class="fila-j" data-acc="hueco" data-k="${k}"><span class="pos pos-${f.p}">${f.p}</span>${c ? `<span class="info"><b>${esc(c.nombre1 + ' ' + c.nombre)}</b><small>${c.pos} · ${esc(c.club)}</small></span>${mediaHTML(c.med)}` : '<span class="info"><b class="aviso-es">Vacío</b></span>'}</button>`; }).join('')}</div>
    <div class="acciones"><button class="btn" data-acc="auto">Once automático</button></div>
    <div class="etq">Todas tus cartas (${E.cartas.length})</div>
    <div class="tarjetas">${E.cartas.slice().sort((a, b) => b.med - a.med).map(c => cartaHTML(c, '', enOnce.has(c.uid))).join('')}</div>`;
}
function vistaSobresEst() {
  const E = DATOS.estrella;
  return `<p class="intro">Los sobres solo se compran con monedas del juego, que ganas jugando partidos.</p>
    <div class="tarjetas">${SOBRES.map(s => `<button class="carta ${s.clase}" data-acc="sobre" data-id="${s.id}" ${E.monedas < s.precio ? 'disabled' : ''}><span class="c-med">${s.n}</span><b>${s.t}</b><small>${s.n} jugadores · media ${s.min}${s.max < 99 ? '–' + s.max : '+'}</small><b>${s.precio.toLocaleString('es')} monedas</b></button>`).join('')}</div>`;
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
function abrirSobre(id) {
  const E = DATOS.estrella, S = SOBRES.find(s => s.id === id);
  if (E.monedas < S.precio) return toast('No tienes monedas suficientes.');
  E.monedas -= S.precio;
  const nuevas = [];
  for (let i = 0; i < S.n; i++) {
    const max = S.id === 'oro' && AZ() > .12 ? 84 : S.max;
    const j = elegirJugadorCarta(S.min, max);
    if (E.cartas.some(c => c.j === j.id)) { const v = ventaRapida({ med: j.med }); E.monedas += v; nuevas.push({ rep: true, j, v }); }
    else nuevas.push({ c: darCarta(E, j) });
  }
  guardarEstrella();
  pantalla(`<div class="tarjetas">${nuevas.map(n => n.c ? cartaHTML(n.c, '<small class="min">¡Nueva!</small>') : `<div class="carta">${mediaHTML(n.j.med)}<b>${esc(n.j.nombre)}</b><small>Repetida: +${n.v} monedas</small></div>`).join('')}</div>
    <div class="acciones"><button class="btn prin" data-acc="ok">Seguir</button><button class="btn" data-acc="otro" ${E.monedas < S.precio ? 'disabled' : ''}>Abrir otro</button></div>`, {
    titulo: S.t, extra: `<span class="med m-oro">${E.monedas.toLocaleString('es')} monedas</span>`, acciones: { ok: () => hubEstrella('equipo'), otro: () => abrirSobre(id), carta: d => fichaCarta(+d.uid) },
  });
}
function fichaCarta(uid) {
  const E = DATOS.estrella, c = cartaPorUid(E, uid); if (!c) return;
  const at = [['vel', 'Velocidad'], ['tir', 'Tiro'], ['pas', 'Pase'], ['reg', 'Regate'], ['def', 'Defensa'], ['par', 'Portería']];
  pantalla(`<div class="tarjetas">${cartaHTML(c)}</div><div class="panel"><div class="kv">${at.map(([k, t]) => `<span>${t}</span><b>${c.at[k]}</b>`).join('')}</div></div>
    <div class="acciones"><button class="btn" data-acc="vender" ${E.once.includes(uid) || E.cartas.length <= 11 ? 'disabled' : ''}>Vender por ${ventaRapida(c)} monedas</button></div>
    ${E.once.includes(uid) ? '<p class="nota">Está en tu once: sácalo antes de venderlo.</p>' : ''}`, {
    titulo: esc(c.nombre1 + ' ' + c.nombre), atras: () => hubEstrella('equipo'), acciones: {
      vender: () => { E.cartas = E.cartas.filter(x => x.uid !== uid); E.monedas += ventaRapida(c); guardarEstrella(); toast('Carta vendida.'); hubEstrella('equipo'); },
    },
  });
}
function elegirCartaHueco(k) {
  const E = DATOS.estrella, form = FORMACIONES[E.formacion], puesto = form[k].p;
  const cs = E.cartas.slice().sort((a, b) => b.med * encaje(b.pos, puesto) - a.med * encaje(a.pos, puesto));
  pantalla(`<div class="panel">${cs.map(c => { const en = E.once.indexOf(c.uid); return `<button class="fila-j" data-acc="poner" data-uid="${c.uid}"><span class="pos pos-${c.pos}">${c.pos}</span><span class="info"><b>${esc(c.nombre1 + ' ' + c.nombre)}</b><small>${esc(c.club)}${en >= 0 ? ' · ya juega de ' + form[en].p : ''}</small></span>${mediaHTML(Math.round(c.med * encaje(c.pos, puesto)))}</button>`; }).join('')}</div>`, {
    titulo: 'Elegir ' + puesto, atras: () => hubEstrella('equipo'), acciones: {
      poner: d => { const uid = +d.uid, n = E.once.slice(), antes = n.indexOf(uid); if (antes >= 0) n[antes] = n[k]; n[k] = uid; E.once = n; guardarEstrella(); hubEstrella('equipo'); },
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
