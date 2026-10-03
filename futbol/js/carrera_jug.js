'use strict';
/* Pelotazo · carrera de jugador. Creas un futbolista; en los partidos controlas solo a él (el botón de pase pide el
   balón). Gana experiencia con su nota, mejora lo que entrenas y recibe ofertas. Ranura 'jug'.
   CJ = { mundo, yo, club, temporada, jornada, ligas, resultados, noticias, historial, ofertas, xp, foco, notas, pestana } */
let CJ = null;
const PESTANAS_JUG = [['inicio', 'Inicio'], ['yo', 'Mi jugador'], ['calendario', 'Calendario'], ['clasif', 'Clasificación'], ['ofertas', 'Ofertas'], ['historial', 'Trayectoria']];
const FOCOS = [['tir', 'Tiro'], ['pas', 'Pase'], ['reg', 'Regate'], ['vel', 'Velocidad'], ['def', 'Defensa']];

async function menuCarreraJug() {
  if (!CJ) { const r = await cargarRanura('jug'); CJ = r.datos; if (r.estado === 'recuperada') toast('Tu carrera estaba dañada: se recuperó la copia anterior.'); if (r.estado === 'perdida') toast('Tu carrera estaba dañada y no se pudo recuperar.'); }
  if (CJ) return hubJug('inicio');
  const nacs = Object.entries(NACIONES);
  pantalla(`<p class="intro">Crea tu futbolista. Empiezas con 17 años y una media de 60; el resto depende de ti.</p>
    <div class="form-grid">
      <label class="campo-txt">Nombre<input id="cjN1" maxlength="20" placeholder="Nombre"></label>
      <label class="campo-txt">Apellido<input id="cjN" maxlength="24" placeholder="Apellido"></label>
      <label class="campo-txt">Nacionalidad<select id="cjNac">${nacs.map(([k, n]) => `<option value="${k}" ${k === 'MX' ? 'selected' : ''}>${n.nombre}</option>`).join('')}</select></label>
      <label class="campo-txt">Posición<select id="cjPos">${PUESTOS.filter(p => p !== 'POR').map(p => `<option value="${p}" ${p === 'DC' ? 'selected' : ''}>${NOMBRE_PUESTO[p]}</option>`).join('')}</select></label>
    </div>
    <div class="acciones"><button class="btn prin grande" data-acc="crear">Elegir club</button></div>`, {
    titulo: 'Carrera de jugador', atras: menuPrincipal, acciones: {
      crear: () => {
        const datos = { n1: ($('cjN1').value || 'Alex').trim().slice(0, 20), n: ($('cjN').value || 'Novato').trim().slice(0, 24), nac: $('cjNac').value, pos: $('cjPos').value };
        elegirClub({ titulo: 'Tu primer club', atras: menuCarreraJug, alElegir: c => nuevaCarreraJug(datos, c.id) });
      },
    },
  });
}
function nuevaCarreraJug(d, clubId) {
  const M = JSON.parse(JSON.stringify(APP.mundo)), club = M.clubes[clubId];
  const j = crearJugador(M, { nac: d.nac, pos: d.pos, med: 60, edad: 17, club: clubId, num: 0, riqueza: ligaDe(M, club.liga).riqueza });
  j.nombre1 = d.n1; j.nombre = d.n; j.usuario = true; j.pot = 90; j.forma = 70; fijarMedia(j, 60);
  j.num = numeroLibre(M, club, j.pos); club.plantilla.push(j.id); j.sal = salarioDe(j, ligaDe(M, club.liga).riqueza); j.val = valorDe(j);
  CJ = { mundo: M, yo: j.id, club: clubId, noticias: [], historial: [], ofertas: [], xp: 0, foco: d.pos === 'DC' || d.pos === 'EI' || d.pos === 'ED' ? 'tir' : d.pos.startsWith('M') ? 'pas' : 'def', notas: [], pestana: 'inicio', creada: Date.now() };
  prepararTemporada(CJ);
  noticia(CJ, `${nombreCompleto(j)} firma su primer contrato profesional con el ${club.nombre}.`, 'buena');
  guardarRanura('jug', CJ, true);
  hubJug('inicio');
}
const yoJ = () => CJ.mundo.jug[CJ.yo];
function guardarJug(copia) { return guardarRanura('jug', CJ, copia); }
function hubJug(p = CJ.pestana || 'inicio') {
  CJ.pestana = p;
  const M = CJ.mundo, c = M.clubes[CJ.club], j = yoJ();
  const tabs = `<div class="chips">${PESTANAS_JUG.map(([id, t]) => `<button class="chip ${id === p ? 'sel' : ''}" data-acc="tab" data-id="${id}">${t}${id === 'ofertas' && CJ.ofertas.length ? ' · ' + CJ.ofertas.length : ''}</button>`).join('')}</div>`;
  const vistas = { inicio: vistaInicioJug, yo: vistaYoJug, calendario: () => calendarioHTML(CJ, CJ.club), clasif: () => clasificacionHTML(CJ, APP.verLiga || c.liga, CJ.club), ofertas: vistaOfertasJug, historial: vistaHistorialJug };
  pantalla(tabs + vistas[p](), { titulo: esc(nombreCompleto(j)), atras: menuPrincipal, extra: `${mediaHTML(j.med)}${escudoHTML(c, 30)}`, acciones: ACC_JUG });
}
const ACC_JUG = {
  tab: d => { APP.verLiga = null; hubJug(d.id); },
  verliga: d => { APP.verLiga = d.id; hubJug('clasif'); },
  jugar: () => partidoJug(false), simular: () => partidoJug(true),
  foco: d => { CJ.foco = d.k; guardarJug(); hubJug('yo'); },
  oferta: d => responderOfertaJug(+d.i, d.r === 'si'),
  finTemp: () => finTemporadaJug(),
  retirarse: () => confirmar('¿Retirarte del fútbol? Tu carrera terminará (se guardará una copia).', async () => { await borrarRanura('jug'); CJ = null; toast('Te has retirado. ¡Gracias por tantos partidos!'); menuPrincipal(); }, () => hubJug('historial')),
};
function esTitular() { const M = CJ.mundo; return alineacionDe(M, M.clubes[CJ.club]).includes(CJ.yo); }
// once con tu jugador dentro (cuando sales del banquillo): ocupa el puesto donde mejor encaja, quitando al más flojo
function onceConmigo(M) {
  const c = M.clubes[CJ.club], once = alineacionDe(M, c);
  if (once.includes(CJ.yo)) return once;
  const form = FORMACIONES[c.formacion], yo = yoJ();
  let k = -1, mejor = -1e9;
  form.forEach((f, i) => { if (f.p === 'POR') return; const actual = once[i] == null ? 0 : mediaEn(M.jug[once[i]], f.p); const v = encaje(yo.pos, f.p) * 100 - actual * .5; if (v > mejor) { mejor = v; k = i; } });
  const n = once.slice(); n[k] = CJ.yo; return n;
}
// probabilidad de que el técnico te saque del banquillo
function probEntrar(M) {
  const c = M.clubes[CJ.club], once = alineacionDe(M, c), yo = yoJ(), form = FORMACIONES[c.formacion];
  const rivales = once.map((id, i) => id != null && encaje(yo.pos, form[i].p) >= .88 ? mediaEn(M.jug[id], form[i].p) : null).filter(v => v != null);
  const ref = rivales.length ? Math.min(...rivales) : yo.med;
  return clamp(.45 + (mediaEn(yo, yo.pos) - ref) / 20, .3, .85);
}

function vistaInicioJug() {
  const M = CJ.mundo, c = M.clubes[CJ.club], j = yoJ(), p = partidoDelClub(CJ);
  let prox;
  if (temporadaTerminada(CJ)) prox = `<div class="panel"><h3>Fin de la temporada</h3><div class="acciones"><button class="btn prin grande" data-acc="finTemp">Empezar la temporada siguiente</button></div></div>`;
  else if (!p) prox = `<div class="panel"><h3>Tu liga terminó</h3><div class="acciones"><button class="btn prin" data-acc="simular">Siguiente jornada</button></div></div>`;
  else {
    const A = M.clubes[p.a], B = M.clubes[p.b], tit = disponible(j) && esTitular();
    const estado = !disponible(j) ? `<span class="aviso-es">${j.les > 0 ? 'Estás lesionado (' + j.les + ' partidos)' : 'Estás sancionado'}</span>` : tit ? '<b class="min">Eres titular</b>' : '<span class="aviso-es">Empiezas en el banquillo: entrena para ganarte el puesto</span>';
    prox = `<div class="panel"><h3>Jornada ${CJ.jornada + 1}</h3><div class="vs">
      <div class="equipo-vs">${escudoHTML(A, 56)}<b>${esc(A.nombre)}</b></div><span class="vs-x">VS</span><div class="equipo-vs">${escudoHTML(B, 56)}<b>${esc(B.nombre)}</b></div></div>
      <p class="centro">${estado}</p>
      <div class="acciones">${tit ? '<button class="btn prin grande" data-acc="jugar">Jugar</button><button class="btn" data-acc="simular">Simular</button>'
        : disponible(j) ? '<button class="btn prin grande" data-acc="jugar">Jugar si entro</button><button class="btn" data-acc="simular">Simular</button>' : '<button class="btn prin" data-acc="simular">Siguiente jornada</button>'}</div>
      ${!tit && disponible(j) ? `<p class="nota centro">Probabilidad de salir del banquillo: ${Math.round(probEntrar(M) * 100)}%</p>` : ''}</div>`;
  }
  const media = CJ.notas.length ? (CJ.notas.reduce((s, n) => s + n, 0) / CJ.notas.length).toFixed(1) : '–';
  return `${prox}<div class="tarjetas">
    <div class="panel"><h3>${j.st.pj}</h3><span class="nota">partidos</span></div><div class="panel"><h3>${j.st.g}</h3><span class="nota">goles</span></div>
    <div class="panel"><h3>${j.st.a}</h3><span class="nota">asistencias</span></div><div class="panel"><h3>${media}</h3><span class="nota">nota media</span></div></div>
    <div class="panel"><h3>Consejo</h3><p class="nota">En el partido solo controlas a ${esc(j.nombre)}. Pulsa <b>Pase</b> sin balón para pedírselo a tus compañeros; muévete al espacio para recibir.</p></div>
    ${CJ.noticias.length ? `<div class="panel"><h3>Noticias</h3>${CJ.noticias.slice(0, 4).map(n => `<div class="fila-j"><span class="info"><b class="${n.tipo === 'mala' ? 'aviso-es' : ''}">${esc(n.txt)}</b></span></div>`).join('')}</div>` : ''}`;
}
function vistaYoJug() {
  const j = yoJ(), M = CJ.mundo;
  const at = [['vel', 'Velocidad'], ['tir', 'Tiro'], ['pas', 'Pase'], ['reg', 'Regate'], ['def', 'Defensa']];
  return `<div class="panel"><div class="fila-j" style="border:0">${fotoHTML(j, 64)}<span class="info"><b style="font-size:20px">${esc(nombreCompleto(j))}</b><small>${NOMBRE_PUESTO[j.pos]} · ${j.edad} años · ${NACIONES[j.nac].nombre}</small><small>${esc(M.clubes[j.club].nombre)} · dorsal ${j.num}</small></span>${mediaHTML(j.med)}</div>
    <div class="kv"><span>Potencial</span><b>${j.pot}</b><span>Valor</span><b>${dinero(j.val)}</b><span>Salario</span><b>${dinero(j.sal)} / semana</b><span>Forma</span><b>${j.forma}</b>
    <span>Experiencia</span><b>${CJ.xp} / 100 para la próxima mejora</b></div></div>
    <div class="panel"><h3>Atributos</h3><div class="kv">${at.map(([k, t]) => `<span>${t}</span><b>${j.at[k]}</b>`).join('')}</div></div>
    <div class="etq">Entrenamiento: qué mejoras primero</div><div class="seg">${FOCOS.map(([k, t]) => `<button class="${CJ.foco === k ? 'sel' : ''}" data-acc="foco" data-k="${k}">${t}</button>`).join('')}</div>
    <p class="nota">Cada partido da experiencia según tu nota, goles y asistencias. Cada 100 puntos mejora el atributo que entrenas (y a veces otro).</p>`;
}
function vistaOfertasJug() {
  const M = CJ.mundo;
  return CJ.ofertas.length ? `<div class="panel">${CJ.ofertas.map((o, i) => { const k = M.clubes[o.club]; return `<div class="fila-j">${escudoHTML(k, 34)}<span class="info"><b>${esc(k.nombre)}</b><small>${esc(ligaDe(M, k.liga).nombre)} · salario ${dinero(o.sal)}/semana · ${estrellasHTML(k.rep)}</small></span><button class="btn chico prin" data-acc="oferta" data-i="${i}" data-r="si">Aceptar</button><button class="btn chico" data-acc="oferta" data-i="${i}" data-r="no">Rechazar</button></div>`; }).join('')}</div>`
    : '<p class="intro">No hay ofertas ahora. Los clubes se fijan en ti a mitad y al final de cada temporada, según tu media y tus notas.</p>';
}
function vistaHistorialJug() {
  const M = CJ.mundo, j = yoJ();
  return `<div class="panel">${CJ.historial.map(h => `<div class="fila-j"><span class="info"><b>${h.temporada}-${String(h.temporada + 1).slice(2)} · ${esc(M.clubes[h.club].nombre)}</b><small>${h.pj} partidos · ${h.g} goles · ${h.a} asistencias · nota ${h.nota} · media ${h.med}</small></span></div>`).join('') || '<p class="nota">Tu primera temporada está en marcha.</p>'}</div>
    ${j.edad >= 32 ? '<div class="acciones"><button class="btn" data-acc="retirarse">Retirarse</button></div>' : ''}`;
}
function partidoJug(simular) {
  const M = CJ.mundo, p = partidoDelClub(CJ), j = yoJ();
  if (!p) { noticiasDeNovedades(CJ, jugarJornada(CJ, null)); guardarJug(); return hubJug('inicio'); }
  const lado = p.a === CJ.club ? 0 : 1, titular = disponible(j) && esTitular();
  const entra = !titular && disponible(j) && AZ() < probEntrar(M);
  const minEntra = entra ? 55 + Math.floor(AZ() * 25) : 0;
  const onceMio = entra ? onceConmigo(M) : null;
  const opc = onceMio ? (lado ? { onceV: onceMio } : { onceL: onceMio }) : {};
  const terminar = res => {
    const r = res.jug[CJ.yo];
    noticiasDeNovedades(CJ, jugarJornada(CJ, res));
    let resumen = '';
    subirExperiencia(15); // entrenamiento de la semana
    if (r) {
      CJ.notas.push(r.nota);
      const xp = Math.round((Math.max(0, r.nota - 5) * 18 + r.g * 25 + r.a * 15) * (entra ? .6 : 1));
      subirExperiencia(xp);
      if (entra) resumen += `<p class="centro min">Saliste del banquillo en el minuto ${minEntra}.</p>`;
      resumen = `<div class="panel"><h3>Tu partido</h3><div class="kv"><span>Nota</span><b>${r.nota.toFixed(1)}</b><span>Goles</span><b>${r.g}</b><span>Asistencias</span><b>${r.a}</b><span>Experiencia</span><b>+${xp}</b></div></div>`;
    } else resumen = `<div class="panel"><p class="nota">${disponible(j) ? 'No jugaste este partido.' : 'No pudiste jugar.'}</p></div>`;
    if (CJ.jornada === 19) ofertasParaMi();
    guardarJug(CJ.jornada % 5 === 0);
    if (!simular) { const gf = lado ? res.gv : res.gl, gc = lado ? res.gl : res.gv; registrarPartido(gf, gc); }
    mostrarResultado(res, { local: M.clubes[p.a], visita: M.clubes[p.b], titulo: 'Jornada ' + CJ.jornada, extra: resumen, botones: [{ t: 'Continuar', prin: true, f: () => hubJug('inicio') }] });
  };
  if (simular || !(titular || entra)) {
    if (!simular && !entra && disponible(j)) toast('El técnico no te sacó esta vez. Sigue entrenando.', 4000);
    return terminar(simularPartido(M, p.a, p.b, opc));
  }
  let inicio = null;
  if (entra) { // lo que pasó antes de que entraras se simula
    const pre = simularPartido(M, p.a, p.b), goles = pre.goles.filter(g => g.min < minEntra);
    inicio = { min: minEntra, gl: goles.filter(g => g.lado === 0).length, gv: goles.filter(g => g.lado === 1).length, goles };
  }
  const local = equipoParaPartido(M, p.a, lado ? null : onceMio), visita = equipoParaPartido(M, p.b, lado ? onceMio : null);
  jugarPartido({ local, visita, usuario: lado, jugadorId: CJ.yo, modo: 'jug', titulo: entra ? `Entras en el minuto ${minEntra}` : 'Jornada ' + (CJ.jornada + 1), inicio, alTerminar: terminar });
}
function subirExperiencia(xp) {
  const j = yoJ(); CJ.xp += xp;
  while (CJ.xp >= 100) {
    CJ.xp -= 100;
    const sube = AZ() < .75 ? CJ.foco : azElige(FOCOS)[0];
    if (j.at[sube] < 99) j.at[sube]++;
    j.med = mediaDe(j); j.pot = Math.max(j.pot, j.med); j.val = valorDe(j);
  }
}
function ofertasParaMi() {
  const M = CJ.mundo, j = yoJ(), media = CJ.notas.length ? CJ.notas.reduce((s, n) => s + n, 0) / CJ.notas.length : 6;
  const actual = M.clubes[CJ.club];
  const interesados = M.clubes.filter(k => k.id !== CJ.club && fuerzaDe(M, k) <= j.med + 4 + (media - 6.5) * 3 && k.rep >= actual.rep - 6);
  const n = media >= 7 ? 3 : media >= 6.5 ? 2 : 1;
  for (let i = 0; i < n && interesados.length; i++) {
    const k = interesados.splice(Math.floor(AZ() * interesados.length), 1)[0];
    CJ.ofertas.push({ club: k.id, sal: Math.round(salarioDe(j, ligaDe(M, k.liga).riqueza) * azEntre(1.1, 1.5) / 100) * 100 });
    noticia(CJ, `El ${k.nombre} pregunta por ti.`, 'buena');
  }
}
function responderOfertaJug(i, acepta) {
  const M = CJ.mundo, o = CJ.ofertas[i]; if (!o) return;
  if (acepta) {
    const j = yoJ(), k = M.clubes[o.club], antes = M.clubes[CJ.club];
    traspasar(M, CJ.yo, o.club); CJ.club = o.club; j.sal = o.sal; CJ.ofertas = [];
    noticia(CJ, `¡Fichas por el ${k.nombre}! Dejas el ${antes.nombre}.`, 'buena');
    guardarJug(true); toast('¡Nuevo club!');
  } else { CJ.ofertas.splice(i, 1); guardarJug(); }
  hubJug(acepta ? 'inicio' : 'ofertas');
}
function finTemporadaJug() {
  const M = CJ.mundo, j = yoJ(), media = CJ.notas.length ? +(CJ.notas.reduce((s, n) => s + n, 0) / CJ.notas.length).toFixed(1) : 0;
  const hist = { temporada: CJ.temporada, club: CJ.club, pj: j.st.pj, g: j.st.g, a: j.st.a, nota: media || '–', med: j.med };
  const r = cerrarTemporada(CJ);
  CJ.historial.push(hist); CJ.notas = []; CJ.ofertas = []; ofertasParaMi();
  noticia(CJ, `Nueva temporada. Tienes ${j.edad} años y una media de ${j.med}.`);
  guardarJug(true);
  const L = ligaDe(M, M.clubes[CJ.club].liga), campeon = M.clubes[r.campeones[L.id]];
  pantalla(`<div class="panel centro">${escudoHTML(campeon, 64)}<h3>Campeón de ${esc(L.nombre)}: ${esc(campeon.nombre)}</h3>
    <p>Tu temporada: ${hist.pj} partidos, ${hist.g} goles, ${hist.a} asistencias, nota media ${hist.nota}.</p><p>Ahora tienes ${j.edad} años y media <b>${j.med}</b>.</p>
    ${CJ.ofertas.length ? `<p class="min">Tienes ${CJ.ofertas.length} oferta${CJ.ofertas.length > 1 ? 's' : ''} de otros clubes.</p>` : ''}</div>
    <div class="acciones"><button class="btn prin" data-acc="ok">Continuar</button></div>`, { titulo: 'Fin de temporada', acciones: { ok: () => hubJug(CJ.ofertas.length ? 'ofertas' : 'inicio') } });
}
