// Capa 3: INTERFAZ. Lee el estado del motor, lo pinta y le manda acciones. La calle la dibuja escena.js.
(function () {
  const M = Motor, D = DATOS, B = D.balance;
  const CLAVE = 'callemayor.partida';
  const VEL = [0, 1, 3, 8], MS_HORA = 1500;
  const SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Iconos propios, trazo de 2 px y esquinas rectas.
  const IC = {
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pausa: '<path d="M8 5v14M16 5v14"/>',
    play: '<path class="f" d="M7 5l11 7-11 7z"/>',
    moneda: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.3c-.6-.8-1.5-1.3-2.7-1.3-1.6 0-2.6.8-2.6 2 0 2.8 5.6 1.4 5.6 4.1 0 1.2-1.1 2-2.8 2-1.2 0-2.2-.5-2.8-1.3M12 6v2M12 16v2"/>',
    trofeo: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8 20h8M9.5 17h5"/>',
    tienda: '<path d="M4.5 11v9h15v-9M3 10l1.6-5.5h14.8L21 10zM10 20v-5h4v5"/>',
    carrito: '<path d="M3 11h14v6H3zM17 13h4M3.5 7.5a6.5 3.5 0 0 1 13 0zM10 7.5V11"/><circle cx="6" cy="19.5" r="1.5"/><circle cx="14" cy="19.5" r="1.5"/>',
    foco: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
    grafica: '<path d="M4 4v16h16M7.5 15l3.5-4.5 3 3L20 6M15.5 6H20v4.5"/>',
    edificio: '<path d="M4 21V8l6-4v17M10 21V4l10 4v13M3 21h18M13.5 10h3M13.5 13.5h3M13.5 17h3M6.5 11h1M6.5 15h1"/>',
    ajustes: '<path d="M4 6h9M17 6h3M15 4v4M4 12h3M11 12h9M9 10v4M4 18h11M19 18h1M17 16v4"/>',
    personas: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.2a3 3 0 0 1 0 5.8M21 20c0-2.8-1.7-5-4-5.7"/>',
    flecha: '<path d="M12 20V5M6 11l6-6 6 6"/>',
    bandera: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
    caja: '<path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4zM3.5 7.5L12 11.5l8.5-4M12 11.5v9"/>',
    candado: '<rect x="5" y="10.5" width="14" height="10"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    dado: '<rect x="4" y="4" width="16" height="16"/><circle class="f" cx="9" cy="9" r="1.3"/><circle class="f" cx="15" cy="15" r="1.3"/><circle class="f" cx="15" cy="9" r="1.3"/><circle class="f" cx="9" cy="15" r="1.3"/>',
    sube: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    baja: '<path d="M3 7l6 6 4-4 8 8M15 17h6v-6"/>',
    cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
    izq: '<path d="M15 5l-7 7 7 7"/>',
    der: '<path d="M9 5l7 7-7 7"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    menos: '<path d="M5 12h14"/>',
    guardar: '<path d="M5 3.5h11l3.5 3.5v13.5h-14.5zM8 3.5v5h7v-5M8 20.5v-6.5h8v6.5"/>',
    noticias: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7.5 9h6M7.5 12.5h6M7.5 16h3.5"/>',
    rayo: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    estrella: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    salir: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
    alerta: '<path d="M12 4l9 16H3zM12 10v4M12 17v.5"/>',
    vaso: '<path d="M6 4h12l-1.6 16H7.6zM6.6 9h10.8M14 4l2.5-2.5"/>',
    flor: '<circle cx="12" cy="7.5" r="4"/><circle class="f" cx="12" cy="7.5" r="1.2"/><path d="M12 11.5V21M12 17c-3 0-5-2-5-4.5 3 0 5 2 5 4.5z"/>',
    taza: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5V6M12 3.5V6M3 21h15"/>',
    pan: '<path d="M3.5 13c0-4 3.8-7 8.5-7s8.5 3 8.5 7v5.5h-17zM8 10l1.5 3M12 9.5V13M16 10l-1.5 3"/>',
    bici: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h6l2 7M10 9l3 7H6M14.5 6.5h3"/>',
    gancho: '<path d="M10 5.5a2 2 0 1 1 2 2v2L3 15.5V18h18v-2.5L12 9.5"/>',
    cubiertos: '<path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v6M9 3v6M17 21V3c-2 0-3.5 2.5-3.5 6s1.5 4 3.5 4"/>',
    fabrica: '<path d="M3 21V11l5 3v-3l5 3v-3l5 3V3h3v18zM3 21h18M7 17.5h2M12 17.5h2"/>',
    tuerca: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><circle cx="12" cy="12" r="3"/>',
  };
  const ICONO_TIPO = { limonada: 'vaso', hotdogs: 'carrito', flores: 'flor', cafeteria: 'taza', panaderia: 'pan', taller: 'bici', boutique: 'gancho', restaurante: 'cubiertos', estudio: 'foco', planta: 'fabrica', ensamble: 'tuerca' };
  const NOMBRES = {
    bebida: [['Volt', 'Chispa', 'Rayo', 'Zumba', 'Brío', 'Turbo'], ['Cola', 'Fresh', 'Max', 'Pulse', 'Cítrica', 'Go']],
    snack: [['Nuti', 'Crují', 'Avena', 'Semilla', 'Bocado', 'Granola'], ['Bits', 'Mix', 'Lista', 'Bar', 'Pop', 'Natural']],
    app: [['Pago', 'Ruta', 'Mesa', 'Cita', 'Nota', 'Tianguis'], ['Fácil', 'Ya', 'Go', 'Pro', 'Express', 'Plus']],
    audifonos: [['Eco', 'Bajo', 'Onda', 'Pulso', 'Nube', 'Faro'], ['One', 'Pro', 'Air', 'Max', 'Studio', 'Mini']],
    tenis: [['Zancada', 'Vuelo', 'Pista', 'Asfalto', 'Brinco', 'Trazo'], ['Run', '90', 'Pro', 'X', 'Libre', 'Max']],
    videojuego: [['Leyendas de', 'Crónicas de', 'El regreso de', 'Misión:', 'Sombras de', 'Furia en'], ['Calle Mayor', 'la Ciudad', 'Neón', 'los Volcanes', 'Medianoche', 'la Esquina']],
    telefono: [['Nova', 'Astra', 'Kairo', 'Lumen', 'Orbe', 'Vértice'], ['1', 'X', 'Pro', 'Ultra', 'Max', 'S']],
  };
  const FRASES_RANGO = ['', 'Ya no eres el del carrito: ahora tienes local con llave.', 'Tus ideas ya pueden llevar tu marca.', 'En Calle Mayor ya se habla de ti.', 'Un millón. La calle entera lleva tu nombre.'];

  const $ = id => document.getElementById(id);
  const ic = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const din = (x, dec = false) => (x < 0 ? '−' : '') + '$' + Math.abs(x).toLocaleString('es-MX', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });
  const corto = x => { const a = Math.abs(x); return a >= 1e6 ? (x < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + ' M' : din(x); };
  const hora = h => String(h % 24).padStart(2, '0') + ':00';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const bt = (html, a, args, cls = 'btn', extra = '') => `<button class="${cls}" data-a="${a}" data-args="${esc(JSON.stringify(args || {}))}" ${extra}>${html}</button>`;
  const kpi = (et, val, cls = '') => `<div class="kpi"><span class="eti">${et}</span><b class="${cls}">${val}</b></div>`;
  const luz = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const sello = (t, cls = '') => { const T = D.negocios[t]; return `<span class="sello ${cls}" style="background:${T.color};color:${luz(T.color) > 0.5 ? 'var(--tinta)' : 'var(--papel)'}">${ic(ICONO_TIPO[t])}</span>`; };
  const nivelPips = (n, max = 4) => `<span class="nivel" aria-label="Nivel ${n} de ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
  const medidor = v => `<div class="medidor ${v < 40 ? 'm-mal' : v < 65 ? 'm-aviso' : ''}" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.round(v / 10) ? 'on' : ''}"></i>`).join('')}</div>`;
  const muestras = (accion, actual) => `<div class="muestras" role="group" aria-label="Color de tu marca">${D.coloresMarca.map(c => bt('', accion, { c }, c === actual ? 'on' : '', `style="background:${c}" aria-label="Color ${c}" aria-pressed="${c === actual}"`)).join('')}</div>`;
  // Retratos de los personajes, dibujados a mano en SVG.
  const RETRATOS = {
    chela: '<rect width="64" height="64" fill="#F6D7E6"/><path d="M8 64c0-12 11-19 24-19s24 7 24 19z" fill="#C2588F"/><path d="M24 50h16v14H24z" fill="#F6F1E7"/><rect x="28" y="38" width="8" height="9" fill="#C98E6B"/><circle cx="32" cy="29" r="12" fill="#C98E6B"/><path d="M20 28c0-9 5-14 12-14s12 5 12 14c-2-5-6-8-12-8s-10 3-12 8z" fill="#C9C4BC"/><circle cx="32" cy="13" r="5" fill="#C9C4BC"/><circle cx="27.5" cy="30" r="3.3" fill="none" stroke="#1B1A2E" stroke-width="1.5"/><circle cx="36.5" cy="30" r="3.3" fill="none" stroke="#1B1A2E" stroke-width="1.5"/><path d="M30.8 30h2.4" stroke="#1B1A2E" stroke-width="1.5"/><circle cx="27.5" cy="30" r="1.1" fill="#1B1A2E"/><circle cx="36.5" cy="30" r="1.1" fill="#1B1A2E"/><path d="M28 35.5q4 3 8 0" fill="none" stroke="#1B1A2E" stroke-width="1.6" stroke-linecap="round"/>',
    ferran: '<rect width="64" height="64" fill="#E2D9F3"/><path d="M8 64c0-12 11-19 24-19s24 7 24 19z" fill="#5C3D99"/><path d="M26 46l6 12 6-12z" fill="#F6F1E7"/><path d="M31 48h2l1.2 8-2.2 3-2.2-3z" fill="#1B1A2E"/><rect x="28" y="38" width="8" height="9" fill="#E2B48E"/><circle cx="32" cy="29" r="12" fill="#E2B48E"/><path d="M20 28c0-9 5-15 13-15 7 0 11 4 11 10-5-4-13-5-24 5z" fill="#1B1A2E"/><path d="M25 27l5 1M39 27l-5 1" stroke="#1B1A2E" stroke-width="1.8" stroke-linecap="round"/><rect x="26.5" y="29.5" width="3" height="2" fill="#1B1A2E"/><rect x="34.5" y="29.5" width="3" height="2" fill="#1B1A2E"/><path d="M27.5 35c2.5-1.4 6.5-1.4 9 0" fill="none" stroke="#1B1A2E" stroke-width="2.2" stroke-linecap="round"/><path d="M29.5 38h5" stroke="#1B1A2E" stroke-width="1.4" stroke-linecap="round"/>',
    vega: '<rect width="64" height="64" fill="#D6E4EA"/><path d="M8 64c0-12 11-19 24-19s24 7 24 19z" fill="#2F4858"/><path d="M27 46l5 8 5-8z" fill="#F6F1E7"/><rect x="28" y="38" width="8" height="9" fill="#F1C7A6"/><path d="M19 34c-1-12 5-20 13-20s14 8 13 20l-3 3V25c-6 2-14 2-20-1v13z" fill="#4A2F22"/><circle cx="32" cy="29" r="11" fill="#F1C7A6"/><path d="M21 26c2-7 7-10 11-10s9 3 11 10c-6-1-15-2-22 0z" fill="#4A2F22"/><rect x="24.5" y="27.5" width="6.5" height="5" fill="none" stroke="#1B1A2E" stroke-width="1.5"/><rect x="33" y="27.5" width="6.5" height="5" fill="none" stroke="#1B1A2E" stroke-width="1.5"/><path d="M31 30h2" stroke="#1B1A2E" stroke-width="1.5"/><circle cx="27.8" cy="30" r="1" fill="#1B1A2E"/><circle cx="36.2" cy="30" r="1" fill="#1B1A2E"/><path d="M29 35.5q3 1.8 6 0" fill="none" stroke="#B5533E" stroke-width="1.8" stroke-linecap="round"/>',
    ortiz: '<rect width="64" height="64" fill="#D9E2F0"/><path d="M8 64c0-12 11-19 24-19s24 7 24 19z" fill="#3B5B8C"/><path d="M26 46l6 12 6-12z" fill="#F6F1E7"/><path d="M31 48h2l1.2 8-2.2 3-2.2-3z" fill="#D7392F"/><rect x="28" y="38" width="8" height="9" fill="#B07A55"/><circle cx="32" cy="29" r="12" fill="#B07A55"/><path d="M20 31c0-6 1-10 3.5-11v10zM44 31c0-6-1-10-3.5-11v10z" fill="#8C8C8C"/><circle cx="28" cy="29.5" r="1.3" fill="#1B1A2E"/><circle cx="36" cy="29.5" r="1.3" fill="#1B1A2E"/><path d="M26.5 34.2h11v2.6h-11z" fill="#4A4A4A"/><path d="M30 38.5h4" stroke="#1B1A2E" stroke-width="1.3" stroke-linecap="round"/>',
  };
  const retrato = (q, cls = '') => `<span class="retrato ${cls}"><svg viewBox="0 0 64 64" aria-hidden="true">${RETRATOS[q]}</svg></span>`;
  const notaCls = n => (n >= 8 ? 'n-alta' : n >= 6 ? 'n-media' : 'n-baja');

  let S = null, vel = 0, velAntes = 1, acc = 0, prev = 0, mostrado = 0, presionando = false, pendiente = false, claveVista = '', ultimaNoticia = '';
  const ui = { inicio: { modo: 'historia', dinero: 5000, rival: true }, empresa: '', dialogo: null, oferta: null, colorInicio: D.coloresMarca[0], lote: null, der: 'imperio', movil: 'lote', confirma: null, capa: null, importa: '', exporta: '', form: { cat: 'bebida', nombre: '', presupuesto: 8000, mezcla: [50, 25, 25] } };
  const disco = {
    leer() { try { const g = JSON.parse(localStorage.getItem(CLAVE)); return valida(g) ? g : null; } catch (e) { return null; } },
    guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(S)); return true; } catch (e) { return false; } },
  };
  const valida = g => !!g && g.v === M.VERSION && Array.isArray(g.negocios) && Number.isFinite(g.dinero) && g.lotes && g.bolsa;

  function aviso(texto, tipo = '', icono) {
    const el = document.createElement('div');
    el.className = 'aviso ' + tipo;
    el.innerHTML = `<span class="sello">${ic(icono || (tipo === 'mal' ? 'alerta' : tipo === 'bien' ? 'moneda' : 'rayo'))}</span><span>${esc(texto)}</span>`;
    const caja = $('avisos');
    caja.append(el);
    while (caja.children.length > (innerWidth < 700 ? 2 : 3)) caja.firstChild.remove();
    setTimeout(() => { el.classList.add('sale'); setTimeout(() => el.remove(), 400); }, 4200);
  }

  // ---------- Barra superior ----------
  function vBarra() {
    const d = M.dia(S), obj = M.objetivo(S), R = D.rangos[S.rango];
    const hoy = Object.values(S.hoy.ingresos).reduce((a, b) => a + b, 0) - Object.entries(S.hoy.gastos).filter(([k]) => k !== 'inversion').reduce((a, [, v]) => a + v, 0);
    $('reloj').innerHTML = `${ic('reloj')}<span>Día ${d} · ${SEMANA[(d - 1) % 7]} ${hora(M.hh(S))}</span>`;
    $('vel').innerHTML = $('int-vel').innerHTML = VEL.map((v, i) => `<button class="${vel === v ? 'on' : ''}" data-a="ui:vel" data-args='{"v":${v}}' aria-pressed="${vel === v}" aria-label="${v ? 'Velocidad ' + v + ' por uno' : 'Pausa'}">${i === 0 ? ic('pausa') : i === 1 ? ic('play') : v + '×'}</button>`).join('');
    $('rango-tel').textContent = R.nombre;
    $('rango').innerHTML = `<span>${ic('trofeo')}${R.nombre}</span><div class="riel" title="${obj.siguiente ? 'Rumbo a ' + obj.siguiente.nombre : 'Rango máximo'}"><i style="width:${obj.avance}%"></i></div>`;
    $('caja').querySelector('small').innerHTML = S.diasRojos ? `<span class="menos">en rojo · ${M.plazoQuiebra(S) - S.diasRojos} días de plazo</span>` : `hoy <span class="${hoy >= 0 ? 'mas' : 'menos'}">${hoy >= 0 ? '+' : ''}${din(hoy)}</span>`;
    $('eventos').innerHTML = S.eventos.map(e => `<span class="chip-ev">${ic('rayo')}${esc(e.titulo)}<small>${e.fin - M.dia(S) + 1} d</small></span>`).join('');
    const clave = S.noticias.map(n => n.dia + n.texto).join('|');
    if (clave !== ultimaNoticia) { // solo se reinicia la cinta si cambian las noticias
      ultimaNoticia = clave;
      const items = S.noticias.map(n => `<span><em>Día ${n.dia}</em>${esc(n.texto)}</span>`).join('');
      $('rueda').innerHTML = items + items;
      $('rueda').style.setProperty('--dur', Math.max(30, S.noticias.reduce((s, n) => s + n.texto.length, 0) * 0.22) + 's');
    }
  }
  function animarCaja(dt) {
    if (!S) return;
    const meta = S.dinero, dif = meta - mostrado;
    mostrado = Math.abs(dif) < 0.5 ? meta : mostrado + dif * Math.min(1, dt / 180);
    const b = $('caja').querySelector('b');
    b.textContent = corto(Math.round(mostrado));
    b.classList.toggle('rojo', meta < 0);
  }

  // ---------- Lote seleccionado ----------
  function vLote() {
    if (!ui.lote) return vElegirLote();
    const L = M.lote(ui.lote), N = M.negocioEn(S, ui.lote), R = M.rivalEn(S, ui.lote);
    if (R) return vRival(R, L);
    if (!N) return vVacio(L);
    if (N.interior) return vTienda(N, L);
    return N.tipo === 'estudio' ? vEstudioLote(N, L) : D.negocios[N.tipo].clase === 'fabrica' ? vFabrica(N, L) : vNegocio(N, L);
  }
  const cerrarLote = bt(ic('cerrar'), 'ui:lote', { id: null }, 'btn', 'aria-label="Cerrar"');

  function vElegirLote() {
    return `<div class="hoja"><div class="vacio"><div class="sello">${ic('tienda')}</div><h2>Elige un lote de la calle</h2>
      <p class="tenue">Arrastra la calle para recorrerla y toca un lote. También puedes elegirlo aquí abajo.</p></div>
      <div class="lotes">${D.lotes.map(L => { const N = M.negocioEn(S, L.id), R = M.rivalEn(S, L.id); return bt(`${L.esquina ? L.nombre : L.corto}<span>${N ? D.negocios[N.tipo].corto : R ? 'Ferrán · ' + D.negocios[R.tipo].corto : S.lotes[L.id].propio ? 'Terreno propio' : 'Libre · ×' + L.trafico}</span>`, 'ui:lote', { id: L.id, enfocar: true }, N ? 'lleno' : R ? 'rival' : ''); }).join('')}</div></div>`;
  }

  function vTienda(N, L) {
    const T = D.negocios[N.tipo], E = M.estadoInterior(N), a = N.ayer, In = N.interior, h = M.hh(S), abierto = h >= T.horario[0] && h < T.horario[1];
    const vender = ui.confirma === 'vender' ? bt(`Sí, vender por ${din(N.invertido * B.valorNegocio)}`, 'vender', { id: N.id }, 'btn peligro armado') : bt(`${ic('salir')} Vender negocio`, 'ui:confirma', { k: 'vender' }, 'btn peligro');
    const terreno = S.rango >= 1 && !S.lotes[L.id].propio ? bt(`${ic('bandera')} Comprar terreno <small>${din(M.precioLote(L))}</small>`, 'comprarLote', { lote: L.id }) : '';
    const vacios = In.muebles.filter(m => D.interior.muebles[m.tipo].para && (!m.prod || m.stock === 0)).length;
    return `<div class="hoja">
      <div class="cab">${sello(N.tipo)}<div><h2>${T.nombre}</h2><p>${esc(L.nombre)} · ${In.muebles.length} muebles</p></div>${cerrarLote}</div>
      <div class="fila"><span class="eti crece">${abierto ? 'Abierto ahora' : 'Cerrado'} · ${hora(T.horario[0])}–${hora(T.horario[1])}</span><span class="eti">Reputación ${Math.round(N.rep)}</span></div>
      ${medidor(N.rep)}
      ${extras(N, T)}
      <div class="kpis">${kpi('Clientes ayer', a.clientes)}${kpi('Se fueron', a.perdidos, a.perdidos ? 'neg' : '')}${kpi('Sin producto', a.sinProducto || 0, a.sinProducto ? 'neg' : '')}${kpi('Utilidad ayer', a.utilidad == null ? '—' : din(a.utilidad), a.utilidad < 0 ? 'neg' : a.utilidad > 0 ? 'pos' : '')}</div>
      <p class="tenue">${E.cajeros} de ${E.cajas} cajas atendiendo · ${Math.round(E.cap)} clientes por hora · bodega ${M.enBodega(In)} de ${D.interior.bodega}${vacios ? ` · <b class="neg">${vacios} anaquel${vacios > 1 ? 'es' : ''} vacío${vacios > 1 ? 's' : ''}</b>` : ''}</p>
      ${bt(`${ic('tienda')} Entrar a la tiendita`, 'ui:entrar', { id: N.id }, 'btn pri ancho')}
      <div class="control"><span class="eti">Publicidad</span><div class="seg">${D.marketing.map((m, i) => bt(`${m.nombre}<small>${m.costo ? din(m.costo) + '/día' : 'gratis'}</small>`, 'marketing', { id: N.id, nivel: i }, N.mkt === i ? 'on' : '', `aria-pressed="${N.mkt === i}"`)).join('')}</div></div>
      ${vAnaquel(N)}
      <div class="control"><span class="eti">Utilidad de los últimos ${N.hist.length || 14} días</span>${barrasUtilidad(N.hist)}</div>
      <div class="fila">${terreno}${vender}</div></div>`;
  }

  function vRival(N, L) {
    const T = D.negocios[N.tipo], X = D.rival, precio = M.precioCompra(N), a = N.ayer;
    const mios = S.negocios.filter(n => n.tipo === N.tipo);
    const duelo = mios.length ? `Tú vendes lo mismo a ${din(Math.min(...mios.map(n => n.precio)), true)}. Si estás más barato que Ferrán, te llevas más clientes; él responde bajando.` : 'No compites con él en este giro.';
    return `<div class="hoja">
      <div class="cab"><span class="sello" style="background:${X.color};color:var(--papel)">${ic(ICONO_TIPO[N.tipo])}</span><div><p class="eti">${X.nombre}</p><h2>${T.nombre}</h2><p>${esc(L.nombre)} · ${nivelPips(N.nivel)}</p></div>${cerrarLote}</div>
      <div class="kpis">${kpi('Su precio', din(N.precio, N.precio < 100))}${kpi('Reputación', Math.round(N.rep))}${kpi('Clientes ayer', a.clientes)}${kpi('Personal', N.emp)}</div>
      <div class="consejo">${ic('rayo')}<span>${duelo}</span></div>
      <p class="tenue">Ferrán cierra un negocio tras ${X.diasRojosCierre} días seguidos perdiendo dinero. También puedes comprárselo: te quedas con su nivel, su personal y su fama; él recibe la mitad.</p>
      ${bt(`${ic('bandera')} Comprarle el negocio <small>${din(precio)}</small>`, 'adquirir', { id: N.id }, 'btn pri ancho', S.dinero < precio ? 'disabled' : '')}
      ${S.dinero < precio ? `<p class="tenue neg">Te faltan ${din(precio - S.dinero)}.</p>` : ''}</div>`;
  }

  function vVacio(L) {
    const propio = S.lotes[L.id].propio, precio = M.precioLote(L);
    const terreno = S.rango < 1 ? `<p class="candado">${ic('candado')} Comprar terrenos: ${D.rangos[1].nombre}</p>`
      : propio ? `<div class="fila"><p class="tenue crece">Este terreno es tuyo: lo que abras aquí no paga renta.</p>${bt('Vender terreno', 'venderLote', { lote: L.id }, 'btn')}</div>`
      : `<div class="fila"><p class="tenue crece">Si compras el terreno, tus locales aquí dejan de pagar renta.</p>${bt(`${ic('bandera')} Comprar terreno <small>${din(precio)}</small>`, 'comprarLote', { lote: L.id }, 'btn')}</div>`;
    return `<div class="hoja">
      <div class="cab"><span class="sello" style="background:var(--papel-2)">${ic('bandera')}</span><div><h2>${esc(L.nombre)}</h2><p>Lote vacío${L.esquina ? ' · esquina' : ''}</p></div>${cerrarLote}</div>
      <div class="kpis">${kpi('Gente que pasa', '×' + L.trafico.toFixed(2))}${kpi('Renta de local', din(L.renta) + '/día')}${kpi('Terreno', propio ? 'Tuyo' : din(precio))}</div>
      ${terreno}<hr class="sep"><h3>¿Qué abrimos aquí?</h3>
      <div class="opciones">${Object.entries(D.negocios).map(([t, T]) => {
        const bloq = T.rango > S.rango, repetido = t === 'estudio' && M.estudio(S), falta = T.costo - S.dinero;
        const fijo = (T.clase === 'puesto' ? T.permiso : propio ? 0 : L.renta) + T.sueldo;
        const pie = bloq ? `<span class="candado">${ic('candado')} ${D.rangos[T.rango].nombre}</span>` : repetido ? '<span class="candado">Ya tienes uno</span>' : falta > 0 ? `<span class="falta">Faltan ${din(falta)}</span>` : '';
        const vec = M.factorVecindad(S, L.id, t) - 1;
        return bt(`${sello(t)}<b>${T.nombre}</b><p>${T.desc}</p><span class="datos">${Math.abs(vec) > 0.001 ? `<span class="${vec > 0 ? 'pos' : 'falta'}">${pct(vec)} por vecinos</span>` : ''}<span><em>Abrir</em> ${din(T.costo)}</span><span><em>Fijo</em> ${din(fijo)}/día</span>${T.precioRef ? `<span><em>Ticket</em> ${din(T.precioRef, T.precioRef < 10)}</span>` : ''}${pie}</span>`,
          'construir', { lote: L.id, tipo: t }, 'opcion', bloq || repetido ? 'disabled' : '');
      }).join('')}</div></div>`;
  }

  const pct = x => (x >= 0 ? '+' : '−') + Math.round(Math.abs(x) * 100) + '%';
  function extras(N, T) { // cadena propia, competencia de Ferrán y vecindad
    const n = M.mismoGiro(S, N), suyos = S.rival.negocios.filter(r => r.tipo === N.tipo), out = [];
    for (const e of M.efectosVecindad(S, N.lote, N.tipo)) out.push(`<span class="insignia ${e.efecto > 0 ? 'pos' : 'neg'}" title="${esc(e.texto)}">${ic(e.efecto > 0 ? 'sube' : 'baja')} ${pct(e.efecto)} · ${esc(e.vecino)} al lado</span>`);
    if (n >= 2) out.push(`<span class="insignia">${ic('edificio')} Cadena ×${n} · insumos −${Math.round(M.descuentoCadena(S, N) * 100)}% · más fama</span>`);
    if (suyos.length) out.push(`<span class="insignia rival">${ic('rayo')} Ferrán vende lo mismo a ${din(Math.min(...suyos.map(r => r.precio)), true)}</span>`);
    return out.length ? `<div class="fila">${out.join('')}</div>` : '';
  }
  function vAnaquel(N) {
    const ops = M.anaquelesPara(S, N), a = N.ayer;
    if (!ops.length) return '';
    return `<div class="control"><div class="fila"><span class="eti crece">Anaquel de tu marca</span><span class="tenue">${a.anaquel ? `ayer ${a.anaquel} piezas · +${din(a.anaquelMonto || 0)}` : 'tus productos en tu mostrador'}</span></div>
      <div class="fila">${bt('Nada', 'anaquel', { id: N.id, prod: null }, 'btn chico' + (!N.anaquel ? ' on' : ''))}${ops.map(p => bt(`«${esc(p.nombre)}»`, 'anaquel', { id: N.id, prod: p.id }, 'btn chico' + (N.anaquel === p.id ? ' on' : ''))).join('')}</div>
      <p class="tenue">Parte de tus clientes se lo lleva a precio de mostrador, y lo que vendes aquí lo da a conocer en las tiendas de fuera.</p></div>`;
  }
  function barrasUtilidad(hist) {
    if (!hist.length) return '<p class="tenue">Las barras aparecen al cerrar el primer día.</p>';
    const max = Math.max(1, ...hist.map(Math.abs));
    return `<div class="barras">${hist.map(v => `<i class="${v < 0 ? 'neg' : ''}" style="height:${Math.max(3, Math.abs(v) / max * 100)}%" title="${din(v)}"></i>`).join('')}</div>`;
  }

  function vNegocio(N, L) {
    const T = D.negocios[N.tipo], h = M.hh(S), abierto = h >= T.horario[0] && h < T.horario[1], y = N.hoy, a = N.ayer, cap = M.capacidad(N);
    const r = N.precio / T.precioRef, pos = clamp((r - 0.5) * 100, 2, 98);
    const pasoP = T.precioRef < 5 ? 0.25 : T.precioRef < 20 ? 0.5 : 2;
    const lectura = r < 0.7 ? 'Regalas margen: vendes mucho pero ganas poco por cliente.' : r < 0.9 ? 'Barato: atraes más gente.' : r <= 1.1 ? 'Precio justo para la zona.' : r <= 1.3 ? 'Caro: algunos se van sin comprar.' : 'Abusivo: casi nadie compra y tu reputación cae.';
    const puedeSubir = N.nivel < M.nivelMax(S);
    const mejora = puedeSubir ? `${bt(`${ic('flecha')} Subir a nivel ${N.nivel + 1} <small>${din(M.costoMejora(N))}</small>`, 'mejorar', { id: N.id }, 'btn pri ancho')}<p class="tenue">+40% de clientes por persona y mejor calidad${T.clase === 'local' ? '; el edificio crece un piso' : '; puesto más vistoso'}.</p>`
      : N.nivel >= 4 ? '<p class="tenue">Nivel máximo alcanzado.</p>' : `<p class="candado">${ic('candado')} Nivel 4 al llegar a Magnate</p>`;
    const vender = ui.confirma === 'vender' ? bt(`Sí, vender por ${din(N.invertido * B.valorNegocio)}`, 'vender', { id: N.id }, 'btn peligro armado') : bt(`${ic('salir')} Vender negocio`, 'ui:confirma', { k: 'vender' }, 'btn peligro');
    const terreno = T.clase === 'local' && S.rango >= 1 && !S.lotes[L.id].propio ? bt(`${ic('bandera')} Comprar terreno <small>${din(M.precioLote(L))}</small>`, 'comprarLote', { lote: L.id }) : '';
    return `<div class="hoja">
      <div class="cab">${sello(N.tipo)}<div><h2>${T.nombre}</h2><p>${esc(L.nombre)} · ${nivelPips(N.nivel)}</p></div>${cerrarLote}</div>
      <div class="fila"><span class="eti crece">${abierto ? 'Abierto ahora' : 'Cerrado'} · ${hora(T.horario[0])}–${hora(T.horario[1])}</span><span class="eti">Reputación ${Math.round(N.rep)}</span></div>
      ${medidor(N.rep)}
      ${extras(N, T)}
      <div class="kpis">${kpi('Clientes hoy', y.clientes)}${kpi('Se fueron', y.perdidos, y.perdidos ? 'neg' : '')}${kpi('Ventas hoy', din(y.ingresos))}${kpi('Utilidad ayer', a.utilidad == null ? '—' : din(a.utilidad), a.utilidad < 0 ? 'neg' : a.utilidad > 0 ? 'pos' : '')}</div>
      <hr class="sep">
      <div class="control"><div class="fila"><span class="eti">Precio</span><span class="tenue">Precio de la zona ${din(T.precioRef, true)}</span></div>
        <div class="fila"><div class="paso">${bt(ic('menos'), 'precio', { id: N.id, valor: Math.round((N.precio - pasoP) * 100) / 100 }, '', `aria-label="Bajar precio" ${N.precio - pasoP < 0.1 ? 'disabled' : ''}`)}<output>${din(N.precio, N.precio < 100)}</output>${bt(ic('mas'), 'precio', { id: N.id, valor: Math.round((N.precio + pasoP) * 100) / 100 }, '', 'aria-label="Subir precio"')}</div><p class="tenue crece">${lectura}</p></div>
        <div class="escala" aria-hidden="true"><span>Regalo</span><span>Barato</span><span>Justo</span><span>Caro</span><span>Abuso</span><b style="left:${pos}%"></b></div></div>
      <div class="control"><div class="fila"><span class="eti">Personal</span><span class="tenue">${din(T.sueldo)}/día cada quien</span></div>
        <div class="fila"><div class="paso">${bt(ic('menos'), 'empleados', { id: N.id, cambio: -1 }, '', `aria-label="Quitar a alguien" ${N.emp <= 1 ? 'disabled' : ''}`)}<output>${N.emp} / ${T.empMax}</output>${bt(ic('mas'), 'empleados', { id: N.id, cambio: 1 }, '', `aria-label="Contratar" ${N.emp >= T.empMax ? 'disabled' : ''}`)}</div>
        <p class="tenue crece">Atienden hasta <b>${Math.round(cap)}</b> clientes por hora.${a.perdidos ? ` Ayer se fueron ${a.perdidos} sin comprar.` : ''}</p></div></div>
      ${vAnaquel(N)}
      <div class="control"><span class="eti">Publicidad</span><div class="seg">${D.marketing.map((m, i) => bt(`${m.nombre}<small>${m.costo ? din(m.costo) + '/día' : 'gratis'}</small>`, 'marketing', { id: N.id, nivel: i }, N.mkt === i ? 'on' : '', `aria-pressed="${N.mkt === i}"`)).join('')}</div></div>
      <div class="control"><span class="eti">Utilidad de los últimos ${N.hist.length || 14} días</span>${barrasUtilidad(N.hist)}</div>
      ${mejora}
      <div class="fila">${terreno}${vender}</div></div>`;
  }

  function vEstudioLote(N, L) {
    const T = D.negocios.estudio, v = M.velocidadEstudio(N), P = S.proyecto;
    const vender = ui.confirma === 'vender' ? bt(`Sí, vender${P ? ' y perder el proyecto' : ''}`, 'vender', { id: N.id }, 'btn peligro armado') : bt(`${ic('salir')} Vender estudio`, 'ui:confirma', { k: 'vender' }, 'btn peligro');
    return `<div class="hoja">
      <div class="cab">${sello('estudio')}<div><h2>${T.nombre}</h2><p>${esc(L.nombre)} · ${nivelPips(N.nivel)}</p></div>${cerrarLote}</div>
      <div class="kpis">${kpi('Diseñadores', N.emp)}${kpi('Avance', v.toFixed(1) + ' d/día')}${kpi('Sueldos', din(T.sueldo * N.emp) + '/día')}</div>
      ${P ? `<div class="control"><span class="eti">Desarrollando «${esc(P.nombre)}»</span><div class="progreso"><i style="width:${P.avance / P.dias * 100}%"></i></div></div>` : '<div class="consejo">' + ic('foco') + '<span>El estudio está libre. Diseña tu próximo producto en la pestaña Estudio.</span></div>'}
      <div class="control"><div class="fila"><span class="eti">Diseñadores</span><span class="tenue">${din(T.sueldo)}/día cada quien</span></div>
        <div class="fila"><div class="paso">${bt(ic('menos'), 'empleados', { id: N.id, cambio: -1 }, '', `aria-label="Quitar diseñador" ${N.emp <= 1 ? 'disabled' : ''}`)}<output>${N.emp} / ${T.empMax}</output>${bt(ic('mas'), 'empleados', { id: N.id, cambio: 1 }, '', `aria-label="Contratar diseñador" ${N.emp >= T.empMax ? 'disabled' : ''}`)}</div><p class="tenue crece">Más gente, productos listos antes.</p></div></div>
      ${N.nivel < M.nivelMax(S) ? `${bt(`${ic('flecha')} Ampliar a nivel ${N.nivel + 1} <small>${din(M.costoMejora(N))}</small>`, 'mejorar', { id: N.id }, 'btn ancho')}<p class="tenue">+25% de velocidad de desarrollo.</p>` : ''}
      ${bt(`${ic('foco')} Abrir el estudio`, 'ui:der', { der: 'estudio' }, 'btn pri ancho')}
      <div class="fila">${vender}</div></div>`;
  }

  function vFabrica(N, L) {
    const T = D.negocios[N.tipo], activas = M.lineasActivas(N), asignadas = N.lineas.filter(Boolean).length, a = N.ayer;
    const elegibles = S.productos.filter(p => p.activo && T.sirve.includes(p.cat));
    const cats = T.sirve.map(k => D.categorias[k].nombre.toLowerCase()).join(', ');
    const vender = ui.confirma === 'vender' ? bt(`Sí, vender por ${din(N.invertido * B.valorNegocio)}`, 'vender', { id: N.id }, 'btn peligro armado') : bt(`${ic('salir')} Vender planta`, 'ui:confirma', { k: 'vender' }, 'btn peligro');
    const terreno = S.rango >= 1 && !S.lotes[L.id].propio ? bt(`${ic('bandera')} Comprar terreno <small>${din(M.precioLote(L))}</small>`, 'comprarLote', { lote: L.id }) : '';
    let k = activas;
    const lineas = N.lineas.map((id, i) => {
      const opera = id && k-- > 0, P = id && S.productos.find(p => p.id === id);
      const estado = !id ? 'Apagada' : opera ? `Fabricando «${esc(P.nombre)}»` : 'Sin obreros: parada';
      return `<div class="linea ${opera ? 'on' : ''}"><div class="fila"><span class="eti crece">Línea ${i + 1}</span><span class="tenue">${estado}</span></div>
        <div class="fila">${bt('Apagar', 'linea', { id: N.id, i, prod: null }, 'btn chico' + (!id ? ' on' : ''))}${elegibles.map(p => bt(`«${esc(p.nombre)}»`, 'linea', { id: N.id, i, prod: p.id }, 'btn chico' + (id === p.id ? ' on' : ''))).join('')}</div></div>`;
    }).join('');
    const puedeSubir = N.nivel < M.nivelMax(S);
    return `<div class="hoja">
      <div class="cab">${sello(N.tipo)}<div><h2>${T.nombre}</h2><p>${esc(L.nombre)} · ${nivelPips(N.nivel)}</p></div>${cerrarLote}</div>
      <p class="tenue">Fabrica ${cats}. Cada línea produce hasta <b>${T.capLinea.toLocaleString('es-MX')}</b> unidades al día; lo que no alcanza se manda a maquilar.</p>
      <div class="kpis">${kpi('Líneas activas', `${activas} / ${N.lineas.length}`)}${kpi('Producido ayer', (a.producidas || 0).toLocaleString('es-MX'))}${kpi('Ahorro ayer', din(a.ingresos), a.ingresos > 0 ? 'pos' : '')}${kpi('Utilidad ayer', a.utilidad == null ? '—' : din(a.utilidad), a.utilidad < 0 ? 'neg' : a.utilidad > 0 ? 'pos' : '')}</div>
      <hr class="sep">
      <div class="control"><span class="eti">Líneas de producción</span>
        ${elegibles.length ? lineas : `<div class="consejo">${ic('foco')}<span>Todavía no tienes ${cats} a la venta. Lanza uno desde el Estudio y ponlo a fabricar aquí.</span></div>`}</div>
      <div class="control"><div class="fila"><span class="eti">Obreros</span><span class="tenue">${din(T.sueldo)}/día · ${T.porLinea} por línea · energía ${din(T.energia)}/línea</span></div>
        <div class="fila"><div class="paso">${bt(ic('menos'), 'empleados', { id: N.id, cambio: -1 }, '', `aria-label="Quitar obrero" ${N.emp <= 1 ? 'disabled' : ''}`)}<output>${N.emp} / ${T.empMax}</output>${bt(ic('mas'), 'empleados', { id: N.id, cambio: 1 }, '', `aria-label="Contratar obrero" ${N.emp >= T.empMax ? 'disabled' : ''}`)}</div>
        <p class="tenue crece">${asignadas > activas ? `<b class="neg">Faltan ${(asignadas - activas) * T.porLinea - (N.emp % T.porLinea)} obreros</b> para encender todas las líneas.` : 'Alcanzan para las líneas encendidas.'}</p></div></div>
      <div class="control"><span class="eti">Utilidad de los últimos ${N.hist.length || 14} días</span>${barrasUtilidad(N.hist)}</div>
      ${puedeSubir ? `${bt(`${ic('flecha')} Agregar la línea ${N.nivel + 1} <small>${din(M.costoMejora(N))}</small>`, 'mejorar', { id: N.id }, 'btn pri ancho')}<p class="tenue">La nave crece y suma una línea más.</p>` : N.nivel >= 4 ? '<p class="tenue">Planta al máximo.</p>' : `<p class="candado">${ic('candado')} Línea 4 al llegar a Magnate</p>`}
      <div class="fila">${terreno}${vender}</div></div>`;
  }

  // ---------- Pestañas de la derecha ----------
  function vImperio() {
    const obj = M.objetivo(S), pat = M.patrimonio(S), R = obj.siguiente, ayer = S.resumen;
    const H = S.historial.map(x => x.pat);
    let grafica = '<p class="tenue">La gráfica de patrimonio aparece al cerrar el segundo día.</p>';
    if (H.length > 1) {
      const lo = Math.min(0, ...H), hi = Math.max(...H), X = i => (i / (H.length - 1)) * 300, Y = v => 116 - ((v - lo) / (hi - lo || 1)) * 110;
      const pts = H.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      grafica = `<svg class="grafica" viewBox="0 0 300 120" preserveAspectRatio="none" role="img" aria-label="Patrimonio por día"><polygon class="area" points="0,120 ${pts} 300,120"/><polyline class="linea" points="${pts}"/></svg>
        <div class="fila tenue"><span class="crece">Día ${S.historial[0].dia}</span><span>máximo ${corto(hi)}</span><span>· día ${S.historial[H.length - 1].dia}</span></div>`;
    }
    const lista = S.negocios.map(N => {
      const T = D.negocios[N.tipo], u = N.ayer.utilidad;
      return bt(`${sello(N.tipo, 'ch')}<span class="crece"><b class="nom">${T.corto}</b><span class="tenue">${M.lote(N.lote).corto} · nivel ${N.nivel}${T.clase === 'estudio' ? '' : T.clase === 'fabrica' ? ' · ' + M.lineasActivas(N) + ' líneas activas' : ' · reputación ' + Math.round(N.rep)}</span></span><span class="cifra ${u < 0 ? 'neg' : u > 0 ? 'pos' : ''}">${u == null ? '—' : din(u)}<br><span class="tenue">${T.clase === 'estudio' ? 'estudio' : T.clase === 'fabrica' ? (N.ayer.producidas || 0).toLocaleString('es-MX') + ' hechas' : N.ayer.clientes + ' clientes'}</span></span>`, 'ui:lote', { id: N.lote, enfocar: true }, 'renglon');
    }).join('');
    const fila = (k, v, cls = '') => `<div class="renglon"><span class="crece">${k}</span><span class="cifra ${cls}">${v}</span></div>`;
    const NOMBRE = { ventas: 'Ventas en la calle', productos: 'Productos propios', ventaActivos: 'Venta de activos', insumos: 'Insumos', sueldos: 'Sueldos', renta: 'Rentas', permisos: 'Permisos de puestos', marketing: 'Publicidad', energia: 'Energía de plantas', decisiones: 'Decisiones', compromisos: 'Pagos al inversionista', hitos: 'Premios por hitos', inversion: 'Inversiones (no cuentan como gasto)' };
    const C = S.modo === 'historia' && !S.fin ? D.capitulos[S.capitulo] : null;
    const capitulo = C ? `<div class="hoja"><div class="cab">${retrato('chela', 'ch')}<div><p class="eti">Capítulo ${S.capitulo + 1} de ${D.capitulos.length}</p><h2>${C.titulo}</h2><p>${S.esperando ? 'Ferrán y Vega esperan tu respuesta.' : C.objetivo}</p></div></div>
      <div class="fila">${S.esperando ? bt(`${ic('rayo')} Responder`, 'ui:dialogo', { id: 'cap6-fin' }, 'btn pri') : bt('Volver a escuchar', 'ui:dialogo', { id: C.intro }, 'btn chico')}</div></div>` : '';
    const ofertas = S.ofertas.length ? `<div class="hoja"><h3>${ic('moneda')} Ofertas en la mesa</h3><div class="lista">${S.ofertas.map(o => {
      const N = S.negocios.find(n => n.id === o.negocio), Cm = D.compradores[o.comprador];
      return N ? bt(`${retrato(Cm.persona, 'ch')}<span class="crece"><b class="nom">${Cm.nombre}</b><span class="tenue">Por tu ${D.negocios[N.tipo].corto.toLowerCase()} en ${M.lote(N.lote).corto} · vence el día ${o.vence + 1}</span></span><span class="cifra pos">${corto(o.precio)}</span>`, 'ui:oferta', { id: o.id }, 'renglon') : '';
    }).join('')}</div></div>` : '';
    return `${capitulo}${ofertas}<div class="hoja">
        <div class="cab"><span class="sello" style="background:var(--mostaza)">${ic('trofeo')}</span><div><h2>${R ? 'Rumbo a ' + R.nombre : 'Eres leyenda de Calle Mayor'}</h2><p>${R ? `Patrimonio máximo ${corto(S.maxPat)} de ${corto(R.min)}. Desbloquea: ${R.desbloquea.toLowerCase()}.` : 'Ya no hay rango más alto. Sigue construyendo.'}</p></div></div>
        <div class="progreso"><i style="width:${obj.avance}%"></i></div>
        <div class="consejo">${ic('foco')}<span>${esc(obj.consejo)}</span></div></div>
      <div class="hoja"><h3>${ic('edificio')} ${esc(S.empresa)}</h3>
        <div class="kpis">${kpi('Patrimonio', corto(pat))}${kpi('Efectivo', corto(S.dinero), S.dinero < 0 ? 'neg' : '')}${kpi('Utilidad ayer', ayer ? din(ayer.neto) : '—', ayer && ayer.neto < 0 ? 'neg' : 'pos')}${kpi('Productos en venta', S.productos.filter(p => p.activo).length)}</div>
        ${grafica}</div>
      ${vHitos()}
      ${S.rival.negocios.length || S.rival.cerrados || S.rival.comprados ? `<div class="hoja"><div class="cab"><span class="sello" style="background:${D.rival.color};color:var(--papel)">${ic('rayo')}</span><div><h3>${D.rival.nombre}</h3><p>${S.rival.negocios.length} negocios en la calle · le has sacado de ${S.rival.cerrados + S.rival.comprados} ${S.rival.cerrados + S.rival.comprados === 1 ? 'lote' : 'lotes'}</p></div></div>
        ${S.rival.negocios.length ? `<div class="lista">${S.rival.negocios.map(N => bt(`<span class="sello ch" style="background:${D.rival.color};color:var(--papel)">${ic(ICONO_TIPO[N.tipo])}</span><span class="crece"><b class="nom">${D.negocios[N.tipo].corto}</b><span class="tenue">${M.lote(N.lote).corto} · nivel ${N.nivel} · reputación ${Math.round(N.rep)}</span></span><span class="cifra">${din(N.precio, N.precio < 100)}<br><span class="tenue">compra ${corto(M.precioCompra(N))}</span></span>`, 'ui:lote', { id: N.lote, enfocar: true }, 'renglon')).join('')}</div>` : '<p class="tenue">Por ahora no le queda nada en la calle.</p>'}</div>` : ''}
      <div class="hoja"><h3>${ic('tienda')} Tus negocios</h3>${S.negocios.length ? `<div class="lista">${lista}</div>` : '<p class="tenue">Todavía nada. Toca un lote libre de la calle para abrir tu primer puesto.</p>'}</div>
      ${ayer ? `<div class="hoja"><h3>${ic('moneda')} Cierre del día ${ayer.dia}</h3><div class="lista">
        ${Object.entries(ayer.ingresos).map(([k, v]) => fila(NOMBRE[k] || k, '+' + din(v), 'pos')).join('')}
        ${Object.entries(ayer.gastos).map(([k, v]) => fila(NOMBRE[k] || k, '−' + din(v), k === 'inversion' ? '' : 'neg')).join('')}
        ${fila('<b>Utilidad del día</b>', din(ayer.neto), ayer.neto < 0 ? 'neg' : 'pos')}</div></div>` : ''}`;
  }

  function vHitos() {
    const hechos = D.hitos.filter(h => S.hitos[h.id]).length, sig = D.hitos.filter(h => !S.hitos[h.id]).slice(0, 3);
    return `<div class="hoja"><div class="fila"><h3 class="crece">${ic('estrella')} Hitos</h3><span class="eti">${hechos} de ${D.hitos.length}</span></div>
      <div class="medidor" aria-hidden="true" style="grid-template-columns:repeat(${D.hitos.length},1fr)">${D.hitos.map(h => `<i class="${S.hitos[h.id] ? 'on' : ''}"></i>`).join('')}</div>
      ${sig.length ? `<div class="lista">${sig.map(h => `<div class="renglon"><span class="sello ch" style="background:var(--papel-2)">${ic('estrella')}</span><span class="crece"><b class="nom">${h.nombre}</b><span class="tenue">${h.texto}</span></span><span class="cifra pos">+${din(h.premio)}</span></div>`).join('')}</div>` : '<p class="tenue">Completaste todos los hitos.</p>'}</div>`;
  }
  function bloqueado(r, texto) {
    return `<div class="hoja"><div class="bloqueo"><span class="candado">${ic('candado')} ${D.rangos[r].nombre} · patrimonio ${din(D.rangos[r].min)}</span><h2>${texto}</h2>
      <p class="tenue">Vas en ${din(M.patrimonio(S))}. Sigue creciendo en la calle.</p></div></div>`;
  }
  function spark(vals, color) {
    if (vals.length < 2) return '';
    const lo = Math.min(...vals), hi = Math.max(...vals);
    return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline style="stroke:${color}" points="${vals.map((v, i) => `${(i / (vals.length - 1) * 100).toFixed(1)},${(28 - (v - lo) / (hi - lo || 1) * 26).toFixed(1)}`).join(' ')}"/></svg>`;
  }

  function vEstudio() {
    if (S.rango < 2) return bloqueado(2, 'El estudio de producto llega cuando seas Empresario');
    const E = M.estudio(S), F = ui.form, P = S.proyecto;
    if (!D.categorias[F.cat] || D.categorias[F.cat].rango > S.rango) F.cat = 'bebida';
    const libre = D.lotes.find(l => !M.negocioEn(S, l.id));
    let cuerpo;
    if (!E) cuerpo = `<div class="hoja"><div class="vacio"><div class="sello">${ic('foco')}</div><h2>Todavía no tienes estudio</h2><p class="tenue">Ábrelo en cualquier lote libre por ${din(D.negocios.estudio.costo)}. Ahí diseñas productos con tu marca y los lanzas al mercado.</p>
      ${libre ? bt(`${ic('bandera')} Elegir un lote libre`, 'ui:lote', { id: libre.id, enfocar: true }, 'btn pri') : '<p class="tenue">No queda lote libre: vende algún negocio para hacer espacio.</p>'}</div></div>`;
    else if (P) {
      const C = D.categorias[P.cat], faltan = Math.max(0, Math.ceil((P.dias - P.avance) / M.velocidadEstudio(E)));
      cuerpo = `<div class="hoja"><div class="cab"><span class="sello" style="background:var(--mostaza)">${ic('caja')}</span><div><p class="eti">En desarrollo</p><h2>«${esc(P.nombre)}»</h2><p>${C.nombre} · presupuesto ${din(P.presupuesto)}</p></div></div>
        <div class="progreso"><i style="width:${P.avance / P.dias * 100}%"></i></div>
        <p class="tenue">${faltan ? `Sale al mercado en unos ${faltan} ${faltan === 1 ? 'día' : 'días'}.` : 'Sale al mercado al cierre de hoy.'} Mezcla: ${P.mezcla.map((x, i) => `${['calidad', 'diseño', 'marketing'][i]} ${Math.round(x * 100)}%`).join(', ')}.</p></div>`;
    } else {
      const C = D.categorias[F.cat], exp = S.experiencia[F.cat] || 0, tot = F.mezcla.reduce((a, b) => a + b, 0) || 1;
      const mayor = C.ideal.indexOf(Math.max(...C.ideal));
      const pista = exp >= 3 ? `Dominas la categoría: lo ideal es ${C.ideal.map((x, i) => `${Math.round(x * 100)}% ${['calidad', 'diseño', 'marketing'][i]}`).join(', ')}.`
        : exp >= 1 ? `Pista: en ${C.nombre.toLowerCase()} la gente valora sobre todo ${['la calidad', 'el diseño', 'el marketing'][mayor]}.`
        : 'Primera vez en esta categoría. La mezcla ideal la descubres lanzando: cada lanzamiento te da oficio.';
      cuerpo = `<div class="hoja"><h3>${ic('foco')} Diseña un producto</h3>
        <div class="control"><span class="eti">1 · Categoría y lo que está de moda</span><div class="tendencias">${Object.entries(D.categorias).map(([k, c]) => {
          const t = S.tendencias[k], b = c.rango > S.rango;
          return bt(`<b>${c.nombre}</b><span>${b ? ic('candado') + D.rangos[c.rango].nombre : `${ic(t >= 1 ? 'sube' : 'baja')}${t >= 1 ? '+' : ''}${Math.round((t - 1) * 100)}%`}</span><span class="tenue">ref. ${corto(c.presupuestoRef)} · ${c.dias} días</span>`, 'ui:cat', { cat: k }, 'tend' + (F.cat === k ? ' on' : ''), b ? 'disabled' : '');
        }).join('')}</div></div>
        <div class="control"><span class="eti">2 · Nombre</span><div class="fila"><input type="text" id="f-nombre" class="crece" maxlength="28" placeholder="Ponle nombre" value="${esc(F.nombre)}" autocomplete="off">${bt(ic('dado'), 'ui:nombre', {}, 'btn', 'aria-label="Sugerir un nombre"')}</div></div>
        <div class="control"><div class="fila"><span class="eti">3 · Presupuesto</span><span class="tenue">referencia ${din(C.presupuestoRef)}</span></div>
          <div class="fila"><div class="paso">${bt(ic('menos'), 'ui:presupuesto', { f: 0.8 }, '', 'aria-label="Menos presupuesto"')}<output>${corto(F.presupuesto)}</output>${bt(ic('mas'), 'ui:presupuesto', { f: 1.25 }, '', 'aria-label="Más presupuesto"')}</div>
          <p class="tenue crece">Más dinero sube la calidad posible, con rendimiento decreciente.</p></div></div>
        <div class="control"><span class="eti">4 · ¿En qué se va el dinero?</span><div class="mezcla">${['Calidad', 'Diseño', 'Marketing'].map((n, i) => `<label>${n}<input type="range" min="0" max="100" value="${F.mezcla[i]}" data-mezcla="${i}"><output data-pct="${i}">${Math.round(F.mezcla[i] / tot * 100)}%</output></label>`).join('')}</div>
          <p class="tenue">${pista} El marketing además dispara las ventas del lanzamiento.</p></div>
        ${bt(`${ic('caja')} Empezar desarrollo <small>${din(F.presupuesto)} · ${C.dias} días base</small>`, 'ui:lanzar', {}, 'btn pri ancho', S.dinero < F.presupuesto ? 'disabled' : '')}
        ${S.dinero < F.presupuesto ? `<p class="tenue neg">Te faltan ${din(F.presupuesto - S.dinero)}.</p>` : ''}
        <p class="tenue">${C.propio != null ? `Maquilado deja ${din(C.precio - C.costo, true)} por unidad; fabricado en tu planta, ${din(C.precio - C.propio, true)}.` : 'Producto digital: no necesita fábrica.'}</p></div>`;
    }
    const productos = S.productos.length ? `<div class="hoja"><h3>${ic('caja')} Tus productos</h3><div class="lista">${S.productos.map(p => {
      const res = p.ganado - p.costo;
      return `<div class="renglon"><span class="nota ch ${notaCls(p.nota)}">${p.nota.toFixed(1)}</span><span class="crece"><b class="nom">«${esc(p.nombre)}»</b><span class="tenue">${D.categorias[p.cat].nombre} · ${p.activo ? `en tiendas, día ${p.dia}` : 'retirado'} · ${p.unidades.toLocaleString('es-MX')} vendidos${p.tienda ? ` · ${p.tienda.toLocaleString('es-MX')} en tus tiendas` : ''}${p.propias ? ` · ${Math.round(p.propias / p.unidades * 100)}% de tu planta` : ''}</span>${spark(p.hist, p.activo ? 'var(--verde)' : 'var(--tenue)')}</span>
        <span class="cifra ${res >= 0 ? 'pos' : 'neg'}">${res >= 0 ? '+' : ''}${corto(res)}<br><span class="tenue">costó ${corto(p.costo)}</span></span></div>`;
    }).join('')}</div></div>` : '';
    return cuerpo + productos;
  }

  function vBolsa() {
    if (S.rango < 2) return bloqueado(2, 'La bolsa de valores abre cuando seas Empresario');
    let valor = 0, costo = 0;
    for (const id in S.cartera) { valor += S.cartera[id].n * S.bolsa[id].precio; costo += S.cartera[id].costo; }
    return `<div class="hoja"><div class="cab"><span class="sello" style="background:var(--mostaza)">${ic('grafica')}</span><div><h2>Bolsa de valores</h2><p>Los precios se mueven al cierre de cada día. Comisión de ${(B.comision * 100).toFixed(1)}% por operación.</p></div></div>
        <div class="kpis">${kpi('Tu cartera', corto(valor))}${kpi('Ganancia', (valor - costo >= 0 ? '+' : '') + corto(valor - costo), valor - costo >= 0 ? 'pos' : 'neg')}${kpi('Efectivo', corto(S.dinero))}</div></div>
      <div class="hoja"><div class="acciones">${D.acciones.map(A => {
        const s = S.bolsa[A.id], h = s.hist, cambio = h.length > 1 ? h[h.length - 1] / h[h.length - 2] - 1 : 0, mia = S.cartera[A.id];
        const comprar = n => bt(`Comprar ${n}<small>${corto(n * s.precio)}</small>`, 'comprarAccion', { id: A.id, n }, 'btn', S.dinero < n * s.precio * (1 + B.comision) ? 'disabled' : '');
        return `<div class="accion"><span class="ticker">${A.id}</span><span class="crece"><b class="nom">${A.nombre}</b><span class="tenue">${mia ? `Tienes ${mia.n.toLocaleString('es-MX')} · valen ${corto(mia.n * s.precio)}` : 'No tienes acciones'}</span></span>
          <span class="cifra">${din(s.precio, true)}<br><span class="${cambio >= 0 ? 'pos' : 'neg'}">${cambio >= 0 ? '▲' : '▼'} ${(Math.abs(cambio) * 100).toFixed(1)}%</span></span>
          <div style="grid-column:1/-1">${spark(h, cambio >= 0 ? 'var(--verde)' : 'var(--rojo)')}</div>
          <div class="botones">${comprar(10)}${comprar(100)}${mia ? bt('Vender 10', 'venderAccion', { id: A.id, n: Math.min(10, mia.n) }) + bt(`Vender todo<small>${corto(mia.n * s.precio)}</small>`, 'venderAccion', { id: A.id, n: mia.n }, 'btn peligro') : ''}</div></div>`;
      }).join('')}</div></div>`;
  }

  function vAjustes() {
    return `<div class="hoja"><h3>${ic('estrella')} Tu marca</h3><p class="tenue">El color se pinta en los toldos, sombrillas y letreros de tus negocios.</p>${muestras('color', S.color)}</div>
      <div class="hoja"><h3>${ic('guardar')} Partida</h3><p class="tenue">${esc(S.empresa)} · día ${M.dia(S)}. Se guarda sola en este dispositivo al cierre de cada día.</p>
        <div class="fila">${bt(`${ic('guardar')} Guardar ahora`, 'ui:guardar', {}, 'btn pri')}${bt('Cargar último guardado', 'ui:cargar')}</div></div>
      <div class="hoja"><h3>Pasar la partida a otro dispositivo</h3>${bt('Exportar como texto', 'ui:exportar')}
        ${ui.exporta ? `<textarea id="f-exporta" readonly aria-label="Partida exportada">${esc(ui.exporta)}</textarea>${bt('Copiar', 'ui:copiar')}` : ''}
        <label class="eti" for="f-importa">Pega aquí una partida exportada</label><textarea id="f-importa">${esc(ui.importa)}</textarea>${bt('Importar', 'ui:importar')}</div>
      <div class="hoja"><h3>Cómo se juega</h3><div class="lista">
        <div class="renglon"><span>Toca un lote de la calle para abrir un negocio, o uno tuyo para administrarlo: precio, personal, publicidad y mejoras.</span></div>
        <div class="renglon"><span>Tu patrimonio (efectivo, la mitad de lo invertido, terrenos y acciones) te sube de rango y desbloquea lo siguiente.</span></div>
        <div class="renglon"><span>En el estudio repartes el presupuesto entre calidad, diseño y marketing. Cada categoría tiene su mezcla ideal; con cada lanzamiento aprendes.</span></div>
        <div class="renglon"><span>Si tu cuenta queda en números rojos, el banco te da unos días de plazo (más si tienes más negocios). Mientras tanto te ofrecen comprar tus negocios, cada día más barato. Si se acaba el plazo, pierdes la partida. Barra espaciadora: pausa.</span></div></div></div>
      <div class="hoja">${ui.confirma === 'nueva' ? bt('Sí, borrar y empezar de cero', 'ui:nueva', {}, 'btn peligro armado') : bt(`${ic('salir')} Nueva partida`, 'ui:confirma', { k: 'nueva' }, 'btn peligro')}</div>`;
  }

  const TABS = [['imperio', 'Imperio', 'edificio'], ['estudio', 'Estudio', 'foco'], ['bolsa', 'Bolsa', 'grafica'], ['ajustes', 'Ajustes', 'ajustes']];
  const VISTAS = { imperio: vImperio, estudio: vEstudio, bolsa: vBolsa, ajustes: vAjustes };

  // ---------- Capas (inicio, rangos, lanzamientos, final) ----------
  function abrirCapa(html, tipo) {
    if (vel) { velAntes = vel; vel = 0; }
    const repetida = ui.capa === tipo && !$('capa').hidden; // re-pintar la misma capa sin repetir su animación de entrada
    ui.capa = tipo;
    $('capa').innerHTML = html;
    if (repetida) $('capa').firstElementChild.classList.add('quieta');
    $('capa').hidden = false;
    const f = $('capa').querySelector('input, .btn.pri');
    if (f) setTimeout(() => f.focus(), 60);
  }
  function cerrarCapa() {
    const tipo = ui.capa;
    ui.capa = null;
    $('capa').hidden = true;
    $('capa').innerHTML = '';
    if (tipo !== 'inicio' && S && !M.terminal(S)) vel = velAntes || 1;
    procesarAvisos();
  }
  function capaInicio() {
    const g = disco.leer(), I = ui.inicio;
    abrirCapa(`<div class="modal inicio"><div class="titulo-juego">Calle<br><span>Mayor</span></div>
      <p>Llegas con $300 y una idea. Empieza con un puesto de limonada, abre locales, diseña tus propios productos e invierte en la bolsa hasta que la calle entera lleve tu nombre.</p>
      ${g ? `<div class="kpis">${kpi('Partida guardada', esc(g.empresa))}${kpi('Día', M.dia(g))}${kpi('Patrimonio', corto(M.patrimonio(g)))}</div>${bt(`${ic('play')} Continuar`, 'ui:continuar', {}, 'btn pri ancho')}<hr class="sep">` : ''}
      <span class="eti">Modo de juego</span>
      <div class="modos">${Object.entries(D.modos).map(([k, m]) => bt(`<b>${m.nombre}</b><span>${m.desc}</span>`, 'ui:modo', { modo: k }, 'opcion-d' + (I.modo === k ? ' on' : ''), `aria-pressed="${I.modo === k}"`)).join('')}</div>
      ${I.modo === 'sandbox' ? `<div class="control"><span class="eti">Empiezas con</span><div class="seg">${D.modos.sandbox.dineros.map(v => bt(din(v), 'ui:inicioOpc', { k: 'dinero', v }, I.dinero === v ? 'on' : '')).join('')}</div>
        <span class="eti">Rival en la calle</span><div class="seg">${[[true, 'Grupo Ferrán'], [false, 'Sin rival']].map(([v, n]) => bt(n, 'ui:inicioOpc', { k: 'rival', v }, I.rival === v ? 'on' : '')).join('')}</div></div>` : ''}
      <label class="eti" for="f-empresa">Nombre de tu empresa</label>
      <input type="text" id="f-empresa" maxlength="24" placeholder="Ej. Limones Hermanos" autocomplete="off" value="${esc(ui.empresa)}">
      <span class="eti">Color de tu marca</span>${muestras('ui:colorInicio', ui.colorInicio)}
      ${bt(`${ic('carrito')} ${I.modo === 'historia' ? 'Empezar la historia' : 'Abrir la calle'}`, 'ui:empezar', {}, g ? 'btn ancho' : 'btn pri ancho')}</div>`, 'inicio');
  }
  function capaRango(r) {
    const R = D.rangos[r];
    abrirCapa(`<div class="modal"><div class="estampa oro">${ic('trofeo', 'g')}Nuevo rango<b>${R.nombre}</b></div>
      <p class="cita">${FRASES_RANGO[r]}</p>
      <ul class="desbloqueos"><li>${ic('candado')} Desbloqueas: ${R.desbloquea.toLowerCase()}.</li></ul>
      ${bt(r === D.rangos.length - 1 ? 'Seguir construyendo' : 'A seguir creciendo', r === D.rangos.length - 1 ? 'ui:seguir' : 'ui:cerrarCapa', {}, 'btn pri ancho')}</div>`, 'rango');
  }
  function capaLanzamiento(id) {
    const p = S.productos.find(x => x.id === id), C = D.categorias[p.cat], n = p.nota;
    const cita = n >= 9 ? '«Una obra maestra. Corran a comprarlo.»' : n >= 8 ? '«Muy recomendable: se nota el cuidado.»' : n >= 6.5 ? '«Cumple, aunque no sorprende.»' : n >= 5 ? '«Le falta algo. Esperábamos más.»' : '«Un tropiezo. Mejor esperen el siguiente.»';
    const color = n >= 8 ? 'var(--verde)' : n >= 6 ? '#B57F00' : 'var(--rojo)';
    abrirCapa(`<div class="modal"><div><p class="eti">Lanzamiento · ${C.nombre}</p><h2 style="font-size:30px">«${esc(p.nombre)}»</h2></div>
      <div class="estampa" style="border-color:${color};color:${color}">La prensa le da<b>${n.toFixed(1)} / 10</b></div>
      <p class="cita">${cita}</p>
      <p class="tenue">Las ventas arrancan hoy, tocan techo en unos días y luego bajan. Sigue cada producto en la pestaña Estudio.</p>
      ${bt('Ver cómo se vende', 'ui:cerrarCapa', {}, 'btn pri ancho')}</div>`, 'lanzamiento');
  }
  function capaDecision() {
    const d = D.decisiones.find(x => x.id === S.decision);
    if (!d) return;
    abrirCapa(`<div class="modal"><div><p class="eti">${ic('rayo')} Decisión · día ${M.dia(S)}</p><h2 style="font-size:28px">${d.titulo}</h2></div>
      <p class="cita" style="text-align:left">${d.texto}</p>
      <div class="decision">${d.opciones.map((o, i) => bt(`<b>${o.texto}</b><span>${o.detalle}</span>`, 'ui:decidir', { i }, 'opcion-d' + (i === 0 ? ' pri' : ''), o.efectos.dinero < 0 && S.dinero < -o.efectos.dinero ? 'disabled' : '')).join('')}</div>
      <p class="tenue">El tiempo está en pausa mientras decides.</p></div>`, 'decision');
  }
  function capaFinal() {
    const F = D.finales[S.finalId], derrota = F.tipo === 'derrota';
    abrirCapa(`<div class="modal"><div class="estampa ${derrota ? '' : 'oro'}">${derrota ? 'Fin de la partida' : F.tipo === 'agridulce' ? 'Final agridulce' : 'Final'}<b>${F.titulo}</b></div>
      <div class="habla">${retrato(F.persona)}<p class="cita" style="text-align:left">${F.texto}</p></div>
      <div class="kpis">${kpi('Días', M.dia(S) - 1)}${kpi('Patrimonio máximo', corto(S.maxPat))}${kpi('Productos', S.productos.length)}${kpi('Hitos', Object.keys(S.hitos).length + ' / ' + D.hitos.length)}</div>
      ${derrota ? '' : bt(`${ic('play')} Seguir jugando en sandbox`, 'ui:seguir', {}, 'btn pri ancho')}
      ${bt('Nueva partida', 'ui:nueva', {}, derrota ? 'btn pri ancho' : 'btn ancho')}</div>`, 'final');
  }
  // Diálogo: una línea a la vez, con efecto de máquina de escribir.
  function capaDialogo() {
    const lineas = D.dialogos[ui.dialogo.id], L = lineas[ui.dialogo.i], P = D.personajes[L.q], ultima = ui.dialogo.i === lineas.length - 1;
    const botones = L.opciones && S.esperando === 'final' ? `<div class="decision">${L.opciones.map(o => bt(`<b>${o.texto}</b><span>${o.detalle}</span>`, 'ui:elegirFinal', { valor: o.final }, 'opcion-d')).join('')}</div>`
      : `<div class="fila"><span class="crece puntos">${lineas.map((_, i) => `<i class="${i <= ui.dialogo.i ? 'on' : ''}"></i>`).join('')}</span>${bt(ultima ? 'Entendido' : `Siguiente ${ic('der')}`, 'ui:siguiente', {}, 'btn pri')}</div>`;
    abrirCapa(`<div class="modal dialogo"><div class="habla">${retrato(L.q)}<div><p class="nombre-p" style="color:${P.color}">${P.nombre}</p><p class="tenue">${P.rol}</p></div></div>
      <p class="linea-dialogo" id="linea" aria-live="polite">${esc(L.t)}</p>${botones}</div>`, 'dialogo');
    escribir($('linea'), L.t);
  }
  let escritura = null;
  function escribir(el, texto) {
    clearInterval(escritura);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let n = 0;
    el.textContent = '';
    escritura = setInterval(() => { n += 2; el.textContent = texto.slice(0, n); if (n >= texto.length) clearInterval(escritura); }, 16);
  }
  function capaOferta() {
    const o = S.ofertas.find(x => x.id === ui.oferta), N = o && S.negocios.find(n => n.id === o.negocio);
    if (!N) { ui.oferta = null; return; }
    const C = D.compradores[o.comprador], P = D.personajes[C.persona], T = D.negocios[N.tipo], L = M.lote(N.lote), pct = Math.round(o.precio / N.invertido * 100);
    const frase = o.motivo === 'rojo' ? (o.comprador === 'ferran' ? '«Su cuenta está en rojo y lo sabemos. Le compro ese negocio hoy. Mañana le ofreceré menos.»' : '«En Capital Vega compramos negocios con problemas. Esta oferta no va a mejorar con los días.»')
      : '«Nos gusta lo que hizo con ese negocio. Le hacemos una oferta generosa, por si quiere hacer caja.»';
    abrirCapa(`<div class="modal"><div class="habla">${retrato(C.persona)}<div><p class="nombre-p" style="color:${P.color}">${P.nombre} · ${C.nombre}</p><h2>Quiere comprar tu ${T.nombre.toLowerCase()}</h2><p class="tenue">${esc(L.nombre)} · nivel ${N.nivel}</p></div></div>
      <p class="cita" style="text-align:left">${frase}</p>
      <div class="kpis">${kpi('Te ofrecen', din(o.precio), 'pos')}${kpi('Invertiste', din(N.invertido))}${kpi('Es el', pct + '%')}</div>
      <p class="tenue">Si lo vendieras por tu cuenta te darían ${din(N.invertido * B.valorNegocio)}. ${o.motivo === 'rojo' ? `Plazo del banco: ${M.plazoQuiebra(S) - S.diasRojos} días.` : ''} La oferta vence el día ${o.vence + 1}.${o.comprador === 'ferran' ? ' Ferrán se quedaría con el local.' : ' Vega lo cerraría y el lote quedaría libre.'}</p>
      <div class="decision">${bt(`<b>Aceptar</b><span>+${din(o.precio)} hoy</span>`, 'ui:ofertaAcepta', { id: o.id }, 'opcion-d pri')}
        ${o.regateo ? '' : bt(`<b>Regatear</b><span>pedir ${Math.round(D.ofertas.regatear * 100)}% más; pueden levantarse de la mesa</span>`, 'ui:ofertaRegatea', { id: o.id }, 'opcion-d')}
        <div class="fila">${bt('Pensarlo', 'ui:cerrarCapa', {}, 'btn crece')}${bt('Rechazar', 'ui:ofertaRechaza', { id: o.id }, 'btn peligro crece')}</div></div></div>`, 'oferta');
  }

  // ---------- Pintado ----------
  const enfocado = region => { const a = document.activeElement; return a && region.contains(a) && a.matches('input, textarea'); };
  function pintar() {
    if (!S) return;
    if (presionando) { pendiente = true; return; }
    pendiente = false;
    document.body.dataset.movil = ui.movil;
    vBarra();
    const clave = ui.lote + '|' + ui.der + '|' + ui.movil;
    const plana = clave === claveVista;
    claveVista = clave;
    const quieta = h => (plana ? h.replace(/class="hoja"/g, 'class="hoja plana"') : h);
    const lote = $('col-lote'), der = $('p-der');
    if (enfocado(lote)) pendiente = true; else lote.innerHTML = quieta(vLote());
    if (enfocado(der)) pendiente = true; else der.innerHTML = quieta(VISTAS[ui.der]());
    $('pestanas').innerHTML = TABS.map(([k, n, i]) => bt(`${ic(i)}${n}`, 'ui:der', { der: k }, ui.der === k ? 'on' : '', `aria-pressed="${ui.der === k}"`)).join('');
    const libre = M.estudio(S) && !S.proyecto;
    $('nav').innerHTML = [['lote', ui.lote ? 'Lote' : 'Calle', 'tienda'], ...TABS].map(([k, n, i]) => {
      const on = k === 'lote' ? ui.movil === 'lote' : ui.movil === 'der' && ui.der === k;
      return bt(`${ic(i, 'g')}${n}${k === 'estudio' && libre ? '<span class="punto"></span>' : ''}`, 'ui:tab', { tab: k }, on ? 'on' : '', `aria-current="${on}"`);
    }).join('');
    Escena.seleccion(ui.lote);
  }

  function procesarAvisos() {
    if (!S || ui.capa) return;
    while (S.avisos.length && !ui.capa) {
      const a = S.avisos.shift();
      if (a.tipo === 'rango') capaRango(a.rango);
      else if (a.tipo === 'lanzamiento') capaLanzamiento(a.id);
      else if (a.tipo === 'evento') aviso(a.texto, '', 'rayo');
      else if (a.tipo === 'decision') capaDecision();
      else if (a.tipo === 'dialogo') { ui.dialogo = { id: a.id, i: 0 }; capaDialogo(); }
      else if (a.tipo === 'oferta') { if (S.ofertas.some(o => o.id === a.id)) { ui.oferta = a.id; capaOferta(); } }
      else if (a.tipo === 'capitulo') aviso(`Capítulo ${a.n + 1}: ${D.capitulos[a.n].titulo}`, 'bien', 'estrella');
      else if (a.tipo === 'hito') { const H = D.hitos.find(h => h.id === a.id); aviso(`Hito «${H.nombre}»: +${din(H.premio)}`, 'bien', 'estrella'); }
      else if (a.tipo === 'dia') { aviso(`Cierre del día ${a.dia}: ${a.neto >= 0 ? '+' : ''}${din(a.neto)}`, a.neto >= 0 ? 'bien' : 'mal', 'moneda'); disco.guardar(); }
    }
    if (M.terminal(S) && !ui.capa) capaFinal();
  }
  function despues() { procesarAvisos(); pintar(); if (Interior.abierto) Interior.actualizar(); }

  function bucle(t) {
    const dt = Math.min(250, t - prev || 0);
    prev = t;
    if (S) {
      const ms = MS_HORA / (vel || 1);
      if (vel && !ui.capa && !M.terminal(S)) {
        acc += dt;
        let n = 0;
        while (acc >= ms && n < 3) { acc -= ms; M.tick(S); Escena.ventas(S.ventas); Interior.ventas(S.ventas, ms); n++; }
        if (n === 3) acc = 0;
        if (n) despues();
      }
      Escena.reloj(S.hora + (vel ? acc / ms : 0), ms);
      animarCaja(dt);
    }
    requestAnimationFrame(bucle);
  }

  function iniciar(estado) {
    S = M.migrar(estado);
    if (S.decision) S.avisos.push({ tipo: 'decision' });
    mostrado = S.dinero;
    ultimaNoticia = '';
    Object.assign(ui, { lote: null, der: 'imperio', movil: 'lote', confirma: null, exporta: '', importa: '' });
    Escena.estado(S);
    cerrarCapa();
    vel = 1;
    pintar();
  }

  // ---------- Acciones de interfaz ----------
  const U = {
    vel({ v }) { vel = v; if (v) velAntes = v; },
    lote({ id, enfocar }) { ui.lote = id; ui.movil = 'lote'; if (id && enfocar) Escena.enfocar(id); $('app').querySelector('main').scrollTop = 0; },
    der({ der }) { ui.der = der; ui.movil = 'der'; },
    tab({ tab }) { if (tab === 'lote') ui.movil = 'lote'; else { ui.der = tab; ui.movil = 'der'; } $('app').querySelector('main').scrollTop = 0; },
    confirma({ k }) { ui.confirma = k; },
    cat({ cat }) { ui.form.cat = cat; ui.form.presupuesto = D.categorias[cat].presupuestoRef; },
    nombre() { const [a, b] = NOMBRES[ui.form.cat]; ui.form.nombre = a[Math.floor(Math.random() * a.length)] + ' ' + b[Math.floor(Math.random() * b.length)]; },
    presupuesto({ f }) { const v = ui.form.presupuesto * f, p = Math.pow(10, Math.floor(Math.log10(v)) - 1); ui.form.presupuesto = Math.max(1000, Math.round(v / p) * p); },
    lanzar() {
      if (!ui.form.nombre.trim()) U.nombre();
      const r = M.hacer(S, 'proyecto', { cat: ui.form.cat, nombre: ui.form.nombre, presupuesto: ui.form.presupuesto, mezcla: ui.form.mezcla });
      aviso(r.msg, r.ok ? 'bien' : 'mal', r.ok ? 'foco' : undefined);
      if (r.ok) ui.form.nombre = '';
    },
    guardar() { aviso(disco.guardar() ? 'Partida guardada.' : 'Este navegador no deja guardar. Usa Exportar como texto.', '', 'guardar'); },
    cargar() { const g = disco.leer(); if (g) { iniciar(g); aviso('Partida cargada.', '', 'guardar'); } else aviso('No hay partida guardada en este dispositivo.', 'mal'); },
    exportar() { ui.exporta = JSON.stringify(S); },
    copiar() {
      const sel = () => { const t = $('f-exporta'); if (t) { t.focus(); t.select(); } aviso('Selecciona el texto y cópialo.', ''); };
      try { navigator.clipboard.writeText(ui.exporta).then(() => aviso('Copiado.', 'bien'), sel); } catch (e) { sel(); }
    },
    importar() {
      let g = null;
      try { g = JSON.parse(ui.importa); } catch (e) { /* se avisa abajo */ }
      if (valida(g)) { iniciar(g); disco.guardar(); aviso('Partida importada.', 'bien'); } else aviso('Ese texto no es una partida de Calle Mayor. Cópialo completo desde Exportar.', 'mal');
    },
    nueva() { if (Interior.abierto) Interior.cerrar(); S = null; ui.confirma = null; Escena.estado(null); capaInicio(); },
    continuar() { const g = disco.leer(); if (g) iniciar(g); },
    colorInicio({ c }) { ui.colorInicio = c; document.querySelectorAll('.muestras button').forEach(b => { const on = JSON.parse(b.dataset.args).c === c; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); },
    decidir({ i }) { const r = M.hacer(S, 'decidir', { i }); if (r.ok) { cerrarCapa(); aviso(r.msg, '', 'rayo'); } else aviso(r.msg, 'mal'); },
    modo({ modo }) { ui.inicio.modo = modo; capaInicio(); },
    inicioOpc({ k, v }) { ui.inicio[k] = v; capaInicio(); },
    dialogo({ id }) { ui.dialogo = { id, i: 0 }; capaDialogo(); },
    siguiente() { const n = D.dialogos[ui.dialogo.id].length; if (++ui.dialogo.i < n) capaDialogo(); else { ui.dialogo = null; cerrarCapa(); } },
    elegirFinal({ valor }) { M.hacer(S, 'elegirFinal', { valor }); ui.dialogo = null; cerrarCapa(); },
    oferta({ id }) { ui.oferta = id; capaOferta(); },
    ofertaAcepta({ id }) { const r = M.hacer(S, 'aceptarOferta', { id }); ui.oferta = null; cerrarCapa(); aviso(r.msg, r.ok ? 'bien' : 'mal', 'moneda'); },
    ofertaRegatea({ id }) { const r = M.hacer(S, 'regatear', { id }); aviso(r.msg, r.sigue ? 'bien' : 'mal', 'moneda'); if (r.sigue) capaOferta(); else { ui.oferta = null; cerrarCapa(); } },
    ofertaRechaza({ id }) { M.hacer(S, 'rechazarOferta', { id }); ui.oferta = null; cerrarCapa(); },
    entrar({ id }) { Interior.abrir(S, id, { aviso, despues }); },
    empezar() { const I = ui.inicio; iniciar(M.nueva({ empresa: ($('f-empresa') || {}).value, color: ui.colorInicio, modo: I.modo, dinero: I.dinero, rival: I.rival })); if (I.modo !== 'historia') aviso('Toca un lote vacío de la calle para abrir tu primer puesto.', '', 'tienda'); },
    cerrarCapa() { cerrarCapa(); },
    seguir() { M.hacer(S, 'seguir'); cerrarCapa(); },
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    const a = b.dataset.a, args = JSON.parse(b.dataset.args || '{}');
    if (a !== 'ui:confirma') ui.confirma = null;
    if (a.startsWith('ui:')) U[a.slice(3)](args);
    else {
      const r = M.hacer(S, a, args);
      if (r.msg) aviso(r.msg, r.ok ? 'bien' : 'mal', r.ok && a === 'construir' ? 'tienda' : undefined);
      if (r.ok && a === 'construir' && r.id) { const N = S.negocios.find(n => n.id === r.id); if (N.tipo === 'estudio') { ui.der = 'estudio'; } }
      if (r.ok && a === 'vender') ui.lote = ui.lote; // el lote queda vacío y se muestra para construir otra cosa
    }
    despues();
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'f-nombre') ui.form.nombre = t.value;
    if (t.id === 'f-importa') ui.importa = t.value;
    if (t.id === 'f-empresa') ui.empresa = t.value;
    if (t.dataset.mezcla != null) {
      ui.form.mezcla[+t.dataset.mezcla] = +t.value;
      const tot = ui.form.mezcla.reduce((a, b) => a + b, 0) || 1;
      document.querySelectorAll('[data-pct]').forEach(o => { o.textContent = Math.round(ui.form.mezcla[+o.dataset.pct] / tot * 100) + '%'; });
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'f-empresa') U.empezar();
    if (e.key === ' ' && S && !ui.capa && !e.target.matches('input, textarea, button, canvas')) { e.preventDefault(); U.vel({ v: vel ? 0 : velAntes || 1 }); pintar(); }
  });
  document.addEventListener('pointerdown', e => { if (e.target.closest('main, .barra')) presionando = true; });
  for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => { presionando = false; if (pendiente) setTimeout(pintar); });
  document.addEventListener('focusout', () => { if (pendiente) setTimeout(pintar); });

  $('caja').innerHTML = '<b>$0</b><small></small>';
  $('pan-izq').innerHTML = ic('izq');
  $('pan-der').innerHTML = ic('der');
  $('pan-izq').onclick = () => Escena.desplazar(-1);
  $('int-volver').onclick = () => Interior.cerrar();
  $('int-giro-izq').onclick = () => Interior.girarCamara(-1);
  $('int-giro-der').onclick = () => Interior.girarCamara(1);
  $('int-mas').onclick = () => Interior.acercar(1.2);
  $('int-menos').onclick = () => Interior.acercar(1 / 1.2);
  $('pan-der').onclick = () => Escena.desplazar(1);
  $('etq-noticias').innerHTML = ic('noticias') + 'Al minuto';
  Escena.iniciar($('lienzo'), D, { alSeleccionar: id => { U.lote({ id }); despues(); } });
  window.CalleMayor = { get estado() { return S; } }; // para depurar desde la consola
  capaInicio();
  requestAnimationFrame(bucle);
})();
