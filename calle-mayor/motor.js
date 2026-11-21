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
    if (r === D.rangos.length - 1 && !S.fin) S.fin = 'tycoon';
  }

  // ---- Una hora en un negocio ----
  function simHora(S, N, h) {
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
    const miran = pasan * T.interes * D.curvas[T.curva][h] * mult(S, 'cat:' + T.cat) * (0.5 + N.rep / 100) * (1 + D.marketing[N.mkt].efecto) / rivales * (0.85 + 0.3 * azar(S));
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
      const u = entero(S, C.mercado * S.tendencias[P.cat] * (P.nota / 10) ** 2 * P.hype * ciclo(P.dia) / Math.sqrt(propios) * (0.9 + 0.2 * azar(S)));
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
    if (S.diasRojos >= B.diasQuiebra && !S.fin) S.fin = 'quiebra';
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
    if (c < X.diaInicio || c < R.proximo || R.negocios.length >= X.maxNegocios) return;
    const libres = D.lotes.filter(l => !ocupado(S, l.id)).sort((a, b) => b.trafico - a.trafico);
    const tuyos = S.negocios.map(n => n.tipo);
    const giros = Object.keys(D.negocios).filter(t => ['puesto', 'local'].includes(D.negocios[t].clase) && D.negocios[t].rango <= S.rango && D.negocios[t].costo <= R.dinero * 0.8);
    if (libres.length < X.lotesLibresMin || !giros.length) return;
    const atacar = giros.filter(t => tuyos.includes(t)); // la mitad de las veces abre justo lo que tú vendes
    const t = (atacar.length && azar(S) < 0.5 ? atacar : giros)[Math.floor(azar(S) * (atacar.length && azar(S) < 0.5 ? atacar : giros).length)];
    const L = libres[Math.floor(azar(S) * Math.min(3, libres.length))], T = D.negocios[t];
    R.dinero = r2(R.dinero - T.costo);
    R.negocios.push({ id: 'r' + S.sig++, rival: true, tipo: t, lote: L.id, nivel: 1, emp: Math.max(1, Math.ceil(T.empMax / 2)), precio: r2(T.precioRef * X.descuento), mkt: 1, rep: 50, rojos: 0, hoy: vacio(), ayer: vacio() });
    R.proximo = c + X.cadaDias[0] + Math.floor(azar(S) * (X.cadaDias[1] - X.cadaDias[0] + 1));
    noticia(S, `${X.nombre} abre ${T.nombre.toLowerCase()} en ${L.nombre}${tuyos.includes(t) ? ', justo en tu giro' : ''}.`, 'rival');
    S.avisos.push({ tipo: 'evento', texto: `${X.nombre} abrió ${T.nombre.toLowerCase()} en la calle.` });
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
    S.proximaDecision = S.proximaDecision ?? dia(S) + 3;
    return S;
  }

  function tick(S) {
    if (S.fin === 'quiebra') return;
    migrar(S);
    S.ventas = [];
    for (const N of S.negocios) simHora(S, N, hh(S));
    for (const N of S.rival.negocios) simHora(S, N, hh(S));
    S.hora++;
    if (hh(S) === 0) cierreDia(S);
    actualizarRango(S);
    revisarHitos(S);
  }

  function nueva(o = {}) {
    const S = {
      v: VERSION, rng: (o.semilla ?? Date.now()) | 0, empresa: (o.empresa || '').trim() || 'Mi Empresa',
      hora: D.inicio.hora, dinero: D.inicio.dinero, rango: 0, maxPat: D.inicio.dinero,
      lotes: Object.fromEntries(D.lotes.map(l => [l.id, { propio: false }])), negocios: [],
      eventos: [], noticias: [], tendencias: Object.fromEntries(Object.keys(D.categorias).map(k => [k, 1])),
      bolsa: Object.fromEntries(D.acciones.map(a => [a.id, { precio: a.precio, hist: [a.precio] }])), cartera: {},
      proyecto: null, productos: [], experiencia: {},
      hoy: { ingresos: {}, gastos: {} }, resumen: null, historial: [], avisos: [], ventas: [], diasRojos: 0, sig: 1, fin: null,
      color: D.coloresMarca.includes(o.color) ? o.color : D.coloresMarca[0],
    };
    migrar(S);
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
    seguir(S) { if (S.fin === 'tycoon') S.fin = 'libre'; },
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
    if (S.fin === 'quiebra') return { ok: false, msg: 'La empresa quebró.' };
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
    const sinLinea = planta && S.productos.find(p => p.activo && tipo(planta).sirve.includes(p.cat) && !S.negocios.some(n => n.lineas && n.lineas.includes(p.id)));
    if (!S.negocios.length) consejo = 'Toca un lote vacío de la calle y abre tu primer puesto de limonada.';
    else if (S.dinero < 0) consejo = `Estás en números rojos. Vende algo o recorta personal: en ${B.diasQuiebra - S.diasRojos} días el banco te cierra.`;
    else if (perdiendo) consejo = `${nombreDe(perdiendo)} dejó ir a ${perdiendo.ayer.perdidos} clientes ayer. Contrata o sube de nivel.`;
    else if (malaRep) consejo = `La reputación de ${nombreDe(malaRep)} va en picada. Revisa el precio.`;
    else if (S.rango >= 2 && !estudio(S)) consejo = 'Abre un estudio de producto: ahí diseñas y lanzas tus propias marcas.';
    else if (estudio(S) && !S.proyecto) consejo = 'Tu estudio está libre. Diseña un producto en la pestaña Estudio.';
    else if (planta && sinLinea) consejo = `«${sinLinea.nombre}» se manda a maquilar y tu ${tipo(planta).nombre.toLowerCase()} tiene una línea libre. Asígnasela.`;
    else if (!planta && S.rango >= 2 && S.productos.some(p => p.activo && D.negocios.planta.sirve.includes(p.cat))) consejo = 'Tus bebidas y snacks se maquilan fuera. Con una planta de alimentos cada unidad deja el doble.';
    else if (S.negocios.length < 3) consejo = 'Diversifica: dos puestos iguales en la misma calle se roban clientes.';
    else consejo = 'Sube de nivel lo que más vende y prueba precios: el Insight de cada negocio te dice si vas caro.';
    return { siguiente: sig || null, avance: sig ? clamp((S.maxPat - base) / (sig.min - base) * 100) : 100, consejo };
  }

  return {
    VERSION, lineasActivas, migrar, rivalEn, ocupado, precioCompra, descuentoCadena, mismoGiro, nueva, tick, hacer, objetivo, patrimonio, capacidad, calidad, fijos, costoMejora, nivelMax, precioLote,
    velocidadEstudio, negocioEn, estudio, nombreDe, ciclo, dia, hh, mult, lote,
  };
})();
if (typeof module !== 'undefined') module.exports = Motor;
