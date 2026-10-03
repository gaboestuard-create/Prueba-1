'use strict';
/* Pelotazo · temporada: lo común a las carreras (técnico y jugador). Todas las ligas avanzan a la vez, jornada a
   jornada; los partidos que no juega el usuario se simulan. C (carrera) tiene: { mundo, club, temporada, jornada,
   ligas: { id: { calendario, tabla, goles } }, noticias, historial }. */
function prepararTemporada(C) {
  const M = C.mundo;
  C.jornada = 0; C.ligas = {}; C.resultados = {};
  for (const L of M.ligas) C.ligas[L.id] = { calendario: calendarioLiga(L.clubes), tabla: tablaNueva(L.clubes), goles: {} };
  C.temporada = M.temporada;
}
const jornadasTemporada = C => Math.max(...Object.values(C.ligas).map(l => l.calendario.length));
const ligaDelClub = C => C.mundo.clubes[C.club].liga;
// partido del club del usuario en la jornada actual (o null si su liga ya terminó)
function partidoDelClub(C) {
  const L = C.ligas[ligaDelClub(C)], j = L.calendario[C.jornada];
  if (!j) return null;
  const p = j.find(([a, b]) => a === C.club || b === C.club);
  return p ? { a: p[0], b: p[1] } : null;
}
function noticia(C, txt, tipo = 'info') { C.noticias.unshift({ t: C.temporada + '·' + (C.jornada + 1), txt, tipo }); if (C.noticias.length > 60) C.noticias.length = 60; }
// juega la jornada en todas las ligas. resUsuario: resultado del partido del usuario (jugado o simulado), o null
function jugarJornada(C, resUsuario) {
  const M = C.mundo, mio = partidoDelClub(C), novedades = [];
  for (const L of M.ligas) {
    const E = C.ligas[L.id], j = E.calendario[C.jornada];
    if (!j) continue;
    for (const [a, b] of j) {
      const esMio = mio && a === mio.a && b === mio.b;
      const res = esMio && resUsuario ? resUsuario : simularPartido(M, a, b);
      if (esMio) C.ultimoRes = { a, b, gl: res.gl, gv: res.gv };
      if (a === C.club || b === C.club) (C.resultados = C.resultados || {})[a + '-' + b] = [res.gl, res.gv];
      novedades.push(...aplicarResultado(M, a, b, res).map(n => ({ ...n, club: M.jug[n.j].club })));
      sumarATabla(E.tabla, a, b, res.gl, res.gv);
      for (const g of res.goles) if (g.id != null && !g.propia) E.goles[g.id] = (E.goles[g.id] || 0) + 1;
    }
  }
  C.jornada++;
  return novedades;
}
const temporadaTerminada = C => C.jornada >= jornadasTemporada(C);
// cierre de la temporada: campeones, historial, evolución de jugadores, fichajes de la computadora y nuevo calendario
function cerrarTemporada(C) {
  const M = C.mundo, resumen = { campeones: {}, pos: null };
  for (const L of M.ligas) {
    const t = ordenarTabla(C.ligas[L.id].tabla);
    resumen.campeones[L.id] = t[0].id;
    if (L.id === ligaDelClub(C)) resumen.pos = t.findIndex(f => f.id === C.club) + 1;
    const pichichi = Object.entries(C.ligas[L.id].goles).sort((a, b) => b[1] - a[1])[0];
    if (L.id === ligaDelClub(C) && pichichi) resumen.pichichi = { id: +pichichi[0], g: pichichi[1] };
  }
  C.historial.push({ temporada: C.temporada, club: C.club, pos: resumen.pos, campeon: resumen.campeones[ligaDelClub(C)] });
  const retirados = evolucionarJugadores(M);
  fichajesComputadora(C);
  prepararTemporada(C);
  return { ...resumen, retirados };
}
// la computadora también ficha: buenos jugadores de clubes pequeños pasan a clubes más grandes
function fichajesComputadora(C, n = 40) {
  const M = C.mundo, protegidos = new Set([C.yo]);
  for (let i = 0; i < n; i++) {
    const comprador = azElige(M.clubes); if (comprador.id === C.club) continue;
    const pos = azElige(PLANTILLA_TIPO);
    const candidatos = M.jug.filter(j => j.club >= 0 && j.club !== comprador.id && j.club !== C.club && !protegidos.has(j.id) && j.pos === pos && M.clubes[j.club].rep < comprador.rep && j.val < comprador.presupuesto * .5 && j.med > fuerzaDe(M, comprador) - 2);
    if (!candidatos.length) continue;
    const j = azElige(candidatos), vendedor = M.clubes[j.club];
    if (vendedor.plantilla.length <= 20 || comprador.plantilla.length >= 28) continue;
    comprador.presupuesto -= j.val; vendedor.presupuesto += j.val;
    traspasar(M, j.id, comprador.id);
    if (C.siguiendo && C.siguiendo.has && C.siguiendo.has(j.id)) noticia(C, `${nombreCompleto(j)} ficha por el ${comprador.nombre}.`);
  }
}
// textos de noticias para las novedades que afectan al club del usuario
function noticiasDeNovedades(C, novedades) {
  const M = C.mundo;
  for (const n of novedades) {
    if (n.club !== C.club) continue;
    const j = M.jug[n.j];
    if (n.tipo === 'lesion') noticia(C, `${nombreCompleto(j)} se lesionó: estará ${n.n} partido${n.n > 1 ? 's' : ''} fuera.`, 'mala');
    if (n.tipo === 'roja') noticia(C, `${nombreCompleto(j)} fue expulsado: cumplirá un partido de sanción.`, 'mala');
    if (n.tipo === 'alta') noticia(C, `${nombreCompleto(j)} ya está recuperado.`, 'buena');
  }
}
// clasificación con pestañas de ligas (para las dos carreras)
function clasificacionHTML(C, ligaId, resaltar) {
  const M = C.mundo, E = C.ligas[ligaId];
  return `<div class="chips">${M.ligas.map(l => `<button class="chip ${l.id === ligaId ? 'sel' : ''}" data-acc="verliga" data-id="${l.id}">${esc(l.nombre)}</button>`).join('')}</div>
    ${tablaHTML(M, E.tabla, resaltar)}${goleadoresHTML(M, E.goles, 10)}`;
}
// calendario del club con resultados
function calendarioHTML(C, clubId) {
  const M = C.mundo, E = C.ligas[M.clubes[clubId].liga];
  const filas = E.calendario.map((j, i) => { const p = j.find(([a, b]) => a === clubId || b === clubId); return p ? { i, a: p[0], b: p[1] } : null; }).filter(Boolean);
  return `<div class="panel">${filas.map(f => {
    const local = f.a === clubId, rival = M.clubes[local ? f.b : f.a];
    const jugado = f.i < C.jornada, res = jugado ? resultadoGuardado(C, f.a, f.b) : null;
    return `<div class="fila-j ${f.i === C.jornada ? 'yo' : ''}"><span class="nota" style="width:28px">J${f.i + 1}</span>${escudoHTML(rival, 26)}<span class="info"><b>${local ? '' : '@ '}${esc(rival.nombre)}</b><small>${local ? 'En casa' : 'Fuera'}</small></span><span>${res ? res : f.i === C.jornada ? '<b class="min">Próximo</b>' : ''}</span></div>`;
  }).join('')}</div>`;
}
// resultado de un partido ya jugado: se guarda en la carrera para el calendario
function resultadoGuardado(C, a, b) { const r = (C.resultados || {})[a + '-' + b]; return r ? `${r[0]} - ${r[1]}` : '·'; }
