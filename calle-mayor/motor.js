// Capa 2: MOTOR. Simulación pura, sin interfaz. Determinista: todo el azar sale de S.rng.
// El estado S es JSON plano. La interfaz lo lee y manda acciones con Motor.hacer(S, accion, args).
const Motor = (function () {
  const D = typeof module !== 'undefined' ? require('./datos.js') : DATOS;
  const B = D.balance;
  const VERSION = 1;
  const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const r2 = x => Math.round(x * 100) / 100;
  const por = (l, id) => l.find(x => x.id === id);
  const suma = o => Object.values(o).reduce((a, b) => a + b, 0);
  const dinero = x => '$' + Math.round(x).toLocaleString('es-MX');

  function azar(S) { // mulberry32
    S.rng = (S.rng + 0x6D2B79F5) | 0;
    let t = S.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function gauss(S) { let u = 0; while (u === 0) u = azar(S); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * azar(S)); }
  const entero = (S, x) => Math.floor(x) + (azar(S) < x - Math.floor(x) ? 1 : 0);

  const dia = S => Math.floor(S.hora / 24) + 1;
  const hh = S => S.hora % 24;
  const tipo = N => D.negocios[N.tipo];
  const lote = id => por(D.lotes, id);
  const negocioEn = (S, id) => S.negocios.find(n => n.lote === id);
  const rivalEn = (S, id) => S.rival.negocios.find(n => n.lote === id);
  const ocupado = (S, id) => negocioEn(S, id) || rivalEn(S, id);
  // Vecindad: los negocios (tuyos o de Ferrán) de los lotes de al lado.
  function vecinosDe(S, loteId) {
    const i = D.lotes.findIndex(l => l.id === loteId);
    return [D.lotes[i - 1], D.lotes[i + 1]].filter(Boolean).map(l => ocupado(S, l.id)).filter(Boolean);
  }
  const coincide = (regla, T, t) => regla === 'tienda' ? ['puesto', 'local'].includes(T.clase) : regla.startsWith('clase:') ? T.clase === regla.slice(6) : regla === T.cat;
  function efectosVecindad(S, loteId, t) { // lista de {efecto, texto, vecino} para un giro t en un lote
    const T = D.negocios[t], out = [];
    if (!['puesto', 'local'].includes(T.clase)) return out;
    for (const V of vecinosDe(S, loteId)) {
      const TV = tipo(V);
      for (const R of D.vecindad) {
        const ok = R.a === 'mismo' ? V.tipo === t : coincide(R.a, T, t) && coincide(R.b, TV, V.tipo);
        if (ok) out.push({ efecto: R.efecto, texto: R.texto, vecino: (V.rival ? D.rival.nombre + ': ' : '') + TV.corto });
      }
    }
    return out;
  }
  const factorVecindad = (S, loteId, t) => clamp(1 + efectosVecindad(S, loteId, t).reduce((s, e) => s + e.efecto, 0), 0.6, 1.5);

  // Anaquel: qué productos tuyos caben en un negocio.
  const anaquelesPara = (S, N) => S.productos.filter(p => p.activo && (D.anaquel.giros[p.cat] || []).includes(tipo(N).cat));

  const mismoGiro = (S, N) => S.negocios.filter(n => n.tipo === N.tipo).length;
  const descuentoCadena = (S, N) => Math.min(D.cadena.maxDescuento, D.cadena.descuentoInsumos * (mismoGiro(S, N) - 1));
  const precioCompra = N => Math.round(tipo(N).costo * (1 + 0.6 * (N.nivel - 1)) * D.rival.sobreprecioCompra);
  const estudio = S => S.negocios.find(n => n.tipo === 'estudio');
  const precioLote = L => L.renta * B.diasLote;
  const capacidad = N => tipo(N).capBase * N.emp * (1 + B.mejoraCap * (N.nivel - 1));
  const calidad = N => clamp(tipo(N).calidad + B.mejoraCalidad * (N.nivel - 1));
  const nivelMax = S => (S.rango >= 3 ? 4 : 3);
  const costoMejora = N => Math.round(tipo(N).costo * B.mejoras[N.nivel]);
  const velocidadEstudio = E => (0.6 + 0.4 * E.emp) * (1 + 0.25 * (E.nivel - 1));
  const ciclo = d => (d < 4 ? (d + 1) / 4 : Math.pow(0.5, (d - 4) / 12)); // vida de un producto en el mercado
  const vacio = () => ({ clientes: 0, perdidos: 0, ingresos: 0, costo: 0, producidas: 0 });
  const nombreDe = N => `${tipo(N).corto} · ${lote(N.lote).corto}`;

  // Líneas de una planta que de verdad trabajan: las primeras asignadas que alcanzan a cubrir los obreros.
  const lineasActivas = N => (tipo(N).clase !== 'fabrica' ? 0 : Math.min(N.lineas.filter(Boolean).length, Math.floor(N.emp / tipo(N).porLinea)));
  function capacidadPropia(S, prodId) { // unidades al día que tus plantas pueden fabricar de un producto
    const cap = [];
    if (S.paro > 0) return cap; // huelga
    for (const N of S.negocios) {
      if (tipo(N).clase !== 'fabrica') continue;
      let k = lineasActivas(N);
      for (const id of N.lineas) if (id && k-- > 0 && id === prodId) cap.push({ N, u: tipo(N).capLinea });
    }
    return cap;
  }
  function fijos(S, N) { // gasto diario fijo de un negocio
    const T = tipo(N);
    const lugar = T.clase === 'puesto' ? T.permiso : S.lotes[N.lote].propio ? 0 : lote(N.lote).renta;
    return lugar + T.sueldo * N.emp + D.marketing[N.mkt].costo + (T.energia || 0) * lineasActivas(N);
  }
  const mult = (S, k) => S.eventos.reduce((m, e) => m * (e.efectos[k] ?? 1), 1);

  // ---- Dinero ----
  function gasto(S, cat, m) { m = r2(m); S.dinero = r2(S.dinero - m); S.hoy.gastos[cat] = r2((S.hoy.gastos[cat] || 0) + m); }
  function ingreso(S, cat, m) { m = r2(m); S.dinero = r2(S.dinero + m); S.hoy.ingresos[cat] = r2((S.hoy.ingresos[cat] || 0) + m); }
  function patrimonio(S) {
    let v = S.dinero;
    for (const N of S.negocios) v += N.invertido * B.valorNegocio;
    for (const L of D.lotes) if (S.lotes[L.id].propio) v += precioLote(L);
    for (const id in S.cartera) v += S.cartera[id].n * S.bolsa[id].precio;
    return r2(v);
  }
  function noticia(S, texto, tag) {
    S.noticias.unshift({ dia: dia(S), texto, tag });
    S.noticias.length = Math.min(S.noticias.length, 14);
  }
  function actualizarRango(S) {
    S.maxPat = Math.max(S.maxPat, patrimonio(S));
    let r = S.rango;
    while (r + 1 < D.rangos.length && S.maxPat >= D.rangos[r + 1].min) r++;
    if (r === S.rango) return;
    S.rango = r;
    S.avisos.push({ tipo: 'rango', rango: r });
    noticia(S, `${S.empresa} asciende a ${D.rangos[r].nombre}.`, 'empresa');
    if (r === D.rangos.length - 1 && !S.fin && S.modo !== 'historia') S.fin = 'tycoon';
  }

  // ---- Interior: la tiendita ----
  const I = D.interior;
  const tamDe = m => { const t = I.muebles[m.tipo].tam; return m.rot ? [t[1], t[0]] : t; };
  function casillas(m) { const [w, h] = tamDe(m), out = []; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push([m.x + i, m.y + j]); return out; }
  const casillasPuerta = () => I.puerta.flatMap(x => [[x, I.fondo - 1], [x, I.fondo - 2]]);
  function cuadricula(muebles) {
    const g = Array.from({ length: I.fondo }, () => Array(I.ancho).fill(null));
    for (const m of muebles) for (const [x, y] of casillas(m)) if (g[y] && x >= 0 && x < I.ancho) g[y][x] = m.id;
    return g;
  }
  function alcanzables(muebles) { // casillas libres a las que se llega caminando desde la puerta
    const g = cuadricula(muebles), vis = new Set(), cola = I.puerta.map(x => [x, I.fondo - 1]).filter(([x, y]) => !g[y][x]);
    for (const [x, y] of cola) vis.add(x + ',' + y);
    while (cola.length) {
      const [x, y] = cola.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= I.ancho || ny >= I.fondo || g[ny][nx] || vis.has(nx + ',' + ny)) continue;
        vis.add(nx + ',' + ny);
        cola.push([nx, ny]);
      }
    }
    return vis;
  }
  function accesible(m, vis) { // la caja se atiende por enfrente; lo demás, desde cualquier lado
    if (m.tipo === 'caja') return casillas(m).some(([x, y]) => vis.has(x + ',' + (y + 1)));
    return casillas(m).some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => vis.has((x + dx) + ',' + (y + dy))));
  }
  const capMueble = m => { const X = I.muebles[m.tipo]; return m.nivel > 1 && X.mejora ? X.mejora.capacidad : X.capacidad; };
  const capCaja = m => (m.nivel > 1 ? I.muebles.caja.mejora.cap : I.muebles.caja.cap);
  function estadoInterior(N) { // lo que el acomodo significa en números
    const In = N.interior, vis = alcanzables(In.muebles), ok = In.muebles.filter(m => accesible(m, vis));
    const cajas = ok.filter(m => m.tipo === 'caja'), cajeros = Math.min(In.cajeros, cajas.length);
    const ocupadas = In.muebles.reduce((t, m) => t + casillas(m).length, 0), libre = 1 - ocupadas / (I.ancho * I.fondo);
    const apretado = libre < I.apretado;
    const cap = cajas.map(capCaja).sort((a, b) => b - a).slice(0, cajeros).reduce((a, b) => a + b, 0) * (apretado ? 0.8 : 1);
    return { vis, ok, cajas: cajas.length, cajeros, cap, apretado, libre, decor: ok.filter(m => m.tipo === 'planta').length, bloqueados: In.muebles.length - ok.length };
  }
  function reponer(N, unidades) { // de la bodega a los anaqueles, primero lo más vacío
    const In = N.interior;
    let mov = 0;
    for (const m of In.muebles.filter(x => x.prod).sort((a, b) => a.stock / capMueble(a) - b.stock / capMueble(b))) {
      const q = Math.min(capMueble(m) - m.stock, In.bodega[m.prod] || 0, unidades - mov);
      if (q > 0) { m.stock += q; In.bodega[m.prod] -= q; mov += q; }
      if (mov >= unidades) break;
    }
    return mov;
  }
  const enBodega = In => Object.values(In.bodega).reduce((a, b) => a + b, 0);
  function entregarPedidos(S, N) { // el pedido automático llega de noche: se completa la bodega hasta lo que pediste
    const In = N.interior, Q = I.calidades[In.calidad];
    let costo = 0;
    for (const k in In.pedidos) {
      const q = Math.max(0, Math.min(In.pedidos[k] - In.bodega[k], I.bodega - enBodega(In)));
      if (!q) continue;
      In.bodega[k] += q;
      costo += q * I.productos[k].costo * Q.costo;
    }
    if (costo) { gasto(S, 'mercancia', costo); N.hoy.costo = r2(N.hoy.costo + costo); }
  }
  function nuevoInterior() {
    const In = { muebles: [], bodega: {}, pedidos: {}, precios: {}, calidad: 'normal', cajeros: 1, reponedores: 1, sig: 1 };
    for (const k in I.productos) { In.precios[k] = I.productos[k].precioRef; In.bodega[k] = 0; In.pedidos[k] = 0; }
    for (const m of I.inicial) {
      In.muebles.push({ id: 'm' + In.sig++, tipo: m.tipo, x: m.x, y: m.y, rot: m.rot, nivel: 1, prod: m.prod || null, stock: 0 });
      if (m.prod) In.pedidos[m.prod] = 120;
    }
    return In;
  }
  function lugarInvalido(In, m, ignorar) { // null si el mueble cabe ahí sin bloquear a nadie
    const otros = In.muebles.filter(x => x.id !== ignorar);
    for (const [x, y] of casillas(m)) {
      if (x < 0 || y < 0 || x >= I.ancho || y >= I.fondo) return 'No cabe ahí.';
      if (casillasPuerta().some(([px, py]) => px === x && py === y)) return 'Hay que dejar libre la entrada.';
      if (otros.some(o => casillas(o).some(([ox, oy]) => ox === x && oy === y))) return 'Ese lugar ya está ocupado.';
    }
    const antes = alcanzables(otros), despues = alcanzables([...otros, m]);
    if (!accesible(m, despues)) return m.tipo === 'caja' ? 'La caja necesita espacio libre enfrente para la fila.' : 'Nadie podría llegar a ese mueble.';
    if (otros.some(o => accesible(o, antes) && !accesible(o, despues))) return 'Así bloquearías el paso a otro mueble.';
    return null;
  }
  function anaquelPropio(S, N, v) { // tu producto en tu mostrador: algunos clientes se lo llevan también
    const P = !N.rival && N.anaquel && S.productos.find(p => p.id === N.anaquel && p.activo);
    if (!P || !v) return;
    const C = D.categorias[P.cat], q = entero(S, v * D.anaquel.tasa * P.nota / 10);
    // shortcut: si una planta lo fabrica se cobra el costo propio aunque sus líneas estén llenas; separar inventario cuando exista el almacén
    const cuP = capacidadPropia(S, P.id).length ? C.propio : C.costo, margen = r2(q * (C.precio * D.anaquel.sobreprecio - cuP));
    if (!q) return;
    ingreso(S, 'productos', margen);
    P.tiendaHoy = (P.tiendaHoy || 0) + q; P.tienda = (P.tienda || 0) + q; P.ganado = r2(P.ganado + margen);
    N.hoy.anaquel = (N.hoy.anaquel || 0) + q; N.hoy.anaquelMonto = r2((N.hoy.anaquelMonto || 0) + margen);
  }
  const DEMANDA_TOTAL = Object.values(I.productos).reduce((t, p) => t + p.demanda, 0);
  function simTienda(S, N, h) {
    const T = tipo(N), L = lote(N.lote), In = N.interior, Q = I.calidades[In.calidad];
    if (In.reponedores && h >= T.horario[0] - 2 && h < T.horario[1]) reponer(N, In.reponedores * I.reponerHora); // reponen desde antes de abrir
    if (h < T.horario[0] || h >= T.horario[1]) return;
    const E = estadoInterior(N), mios = S.negocios.filter(n => n.tipo === N.tipo).length;
    const pasan = D.trafico[h] * L.trafico * mult(S, 'trafico');
    const miran = pasan * T.interes * D.curvas[T.curva][h] * mult(S, 'cat:' + T.cat) * factorVecindad(S, N.lote, N.tipo) * (0.5 + N.rep / 100) * (1 + D.marketing[N.mkt].efecto) / Math.pow(mios, 0.6) * (0.85 + 0.3 * azar(S));
    const dem = entero(S, miran), v = Math.min(dem, entero(S, E.cap));
    let monto = 0, quieren = 0, vendidos = 0, puntosPrecio = 0, falto = null;
    for (const k in I.productos) {
      const P = I.productos[k], r = In.precios[k] / P.precioRef - Q.acepta;
      puntosPrecio += clamp(100 - Math.max(0, r - 0.9) * 150) * P.demanda / DEMANDA_TOTAL;
      const q = entero(S, v * I.itemsPorCliente * P.demanda / DEMANDA_TOTAL * (r <= 1 ? 1 + (1 - r) * 0.8 : Math.max(0, 1 - (r - 1) * 1.4)));
      if (!q) continue;
      const estantes = E.ok.filter(m => m.prod === k), venta = Math.min(q, estantes.reduce((t, m) => t + m.stock, 0));
      let resta = venta;
      for (const m of estantes) { const d = Math.min(m.stock, resta); m.stock -= d; resta -= d; }
      quieren += q; vendidos += venta; monto += venta * In.precios[k];
      if (venta < q && (!falto || q - venta > falto.n)) falto = { prod: k, n: q - venta };
    }
    monto = r2(monto);
    N.hoy.clientes += v; N.hoy.perdidos += dem - v; N.hoy.sinProducto = (N.hoy.sinProducto || 0) + quieren - vendidos;
    N.hoy.ingresos = r2(N.hoy.ingresos + monto);
    ingreso(S, 'ventas', monto);
    if (v) S.ventas.push({ lote: N.lote, n: v, monto, falto: falto && falto.prod });
    anaquelPropio(S, N, v);
    if (dem) {
      const meta = 0.25 * puntosPrecio + 0.3 * (v / dem) * 100 + 0.25 * (quieren ? vendidos / quieren : 1) * 100 + 0.2 * calidad(N) + Math.min(3, E.decor) * D.interior.muebles.planta.decor + Q.rep;
      N.rep = clamp(N.rep + (meta - N.rep) * B.repVel);
    }
  }

  // ---- Una hora en un negocio ----
  function simHora(S, N, h) {
    if (N.interior) return simTienda(S, N, h);
    const T = tipo(N), L = lote(N.lote);
    if (T.clase === 'estudio' || T.clase === 'fabrica' || h < T.horario[0] || h >= T.horario[1]) return;
    const pasan = D.trafico[h] * L.trafico * mult(S, 'trafico');
    const mios = S.negocios.filter(n => n.tipo === N.tipo), suyos = S.rival.negocios.filter(n => n.tipo === N.tipo);
    const otros = N.rival ? mios : suyos; // contra el otro bando pesa el precio: el más barato se lleva más
    const peso = otros.reduce((s, o) => s + clamp(N.precio / o.precio, 0.6, 1.7), 0);
    const rivales = Math.pow((N.rival ? suyos : mios).length + peso, 0.6);
    const r = N.precio / T.precioRef;
    const cu = T.costoUnidad * mult(S, 'insumos') * (N.rival ? 1 : 1 - descuentoCadena(S, N));
    const fPrecio = r <= 1 ? 1 + (1 - r) * 0.8 : Math.max(0, 1 - (r - 1) * 1.4); // barato vende más; caro espanta
    const miran = pasan * T.interes * D.curvas[T.curva][h] * mult(S, 'cat:' + T.cat) * factorVecindad(S, N.lote, N.tipo) * (0.5 + N.rep / 100) * (1 + D.marketing[N.mkt].efecto) / rivales * (0.85 + 0.3 * azar(S));
    const dem = entero(S, miran * fPrecio);
    const v = Math.min(dem, entero(S, capacidad(N)));
    const monto = r2(v * N.precio);
    N.hoy.clientes += v;
    N.hoy.perdidos += dem - v;
    N.hoy.ingresos = r2(N.hoy.ingresos + monto);
    N.hoy.costo = r2(N.hoy.costo + v * cu);
    if (N.rival) S.rival.dinero = r2(S.rival.dinero + monto - v * cu);
    else { ingreso(S, 'ventas', monto); gasto(S, 'insumos', v * cu); }
    if (v) S.ventas.push({ lote: N.lote, n: v, monto, rival: !!N.rival });
    anaquelPropio(S, N, v);
    if (miran >= 0.5) { // la reputación se acerca poco a poco a lo que vivió quien se asomó esta hora
      const precio = clamp(100 - Math.max(0, r - 0.9) * 150);
      const fama = N.rival ? 0 : Math.min(3, mios.length - 1) * D.cadena.rep; // la cadena comparte fama
      const meta = 0.35 * precio + 0.35 * (dem ? v / dem : 0) * 100 + 0.3 * calidad(N) + fama;
      N.rep = clamp(N.rep + (meta - N.rep) * B.repVel);
    }
  }

  function lanzar(S) {
    const P = S.proyecto, C = D.categorias[P.cat];
    const ajuste = clamp(1 - P.mezcla.reduce((s, x, i) => s + Math.abs(x - C.ideal[i]), 0) * 1.2, 0.2, 1);
    const fondos = clamp(0.75 + 0.25 * Math.log2(P.presupuesto / C.presupuestoRef), 0.3, 1.15);
    const oficio = Math.min(0.2, 0.04 * (S.experiencia[P.cat] || 0));
    const nota = clamp(Math.round(100 * ajuste * fondos * (1 + oficio) * (0.9 + 0.2 * azar(S))) / 10, 1, 10);
    S.experiencia[P.cat] = (S.experiencia[P.cat] || 0) + 1;
    const prod = { id: 'p' + S.sig++, nombre: P.nombre, cat: P.cat, nota, hype: 0.6 + 1.2 * P.mezcla[2], dia: 0, activo: true, unidades: 0, ganado: 0, costo: P.presupuesto, lanzado: dia(S), hist: [] };
    S.productos.unshift(prod);
    S.proyecto = null;
    S.avisos.push({ tipo: 'lanzamiento', id: prod.id });
    noticia(S, `La prensa califica con ${nota.toFixed(1)} a «${prod.nombre}», ${C.nombre.toLowerCase()} de ${S.empresa}.`, 'empresa');
  }

  function cierreDia(S) {
    const c = dia(S) - 1;
    const E = estudio(S);
    if (S.proyecto && E) {
      S.proyecto.avance = r2(S.proyecto.avance + velocidadEstudio(E));
      if (S.proyecto.avance >= S.proyecto.dias) lanzar(S);
    }
    for (const P of S.productos.filter(p => p.activo)) {
      const C = D.categorias[P.cat], propios = S.productos.filter(p => p.activo && p.cat === P.cat).length;
      const fama = 1 + D.anaquel.fama * Math.min(1, (P.tiendaAyer || 0) / D.anaquel.porCada); // verlo en tus tiendas lo da a conocer
      P.tiendaAyer = P.tiendaHoy || 0;
      P.tiendaHoy = 0;
      const u = entero(S, C.mercado * S.tendencias[P.cat] * (P.nota / 10) ** 2 * P.hype * ciclo(P.dia) * fama / Math.sqrt(propios) * (0.9 + 0.2 * azar(S)));
      // Lo que cabe en tus plantas sale con el costo propio; el resto se manda a maquilar.
      const lineas = capacidadPropia(S, P.id), cap = lineas.reduce((s, l) => s + l.u, 0), hechas = Math.min(u, cap);
      for (const l of lineas) { const q = hechas * l.u / cap; l.N.hoy.producidas += q; l.N.hoy.ingresos = r2(l.N.hoy.ingresos + q * (C.costo - C.propio)); }
      const m = r2((hechas ? hechas * (C.precio - C.propio) : 0) + (u - hechas) * (C.precio - C.costo)); // las categorías digitales no tienen costo propio
      ingreso(S, 'productos', m);
      P.propias = (P.propias || 0) + hechas;
      P.unidades += u;
      P.ganado = r2(P.ganado + m);
      P.hist.push(m);
      if (P.hist.length > 60) P.hist.shift();
      P.dia++;
      if (ciclo(P.dia) < 0.05) {
        P.activo = false;
        noticia(S, `«${P.nombre}» sale de los anaqueles tras vender ${P.unidades.toLocaleString('es-MX')} unidades.`, 'empresa');
        for (const N of S.negocios) if (N.anaquel === P.id) N.anaquel = null;
        for (const N of S.negocios) if (N.lineas && N.lineas.includes(P.id)) {
          N.lineas = N.lineas.map(id => (id === P.id ? null : id));
          S.avisos.push({ tipo: 'evento', texto: `Una línea de ${tipo(N).nombre.toLowerCase()} quedó libre.` });
        }
      }
    }
    for (const N of S.negocios) {
      const T = tipo(N);
      if (T.clase === 'puesto') gasto(S, 'permisos', T.permiso);
      else if (!S.lotes[N.lote].propio) gasto(S, 'renta', lote(N.lote).renta);
      gasto(S, 'sueldos', T.sueldo * N.emp);
      if (N.mkt) gasto(S, 'marketing', D.marketing[N.mkt].costo);
      if (T.energia) gasto(S, 'energia', T.energia * lineasActivas(N));
      if (N.interior) entregarPedidos(S, N);
      N.hoy.producidas = Math.round(N.hoy.producidas);
      N.hoy.utilidad = r2(N.hoy.ingresos - N.hoy.costo - fijos(S, N));
      N.hist.push(N.hoy.utilidad);
      if (N.hist.length > 14) N.hist.shift();
      N.ayer = N.hoy;
      N.hoy = vacio();
    }
    if (S.paro > 0) S.paro--;
    for (const p of S.pagos) { gasto(S, 'compromisos', p.monto); p.dias--; }
    S.pagos = S.pagos.filter(p => p.dias > 0);
    cierreRival(S, c);
    if (!S.decision && c >= S.proximaDecision) {
      const ops = D.decisiones.filter(d => (d.rango ?? 0) <= S.rango && cumple(S, d.requiere));
      if (ops.length) {
        S.decision = ops[Math.floor(azar(S) * ops.length)].id;
        S.proximaDecision = c + 4 + Math.floor(azar(S) * 4);
        S.avisos.push({ tipo: 'decision' });
      }
    }
    for (const k in S.tendencias) S.tendencias[k] = r2(clamp(S.tendencias[k] * Math.exp(0.06 * gauss(S)) + (1 - S.tendencias[k]) * 0.04, 0.5, 1.8));
    const choque = S.eventos.reduce((s, e) => s + (e.efectos.bolsa || 0), 0);
    for (const A of D.acciones) {
      const s = S.bolsa[A.id];
      s.precio = Math.max(0.5, r2(s.precio * Math.exp(A.deriva - A.vol * A.vol / 2 + A.vol * gauss(S) + choque * A.beta)));
      s.hist.push(s.precio);
      if (s.hist.length > 60) s.hist.shift();
    }
    S.eventos = S.eventos.filter(e => e.fin > c);
    if (azar(S) < B.probEvento) {
      const ops = D.eventos.filter(e => !S.eventos.some(x => x.id === e.id) && (e.rango ?? 0) <= S.rango);
      if (ops.length) {
        const ev = ops[Math.floor(azar(S) * ops.length)];
        let texto = ev.texto;
        if (ev.id === 'moda') {
          const cats = Object.keys(D.categorias), k = cats[Math.floor(azar(S) * cats.length)];
          S.tendencias[k] = r2(clamp(S.tendencias[k] * 1.4, 0.5, 1.8));
          texto = texto.replace('{cat}', D.categorias[k].nombre.toLowerCase());
        }
        S.eventos.push({ id: ev.id, titulo: ev.titulo, fin: c + ev.dias, efectos: { ...ev.efectos } });
        noticia(S, `${ev.titulo}: ${texto}`, ev.tag);
        S.avisos.push({ tipo: 'evento', texto: ev.titulo });
      }
    }
    S.diasRojos = S.dinero < 0 ? S.diasRojos + 1 : 0;
    if (S.diasRojos === 1 && !S.vistos.banco) { S.vistos.banco = true; S.avisos.push({ tipo: 'dialogo', id: 'banco-rojo' }); }
    if (S.diasRojos === 0) S.vistos.banco = false;
    if (S.diasRojos >= plazoQuiebra(S) && !S.fin) {
      const quedan = vendibles(S);
      S.fin = quedan.length <= 1 ? 'comprado' : 'quiebra';
      S.finalId = S.fin;
      if (S.fin === 'comprado' && quedan[0] && ['puesto', 'local'].includes(tipo(quedan[0]).clase) && !tipo(quedan[0]).interior) { // Ferrán se queda tu último negocio
        const N = quedan[0];
        S.negocios = S.negocios.filter(n => n !== N);
        S.rival.negocios.push({ ...N, id: 'r' + S.sig++, rival: true, rojos: 0, hoy: vacio() });
      }
      noticia(S, D.finales[S.fin].titulo + '.', 'empresa');
    }
    if (!S.fin) generarOfertas(S, c);
    const pat = patrimonio(S);
    S.historial.push({ dia: c, pat, dinero: S.dinero });
    if (S.historial.length > 120) S.historial.shift();
    const operativos = Object.entries(S.hoy.gastos).filter(([k]) => k !== 'inversion').reduce((s, [, v]) => s + v, 0);
    S.resumen = { dia: c, ingresos: S.hoy.ingresos, gastos: S.hoy.gastos, neto: r2(suma(S.hoy.ingresos) - operativos) };
    S.avisos.push({ tipo: 'dia', dia: c, neto: S.resumen.neto });
    S.hoy = { ingresos: {}, gastos: {} };
  }

  // ---- Rival: Grupo Ferrán ----
  function cierreRival(S, c) {
    const R = S.rival, X = D.rival;
    R.dinero = r2(R.dinero + X.apoyo + X.apoyoPorRango * S.rango);
    for (const N of [...R.negocios]) {
      const T = tipo(N), fijo = (T.clase === 'puesto' ? T.permiso : lote(N.lote).renta) + T.sueldo * N.emp + D.marketing[N.mkt].costo;
      R.dinero = r2(R.dinero - fijo);
      const util = N.hoy.ingresos - N.hoy.costo - fijo;
      N.rojos = util < 0 ? N.rojos + 1 : 0;
      // reacciona: si tú vendes lo mismo más barato, baja; si su fama cae, sube hacia el precio de la zona
      const tuyo = S.negocios.filter(n => n.tipo === N.tipo).map(n => n.precio);
      if (tuyo.length && Math.min(...tuyo) < N.precio) N.precio = r2(Math.max(T.precioRef * 0.75, N.precio * 0.95));
      else if (N.rep < 40) N.precio = r2(Math.min(T.precioRef, N.precio * 1.04));
      if (N.hoy.perdidos > N.hoy.clientes * 0.2 && N.emp < T.empMax) N.emp++;
      if (N.nivel < 3 && R.dinero > costoMejora(N) * 2) { R.dinero = r2(R.dinero - costoMejora(N)); N.nivel++; }
      N.ayer = N.hoy;
      N.hoy = vacio();
      if (N.rojos >= X.diasRojosCierre || R.dinero < -2000) {
        R.negocios = R.negocios.filter(n => n !== N);
        R.cerrados++;
        R.dinero = r2(R.dinero + T.costo * 0.3);
        noticia(S, `${X.nombre} cierra su ${T.nombre.toLowerCase()} en ${lote(N.lote).nombre}.`, 'rival');
        S.avisos.push({ tipo: 'evento', texto: `${X.nombre} cerró un negocio: el lote quedó libre.` });
      }
    }
    if (!S.rivalActivo || (S.modo === 'historia' && S.capitulo < 2) || (S.modo !== 'historia' && c < X.diaInicio) || c < R.proximo || R.negocios.length >= X.maxNegocios) return;
    const libres = D.lotes.filter(l => !ocupado(S, l.id)).sort((a, b) => b.trafico - a.trafico);
    const tuyos = S.negocios.map(n => n.tipo);
    const giros = Object.keys(D.negocios).filter(t => ['puesto', 'local'].includes(D.negocios[t].clase) && !D.negocios[t].interior && D.negocios[t].rango <= S.rango && D.negocios[t].costo <= R.dinero * 0.8);
    if (libres.length < X.lotesLibresMin || !giros.length) return;
    const atacar = giros.filter(t => tuyos.includes(t)); // la mitad de las veces abre justo lo que tú vendes
    const lista = atacar.length && azar(S) < 0.5 ? atacar : giros; // se elige la lista una sola vez
    const t = lista[Math.floor(azar(S) * lista.length)];
    const L = libres[Math.floor(azar(S) * Math.min(3, libres.length))], T = D.negocios[t];
    R.dinero = r2(R.dinero - T.costo);
    R.negocios.push({ id: 'r' + S.sig++, rival: true, tipo: t, lote: L.id, nivel: 1, emp: Math.max(1, Math.ceil(T.empMax / 2)), precio: r2(T.precioRef * X.descuento), mkt: 1, rep: 50, rojos: 0, hoy: vacio(), ayer: vacio() });
    R.proximo = c + X.cadaDias[0] + Math.floor(azar(S) * (X.cadaDias[1] - X.cadaDias[0] + 1));
    noticia(S, `${X.nombre} abre ${T.nombre.toLowerCase()} en ${L.nombre}${tuyos.includes(t) ? ', justo en tu giro' : ''}.`, 'rival');
    if (!S.vistos.ferran && S.modo !== 'historia') { S.vistos.ferran = true; S.avisos.push({ tipo: 'dialogo', id: 'ferran-llega' }); }
    S.avisos.push({ tipo: 'evento', texto: `${X.nombre} abrió ${T.nombre.toLowerCase()} en la calle.` });
  }

  // ---- Ofertas de compra ----
  const vendibles = S => S.negocios.filter(n => ['puesto', 'local', 'fabrica'].includes(tipo(n).clase));
  const plazoQuiebra = S => D.quiebra.diasBase + Math.min(D.quiebra.maxExtra, D.quiebra.diasPorNegocio * Math.max(0, vendibles(S).length - 1));
  const terminal = S => ['quiebra', 'comprado', 'final'].includes(S.fin);
  function generarOfertas(S, c) {
    const O = D.ofertas;
    S.ofertas = S.ofertas.filter(o => o.vence > c && S.negocios.some(n => n.id === o.negocio));
    const libres = vendibles(S).filter(n => !S.ofertas.some(o => o.negocio === n.id));
    if (!libres.length || S.ofertas.length >= O.maxAbiertas) return;
    let N, factor, motivo;
    if (S.dinero < 0 && azar(S) < O.probRojo) { // en rojo: compran barato y cada día más barato
      const top = [...libres].sort((a, b) => b.invertido - a.invertido).slice(0, 2);
      N = top[Math.floor(azar(S) * top.length)];
      factor = Math.max(O.piso, O.inicio - O.baja * (S.diasRojos - 1));
      motivo = 'rojo';
    } else if (S.dinero >= 0 && libres.length >= 2 && azar(S) < O.probPremio) { // te va bien: alguien quiere tu mejor negocio
      N = [...libres].sort((a, b) => (b.ayer.utilidad || 0) - (a.ayer.utilidad || 0))[0];
      factor = O.premio[0] + azar(S) * (O.premio[1] - O.premio[0]);
      motivo = 'premio';
    } else return;
    const precio = Math.round(N.invertido * factor);
    const puedeFerran = S.rival.negocios.length < D.rival.maxNegocios + 2 && S.rival.dinero >= precio && ['puesto', 'local'].includes(tipo(N).clase) && !tipo(N).interior && S.rivalActivo;
    const comprador = puedeFerran && (motivo === 'rojo' || azar(S) < 0.5) ? 'ferran' : 'vega';
    const o = { id: 'o' + S.sig++, negocio: N.id, comprador, precio, vence: c + O.dias, regateo: false, motivo };
    S.ofertas.push(o);
    S.avisos.push({ tipo: 'oferta', id: o.id });
  }

  // ---- Historia ----
  const CAPITULOS = {
    carrito: S => S.negocios.length >= 1 && S.maxPat >= 1000,
    local: S => S.negocios.some(n => tipo(n).clase === 'local'),
    ferran: S => S.rival.cerrados + S.rival.comprados >= 1,
    marca: S => S.productos.some(p => p.nota >= 7.5),
    planta: S => S.negocios.some(n => tipo(n).clase === 'fabrica') && S.productos.reduce((t, p) => t + (p.propias || 0), 0) >= 5000,
    oferta: S => S.rango >= 3,
    calle: S => S.rival.negocios.length === 0 && S.rival.cerrados + S.rival.comprados >= 3 && S.maxPat >= 500000,
  };
  function avanzarHistoria(S) {
    if (S.modo !== 'historia' || S.fin || S.esperando) return;
    const C = D.capitulos[S.capitulo];
    if (!C || !CAPITULOS[C.id](S)) return;
    if (C.cierre) S.avisos.push({ tipo: 'dialogo', id: C.cierre });
    if (C.id === 'oferta') { S.esperando = 'final'; return; } // el diálogo de cierre trae la elección del final
    if (C.id === 'calle') { terminarHistoria(S, 'calle'); return; }
    S.capitulo++;
    const N = D.capitulos[S.capitulo];
    S.avisos.push({ tipo: 'capitulo', n: S.capitulo });
    if (N.intro) S.avisos.push({ tipo: 'dialogo', id: N.intro });
    if (N.id === 'ferran') S.rival.proximo = Math.min(S.rival.proximo, dia(S) - 1); // Ferrán llega con el capítulo
  }
  function terminarHistoria(S, id) {
    S.fin = 'final';
    S.finalId = id;
    if (id === 'vendido') ingreso(S, 'ventaActivos', patrimonio(S) * 0.5); // Vega paga 1.5× el patrimonio
    noticia(S, D.finales[id].titulo + '.', 'empresa');
  }

  // ---- Decisiones ----
  function cumple(S, req) {
    if (!req) return true;
    return req.some(r => r === 'rival' ? S.rival.negocios.length > 0
      : r.startsWith('tipo:') ? S.negocios.some(n => n.tipo === r.slice(5))
      : r.startsWith('clase:') ? S.negocios.some(n => tipo(n).clase === r.slice(6)) : false);
  }
  function aplicar(S, e) { // devuelve el texto del resultado si el efecto lo cambia (por azar)
    if (e.dinero > 0) ingreso(S, 'decisiones', e.dinero);
    if (e.dinero < 0) gasto(S, 'decisiones', -e.dinero);
    if (e.dineroPct) ingreso(S, 'decisiones', Math.max(500, patrimonio(S) * e.dineroPct));
    if (e.rep) for (const N of S.negocios) N.rep = clamp(N.rep + e.rep);
    if (e.evento) S.eventos.push({ id: 'dec' + S.sig++, titulo: e.evento.titulo, fin: dia(S) - 1 + e.evento.dias, efectos: { ...e.evento.efectos } });
    if (e.pagos) S.pagos.push({ monto: e.pagos.base, dias: e.pagos.dias }); // la base la calcula decidir() con el patrimonio de ese momento
    if (e.paro) S.paro = e.paro;
    if (e.rivalPausa) S.rival.proximo = Math.max(S.rival.proximo, dia(S) - 1 + e.rivalPausa);
    if (e.rivalDinero) S.rival.dinero = r2(S.rival.dinero + e.rivalDinero);
    if (e.quitaEmpleado) { const N = [...S.negocios].filter(n => n.emp > 1 && ['puesto', 'local'].includes(tipo(n).clase)).sort((a, b) => b.emp - a.emp)[0]; if (N) N.emp--; }
    if (e.azar) { const rama = azar(S) < e.azar.prob ? e.azar.si : e.azar.no; aplicar(S, rama); return rama.resultado; }
    return null;
  }

  // ---- Hitos ----
  const CHEQUEOS = {
    'primer-negocio': S => S.negocios.length >= 1,
    'tres-negocios': S => S.negocios.length >= 3,
    'primer-local': S => S.negocios.some(n => tipo(n).clase === 'local'),
    'dia-mil': S => S.resumen && S.resumen.neto >= 1000,
    terreno: S => Object.values(S.lotes).some(l => l.propio),
    cadena: S => S.negocios.some(n => ['puesto', 'local'].includes(tipo(n).clase) && mismoGiro(S, n) >= 3),
    'gana-rival': S => S.rival.cerrados + S.rival.comprados >= 1,
    'nota-ocho': S => S.productos.some(p => p.nota >= 8),
    planta: S => S.negocios.some(n => tipo(n).clase === 'fabrica'),
    'diez-mil': S => S.productos.some(p => p.unidades >= 10000),
    'calle-llena': S => S.negocios.length >= 8,
    'sin-rival': S => S.rival.cerrados + S.rival.comprados >= 3 && !S.rival.negocios.length,
  };
  function revisarHitos(S) {
    for (const H of D.hitos) {
      if (S.hitos[H.id] || !CHEQUEOS[H.id](S)) continue;
      S.hitos[H.id] = dia(S);
      ingreso(S, 'hitos', H.premio);
      S.avisos.push({ tipo: 'hito', id: H.id });
    }
  }

  // Partidas guardadas antes de la Fase 2 reciben lo que les falta.
  function migrar(S) {
    S.rival = S.rival || { dinero: D.rival.dineroInicial, negocios: [], proximo: D.rival.diaInicio, cerrados: 0, comprados: 0 };
    S.color = S.color || D.coloresMarca[0];
    S.hitos = S.hitos || {};
    S.pagos = S.pagos || [];
    S.paro = S.paro || 0;
    S.decision = S.decision || null;
    S.modo = S.modo === 'historia' ? 'historia' : 'sandbox';
    S.capitulo = S.capitulo || 0;
    S.ofertas = S.ofertas || [];
    S.vistos = S.vistos || {};
    S.rivalActivo = S.rivalActivo ?? true;
    S.esperando = S.esperando || null;
    S.proximaDecision = S.proximaDecision ?? dia(S) + 3;
    return S;
  }

  function tick(S) {
    if (terminal(S)) return;
    migrar(S);
    S.ventas = [];
    for (const N of S.negocios) simHora(S, N, hh(S));
    for (const N of S.rival.negocios) simHora(S, N, hh(S));
    S.hora++;
    if (hh(S) === 0) cierreDia(S);
    actualizarRango(S);
    revisarHitos(S);
    avanzarHistoria(S);
  }

  function nueva(o = {}) {
    const S = {
      v: VERSION, rng: (o.semilla ?? Date.now()) | 0, empresa: (o.empresa || '').trim() || 'Mi Empresa',
      hora: D.inicio.hora, dinero: o.modo === 'sandbox' && D.modos.sandbox.dineros.includes(o.dinero) ? o.dinero : D.inicio.dinero, rango: 0, maxPat: 0,
      lotes: Object.fromEntries(D.lotes.map(l => [l.id, { propio: false }])), negocios: [],
      eventos: [], noticias: [], tendencias: Object.fromEntries(Object.keys(D.categorias).map(k => [k, 1])),
      bolsa: Object.fromEntries(D.acciones.map(a => [a.id, { precio: a.precio, hist: [a.precio] }])), cartera: {},
      proyecto: null, productos: [], experiencia: {},
      hoy: { ingresos: {}, gastos: {} }, resumen: null, historial: [], avisos: [], ventas: [], diasRojos: 0, sig: 1, fin: null,
      color: D.coloresMarca.includes(o.color) ? o.color : D.coloresMarca[0],
      modo: o.modo === 'historia' ? 'historia' : 'sandbox', rivalActivo: o.rival !== false,
    };
    S.maxPat = S.dinero;
    migrar(S);
    actualizarRango(S); // en sandbox con mucho dinero se arranca con el rango que toca
    S.avisos = S.avisos.filter(a => a.tipo !== 'rango');
    if (S.modo === 'historia') S.avisos.push({ tipo: 'dialogo', id: 'cap1' });
    noticia(S, `${S.empresa} llega a Calle Mayor con ${dinero(S.dinero)} y un sueño.`, 'empresa');
    return S;
  }

  // ---- Acciones: devuelven un texto si fallan, o nada / {msg} si salen bien ----
  const pagar = (S, cat, m) => (S.dinero < m ? `Te faltan ${dinero(m - S.dinero)}.` : void gasto(S, cat, m));
  const negocio = (S, id) => por(S.negocios, id);
  const A = {
    construir(S, { lote: id, tipo: t }) {
      const T = D.negocios[t], L = lote(id);
      if (!T || !L) return 'No existe.';
      if (ocupado(S, id)) return rivalEn(S, id) ? `Ese lote es de ${D.rival.nombre}. Puedes comprárselo.` : 'Ese lote ya está ocupado.';
      if (T.rango > S.rango) return `Se desbloquea al llegar a ${D.rangos[T.rango].nombre}.`;
      if (t === 'estudio' && estudio(S)) return 'Ya tienes un estudio.';
      const e = pagar(S, 'inversion', T.costo);
      if (e) return e;
      const N = { id: 'n' + S.sig++, tipo: t, lote: id, nivel: 1, emp: T.porLinea || 1, precio: T.precioRef, mkt: 0, rep: 50, invertido: T.costo, hoy: vacio(), ayer: vacio(), hist: [] };
      if (T.clase === 'fabrica') N.lineas = [null];
      if (T.interior) {
        N.interior = nuevoInterior();
        N.emp = N.interior.cajeros + N.interior.reponedores;
        entregarPedidos(S, N);
        reponer(N, 1e9);
      }
      S.negocios.push(N);
      noticia(S, `Abre ${T.nombre.toLowerCase()} en ${L.nombre}.`, 'calle');
      return { msg: `Abriste ${T.nombre.toLowerCase()}.`, id: N.id };
    },
    mejorar(S, { id }) {
      const N = negocio(S, id);
      if (N.nivel >= nivelMax(S)) return N.nivel >= 4 ? 'Ya está al máximo.' : 'El nivel 4 se desbloquea al llegar a Magnate.';
      const costo = costoMejora(N), e = pagar(S, 'inversion', costo);
      if (e) return e;
      N.nivel++;
      N.invertido += costo;
      if (N.lineas) N.lineas.push(null); // en una planta, cada nivel es una línea más
      return { msg: `${nombreDe(N)} sube a nivel ${N.nivel}.` };
    },
    empleados(S, { id, cambio }) {
      const N = negocio(S, id), n = N.emp + cambio;
      if (n < 1) return 'Siempre hace falta alguien atendiendo.';
      if (n > tipo(N).empMax) return 'No cabe más gente en este negocio.';
      N.emp = n;
    },
    linea(S, { id, i, prod }) { // qué fabrica cada línea de una planta; prod null la apaga
      const N = negocio(S, id), T = tipo(N);
      if (!N.lineas || !(i >= 0 && i < N.lineas.length)) return 'Esa línea no existe.';
      if (prod) {
        const P = por(S.productos, prod);
        if (!P || !P.activo) return 'Ese producto ya no está a la venta.';
        if (!T.sirve.includes(P.cat)) return `Esta planta no fabrica ${D.categorias[P.cat].nombre.toLowerCase()}.`;
      }
      N.lineas[i] = prod || null;
    },
    mueble(S, { id, tipo: t, x, y, rot }) {
      const N = negocio(S, id), In = N && N.interior, X = I.muebles[t];
      if (!In || !X) return 'Aquí no se pueden poner muebles.';
      const m = { id: 'm' + In.sig, tipo: t, x, y, rot: rot ? 1 : 0, nivel: 1, prod: null, stock: 0 };
      const malo = lugarInvalido(In, m);
      if (malo) return malo;
      const e = pagar(S, 'inversion', X.costo);
      if (e) return e;
      In.sig++;
      In.muebles.push(m);
      N.invertido += X.costo;
      return { msg: `${X.nombre} instalado.`, mid: m.id };
    },
    moverMueble(S, { id, mid, x, y, rot }) {
      const In = negocio(S, id).interior, m = por(In.muebles, mid);
      if (!m) return 'Ese mueble ya no está.';
      const nuevo = { ...m, x, y, rot: rot ? 1 : 0 }, malo = lugarInvalido(In, nuevo, mid);
      if (malo) return malo;
      Object.assign(m, { x, y, rot: nuevo.rot });
    },
    venderMueble(S, { id, mid }) {
      const N = negocio(S, id), In = N.interior, m = por(In.muebles, mid), X = m && I.muebles[m.tipo];
      if (!m) return 'Ese mueble ya no está.';
      if (m.prod) In.bodega[m.prod] += m.stock;
      In.muebles = In.muebles.filter(x => x !== m);
      const vuelve = X.costo * B.valorNegocio;
      ingreso(S, 'ventaActivos', vuelve);
      N.invertido = Math.max(0, N.invertido - X.costo);
      return { msg: `Vendiste ${X.nombre.toLowerCase()} por ${dinero(vuelve)}.` };
    },
    mejorarMueble(S, { id, mid }) {
      const N = negocio(S, id), m = por(N.interior.muebles, mid), X = m && I.muebles[m.tipo];
      if (!X || !X.mejora || m.nivel > 1) return 'No tiene mejora.';
      const e = pagar(S, 'inversion', X.mejora.costo);
      if (e) return e;
      m.nivel = 2;
      N.invertido += X.mejora.costo;
      return { msg: `Ahora es ${X.mejora.nombre.toLowerCase()}.` };
    },
    surtir(S, { id, mid, prod }) { // qué producto exhibe un anaquel o refri
      const In = negocio(S, id).interior, m = por(In.muebles, mid), X = m && I.muebles[m.tipo];
      if (!X || !X.para) return 'Ese mueble no exhibe productos.';
      if (prod && I.productos[prod].para !== X.para) return X.para === 'frio' ? 'En el refri solo van bebidas.' : 'Las bebidas van en el refri.';
      if (m.prod) In.bodega[m.prod] += m.stock;
      m.prod = prod || null;
      m.stock = 0;
      if (prod && !In.pedidos[prod]) In.pedidos[prod] = 120;
    },
    pedido(S, { id, prod, objetivo }) { negocio(S, id).interior.pedidos[prod] = clamp(Math.round(objetivo), 0, I.bodega); },
    pedirYa(S, { id, prod, cant }) {
      const N = negocio(S, id), In = N.interior, q = Math.min(cant, I.bodega - enBodega(In));
      if (q <= 0) return 'La bodega está llena.';
      const costo = q * I.productos[prod].costo * I.calidades[In.calidad].costo * I.express, e = pagar(S, 'mercancia', costo);
      if (e) return e;
      In.bodega[prod] += q;
      N.hoy.costo = r2(N.hoy.costo + costo);
      return { msg: `Llegaron ${q} de ${I.productos[prod].nombre.toLowerCase()} por ${dinero(costo)}.` };
    },
    reponerYa(S, { id }) {
      const q = reponer(negocio(S, id), 1e9);
      return q ? { msg: `Acomodaste ${q} piezas en los anaqueles.` } : 'No hay nada en bodega para acomodar, o los anaqueles están llenos.';
    },
    personalTienda(S, { id, rol, cambio }) {
      const N = negocio(S, id), In = N.interior, n = In[rol] + cambio;
      if (!['cajeros', 'reponedores'].includes(rol)) return 'No válido.';
      if (n < (rol === 'cajeros' ? 1 : 0)) return rol === 'cajeros' ? 'Alguien tiene que cobrar.' : 'Ya no hay reponedores.';
      if (In.cajeros + In.reponedores + cambio > tipo(N).empMax) return 'No cabe más gente en este local.';
      In[rol] = n;
      N.emp = In.cajeros + In.reponedores;
    },
    calidadSurtido(S, { id, nivel }) { if (!I.calidades[nivel]) return 'No válido.'; negocio(S, id).interior.calidad = nivel; },
    precioTienda(S, { id, prod, valor }) { if (!(valor >= 0.05)) return 'Precio no válido.'; negocio(S, id).interior.precios[prod] = r2(valor); },
    anaquel(S, { id, prod }) { // qué producto tuyo se vende en el mostrador de este negocio; prod null lo vacía
      const N = negocio(S, id);
      if (prod && !anaquelesPara(S, N).some(p => p.id === prod)) return 'Ese producto no cabe en este negocio.';
      N.anaquel = prod || null;
    },
    precio(S, { id, valor }) { if (!(valor >= 0.1)) return 'Precio no válido.'; negocio(S, id).precio = r2(valor); },
    marketing(S, { id, nivel }) { if (!D.marketing[nivel]) return 'No válido.'; negocio(S, id).mkt = nivel; },
    vender(S, { id }) {
      const N = negocio(S, id);
      if (N.tipo === 'estudio' && S.proyecto) S.proyecto = null; // el proyecto a medias se pierde
      ingreso(S, 'ventaActivos', N.invertido * B.valorNegocio);
      S.negocios = S.negocios.filter(n => n !== N);
      return { msg: `Vendiste ${nombreDe(N)} por ${dinero(N.invertido * B.valorNegocio)}.` };
    },
    comprarLote(S, { lote: id }) {
      if (S.rango < 1) return 'Se desbloquea al llegar a Comerciante.';
      if (S.lotes[id].propio) return 'Ya es tuyo.';
      const e = pagar(S, 'inversion', precioLote(lote(id)));
      if (e) return e;
      S.lotes[id].propio = true;
      return { msg: `Compraste ${lote(id).nombre}. Ya no pagas renta ahí.` };
    },
    venderLote(S, { lote: id }) {
      if (!S.lotes[id].propio) return 'No es tuyo.';
      S.lotes[id].propio = false;
      ingreso(S, 'ventaActivos', precioLote(lote(id)) * B.reventaLote);
    },
    proyecto(S, { cat, nombre, presupuesto, mezcla }) {
      const C = D.categorias[cat];
      if (!estudio(S)) return 'Necesitas un estudio de producto.';
      if (S.proyecto) return 'Tu estudio ya está desarrollando algo.';
      if (!C || C.rango > S.rango) return 'Esa categoría todavía no está a tu alcance.';
      const total = mezcla.reduce((a, b) => a + b, 0);
      if (!(total > 0) || mezcla.some(x => x < 0)) return 'Reparte el presupuesto.';
      if (!(presupuesto >= 1000)) return 'El presupuesto mínimo es $1,000.';
      const e = pagar(S, 'inversion', presupuesto);
      if (e) return e;
      S.proyecto = { cat, nombre: (nombre || '').trim().slice(0, 28) || 'Sin nombre', presupuesto, mezcla: mezcla.map(x => x / total), avance: 0, dias: C.dias };
      return { msg: `Arranca el desarrollo de «${S.proyecto.nombre}».` };
    },
    comprarAccion(S, { id, n }) {
      if (S.rango < 2) return 'La bolsa se desbloquea al llegar a Empresario.';
      const p = S.bolsa[id].precio, e = pagar(S, 'inversion', n * p * (1 + B.comision));
      if (e) return e;
      const c = S.cartera[id] || (S.cartera[id] = { n: 0, costo: 0 });
      c.n += n;
      c.costo = r2(c.costo + n * p);
    },
    venderAccion(S, { id, n }) {
      const c = S.cartera[id];
      if (!c || c.n < n) return 'No tienes tantas acciones.';
      ingreso(S, 'ventaActivos', n * S.bolsa[id].precio * (1 - B.comision));
      c.costo = r2(c.costo * (1 - n / c.n));
      c.n -= n;
      if (!c.n) delete S.cartera[id];
    },
    seguir(S) { // después de un final bueno o de llegar a Tycoon, la partida sigue como sandbox
      if (S.fin === 'tycoon' || (S.fin === 'final' && D.finales[S.finalId].tipo !== 'derrota')) { S.fin = 'libre'; S.modo = 'sandbox'; }
    },
    elegirFinal(S, { valor }) {
      if (S.esperando !== 'final') return 'Todavía no es momento de decidir.';
      S.esperando = null;
      if (valor !== 'calle') { terminarHistoria(S, valor); return; }
      S.capitulo++;
      S.avisos.push({ tipo: 'capitulo', n: S.capitulo });
      S.avisos.push({ tipo: 'dialogo', id: 'cap7' });
      S.rival.dinero = r2(S.rival.dinero + 60000); // Ferrán consigue más socios para la pelea final
    },
    aceptarOferta(S, { id }) {
      const o = por(S.ofertas, id), N = o && negocio(S, o.negocio);
      if (!o || !N) return 'Esa oferta ya no está en la mesa.';
      ingreso(S, 'ventaActivos', o.precio);
      S.negocios = S.negocios.filter(n => n !== N);
      if (N.tipo === 'estudio') S.proyecto = null;
      S.ofertas = S.ofertas.filter(x => x !== o);
      const C = D.compradores[o.comprador];
      if (o.comprador === 'ferran') {
        S.rival.dinero = r2(S.rival.dinero - o.precio);
        S.rival.negocios.push({ ...N, id: 'r' + S.sig++, rival: true, mkt: 1, rojos: 0, hoy: vacio(), ayer: vacio() });
      }
      noticia(S, `${C.nombre} compra el ${tipo(N).nombre.toLowerCase()} de ${S.empresa} en ${lote(N.lote).nombre}.`, 'empresa');
      return { msg: `Vendiste ${nombreDe(N)} a ${C.nombre} por ${dinero(o.precio)}.` };
    },
    regatear(S, { id }) {
      const o = por(S.ofertas, id);
      if (!o) return 'Esa oferta ya no está en la mesa.';
      if (o.regateo) return 'Ya regateaste esta oferta.';
      o.regateo = true;
      if (azar(S) < D.ofertas.probRegatear) { o.precio = Math.round(o.precio * (1 + D.ofertas.regatear)); return { msg: `Aceptan: ahora ofrecen ${dinero(o.precio)}.`, sigue: true }; }
      S.ofertas = S.ofertas.filter(x => x !== o);
      return { msg: 'Se levantan de la mesa. La oferta se cayó.', sigue: false };
    },
    rechazarOferta(S, { id }) { S.ofertas = S.ofertas.filter(o => o.id !== id); },
    adquirir(S, { id }) { // comprarle un negocio al rival, con todo y su fama
      const R = S.rival, N = por(R.negocios, id);
      if (!N) return 'Ese negocio ya no es de Ferrán.';
      const precio = precioCompra(N), e = pagar(S, 'inversion', precio);
      if (e) return e;
      R.negocios = R.negocios.filter(n => n !== N);
      R.comprados++;
      R.dinero = r2(R.dinero + precio * 0.5);
      const M = { id: 'n' + S.sig++, tipo: N.tipo, lote: N.lote, nivel: N.nivel, emp: N.emp, precio: N.precio, mkt: 0, rep: N.rep, invertido: precio, hoy: vacio(), ayer: N.ayer, hist: [] };
      S.negocios.push(M);
      noticia(S, `${S.empresa} compra el ${tipo(N).nombre.toLowerCase()} de ${D.rival.nombre} en ${lote(N.lote).nombre}.`, 'empresa');
      return { msg: `Ahora es tuyo: ${tipo(N).nombre.toLowerCase()} en ${lote(N.lote).nombre}.`, id: M.id };
    },
    decidir(S, { i }) {
      const d = por(D.decisiones, S.decision), o = d && d.opciones[i];
      if (!o) return 'No hay nada que decidir.';
      if (o.efectos.dinero < 0 && S.dinero < -o.efectos.dinero) return `Te faltan ${dinero(-o.efectos.dinero - S.dinero)} para esa opción.`;
      const efectos = { ...o.efectos };
      if (efectos.pagos) efectos.pagos = { base: r2(Math.max(500, patrimonio(S) * 0.2) * 1.35 / efectos.pagos.dias), dias: efectos.pagos.dias };
      const resultado = aplicar(S, efectos) || o.resultado;
      S.decision = null;
      noticia(S, `${d.titulo}: ${resultado}`, 'empresa');
      return { msg: resultado };
    },
    color(S, { c }) { if (!D.coloresMarca.includes(c)) return 'Color no válido.'; S.color = c; },
  };
  function hacer(S, accion, args) {
    migrar(S);
    if (terminal(S) && accion !== 'seguir') return { ok: false, msg: 'La partida terminó.' };
    const r = A[accion](S, args || {});
    actualizarRango(S);
    revisarHitos(S);
    return typeof r === 'string' ? { ok: false, msg: r } : { ok: true, ...r };
  }

  // Qué conviene hacer ahora: meta de rango y un consejo concreto.
  function objetivo(S) {
    const sig = D.rangos[S.rango + 1], base = D.rangos[S.rango].min;
    const util = n => tipo(n).clase !== 'estudio' && tipo(n).clase !== 'fabrica';
    const perdiendo = S.negocios.find(n => util(n) && n.ayer.perdidos > 8 && n.ayer.perdidos > n.ayer.clientes * 0.2);
    const malaRep = S.negocios.find(n => util(n) && n.rep < 40);
    let consejo;
    const planta = S.negocios.find(n => n.lineas && n.lineas.includes(null));
    const sinAnaquel = S.negocios.find(n => !n.anaquel && anaquelesPara(S, n).length);
    const vacia = S.negocios.find(n => n.interior && n.ayer.sinProducto > 20);
    const sinLinea = planta && S.productos.find(p => p.activo && tipo(planta).sirve.includes(p.cat) && !S.negocios.some(n => n.lineas && n.lineas.includes(p.id)));
    if (!S.negocios.length) consejo = 'Toca un lote vacío de la calle y abre tu primer puesto de limonada.';
    else if (S.dinero < 0) consejo = `Estás en números rojos. Recorta personal o acepta alguna oferta: en ${plazoQuiebra(S) - S.diasRojos} días el banco cierra tu cuenta.`;
    else if (vacia) consejo = `En ${nombreDe(vacia)} se quedaron ${vacia.ayer.sinProducto} pedidos sin producto ayer. Sube tus pedidos o pon un reponedor.`;
    else if (perdiendo) consejo = perdiendo.interior ? `${nombreDe(perdiendo)} dejó ir a ${perdiendo.ayer.perdidos} clientes ayer: faltan cajas o cajeros.` : `${nombreDe(perdiendo)} dejó ir a ${perdiendo.ayer.perdidos} clientes ayer. Contrata o sube de nivel.`;
    else if (malaRep) consejo = `La reputación de ${nombreDe(malaRep)} va en picada. Revisa el precio.`;
    else if (S.rango >= 2 && !estudio(S)) consejo = 'Abre un estudio de producto: ahí diseñas y lanzas tus propias marcas.';
    else if (estudio(S) && !S.proyecto) consejo = 'Tu estudio está libre. Diseña un producto en la pestaña Estudio.';
    else if (sinAnaquel) consejo = `${nombreDe(sinAnaquel)} podría vender tus productos en su mostrador. Ponlos en su anaquel.`;
    else if (planta && sinLinea) consejo = `«${sinLinea.nombre}» se manda a maquilar y tu ${tipo(planta).nombre.toLowerCase()} tiene una línea libre. Asígnasela.`;
    else if (!planta && S.rango >= 2 && S.productos.some(p => p.activo && D.negocios.planta.sirve.includes(p.cat))) consejo = 'Tus bebidas y snacks se maquilan fuera. Con una planta de alimentos cada unidad deja el doble.';
    else if (S.negocios.length < 3) consejo = 'Diversifica: dos puestos iguales en la misma calle se roban clientes.';
    else consejo = 'Sube de nivel lo que más vende y prueba precios: el Insight de cada negocio te dice si vas caro.';
    return { siguiente: sig || null, avance: sig ? clamp((S.maxPat - base) / (sig.min - base) * 100) : 100, consejo };
  }

  return {
    VERSION, estadoInterior, casillas, capMueble, capCaja, lugarInvalido, enBodega, efectosVecindad, factorVecindad, anaquelesPara, lineasActivas, migrar, plazoQuiebra, terminal, vendibles, rivalEn, ocupado, precioCompra, descuentoCadena, mismoGiro, nueva, tick, hacer, objetivo, patrimonio, capacidad, calidad, fijos, costoMejora, nivelMax, precioLote,
    velocidadEstudio, negocioEn, estudio, nombreDe, ciclo, dia, hh, mult, lote,
  };
})();
if (typeof module !== 'undefined') module.exports = Motor;
