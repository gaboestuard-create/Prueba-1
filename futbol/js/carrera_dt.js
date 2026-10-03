'use strict';
/* Pelotazo · carrera de técnico. Eliges un club; manejas plantilla, alineación, tácticas, fichajes y dinero, y juegas
   (o simulas) los partidos. Se guarda en la ranura 'dt' con su propia copia del mundo (no toca la base de datos).
   C = { mundo, club, tecnico, temporada, jornada, ligas, resultados, noticias, historial, ofertas, objetivo, pestana } */
let CDT = null;
const PESTANAS_DT = [['inicio', 'Inicio'], ['plantilla', 'Plantilla'], ['tacticas', 'Tácticas'], ['calendario', 'Calendario'], ['clasif', 'Clasificación'], ['fichajes', 'Fichajes'], ['club', 'Club'], ['noticias', 'Noticias']];

async function menuCarreraDT() {
  if (!CDT) { const r = await cargarRanura('dt'); CDT = r.datos; if (r.estado === 'recuperada') toast('Tu carrera estaba dañada: se recuperó la copia anterior.'); if (r.estado === 'perdida') toast('Tu carrera estaba dañada y no se pudo recuperar.'); }
  if (CDT) return hubDT('inicio');
  pantalla(`<p class="intro">Elige un club de cualquiera de las 8 ligas. Tendrás que alinear al equipo, fichar, cuidar el dinero y ganar partidos (jugándolos tú o simulándolos).</p>
    <div class="form-grid"><label class="campo-txt">Tu nombre<input id="dtNombre" maxlength="30" value="${esc(DATOS.nombreTecnico || '')}" placeholder="Técnico"></label></div>
    <div class="acciones"><button class="btn prin grande" data-acc="elegir">Elegir club</button></div>`, {
    titulo: 'Carrera de técnico', atras: menuPrincipal, acciones: {
      elegir: () => {
        const nombre = ($('dtNombre').value || 'Técnico').trim().slice(0, 30); DATOS.nombreTecnico = nombre;
        elegirClub({ titulo: 'Elige tu club', atras: menuCarreraDT, alElegir: c => nuevaCarreraDT(c.id, nombre) });
      },
    },
  });
}
function nuevaCarreraDT(clubId, nombre) {
  const M = JSON.parse(JSON.stringify(APP.mundo));
  CDT = { mundo: M, club: clubId, tecnico: nombre, noticias: [], historial: [], ofertas: [], pestana: 'inicio', creada: Date.now() };
  prepararTemporada(CDT);
  fijarObjetivo(CDT);
  const c = M.clubes[clubId];
  noticia(CDT, `${nombre} es el nuevo técnico del ${c.nombre}. La directiva pide: ${CDT.objetivo.txt}.`, 'buena');
  guardarRanura('dt', CDT, true);
  hubDT('inicio');
}
// objetivo de la directiva según la fuerza del club dentro de su liga
function fijarObjetivo(C) {
  const M = C.mundo, liga = M.clubes[C.club].liga;
  const orden = clubesDeLiga(M, liga).sort((a, b) => fuerzaDe(M, b) - fuerzaDe(M, a)).map(c => c.id);
  const r = orden.indexOf(C.club) + 1, n = orden.length;
  const pos = r <= 1 ? 1 : r <= 3 ? 3 : r <= 6 ? 6 : r <= n / 2 ? Math.ceil(n / 2) : n - 3;
  C.objetivo = { pos, txt: pos === 1 ? 'ganar la liga' : pos === n - 3 ? 'no quedar en los últimos puestos' : `quedar entre los ${pos} primeros` };
}
function guardarDT(copia) { return guardarRanura('dt', CDT, copia); }
const miClub = () => CDT.mundo.clubes[CDT.club];
const masaSalarial = (M, c) => plantillaDe(M, c).reduce((s, j) => s + j.sal, 0);

function hubDT(p = CDT.pestana || 'inicio') {
  CDT.pestana = p;
  const M = CDT.mundo, c = miClub();
  const extra = `<span class="nota">${dinero(c.presupuesto)}</span>${escudoHTML(c, 30)}`;
  const tabs = `<div class="chips">${PESTANAS_DT.map(([id, t]) => `<button class="chip ${id === p ? 'sel' : ''}" data-acc="tab" data-id="${id}">${t}${id === 'fichajes' && CDT.ofertas.length ? ' · ' + CDT.ofertas.length : ''}</button>`).join('')}</div>`;
  const vistas = { inicio: vistaInicioDT, plantilla: vistaPlantillaDT, tacticas: vistaTacticasDT, calendario: () => calendarioHTML(CDT, CDT.club), clasif: () => clasificacionHTML(CDT, APP.verLiga || c.liga, CDT.club), fichajes: vistaFichajesDT, club: vistaClubDT, noticias: vistaNoticiasDT };
  pantalla(tabs + vistas[p](), { titulo: c.nombre, atras: menuPrincipal, extra, acciones: ACC_DT });
}
const ACC_DT = {
  tab: d => { APP.verLiga = null; hubDT(d.id); },
  verliga: d => { APP.verLiga = d.id; hubDT('clasif'); },
  jugar: () => jugarPartidoDT(false),
  simular: () => jugarPartidoDT(true),
  seguir: () => avanzarSinPartido(),
  jug: d => fichaJugadorDT(+d.id),
  form: d => { miClub().formacion = d.f; miClub().alineacion = null; guardarDT(); hubDT('tacticas'); },
  estilo: d => { miClub().estilo[d.k] = +d.v; guardarDT(); hubDT('tacticas'); },
  auto: () => { miClub().alineacion = mejorOnce(CDT.mundo, miClub()); guardarDT(); hubDT('tacticas'); },
  hueco: d => elegirParaHueco(+d.k),
  buscar: () => hubDT('fichajes'),
  oferta: d => responderOferta(+d.i, d.r === 'si'),
  finTemp: () => finTemporadaDT(),
  borrar: () => confirmar('¿Borrar esta carrera y empezar otra? Se guardará una copia por si te arrepientes.', async () => { await borrarRanura('dt'); CDT = null; menuCarreraDT(); }, () => hubDT('club')),
};

/* ---------- inicio ---------- */
function vistaInicioDT() {
  const M = CDT.mundo, c = miClub(), p = partidoDelClub(CDT);
  const tabla = ordenarTabla(CDT.ligas[c.liga].tabla), pos = tabla.findIndex(f => f.id === CDT.club) + 1;
  let prox;
  if (temporadaTerminada(CDT)) prox = `<div class="panel"><h3>Fin de la temporada ${CDT.temporada}-${String(CDT.temporada + 1).slice(2)}</h3><p>Terminaste en el puesto ${pos}. Objetivo: ${CDT.objetivo.txt}.</p><div class="acciones"><button class="btn prin grande" data-acc="finTemp">Empezar la temporada siguiente</button></div></div>`;
  else if (p) {
    const A = M.clubes[p.a], B = M.clubes[p.b], bajas = plantillaDe(M, c).filter(j => !disponible(j)).length;
    prox = `<div class="panel"><h3>Jornada ${CDT.jornada + 1} · ${esc(ligaDe(M, c.liga).nombre)}</h3><div class="vs">
      <div class="equipo-vs">${escudoHTML(A, 56)}<b>${esc(A.nombre)}</b><small>media ${Math.round(fuerzaDe(M, A))}</small></div><span class="vs-x">VS</span>
      <div class="equipo-vs">${escudoHTML(B, 56)}<b>${esc(B.nombre)}</b><small>media ${Math.round(fuerzaDe(M, B))}</small></div></div>
      <p class="nota centro">${esc(A.estadio)}${bajas ? ` · <span class="aviso-es">${bajas} baja${bajas > 1 ? 's' : ''} en tu equipo</span>` : ''}</p>
      <div class="acciones"><button class="btn prin grande" data-acc="jugar">Jugar</button><button class="btn" data-acc="simular">Simular</button><button class="btn" data-acc="tab" data-id="tacticas">Alineación</button></div></div>`;
  } else prox = `<div class="panel"><h3>Jornada ${CDT.jornada + 1}</h3><p class="nota">Tu liga ya terminó; las demás siguen.</p><div class="acciones"><button class="btn prin" data-acc="seguir">Siguiente jornada</button></div></div>`;
  const ultimas = CDT.noticias.slice(0, 4).map(n => `<div class="fila-j"><span class="info"><b class="${n.tipo === 'mala' ? 'aviso-es' : ''}">${esc(n.txt)}</b></span></div>`).join('');
  return `${prox}
    <div class="tarjetas">
      <div class="panel"><h3>${pos}º</h3><span class="nota">en ${esc(ligaDe(M, c.liga).nombre)}</span></div>
      <div class="panel"><h3>${dinero(c.presupuesto)}</h3><span class="nota">para fichar</span></div>
      <div class="panel"><h3>${Math.round(fuerzaDe(M, c))}</h3><span class="nota">media del once</span></div>
      <div class="panel"><h3>${esc(CDT.objetivo.pos)}º</h3><span class="nota">objetivo</span></div>
    </div>
    ${ultimas ? `<div class="panel"><h3>Noticias</h3>${ultimas}</div>` : ''}`;
}

/* ---------- plantilla ---------- */
function filaJugador(M, j, extra = '') {
  const est = j.les > 0 ? `<span class="aviso-es">Lesionado (${j.les})</span>` : j.san > 0 ? '<span class="aviso-es">Sancionado</span>' : `forma ${j.forma}`;
  return `<button class="fila-j" data-acc="jug" data-id="${j.id}"><span class="pos pos-${j.pos}">${j.pos}</span>${fotoHTML(j, 34)}<span class="info"><b>${j.num} · ${esc(nombreCompleto(j))}</b><small>${j.edad} años · ${NACIONES[j.nac] ? NACIONES[j.nac].nombre : j.nac} · ${est}</small></span>${extra}${mediaHTML(j.med)}</button>`;
}
const ordenPorPuesto = (a, b) => ordenPuestos.indexOf(a.pos) - ordenPuestos.indexOf(b.pos) || b.med - a.med;
function vistaPlantillaDT() {
  const M = CDT.mundo, js = plantillaDe(M, miClub()).sort(ordenPorPuesto);
  return `<p class="nota">${js.length} jugadores · salarios ${dinero(masaSalarial(M, miClub()))} por semana. Toca un jugador para ver su ficha.</p><div class="panel">${js.map(j => filaJugador(M, j)).join('')}</div>`;
}
function fichaJugadorDT(id, volver = () => hubDT()) {
  const M = CDT.mundo, j = M.jug[id], mio = j.club === CDT.club, club = M.clubes[j.club];
  const at = [['vel', 'Velocidad'], ['tir', 'Tiro'], ['pas', 'Pase'], ['reg', 'Regate'], ['def', 'Defensa'], ['par', 'Portería']];
  pantalla(`<div class="panel"><div class="fila-j" style="border:0">${fotoHTML(j, 64)}<span class="info"><b style="font-size:20px">${esc(nombreCompleto(j))}</b><small>${NOMBRE_PUESTO[j.pos]} · ${j.edad} años · ${NACIONES[j.nac] ? NACIONES[j.nac].nombre : ''}</small><small>${club ? esc(club.nombre) : 'Sin club'} · dorsal ${j.num}</small></span>${mediaHTML(j.med)}</div>
      <div class="kv"><span>Potencial</span><b>${j.pot}</b><span>Valor</span><b>${dinero(j.val)}</b><span>Salario</span><b>${dinero(j.sal)} / semana</b><span>Forma</span><b>${j.forma}</b>
      <span>Estado</span><b>${j.les > 0 ? 'Lesionado: ' + j.les + ' partidos' : j.san > 0 ? 'Sancionado: ' + j.san + ' partido' : 'Disponible'}</b><span>Temporada</span><b>${j.st.pj} partidos · ${j.st.g} goles · ${j.st.a} asistencias</b></div></div>
    <div class="panel"><h3>Atributos</h3><div class="kv">${at.map(([k, t]) => `<span>${t}</span><b>${j.at[k]}</b>`).join('')}</div></div>
    <div class="acciones">${mio ? `<button class="btn" data-acc="venta">Escuchar ofertas</button>` : `<button class="btn prin" data-acc="comprar">Hacer una oferta</button>`}</div>`, {
    titulo: esc(nombreCompleto(j)), atras: volver, acciones: {
      venta: () => buscarComprador(j.id),
      comprar: () => hacerOferta(j.id),
    },
  });
}

/* ---------- tácticas y alineación ---------- */
function vistaTacticasDT() {
  const M = CDT.mundo, c = miClub(), form = FORMACIONES[c.formacion], once = alineacionDe(M, c);
  const seg = (k, t, ops) => `<div class="etq">${t}</div><div class="seg">${ops.map((o, v) => `<button class="${c.estilo[k] === v ? 'sel' : ''}" data-acc="estilo" data-k="${k}" data-v="${v}">${o}</button>`).join('')}</div>`;
  return `<div class="etq">Formación</div><div class="seg">${Object.keys(FORMACIONES).map(f => `<button class="${c.formacion === f ? 'sel' : ''}" data-acc="form" data-f="${f}">${f}</button>`).join('')}</div>
    ${seg('presion', 'Presión', ['Baja', 'Media', 'Alta'])}${seg('linea', 'Línea defensiva', ['Baja', 'Media', 'Alta'])}${seg('ritmo', 'Estilo de ataque', ['Posesión', 'Mixto', 'Directo'])}
    <div class="etq">Alineación (toca un puesto para cambiar al jugador)</div>
    <div class="panel">${form.map((f, k) => { const j = M.jug[once[k]]; return `<button class="fila-j" data-acc="hueco" data-k="${k}"><span class="pos pos-${f.p}">${f.p}</span>${j ? fotoHTML(j, 30) + `<span class="info"><b>${esc(nombreCompleto(j))}</b><small>${j.pos}${j.pos !== f.p ? ' · fuera de su puesto' : ''}</small></span>${mediaHTML(Math.round(mediaEn(j, f.p)))}` : '<span class="info"><b class="aviso-es">Vacío</b></span>'}</button>`; }).join('')}</div>
    <div class="acciones"><button class="btn" data-acc="auto">Alineación automática</button></div>`;
}
function elegirParaHueco(k) {
  const M = CDT.mundo, c = miClub(), form = FORMACIONES[c.formacion], once = alineacionDe(M, c), puesto = form[k].p;
  const js = plantillaDe(M, c).sort((a, b) => mediaEn(b, puesto) - mediaEn(a, puesto));
  pantalla(`<p class="nota">Puesto: ${NOMBRE_PUESTO[puesto]}. La media mostrada es la que rendiría en ese puesto.</p><div class="panel">${js.map(j => {
    const en = once.indexOf(j.id), dis = !disponible(j);
    return `<button class="fila-j" data-acc="poner" data-id="${j.id}" ${dis ? 'disabled' : ''}><span class="pos pos-${j.pos}">${j.pos}</span>${fotoHTML(j, 30)}<span class="info"><b>${esc(nombreCompleto(j))}</b><small>${dis ? 'No disponible' : en >= 0 ? 'Ya juega de ' + form[en].p : 'Suplente'}</small></span>${mediaHTML(Math.round(mediaEn(j, puesto)))}</button>`;
  }).join('')}</div>`, {
    titulo: 'Elegir ' + puesto, atras: () => hubDT('tacticas'), acciones: {
      poner: d => {
        const id = +d.id, nuevo = once.slice(), antes = nuevo.indexOf(id);
        if (antes >= 0) nuevo[antes] = nuevo[k]; // intercambia los puestos
        nuevo[k] = id; c.alineacion = nuevo; guardarDT(); hubDT('tacticas');
      },
    },
  });
}

/* ---------- partidos ---------- */
function jugarPartidoDT(simular) {
  const M = CDT.mundo, p = partidoDelClub(CDT); if (!p) return;
  const lado = p.a === CDT.club ? 0 : 1, c = miClub();
  const once = alineacionDe(M, c); // la de este partido (con suplentes si hay bajas); no se guarda
  const terminar = res => {
    const nov = jugarJornada(CDT, res);
    noticiasDeNovedades(CDT, nov);
    economiaJornada(CDT, p.a === CDT.club);
    ofertasDeLaComputadora(CDT);
    const gf = lado ? res.gv : res.gl, gc = lado ? res.gl : res.gv;
    noticia(CDT, `${M.clubes[p.a].nombre} ${res.gl} - ${res.gv} ${M.clubes[p.b].nombre}`, gf > gc ? 'buena' : gf < gc ? 'mala' : 'info');
    guardarDT(CDT.jornada % 5 === 0);
    if (!simular) registrarPartido(gf, gc);
    const notas = Object.entries(res.jug).filter(([, r]) => r.lado === lado).sort((a, b) => b[1].nota - a[1].nota).slice(0, 3);
    const extra = `<div class="panel"><h3>Mejores de tu equipo</h3>${notas.map(([id, r]) => `<div class="fila-j">${fotoHTML(M.jug[id], 30)}<span class="info"><b>${esc(nombreCompleto(M.jug[id]))}</b><small>${r.g ? r.g + ' gol' + (r.g > 1 ? 'es ' : ' ') : ''}${r.a ? r.a + ' asist.' : ''}</small></span><b>${r.nota.toFixed(1)}</b></div>`).join('')}</div>`;
    mostrarResultado(res, { local: M.clubes[p.a], visita: M.clubes[p.b], titulo: 'Jornada ' + CDT.jornada, extra, botones: [{ t: 'Continuar', prin: true, f: () => hubDT('inicio') }] });
  };
  if (simular) return terminar(simularPartido(M, p.a, p.b, { onceL: lado ? null : once, onceV: lado ? once : null }));
  jugarPartido({ local: equipoParaPartido(M, p.a, lado ? null : once), visita: equipoParaPartido(M, p.b, lado ? once : null), usuario: lado, modo: 'dt', titulo: 'Jornada ' + (CDT.jornada + 1), alTerminar: terminar });
}
function avanzarSinPartido() { noticiasDeNovedades(CDT, jugarJornada(CDT, null)); economiaJornada(CDT, false); guardarDT(); hubDT('inicio'); }
// dinero: taquilla en casa y salarios cada jornada
function economiaJornada(C, enCasa) {
  const M = C.mundo, c = M.clubes[C.club], L = ligaDe(M, c.liga);
  const taquilla = enCasa ? Math.round(c.rep * c.rep * 140 * L.riqueza) : 0, sueldos = masaSalarial(M, c);
  c.presupuesto += taquilla - sueldos;
  C.ultimaCaja = { taquilla, sueldos };
}

/* ---------- fichajes ---------- */
function vistaFichajesDT() {
  const M = CDT.mundo, c = miClub(), F = APP.filtroFich || (APP.filtroFich = { pos: 'DC', liga: 'todas', max: 0 });
  const ofertas = CDT.ofertas.map((o, i) => { const j = M.jug[o.jug], comp = M.clubes[o.club]; return `<div class="fila-j">${fotoHTML(j, 30)}<span class="info"><b>${esc(comp.nombre)} ofrece ${dinero(o.precio)}</b><small>por ${esc(nombreCompleto(j))} · valor ${dinero(j.val)}</small></span><button class="btn chico prin" data-acc="oferta" data-i="${i}" data-r="si">Aceptar</button><button class="btn chico" data-acc="oferta" data-i="${i}" data-r="no">Rechazar</button></div>`; }).join('');
  const lista = M.jug.filter(j => j.club >= 0 && j.club !== CDT.club && j.pos === F.pos && (F.liga === 'todas' || M.clubes[j.club].liga === F.liga) && (!F.max || j.val <= F.max))
    .sort((a, b) => b.med - a.med).slice(0, 40);
  return `${ofertas ? `<div class="panel"><h3>Ofertas por tus jugadores</h3>${ofertas}</div>` : ''}
    <p class="nota">Presupuesto: <b>${dinero(c.presupuesto)}</b>. Busca jugadores por puesto y liga; toca uno para ver su ficha y hacer una oferta.</p>
    <div class="form-grid">
      <label class="campo-txt">Puesto<select data-cambio="fpos">${PUESTOS.map(p => `<option value="${p}" ${p === F.pos ? 'selected' : ''}>${NOMBRE_PUESTO[p]}</option>`).join('')}</select></label>
      <label class="campo-txt">Liga<select data-cambio="fliga"><option value="todas">Todas</option>${M.ligas.map(l => `<option value="${l.id}" ${l.id === F.liga ? 'selected' : ''}>${esc(l.nombre)}</option>`).join('')}</select></label>
      <label class="campo-txt">Precio máximo<select data-cambio="fmax">${[0, 5e6, 15e6, 30e6, 60e6].map(v => `<option value="${v}" ${v === F.max ? 'selected' : ''}>${v ? dinero(v) : 'Sin límite'}</option>`).join('')}</select></label>
    </div>
    <div class="panel">${lista.map(j => filaJugador(M, j, `<span class="nota" style="white-space:nowrap">${dinero(j.val)}</span>`)).join('') || '<p class="nota">No hay jugadores con esos filtros.</p>'}</div>`;
}
Object.assign(ACC_DT, {
  fpos: (d, el) => { APP.filtroFich.pos = el.value; hubDT('fichajes'); },
  fliga: (d, el) => { APP.filtroFich.liga = el.value; hubDT('fichajes'); },
  fmax: (d, el) => { APP.filtroFich.max = +el.value; hubDT('fichajes'); },
});
function precioPedido(M, j) {
  const club = M.clubes[j.club], once = alineacionDe(M, club), titular = once.includes(j.id);
  return Math.round(j.val * (titular ? 1.3 : 1.05) / 50000) * 50000;
}
function hacerOferta(id) {
  const M = CDT.mundo, j = M.jug[id], c = miClub(), pedido = precioPedido(M, j);
  const opciones = [.8, .9, 1, 1.1, 1.25, 1.5].map(f => Math.round(j.val * f / 50000) * 50000);
  pantalla(`<div class="panel"><div class="fila-j" style="border:0">${fotoHTML(j, 50)}<span class="info"><b>${esc(nombreCompleto(j))}</b><small>${esc(M.clubes[j.club].nombre)} · valor ${dinero(j.val)} · salario ${dinero(j.sal)}/sem.</small></span>${mediaHTML(j.med)}</div>
    <p>Tu presupuesto: <b>${dinero(c.presupuesto)}</b>. Elige cuánto ofreces:</p>
    <div class="seg">${opciones.map(v => `<button data-acc="ofrecer" data-v="${v}" ${v > c.presupuesto ? 'disabled' : ''}>${dinero(v)}</button>`).join('')}</div></div>`, {
    titulo: 'Oferta', atras: () => fichaJugadorDT(id), acciones: {
      ofrecer: d => {
        const v = +d.v;
        if (plantillaDe(M, c).length >= 30) { toast('Tu plantilla ya tiene 30 jugadores: vende a alguno antes.'); return; }
        if (v >= pedido * azEntre(.92, 1.05)) {
          const vend = M.clubes[j.club]; vend.presupuesto += v; c.presupuesto -= v;
          traspasar(M, id, CDT.club); j.sal = Math.max(j.sal, salarioDe(j, ligaDe(M, c.liga).riqueza));
          noticia(CDT, `¡Fichaje! ${nombreCompleto(j)} llega desde el ${vend.nombre} por ${dinero(v)}.`, 'buena');
          guardarDT(true); toast('¡Fichaje cerrado!'); hubDT('plantilla');
        } else { toast(`${M.clubes[j.club].nombre} rechaza la oferta: piden unos ${dinero(pedido)}.`, 5000); }
      },
    },
  });
}
// alguien quiere a tu jugador
function buscarComprador(id) {
  const M = CDT.mundo, j = M.jug[id], c = miClub();
  if (plantillaDe(M, c).length <= 16) { toast('Necesitas al menos 16 jugadores en la plantilla.'); return; }
  const compradores = M.clubes.filter(k => k.id !== CDT.club && k.presupuesto > j.val * .8 && fuerzaDe(M, k) < j.med + 6);
  if (!compradores.length || AZ() < .2) { toast('Ningún club se interesa por él ahora mismo.'); return; }
  const k = azElige(compradores), precio = Math.round(j.val * azEntre(.8, 1.15) / 50000) * 50000;
  CDT.ofertas.push({ jug: id, club: k.id, precio, hasta: CDT.jornada + 2 }); guardarDT();
  toast(`${k.nombre} ofrece ${dinero(precio)}. Respóndele en Fichajes.`, 5000); hubDT('fichajes');
}
function ofertasDeLaComputadora(C) {
  const M = C.mundo;
  C.ofertas = C.ofertas.filter(o => o.hasta >= C.jornada && M.jug[o.jug].club === C.club);
  if (AZ() < .22) {
    const mios = plantillaDe(M, C.club).filter(j => j.med >= 70).sort((a, b) => b.med - a.med);
    if (mios.length) {
      const j = mios[Math.floor(AZ() * Math.min(6, mios.length))];
      const ricos = M.clubes.filter(k => k.id !== C.club && k.presupuesto > j.val && k.rep >= M.clubes[C.club].rep - 4);
      if (ricos.length) { const k = azElige(ricos), precio = Math.round(j.val * azEntre(.9, 1.3) / 50000) * 50000; C.ofertas.push({ jug: j.id, club: k.id, precio, hasta: C.jornada + 2 }); noticia(C, `El ${k.nombre} ofrece ${dinero(precio)} por ${nombreCompleto(j)}.`); }
    }
  }
}
function responderOferta(i, acepta) {
  const M = CDT.mundo, o = CDT.ofertas[i]; if (!o) return;
  CDT.ofertas.splice(i, 1);
  const j = M.jug[o.jug], k = M.clubes[o.club], c = miClub();
  if (acepta) {
    if (plantillaDe(M, c).length <= 16) { toast('Necesitas al menos 16 jugadores en la plantilla.'); CDT.ofertas.splice(i, 0, o); return; }
    c.presupuesto += o.precio; k.presupuesto -= o.precio; traspasar(M, o.jug, o.club);
    noticia(CDT, `${nombreCompleto(j)} se marcha al ${k.nombre} por ${dinero(o.precio)}.`);
    toast('Venta cerrada.');
  }
  guardarDT(acepta); hubDT('fichajes');
}

/* ---------- club, noticias y temporada ---------- */
function vistaClubDT() {
  const M = CDT.mundo, c = miClub(), L = ligaDe(M, c.liga);
  return `<div class="panel">${escudoHTML(c, 64)}<h3>${esc(c.nombre)}</h3><div class="kv">
      <span>Técnico</span><b>${esc(CDT.tecnico)}</b><span>Liga</span><b>${esc(L.nombre)}</b><span>Estadio</span><b>${esc(c.estadio)}</b>
      <span>Presupuesto</span><b>${dinero(c.presupuesto)}</b><span>Salarios</span><b>${dinero(masaSalarial(M, c))} por semana</b>
      ${CDT.ultimaCaja ? `<span>Última jornada</span><b>taquilla ${dinero(CDT.ultimaCaja.taquilla)} · sueldos ${dinero(CDT.ultimaCaja.sueldos)}</b>` : ''}
      <span>Objetivo</span><b>${esc(CDT.objetivo.txt)}</b><span>Temporada</span><b>${CDT.temporada}-${String(CDT.temporada + 1).slice(2)}</b></div></div>
    ${CDT.historial.length ? `<div class="panel"><h3>Historial</h3>${CDT.historial.map(h => `<div class="fila-j"><span class="info"><b>${h.temporada}-${String(h.temporada + 1).slice(2)} · ${esc(M.clubes[h.club].nombre)}</b><small>Puesto ${h.pos}${h.campeon === h.club ? ' · ¡Campeón!' : ''}</small></span></div>`).join('')}</div>` : ''}
    <div class="acciones"><button class="btn" data-acc="borrar">Empezar otra carrera</button></div>`;
}
function vistaNoticiasDT() {
  return `<div class="panel">${CDT.noticias.map(n => `<div class="fila-j"><span class="nota" style="width:60px">${esc(n.t)}</span><span class="info"><b class="${n.tipo === 'mala' ? 'aviso-es' : ''}">${esc(n.txt)}</b></span></div>`).join('') || '<p class="nota">Sin noticias.</p>'}</div>`;
}
function finTemporadaDT() {
  const M = CDT.mundo, c = miClub(), L = ligaDe(M, c.liga);
  const r = cerrarTemporada(CDT);
  CDT.historial.push({ temporada: r.temporada, club: CDT.club, pos: r.pos, campeon: r.campeones[c.liga] });
  const cumplido = r.pos <= CDT.objetivo.pos;
  const premio = Math.round((L.clubes.length - r.pos + 1) * 1.5e6 * L.riqueza / 1e5) * 1e5;
  c.presupuesto += premio;
  const campeon = M.clubes[r.campeones[c.liga]];
  noticia(CDT, `Temporada terminada: puesto ${r.pos}. ${cumplido ? 'La directiva está contenta.' : 'La directiva esperaba más.'} Premio: ${dinero(premio)}.`, cumplido ? 'buena' : 'mala');
  fijarObjetivo(CDT);
  noticia(CDT, `Nueva temporada ${CDT.temporada}-${String(CDT.temporada + 1).slice(2)}. Objetivo: ${CDT.objetivo.txt}.`);
  guardarDT(true);
  pantalla(`<div class="panel centro">${escudoHTML(campeon, 72)}<h3>Campeón de ${esc(L.nombre)}: ${esc(campeon.nombre)}</h3>
      <p>Tu equipo terminó <b>${r.pos}º</b>. ${cumplido ? '¡Objetivo cumplido!' : 'No llegaste al objetivo.'}</p><p>Premio por la clasificación: <b>${dinero(premio)}</b></p>
      ${r.pichichi ? `<p class="nota">Máximo goleador: ${esc(nombreCompleto(M.jug[r.pichichi.id]))} (${r.pichichi.g} goles)</p>` : ''}
      <p class="nota">${r.retirados.length} jugadores se retiraron en todo el mundo; los jóvenes crecen y los veteranos bajan.</p></div>
    <div class="acciones"><button class="btn prin" data-acc="ok">Continuar</button></div>`, { titulo: 'Fin de temporada', acciones: { ok: () => hubDT('inicio') } });
}
