'use strict';
/* Pelotazo · editor dentro del juego. Edita la base de datos (lo que usan amistosos, torneos, Equipo Estrella y las
   carreras nuevas) o el mundo de una carrera en curso. Clubes: nombre, abreviatura, estadio, colores, reputación,
   presupuesto y escudo. Jugadores: nombre, edad, nacionalidad, posición, media, potencial, salario, forma, lesión,
   sanción, dorsal, foto y club. Las imágenes se reducen y se guardan dentro de los datos. */
const ED = { destino: 'base', liga: null };
function mundoEditado() { return ED.destino === 'dt' ? CDT && CDT.mundo : ED.destino === 'jug' ? CJ && CJ.mundo : APP.mundo; }
let guardarEdT = null;
function guardarEditor() {
  clearTimeout(guardarEdT);
  guardarEdT = setTimeout(() => {
    if (ED.destino === 'dt' && CDT) guardarRanura('dt', CDT, true);
    else if (ED.destino === 'jug' && CJ) guardarRanura('jug', CJ, true);
    else guardarRanura('mundo', APP.mundo, true);
  }, 500);
}
async function menuEditor() {
  if (!CDT) { const r = await cargarRanura('dt'); CDT = r.datos; }
  if (!CJ) { const r = await cargarRanura('jug'); CJ = r.datos; }
  if ((ED.destino === 'dt' && !CDT) || (ED.destino === 'jug' && !CJ)) ED.destino = 'base';
  const M = mundoEditado();
  ED.liga = ED.liga || M.ligas[0].id;
  const destinos = [['base', 'Base de datos'], ...(CDT ? [['dt', 'Mi carrera de técnico']] : []), ...(CJ ? [['jug', 'Mi carrera de jugador']] : [])];
  const clubes = clubesDeLiga(M, ED.liga).sort((a, b) => b.rep - a.rep);
  pantalla(`<div class="etq">Qué editas</div><div class="seg">${destinos.map(([k, t]) => `<button class="${ED.destino === k ? 'sel' : ''}" data-acc="destino" data-k="${k}">${t}</button>`).join('')}</div>
    <p class="nota">${ED.destino === 'base' ? 'Los cambios en la base de datos se usan en amistosos, torneos, Equipo Estrella y en las carreras que empieces después.' : 'Los cambios solo afectan a esa carrera.'}</p>
    <div class="chips">${M.ligas.map(l => `<button class="chip ${l.id === ED.liga ? 'sel' : ''}" data-acc="liga" data-id="${l.id}">${esc(l.nombre)}</button>`).join('')}</div>
    <div class="clubes">${clubes.map(c => `<button class="club" data-acc="club" data-id="${c.id}">${escudoHTML(c, 40)}<span><b>${esc(c.nombre)}</b><small>${esc(c.estadio)}</small></span></button>`).join('')}</div>
    ${ED.destino === 'base' ? '<div class="acciones"><button class="btn" data-acc="fabrica">Volver a la base de datos de fábrica</button></div>' : ''}`, {
    titulo: 'Editor', atras: menuPrincipal, acciones: {
      destino: d => { ED.destino = d.k; menuEditor(); },
      liga: d => { ED.liga = d.id; menuEditor(); },
      club: d => editarClub(+d.id),
      fabrica: () => confirmar('¿Volver a la base de datos de fábrica? Se perderán tus cambios (queda una copia de seguridad).', async () => { await borrarRanura('mundo'); APP.mundo = generarMundo(); APP.fondo = false; toast('Base de datos de fábrica restaurada.'); menuEditor(); }, menuEditor),
    },
  });
}
// lee una imagen elegida por el usuario y la reduce (cuadrada) para guardarla dentro de los datos
function leerImagen(input, lado, formato, alListo) {
  const f = input.files && input.files[0]; if (!f) return;
  if (!/^image\//.test(f.type)) { toast('Ese archivo no es una imagen.'); return; }
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = lado;
      const x = c.getContext('2d'), s = Math.min(img.width, img.height);
      if (formato === 'image/png') x.drawImage(img, 0, 0, img.width, img.height, ...ajustarDentro(img.width, img.height, lado));
      else x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, lado, lado);
      alListo(c.toDataURL(formato, .85));
    };
    img.onerror = () => toast('No se pudo leer la imagen.');
    img.src = r.result;
  };
  r.readAsDataURL(f);
}
function ajustarDentro(w, h, lado) { const k = lado / Math.max(w, h), a = w * k, b = h * k; return [(lado - a) / 2, (lado - b) / 2, a, b]; }
const campoTxt = (t, k, v, extra = '') => `<label class="campo-txt">${t}<input value="${esc(v)}" data-cambio="campo" data-k="${k}" ${extra}></label>`;
const campoNum = (t, k, v, min, max) => `<label class="campo-txt">${t}<input type="number" inputmode="numeric" value="${v}" min="${min}" max="${max}" data-cambio="campo" data-k="${k}" data-num="1" data-min="${min}" data-max="${max}"></label>`;
const campoColor = (t, k, v) => `<label class="campo-txt">${t}<input type="color" value="${colorCss(v)}" data-cambio="color" data-k="${k}"></label>`;

function editarClub(id) {
  const M = mundoEditado(), c = M.clubes[id];
  const js = plantillaDe(M, c).sort(ordenPorPuesto);
  pantalla(`<div class="panel"><div class="fila-j" style="border:0">${escudoHTML(c, 72)}<span class="info"><b style="font-size:20px">${esc(c.nombre)}</b><small>${esc(ligaDe(M, c.liga).nombre)}</small></span></div>
      <div class="form-grid">
        ${campoTxt('Nombre', 'nombre', c.nombre, 'maxlength="32"')}${campoTxt('Abreviatura (3-4 letras)', 'corto', c.corto, 'maxlength="4"')}
        ${campoTxt('Estadio', 'estadio', c.estadio, 'maxlength="40"')}${campoNum('Reputación (40-99)', 'rep', c.rep, 40, 99)}
        ${campoNum('Presupuesto (€)', 'presupuesto', c.presupuesto, 0, 2e9)}
        ${campoColor('Camiseta', 'camiseta', c.camiseta)}${campoColor('Pantalón', 'pantalon', c.pantalon)}${campoColor('Segunda camiseta', 'camiseta2', c.camiseta2)}
        <label class="campo-txt">Escudo (imagen)<input type="file" accept="image/*" data-cambio="escudo"></label>
      </div>
      ${c.escudo ? '<div class="acciones"><button class="btn chico" data-acc="sinEscudo">Quitar escudo</button></div>' : ''}</div>
    <div class="etq">Plantilla (${js.length}) · toca un jugador para editarlo</div>
    <div class="panel">${js.map(j => `<button class="fila-j" data-acc="jug" data-id="${j.id}"><span class="pos pos-${j.pos}">${j.pos}</span>${fotoHTML(j, 30)}<span class="info"><b>${j.num} · ${esc(nombreCompleto(j))}</b><small>${j.edad} años${j.les > 0 ? ' · lesionado' : ''}${j.san > 0 ? ' · sancionado' : ''}</small></span>${mediaHTML(j.med)}</button>`).join('')}</div>`, {
    titulo: 'Editar club', atras: menuEditor, acciones: {
      campo: (d, el) => { let v = el.value; if (d.num) v = Math.round(clamp(+v || 0, +d.min, +d.max)); else v = v.trim() || c[d.k]; if (d.k === 'corto') v = String(v).toUpperCase(); c[d.k] = v; guardarEditor(); },
      color: (d, el) => { c[d.k] = parseInt(el.value.slice(1), 16); guardarEditor(); },
      escudo: (d, el) => leerImagen(el, 128, 'image/png', url => { c.escudo = url; guardarEditor(); editarClub(id); }),
      sinEscudo: () => { c.escudo = null; guardarEditor(); editarClub(id); },
      jug: d => editarJugador(+d.id),
    },
  });
}
function editarJugador(id) {
  const M = mundoEditado(), j = M.jug[id], club = M.clubes[j.club];
  const at = [['vel', 'Velocidad'], ['tir', 'Tiro'], ['pas', 'Pase'], ['reg', 'Regate'], ['def', 'Defensa'], ['par', 'Portería']];
  pantalla(`<div class="panel"><div class="fila-j" style="border:0">${fotoHTML(j, 72)}<span class="info"><b style="font-size:20px">${esc(nombreCompleto(j))}</b><small>${club ? esc(club.nombre) : 'Sin club'}</small></span>${mediaHTML(j.med)}</div>
      <div class="form-grid">
        ${campoTxt('Nombre', 'nombre1', j.nombre1, 'maxlength="20"')}${campoTxt('Apellido', 'nombre', j.nombre, 'maxlength="24"')}
        ${campoNum('Edad', 'edad', j.edad, 15, 45)}${campoNum('Dorsal', 'num', j.num, 1, 99)}
        <label class="campo-txt">Nacionalidad<select data-cambio="sel" data-k="nac">${Object.entries(NACIONES).map(([k, n]) => `<option value="${k}" ${k === j.nac ? 'selected' : ''}>${n.nombre}</option>`).join('')}</select></label>
        <label class="campo-txt">Posición<select data-cambio="sel" data-k="pos">${PUESTOS.map(p => `<option value="${p}" ${p === j.pos ? 'selected' : ''}>${NOMBRE_PUESTO[p]}</option>`).join('')}</select></label>
        ${campoNum('Media', 'med', j.med, 30, 99)}${campoNum('Potencial', 'pot', j.pot, 30, 99)}
        ${campoNum('Salario (€ por semana)', 'sal', j.sal, 0, 2e6)}${campoNum('Forma (0-100)', 'forma', j.forma, 0, 100)}
        ${campoNum('Lesión (partidos fuera)', 'les', j.les, 0, 60)}${campoNum('Sanción (partidos)', 'san', j.san, 0, 20)}
        <label class="campo-txt">Foto<input type="file" accept="image/*" data-cambio="foto"></label>
        <label class="campo-txt">Club<select data-cambio="club">${M.clubes.map(k => `<option value="${k.id}" ${k.id === j.club ? 'selected' : ''}>${esc(k.nombre)}</option>`).join('')}</select></label>
      </div>
      <div class="acciones">${j.les > 0 ? '<button class="btn chico" data-acc="curar">Curar lesión</button>' : ''}${j.san > 0 ? '<button class="btn chico" data-acc="perdonar">Quitar sanción</button>' : ''}${j.foto ? '<button class="btn chico" data-acc="sinFoto">Quitar foto</button>' : ''}</div></div>
    <div class="panel"><h3>Atributos</h3><div class="form-grid">${at.map(([k, t]) => campoNum(t, 'at.' + k, j.at[k], 1, 99)).join('')}</div></div>`, {
    titulo: 'Editar jugador', atras: () => editarClub(j.club >= 0 ? j.club : 0), acciones: {
      campo: (d, el) => {
        if (d.num) {
          const v = Math.round(clamp(+el.value || 0, +d.min, +d.max));
          if (d.k === 'med') fijarMedia(j, v);
          else if (d.k.startsWith('at.')) { j.at[d.k.slice(3)] = v; j.med = mediaDe(j); }
          else j[d.k] = v;
          if (d.k === 'pot' || d.k === 'med') j.pot = Math.max(j.pot, j.med);
          j.val = valorDe(j);
        } else j[d.k] = el.value.trim() || j[d.k];
        guardarEditor();
        if (d.k === 'med' || d.k.startsWith('at.')) editarJugador(id);
      },
      sel: (d, el) => { j[d.k] = el.value; if (d.k === 'pos') j.med = mediaDe(j); j.val = valorDe(j); guardarEditor(); editarJugador(id); },
      club: (d, el) => {
        const dest = +el.value; if (dest === j.club) return;
        if (j.club >= 0 && plantillaDe(M, j.club).length <= 14) { toast('Ese club se quedaría con muy pocos jugadores.'); return editarJugador(id); }
        traspasar(M, id, dest); guardarEditor(); toast('Jugador movido al ' + M.clubes[dest].nombre); editarJugador(id);
      },
      foto: (d, el) => leerImagen(el, 96, 'image/jpeg', url => { j.foto = url; guardarEditor(); editarJugador(id); }),
      sinFoto: () => { j.foto = null; guardarEditor(); editarJugador(id); },
      curar: () => { j.les = 0; guardarEditor(); toast('Lesión curada.'); editarJugador(id); },
      perdonar: () => { j.san = 0; guardarEditor(); toast('Sanción retirada.'); editarJugador(id); },
    },
  });
}
