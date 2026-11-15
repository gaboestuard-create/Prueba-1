// Capa 3: INTERFAZ. Solo lee el estado del Motor y le manda acciones con Motor.hacer().
(function () {
  const M = Motor, D = DATOS, B = D.balance;
  const CLAVE = 'miimperio.partida', TEMA = 'miimperio.tema';
  const TABS = [['mapa', 'Mapa'], ['negocios', 'Negocios'], ['personaje', 'Personaje'], ['finanzas', 'Finanzas'], ['menu', 'Menú']];
  const VEL = [0, 1, 2, 4, 8], MS_HORA = 2000;
  const GASTOS = { renta: 'Renta de locales', servicios: 'Servicios', salarios: 'Sueldos y capacitación', mercancia: 'Mercancía', marketing: 'Marketing', equipo: 'Equipo y mejoras', viajes: 'Viajes', vida: 'Vivienda, comida y ocio', intereses: 'Intereses', abonos: 'Abono a préstamos', impuestos: 'Impuestos' };
  const app = document.getElementById('app');
  let S = null, reloj = null, presionando = false, pendiente = false, visto = 0;
  const ui = { tab: 'mapa', sel: 'casa', neg: null, sec: 'insight', vel: 0, confirma: null, exporta: '', importa: '', nueva: { nombre: '', dinero: D.dineroInicial[1], dificultad: 'normal', modo: 'historia' } };
  // localStorage a veces no existe (modo privado, vista previa): nunca debe tumbar el juego.
  const disco = {
    leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    guardar(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $$ = x => (x < 0 ? '−' : '') + '$' + Math.abs(Math.round(x)).toLocaleString('es-MX');
  const $c = x => '$' + x.toFixed(2);
  const hora = h => String(h).padStart(2, '0') + ':00';
  const por = (l, id) => l.find(x => x.id === id);
  const nivel = v => (v < 40 ? 'mal' : v < 65 ? 'aviso' : '');
  const r2 = x => Math.round(x * 100) / 100;
  const bt = (texto, a, args, cls = '', off = false) => `<button class="${cls}" data-a="${a}" data-args="${esc(JSON.stringify(args || {}))}"${off ? ' disabled' : ''}>${texto}</button>`;
  const par = (a, b, cls = '') => `<div class="par"><span>${a}</span><b class="${cls}">${b}</b></div>`;
  const barra = (v, cls = nivel(v)) => `<div class="barra ${cls}"><i style="width:${Math.round(Math.max(0, Math.min(100, v)))}%"></i></div>`;
  const medida = (nombre, v, nota = '') => `<div class="medida">${par(nombre, v == null ? '—' : Math.round(v))}${barra(v ?? 0, v == null ? '' : nivel(v))}${nota ? `<p class="tenue">${nota}</p>` : ''}</div>`;
  const negocioEn = id => S.negocios.find(n => n.local === id);

  function aviso(texto) {
    const el = document.createElement('div');
    el.className = 'aviso-t';
    el.textContent = texto;
    const caja = document.getElementById('avisos');
    caja.append(el);
    while (caja.children.length > 3) caja.firstChild.remove();
    setTimeout(() => el.remove(), 4500);
  }

  // ---------- Vistas ----------
  function vInicio() {
    const g = leerGuardado(), n = ui.nueva;
    const opc = (k, lista) => `<div class="opc">${lista.map(([v, t]) => bt(t, 'ui:opc', { k, v }, n[k] === v ? 'on' : '')).join('')}</div>`;
    return `<main class="borde"><div class="inicio">
      <div><h1>Mi Imperio</h1><p class="tenue">Llegas a la ciudad con poco dinero. Abre un negocio, hazlo rentable y deja de hacerlo todo tú.</p></div>
      ${g ? `<div class="tarjeta"><b>${esc(g.nombre)} · día ${M.dia(g)} · ${$$(g.dinero)}</b>${bt('Continuar partida', 'ui:cargar', {}, 'pri')}</div>` : ''}
      <div class="tarjeta"><h2>Nueva partida</h2>
        <label>Nombre<input id="nombre" maxlength="24" value="${esc(n.nombre)}" placeholder="Tu nombre" autocomplete="off"></label>
        <span class="rot">Dinero inicial</span>${opc('dinero', D.dineroInicial.map(v => [v, $$(v)]))}
        <span class="rot">Dificultad</span>${opc('dificultad', Object.entries(D.dificultades).map(([k, d]) => [k, d.nombre]))}
        <span class="rot">Modo</span>${opc('modo', [['historia', 'Historia'], ['libre', 'Libre']])}
        <p class="tenue">${n.modo === 'historia' ? `Ganas al llegar a un patrimonio de ${$$(D.dificultades[n.dificultad].meta)}.` : 'Sin meta ni final.'} Si pasas ${B.diasQuiebra} días con saldo negativo, el banco embarga tus bienes; pierdes cuando ni eso alcanza.</p>
        ${bt('Empezar', 'ui:empezar', {}, 'pri')}</div>
      <div class="tarjeta"><h3>Traer una partida de otro dispositivo</h3><label>Texto exportado<textarea id="importa">${esc(ui.importa)}</textarea></label>${bt('Importar', 'ui:importar')}</div>
    </div></main>`;
  }

  function vFinal() {
    if (S.fin === 'derrota') return `<div class="final"><b>Bancarrota.</b><span>El embargo no alcanzó a cubrir tu deuda. Llegaste al día ${M.dia(S)}.</span>${bt('Nueva partida', 'ui:salir')}</div>`;
    return `<div class="final"><b>Meta alcanzada.</b><span>Patrimonio de ${$$(M.patrimonio(S))} en ${M.dia(S) - 1} días.</span>${bt('Seguir en modo libre', 'seguirLibre')}</div>`;
  }

  function vCabecera() {
    const J = S.jugador, a = M.asesor(S);
    return `<div class="dentro">
      <div class="fila"><span class="reloj">Día ${M.dia(S)} · ${D.semana[(M.dia(S) - 1) % 7]} ${hora(M.hh(S))}</span><span class="dinero ${S.dinero < 0 ? 'neg' : ''}">${$$(S.dinero)}</span></div>
      <div class="vel">${VEL.map(v => bt(v ? 'x' + v : 'Pausa', 'ui:vel', { v }, ui.vel === v ? 'on' : '')).join('')}</div>
      <div class="nec">${[['Energía', J.energia], ['Comida', J.hambre], ['Ánimo', J.animo]].map(([n, v]) => `<div>${n}${barra(v)}</div>`).join('')}</div>
      ${S.fin ? vFinal() : a ? bt(`<b>Asesor:</b> ${esc(a.texto)}`, 'ui:tab', { tab: a.tab }, 'asesor') : '<span></span>'}
    </div>`;
  }

  function vMapa() {
    const J = S.jugador;
    const pins = M.lugares(S).map(p => {
      const N = negocioEn(p.id);
      return `<g class="pin ${p.tipo}${N ? ' mio' : ''}${ui.sel === p.id ? ' sel' : ''}" data-a="ui:sel" data-args="${esc(JSON.stringify({ id: p.id }))}" role="button" tabindex="0" aria-label="${esc(p.nombre)}">
        <circle class="hit" cx="${p.x}" cy="${p.y}" r="24"/>${J.lugar === p.id ? `<circle class="yo" cx="${p.x}" cy="${p.y}" r="17"/>` : ''}
        <circle class="p" cx="${p.x}" cy="${p.y}" r="11"/><text x="${p.x}" y="${p.y + 25}">${esc(N ? por(D.negocios, N.tipo).corto : p.corto)}</text></g>`;
    }).join('');
    return `<div class="tarjeta"><svg class="mapa" viewBox="0 0 360 300" role="group" aria-label="Mapa de la ciudad">
        <polygon class="rio" points="0,200 360,180 360,210 0,225"/>
        ${D.distritos.map(d => `<polygon class="dist ${d.id}" points="${d.forma}"/><text class="dn" x="10" y="${+d.forma.split(' ')[0].split(',')[1] + 16}">${esc(d.nombre)}</text>`).join('')}
        ${pins}</svg>
      <div class="leyenda"><span style="--c:var(--tinta)">Casa</span><span style="--c:var(--panel)">Local libre</span><span style="--c:var(--acento)">Tu negocio</span><span style="--c:var(--aviso)">Proveedor</span><span style="--c:var(--tenue)">Empleo</span><span style="--c:transparent;">Línea roja: tú</span></div></div>
      ${vLugar()}`;
  }

  function vLugar() {
    const J = S.jugador, p = M.lugar(S, ui.sel), aqui = J.lugar === p.id, dist = por(D.distritos, p.distrito), N = negocioEn(p.id);
    const v = aqui ? null : M.viaje(S, p.id);
    let cuerpo;
    if (p.tipo === 'casa') cuerpo = `<div class="botones">${bt('Dormir', 'dormir', {}, 'pri', !aqui)}${bt(`Comer ${$$(B.comerCasa.costo)}`, 'comer', {}, '', !aqui)}</div>`;
    else if (p.tipo === 'empleo') cuerpo = `<p class="tenue">Turno de ${p.horas} h por ${$$(p.pagoHora * p.horas)}. Cansa, pero no arriesgas nada.</p>${bt(`Trabajar ${p.horas} h`, 'trabajar', {}, 'pri', !aqui)}`;
    else if (p.tipo === 'proveedor') {
      const libre = B.cargaMax - M.cargaUsada(S);
      cuerpo = `<p class="tenue">Llevas ${M.cargaUsada(S)} de ${B.cargaMax} unidades.${aqui ? '' : ' Viaja aquí para comprar.'}</p><div class="lista">${p.productos.map(id => {
        const P = D.productos[id], mios = S.negocios.reduce((s, n) => s + (n.stock[id] || 0), 0);
        return `<div class="renglon"><div><b>${P.nombre}</b><div class="tenue">${$c(P.costo * M.dif(S).costos)} c/u · llevas ${J.carga[id] || 0} · en tus locales ${mios}</div></div><div class="botones">${[10, 50, 100].map(n => bt('+' + n, 'comprar', { prod: id, cant: n }, 'mini', !aqui || !libre)).join('')}</div></div>`;
      }).join('')}</div>`;
    } else if (N) cuerpo = `<div class="botones">${bt('Descargar mercancía', 'descargar', { id: N.id }, 'pri', !aqui || !M.cargaUsada(S))}${bt('Limpiar (1 h)', 'limpiar', { id: N.id }, '', !aqui)}${bt('Ver negocio', 'ui:neg', { id: N.id })}</div>${aqui ? '<p class="tenue">Mientras estés aquí y el local esté abierto, tú atiendes.</p>' : ''}`;
    else {
      const renta = Math.round(p.renta * dist.renta * M.dif(S).costos);
      cuerpo = `<p class="tenue">Renta ${$$(renta)} al día. Afluencia ${p.trafico >= 1 ? 'alta' : 'baja'} para la zona. Caben ${p.espacio} muebles y ${p.almacen} unidades de mercancía. El depósito son ${B.depositoDias} días de renta.</p>
        <div class="lista">${D.negocios.map(T => `<div class="renglon"><div><b>${T.nombre}</b><div class="tenue">${T.desc} Muebles mínimos: ${$$(T.muebles.reduce((s, m) => s + D.muebles[m].costo, 0))}.</div></div>${bt(`Abrir · ${$$(renta * B.depositoDias)}`, 'rentar', { local: p.id, tipo: T.id }, 'pri')}</div>`).join('')}</div>`;
    }
    return `<div class="tarjeta"><div class="fila"><div class="crece"><h3>${esc(N ? N.nombre : p.nombre)}</h3><p class="tenue">${dist.nombre} · clase ${dist.clase}</p></div>
      ${aqui ? '<b>Estás aquí</b>' : bt(`Viajar · ${v.horas ? v.horas + ' h · ' : ''}${$$(v.costo)}`, 'viajar', { a: p.id }, 'pri')}</div>${cuerpo}</div>`;
  }

  function semaforo(N) {
    if (!M.capacidad(N)) return ['mal', 'Le faltan muebles, no abre'];
    const i = M.insight(S, N);
    const [v, t] = [[i.stock ?? 100, 'Falta mercancía'], [i.servicio ?? 100, 'Servicio flojo'], [i.precio, 'Precios altos'], [i.limpieza, 'Está sucio']].sort((a, b) => a[0] - b[0])[0];
    return [nivel(v), v < 65 ? t : 'En orden'];
  }

  function vNegocios() {
    if (!S.negocios.length) return `<div class="tarjeta"><h2>Negocios</h2><p class="tenue">Todavía no tienes negocios. En el Mapa, toca un local libre para rentarlo.</p>${bt('Ir al mapa', 'ui:tab', { tab: 'mapa' }, 'pri')}</div>${vMercado()}`;
    const N = por(S.negocios, ui.neg);
    if (N) return vNegocio(N);
    const h = M.hh(S);
    return `<h2>Negocios</h2>` + S.negocios.map(N => {
      const [c, t] = semaforo(N), T = por(D.negocios, N.tipo);
      return `<button class="negocio" data-a="ui:neg" data-args="${esc(JSON.stringify({ id: N.id }))}"><span class="fila"><i class="luz ${c}"></i><b class="crece">${esc(N.nombre)}</b><span>${$$(N.hoy.ingresos)} hoy</span></span>
        <span class="tenue">${t} · reputación ${Math.round(N.reputacion)} · ${M.capacidad(N) && h >= N.abre && h < N.cierra ? 'abierto' : 'cerrado'} (${hora(N.abre)}–${hora(N.cierra % 24)})${T.modelo === 'membresia' ? ` · ${N.miembros} socios` : ''}</span></button>`;
    }).join('') + vMercado();
  }

  // Demanda por barrio: qué conviene vender en cada distrito.
  function vMercado() {
    const cats = { abarrotes: 'Abarrotes', bebidas: 'Bebidas', cafe: 'Café', reposteria: 'Pan y comida', fitness: 'Gimnasio' };
    const pal = v => (v >= 1.15 ? ['', 'Alta'] : v >= 0.9 ? ['aviso', 'Media'] : ['mal', 'Baja']);
    return `<div class="tarjeta"><h3>Mercado por barrio</h3><div class="tabla"><table><tr><th></th>${D.distritos.map(d => `<th>${d.nombre}</th>`).join('')}</tr>
      ${Object.entries(cats).map(([k, n]) => `<tr><td>${n}</td>${D.distritos.map(d => { const [c, t] = pal(d.demanda[k]); return `<td><i class="luz ${c}"></i> ${t}</td>`; }).join('')}</tr>`).join('')}
      <tr><td>Precios</td>${D.distritos.map(d => `<td>${d.precio > 1 ? '+' : ''}${Math.round((d.precio - 1) * 100)}%</td>`).join('')}</tr>
      <tr><td>Renta</td>${D.distritos.map(d => `<td>×${d.renta}</td>`).join('')}</tr></table></div>
      <p class="tenue">Demanda de cada tipo de producto y cuánto más o menos paga la gente respecto al precio base.</p></div>`;
  }

  function vNegocio(N) {
    const T = por(D.negocios, N.tipo), L = por(D.locales, N.local), Dt = por(D.distritos, L.distrito), i = M.insight(S, N), a = i.datos, inv = T.modelo === 'inventario';
    const secs = [['insight', 'Insight'], ['productos', inv ? 'Productos' : 'Socios'], ['personal', 'Personal'], ['local', 'Local']].filter(([k]) => k !== 'personal' || M.desbloqueado(S, 'empleados'));
    const propios = S.empleados.filter(e => e.negocio === N.id), cap = M.capacidad(N), corto = D.muebles[M.cuello(N)].nombre.toLowerCase();
    let cuerpo = '';
    if (ui.sec === 'insight') {
      const r = N.productos.length ? N.productos.reduce((s, p) => s + M.ratioPrecio(N, p), 0) / N.productos.length : 1, pc = Math.round(Math.abs(r - 1) * 100);
      cuerpo = `<div class="tarjeta">${par('Reputación', Math.round(N.reputacion))}${barra(N.reputacion)}<p class="tenue">Cambia poco a poco según lo que ves abajo, y atrae o aleja clientes.</p></div>
        <div class="tarjeta">
          ${medida('Precio', i.precio, pc ? `Estás ${pc}% ${r > 1 ? 'sobre' : 'bajo'} el mercado de la zona.` : 'Estás al precio del mercado.')}
          ${medida('Servicio', i.servicio, !a.horas ? 'Sin datos hasta que abra.' : inv ? `Se atendió a ${a.atendidos} de ${a.clientes} clientes; ${a.horas - a.cubiertas} h sin personal.${a.limEquipo ? ` En ${a.limEquipo} h el tope fue ${corto}.` : ''}` : `${a.cubiertas} de ${a.horas} h abiertas con personal.`)}
          ${inv ? medida('Mercancía', i.stock, a.demanda ? `Se vendieron ${a.vendidos} de ${a.demanda} unidades pedidas.` : '') : ''}
          ${medida('Tráfico', i.trafico, `${Dt.nombre}, ${L.nombre}. No cambia.`)}
          ${medida('Limpieza', i.limpieza, 'Baja con cada cliente. Sube con personal que limpie o si limpias tú.')}
          ${M.desbloqueado(S, 'mejoras') ? medida('Marketing', i.marketing, `${$$(N.marketing)} al día.`) + medida('Interior', i.interior, `Nivel ${N.interior} de ${B.interior.length - 1}.`) : ''}
        </div>
        <div class="tarjeta">${par('Ingresos de hoy', $$(i.ingresos))}${par('Gastos de hoy', $$(i.gastos))}${par('Resultado', $$(i.ingresos - i.gastos), i.ingresos < i.gastos ? 'neg' : '')}
          <p class="tenue">Los gastos incluyen renta, servicios, sueldos, marketing y el costo de lo vendido.${N.hoy.horas ? '' : ' Las puntuaciones son de ayer hasta que abra.'}</p></div>`;
    } else if (ui.sec === 'productos') {
      const usado = Object.values(N.stock).reduce((x, y) => x + y, 0), otros = inv ? M.catalogo().filter(p => !N.productos.includes(p)) : [];
      cuerpo = `<div class="tarjeta">${inv ? par('Almacén', `${usado} de ${L.almacen}`) : par('Socios', `${N.miembros} de ${cap}`) + `<p class="tenue">Ayer: ${N.ayer.nuevos} altas y ${N.ayer.bajas} bajas. Cada socio paga por semana; se cobra un séptimo cada día.</p>`}
        <div class="lista">${N.productos.map(p => {
          const P = D.productos[p], m = P.mercado * Dt.precio, precio = N.precios[p], paso = P.mercado < 5 ? 0.05 : P.mercado < 15 ? 0.25 : 1;
          return `<div class="renglon"><div><b>${P.nombre}</b>${T.productos.includes(p) ? '' : ' <span class="tenue">(fuera de giro)</span>'}<div class="tenue">${inv ? `Quedan ${N.stock[p]} · costo ${$c(P.costo)} · ` : ''}mercado ${$c(m)} · sugerido ${$c(P.sugerido * Dt.precio)}</div>${barra(M.puntosPrecio(precio / m))}</div>
            <div class="botones">${bt('−', 'precio', { id: N.id, prod: p, valor: r2(precio - paso) }, 'mini', precio - paso < 0.05)}<span class="precio">${$c(precio)}</span>${bt('+', 'precio', { id: N.id, prod: p, valor: r2(precio + paso) }, 'mini')}${inv ? bt('Quitar', 'producto', { id: N.id, prod: p }) : ''}</div></div>`;
        }).join('') || '<p class="tenue">No vendes nada. Agrega productos abajo.</p>'}</div><p class="tenue">La barra es la satisfacción por precio: baja si te pasas del mercado. Más barato vende más, con menos margen.</p></div>
        ${otros.length ? `<div class="tarjeta"><h3>Agregar productos</h3><p class="tenue">Puedes vender cualquier producto si tienes el mueble que lo exhibe. Fuera de tu giro se vende menos de la mitad.</p>
          <div class="lista">${otros.map(p => { const P = D.productos[p], mu = D.muebles[M.muebleDe(P.cat)], ok = M.exhibe(N, P.cat), prov = D.proveedores.find(x => x.productos.includes(p));
            return `<div class="renglon"><div><b>${P.nombre}</b><div class="tenue">${ok ? '' : `Necesita ${mu.nombre.toLowerCase()} · `}costo ${$c(P.costo)} · mercado ${$c(P.mercado * Dt.precio)} · se compra en ${prov.nombre}</div></div>${bt('Vender', 'producto', { id: N.id, prod: p }, '', !ok)}</div>`; }).join('')}</div></div>` : ''}`;
    } else if (ui.sec === 'personal') {
      let huecos = 0;
      const hoy = (M.dia(S) - 1) % 7;
      for (let h = N.abre; h < N.cierra; h++) if (!propios.some(e => e.dias[hoy] && M.enTurno(e.turno, h))) huecos++;
      const turno = t => { const x = por(D.turnos, t); return `${x.nombre} ${hora(x.de)}–${hora(x.a)}`; };
      const cond = x => [D.jornadas[x.jornada].nombre + ` (máx. ${D.jornadas[x.jornada].maxDias} días)`, ...x.demandas.map(k => D.demandas[k].toLowerCase())].join(' · ');
      const curso = por(D.cursos, 'rrhh');
      cuerpo = !S.cursos.rrhh ? `<div class="tarjeta"><h3>Todavía no puedes contratar</h3><p class="tenue">${curso.desc} Cuesta ${$$(curso.costo)} y toma ${curso.horas} h.</p>${bt(`Tomar ${curso.nombre}`, 'curso', { id: 'rrhh' }, 'pri')}</div>` : `<div class="tarjeta"><h3>Tu equipo</h3><p class="tenue">Horario ${hora(N.abre)}–${hora(N.cierra % 24)}. ${huecos ? `Hoy hay ${huecos} h sin personal: ahí solo vendes si estás tú.` : 'Hoy todo el horario está cubierto.'}</p>
        <div class="lista">${propios.map(e => { const v = M.violaciones(e);
          return `<div class="renglon"><div><b>${esc(e.nombre)}</b><div class="tenue">${turno(e.turno)} · servicio ${e.hab.servicio} · limpieza ${e.hab.limpieza} · ${$c(e.sueldo)}/h · ${e.capacita ? `en capacitación hasta el día ${e.capacita.hasta}` : M.dia(S) < e.inicia ? 'llega mañana' : 'activo'}</div>
            <div class="tenue">${cond(e)}</div><div class="par"><span class="tenue">Satisfacción</span><b>${Math.round(e.satisfaccion)}</b></div>${barra(e.satisfaccion)}${v.length ? `<p class="neg">${v.join(' ')} Va a renunciar si sigue así.</p>` : ''}
            <div class="dias">${D.semana.map((n, d) => bt(n, 'diaLaboral', { emp: e.id, d }, e.dias[d] ? 'on' : '')).join('')}</div></div>
          <div class="botones">${D.habilidades.map(h => bt(`Capacitar ${h.nombre.toLowerCase()} ${$$(B.capacitar.costo)}`, 'capacitar', { emp: e.id, hab: h.id }, '', !!e.capacita)).join('')}${bt(`Aumento ${Math.round(B.satisfaccion.aumento * 100)}%`, 'aumento', { emp: e.id })}${bt('Despedir', 'despedir', { emp: e.id }, 'peligro')}</div></div>`; }).join('') || '<p class="tenue">Nadie todavía.</p>'}</div>
          <p class="tenue">Toca los días para armar su semana. Se paga solo el día trabajado.</p></div>
        <div class="tarjeta"><h3>Agencia de empleo</h3><p class="tenue">Cada búsqueda trae ${B.candidatosPorBusqueda} candidatos. Con prisa cuesta más.${S.busquedas.length ? ` En camino: ${S.busquedas.map(b => 'día ' + b.llega).join(', ')}.` : ''}</p>
          <div class="botones">${B.agencia.map(o => bt(`${o.dias} ${o.dias > 1 ? 'días' : 'día'} · ${$$(o.costo * B.candidatosPorBusqueda)}`, 'buscar', { dias: o.dias })).join('')}</div></div>
        <div class="tarjeta"><h3>Candidatos</h3><p class="tenue">Toca un turno para contratar. Empiezan al día siguiente. Capacitar toma ${B.capacitar.dias} días sin que vengan a trabajar.</p>
        <div class="lista">${S.candidatos.map(c => `<div class="renglon"><div><b>${esc(c.nombre)}</b><div class="tenue">servicio ${c.hab.servicio} · limpieza ${c.hab.limpieza} · pide ${$c(c.sueldo)}/h (${$$(c.sueldo * B.horasTurno)} al día) · disponible hasta el día ${c.expira}</div><div class="tenue">${cond(c)}</div></div>
          <div class="botones">${c.turnos.map(t => bt(turno(t), 'contratar', { cand: c.id, negocio: N.id, turno: t })).join('')}</div></div>`).join('') || '<p class="tenue">No hay candidatos. Pide una búsqueda a la agencia.</p>'}</div></div>`;
    } else {
      const sig = B.interior[N.interior + 1], hor = (abre, cierra) => ({ id: N.id, abre, cierra }), lleno = M.numMuebles(N) >= L.espacio;
      cuerpo = `<div class="tarjeta"><h3>Muebles</h3>${par(inv ? 'Capacidad' : 'Cupo', cap ? `${cap} ${inv ? 'clientes por hora' : 'socios'}` : 'No puede abrir')}${par('Espacio usado', `${M.numMuebles(N)} de ${L.espacio}`)}
          <p class="tenue">${cap ? `El negocio rinde lo que su mueble más corto. Hoy te limita: ${corto}.` : 'Necesitas al menos uno de cada mueble obligatorio.'}</p>
          <div class="lista">${M.mueblesPosibles(N).map(m => { const mu = D.muebles[m], n = N.muebles[m] || 0, obl = T.muebles.includes(m);
            return `<div class="renglon"><div><b>${mu.nombre}</b> × ${n}<div class="tenue">${obl ? `${n * mu.capacidad} de capacidad (${mu.capacidad} c/u)` : 'Opcional: permite vender otros productos'}${mu.cats ? ` · exhibe ${mu.cats.join(', ')}` : ''}</div></div>${bt(`Comprar · ${$$(mu.costo * M.dif(S).costos)}`, 'equipo', { id: N.id, mueble: m }, obl && !n ? 'pri' : '', lleno)}</div>`; }).join('')}</div></div>
        <div class="tarjeta"><h3>Horario</h3>
          <div class="renglon"><div>Abre</div><div class="botones">${bt('−', 'horario', hor(N.abre - 1, N.cierra), 'mini', N.abre <= 0)}<span class="precio">${hora(N.abre)}</span>${bt('+', 'horario', hor(N.abre + 1, N.cierra), 'mini', N.abre + 1 >= N.cierra)}</div></div>
          <div class="renglon"><div>Cierra</div><div class="botones">${bt('−', 'horario', hor(N.abre, N.cierra - 1), 'mini', N.cierra - 1 <= N.abre)}<span class="precio">${hora(N.cierra % 24)}</span>${bt('+', 'horario', hor(N.abre, N.cierra + 1), 'mini', N.cierra >= 24)}</div></div></div>
        ${M.desbloqueado(S, 'mejoras') ? `<div class="tarjeta"><h3>Marketing diario</h3><div class="botones">${B.marketing.map(v => bt(v ? $$(v) : 'Nada', 'marketing', { id: N.id, valor: v }, N.marketing === v ? 'on' : '')).join('')}</div>
          <h3>Interior</h3>${par('Nivel', `${N.interior} de ${B.interior.length - 1}`)}${sig ? bt(`Mejorar · ${$$(sig)}`, 'interior', { id: N.id }) : ''}<p class="tenue">Ambos traen más clientes. El interior también sube la reputación.</p></div>` : ''}
        <div class="tarjeta">${medida('Limpieza', N.limpieza)}${S.jugador.lugar === N.local ? bt('Limpiar (1 h)', 'limpiar', { id: N.id }) : '<p class="tenue">Para limpiar tú mismo tienes que estar en el local.</p>'}</div>
        <div class="tarjeta">${ui.confirma === 'cerrar' ? bt('Sí, cerrar y despedir a todos', 'cerrar', { id: N.id }, 'peligro') : bt('Cerrar este negocio', 'ui:confirma', { k: 'cerrar' }, 'peligro')}<p class="tenue">Recuperas ${Math.round(B.reventaEquipo * 100)}% de los muebles. El depósito y la mercancía se pierden.</p></div>`;
    }
    return `<div class="fila">${bt('‹ Todos', 'ui:neg', { id: null })}<h2 class="crece">${esc(N.nombre)}</h2></div>
      <div class="botones">${secs.map(([k, n]) => bt(n, 'ui:sec', { sec: k }, ui.sec === k ? 'on' : '')).join('')}</div>${cuerpo}`;
  }

  function vPersonaje() {
    const J = S.jugador, enCasa = J.lugar === 'casa', carga = Object.entries(J.carga);
    return `<h2>${esc(S.nombre)}</h2>
      <div class="tarjeta">${medida('Energía', J.energia, 'Baja mientras estás despierto y más si trabajas. Se recupera durmiendo en casa.')}${medida('Comida', J.hambre)}${medida('Ánimo', J.animo)}
        ${M.rendimiento(S) < 1 ? '<p class="neg">Una necesidad está en cero: atiendes y cobras a menos de la mitad.</p>' : ''}
        <div class="botones">${bt(enCasa ? `Comer en casa ${$$(B.comerCasa.costo)}` : `Comer fuera ${$$(B.comerFuera.costo)}`, 'comer')}${bt(`Ocio ${B.ocio.horas} h · ${$$(B.ocio.costo)}`, 'ocio')}${bt('Dormir', 'dormir', {}, '', !enCasa)}</div></div>
      <div class="tarjeta"><h3>Carga</h3>${carga.length ? carga.map(([p, n]) => par(D.productos[p].nombre, n)).join('') : '<p class="tenue">No llevas mercancía. Caben ' + B.cargaMax + ' unidades.</p>'}</div>
      <div class="tarjeta"><h3>Cursos</h3><div class="lista">${D.cursos.map(c => `<div class="renglon"><div><b>${c.nombre}</b><div class="tenue">${c.desc} Toma ${c.horas} h.</div></div>${S.cursos[c.id] ? '<b>Terminado</b>' : bt(`Tomar · ${$$(c.costo)}`, 'curso', { id: c.id }, 'pri')}</div>`).join('')}</div></div>
      <div class="tarjeta"><h3>Vivienda</h3><div class="lista">${D.departamentos.map(d => `<div class="renglon"><div><b>${d.nombre}</b><div class="tenue">${por(D.distritos, d.distrito).nombre} · ${$$(d.renta)} al día · descanso ${d.animo >= 3 ? 'excelente' : d.animo >= 1.5 ? 'bueno' : 'básico'}</div></div>
        ${J.depto === d.id ? '<b>Vives aquí</b>' : bt(`Mudarme · ${$$(d.renta * B.depositoDias)}`, 'mudarse', { depto: d.id })}</div>`).join('')}</div>
        <p class="tenue">Un lugar mejor sube el ánimo al dormir. El gusto de estrenar casa se desvanece con los días.</p></div>`;
  }

  function vFinanzas() {
    const pat = M.patrimonio(S), meta = M.dif(S).meta, R = S.resumen, lim = M.limitePrestamo(S), P = B.prestamo, H = S.historial;
    let graf = '';
    if (H.length > 1) {
      const vs = H.map(x => x.patrimonio), lo = Math.min(...vs), hi = Math.max(...vs);
      graf = `<svg class="spark" viewBox="0 0 300 44" preserveAspectRatio="none" role="img" aria-label="Patrimonio por día"><polyline points="${vs.map((v, i) => `${(i / (vs.length - 1) * 300).toFixed(1)},${(40 - (v - lo) / (hi - lo || 1) * 36).toFixed(1)}`).join(' ')}"/></svg><p class="tenue">Patrimonio del día ${H[0].dia} al ${H[H.length - 1].dia}: de ${$$(vs[0])} a ${$$(vs[vs.length - 1])}.</p>`;
    }
    return `<h2>Finanzas</h2>
      <div class="tarjeta">${par('Efectivo', $$(S.dinero), S.dinero < 0 ? 'neg' : '')}${par('Deuda', $$(M.deuda(S)))}${par('Patrimonio', $$(pat))}
        ${S.modo === 'historia' ? `${par('Meta', $$(meta))}${barra(pat / meta * 100, '')}` : '<p class="tenue">Modo libre, sin meta.</p>'}${graf}
        <p class="tenue">Patrimonio = efectivo + mercancía + mitad del valor de los muebles − deudas e impuestos.</p></div>
      <div class="tarjeta"><h3>Impuestos</h3>${S.impuesto ? `${par('Debes', $$(S.impuesto.monto), 'neg')}${par('Vence', 'día ' + S.impuesto.vence)}${bt('Pagar impuestos', 'pagarImpuestos', {}, 'pri', S.dinero < S.impuesto.monto)}` : `<p>No debes nada. Próximo corte: día ${Math.ceil(M.dia(S) / B.impuestoPeriodo) * B.impuestoPeriodo}.</p>`}
        <p class="tenue">${Math.round(B.impuesto * 100)}% de la ganancia de cada ${B.impuestoPeriodo} días. Tienes ${B.impuestoPlazo} días para pagar; después cobran ${Math.round(B.impuestoRecargo * 100)}% de recargo y embargan mercancía y muebles.</p></div>
      ${R ? `<div class="tarjeta"><h3>Resumen del día ${R.dia}</h3>${par('Ingresos', $$(R.ingresos))}${Object.entries(R.gastos).map(([k, v]) => par(GASTOS[k] || k, $$(-v))).join('')}${par('<b>Resultado</b>', $$(R.neto), R.neto < 0 ? 'neg' : '')}
        ${R.problemas.length ? `<ul>${R.problemas.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}<p><b>Qué hacer:</b> ${esc(R.sugerencia)}</p></div>` : '<div class="tarjeta"><p class="tenue">El primer resumen llega a medianoche.</p></div>'}
      ${M.desbloqueado(S, 'prestamos') ? `<div class="tarjeta"><h3>Préstamos</h3><p class="tenue">El banco te presta hasta ${$$(lim)}. Pagas en ${P.semanas} semanas, con ${(P.interesSemanal * 100).toFixed(1)}% de interés semanal sobre el monto original. Si no alcanza para la cuota, el saldo se va a negativo.</p>
        <div class="botones">${[...new Set([1000, 2500, lim])].filter(m => m > 0 && m <= lim).map(m => bt(`Pedir ${$$(m)}`, 'prestamo', { monto: m })).join('') || '<span class="tenue">Sin crédito disponible.</span>'}</div>
        <div class="lista">${S.prestamos.map(p => `<div class="renglon"><div>Saldo <b>${$$(p.saldo)}</b><div class="tenue">Cuota semanal ${$$(p.abono + p.interes)}</div></div>${bt('Liquidar', 'pagarPrestamo', { id: p.id }, '', S.dinero < p.saldo)}</div>`).join('')}</div></div>` : ''}`;
  }

  function vMenu() {
    const t = document.documentElement.dataset.theme || '';
    return `<h2>Menú</h2>
      <div class="tarjeta"><div class="botones">${bt('Guardar', 'ui:guardar', {}, 'pri')}${bt('Cargar último guardado', 'ui:cargar')}</div><p class="tenue">La partida se guarda sola al cierre de cada día, en este dispositivo.</p></div>
      <div class="tarjeta"><h3>Pasar la partida a otro dispositivo</h3>${bt('Exportar como texto', 'ui:exportar')}
        ${ui.exporta ? `<textarea id="exporta" readonly aria-label="Partida exportada">${esc(ui.exporta)}</textarea>${bt('Copiar', 'ui:copiar')}` : ''}
        <label>Pega aquí una partida exportada<textarea id="importa">${esc(ui.importa)}</textarea></label>${bt('Importar', 'ui:importar')}</div>
      <div class="tarjeta"><h3>Apariencia</h3><div class="botones">${[['', 'Automática'], ['light', 'Clara'], ['dark', 'Oscura']].map(([k, n]) => bt(n, 'ui:tema', { t: k }, t === k ? 'on' : '')).join('')}</div></div>
      <div class="tarjeta">${ui.confirma === 'salir' ? bt('Sí, salir de esta partida', 'ui:salir', {}, 'peligro') : bt('Nueva partida', 'ui:confirma', { k: 'salir' }, 'peligro')}</div>`;
  }

  // ---------- Pintado ----------
  const VISTAS = { mapa: vMapa, negocios: vNegocios, personaje: vPersonaje, finanzas: vFinanzas, menu: vMenu };
  const escribiendo = () => S && ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  function montar() {
    if (!S) { app.innerHTML = vInicio(); return; }
    app.innerHTML = `<header class="borde" id="cab"></header><main class="borde juego">${TABS.map(([k]) => `<section class="panel" id="p-${k}"></section>`).join('')}</main><nav class="borde" id="nav"></nav>`;
    pintar();
  }
  function pintar() {
    if (!S) return montar();
    if (presionando || escribiendo()) { pendiente = true; return; } // no reemplazar botones a medio toque
    pendiente = false;
    document.getElementById('cab').innerHTML = vCabecera();
    for (const [k] of TABS) {
      const el = document.getElementById('p-' + k);
      el.innerHTML = VISTAS[k]();
      el.classList.toggle('activo', ui.tab === k);
    }
    document.getElementById('nav').innerHTML = TABS.map(([k, n]) => bt(n, 'ui:tab', { tab: k }, ui.tab === k ? 'on' : '')).join('');
  }
  function tras() { // después de cada acción u hora de juego
    if (S) {
      for (const t of S.avisos.splice(0)) aviso(t);
      if (S.resumen && S.resumen.dia !== visto) {
        visto = S.resumen.dia;
        guardar();
        aviso(`Día ${visto} cerrado: ${$$(S.resumen.neto)}. El resumen está en Finanzas.`);
      }
      if (S.fin && ui.vel) velocidad(0);
    }
    pintar();
  }
  function velocidad(v) {
    clearInterval(reloj);
    ui.vel = v;
    if (v) reloj = setInterval(() => { M.tick(S); tras(); }, MS_HORA / v);
  }

  // ---------- Guardado ----------
  const valida = g => g && g.v === M.VERSION && g.jugador && Array.isArray(g.negocios) && Number.isFinite(g.dinero);
  const guardar = () => disco.guardar(CLAVE, JSON.stringify(S));
  function leerGuardado() { try { const g = JSON.parse(disco.leer(CLAVE)); return valida(g) ? g : null; } catch (e) { return null; } }
  function iniciar(estado) {
    S = estado;
    visto = S.resumen ? S.resumen.dia : 0;
    Object.assign(ui, { tab: 'mapa', sel: 'casa', neg: null, sec: 'insight', exporta: '', importa: '' });
    velocidad(0);
    montar();
  }

  // ---------- Acciones de interfaz ----------
  const U = {
    tab({ tab }) { ui.tab = tab; },
    sel({ id }) { ui.sel = id; },
    neg({ id }) { ui.neg = id; ui.sec = 'insight'; ui.tab = 'negocios'; },
    sec({ sec }) { ui.sec = sec; },
    vel({ v }) { velocidad(v); },
    confirma({ k }) { ui.confirma = k; },
    opc({ k, v }) { ui.nueva[k] = v; },
    empezar() { iniciar(M.nueva({ ...ui.nueva, nombre: ui.nueva.nombre.trim() || 'Sin nombre' })); },
    guardar() { aviso(guardar() ? 'Partida guardada.' : 'Este dispositivo no deja guardar. Usa Exportar como texto.'); },
    cargar() { const g = leerGuardado(); if (g) iniciar(g); else aviso('No hay partida guardada en este dispositivo.'); },
    exportar() { ui.exporta = JSON.stringify(S); },
    copiar() {
      const sel = () => { const t = document.getElementById('exporta'); if (t) { t.focus(); t.select(); } aviso('Mantén presionado el texto para copiarlo.'); };
      try { navigator.clipboard.writeText(ui.exporta).then(() => aviso('Copiado.'), sel); } catch (e) { sel(); }
    },
    importar() {
      let g = null;
      try { g = JSON.parse(ui.importa); } catch (e) { /* se avisa abajo */ }
      if (valida(g)) { iniciar(g); guardar(); aviso('Partida importada.'); } else aviso('Ese texto no es una partida válida. Cópialo completo desde Exportar.');
    },
    tema({ t }) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; disco.guardar(TEMA, t); },
    salir() { velocidad(0); S = null; },
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    const a = b.dataset.a, args = JSON.parse(b.dataset.args || '{}');
    if (a !== 'ui:confirma') ui.confirma = null;
    if (a.startsWith('ui:')) U[a.slice(3)](args);
    else {
      const r = M.hacer(S, a, args);
      if (r.msg) aviso(r.msg);
      if (r.ok && a === 'rentar') Object.assign(ui, { neg: r.id, sec: 'local', tab: 'negocios' });
    }
    tras();
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.pin')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  document.addEventListener('input', e => {
    if (e.target.id === 'nombre') ui.nueva.nombre = e.target.value;
    if (e.target.id === 'importa') ui.importa = e.target.value;
  });
  document.addEventListener('pointerdown', () => { presionando = true; });
  for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => { presionando = false; if (pendiente) setTimeout(pintar); });
  document.addEventListener('focusout', () => { if (pendiente) setTimeout(pintar); });

  const tema = disco.leer(TEMA);
  if (tema) document.documentElement.dataset.theme = tema;
  window.MiImperio = { get estado() { return S; } }; // para depurar desde la consola
  montar();
})();
