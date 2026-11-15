// Capa 2: MOTOR. Simulación pura, sin interfaz. Determinista: el azar sale de S.rng (semilla).
// El estado S es JSON plano; la interfaz solo lo lee y manda acciones con Motor.hacer().
const Motor = (function () {
  const D = typeof module !== 'undefined' ? require('./datos.js') : DATOS;
  const B = D.balance;
  const VERSION = 2;
  const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
  const por = (lista, id) => lista.find(x => x.id === id);
  const r2 = x => Math.round(x * 100) / 100;

  function azar(S) { // mulberry32
    S.rng = (S.rng + 0x6D2B79F5) | 0;
    let t = S.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const entero = (S, x) => Math.floor(x) + (azar(S) < x - Math.floor(x) ? 1 : 0);

  const dia = S => Math.floor(S.hora / 24) + 1;
  const hh = S => S.hora % 24;
  const dif = S => D.dificultades[S.dificultad];
  const tipoDe = N => por(D.negocios, N.tipo);
  const localDe = N => por(D.locales, N.local);
  const distDe = id => por(D.distritos, id);
  const distritoDe = N => distDe(localDe(N).distrito);
  const negocio = (S, id) => por(S.negocios, id);
  const enTurno = (t, h) => { const T = por(D.turnos, t); return T.de < T.a ? h >= T.de && h < T.a : h >= T.de || h < T.a; };
  const rendimiento = S => (['energia', 'hambre', 'animo'].some(k => S.jugador[k] <= 0) ? B.rendimientoBajo : 1);
  const rentaDe = (S, N) => Math.round(localDe(N).renta * distritoDe(N).renta * dif(S).costos);
  const hoyVacio = () => ({ ingresos: 0, costo: 0, clientes: 0, atendidos: 0, demanda: 0, vendidos: 0, horas: 0, cubiertas: 0, servicio: 0, limEquipo: 0, limStaff: 0, nuevos: 0, bajas: 0 });

  function lugar(S, id) {
    if (id === 'casa') return { ...por(D.departamentos, S.jugador.depto), id, tipo: 'casa' };
    for (const [tipo, lista] of [['empleo', D.empleos], ['proveedor', D.proveedores], ['local', D.locales]]) {
      const x = por(lista, id);
      if (x) return { ...x, tipo };
    }
  }
  const lugares = S => ['casa', ...D.empleos.map(x => x.id), ...D.proveedores.map(x => x.id), ...D.locales.map(x => x.id)].map(id => lugar(S, id));
  const viaje = (S, a) => (lugar(S, S.jugador.lugar).distrito === lugar(S, a).distrito ? B.viaje.mismo : B.viaje.otro);
  const cargaUsada = S => Object.values(S.jugador.carga).reduce((a, b) => a + b, 0);

  // ---- Muebles y productos ----
  const capMueble = (N, m) => (N.muebles[m] || 0) * D.muebles[m].capacidad;
  // El negocio rinde lo que su mueble más corto: una caja no sirve sin estantes y al revés.
  const cuello = N => tipoDe(N).muebles.reduce((a, m) => (capMueble(N, m) < capMueble(N, a) ? m : a));
  const capacidad = N => capMueble(N, cuello(N));
  const numMuebles = N => Object.values(N.muebles).reduce((a, b) => a + b, 0);
  const valorMuebles = N => Object.entries(N.muebles).reduce((s, [m, n]) => s + n * D.muebles[m].costo, 0);
  const muebleDe = cat => Object.keys(D.muebles).find(m => D.muebles[m].cats?.includes(cat));
  const exhibe = (N, cat) => N.muebles[muebleDe(cat)] > 0;
  // Muebles que este negocio puede comprar: los suyos y, si vende mercancía, cualquier exhibidor.
  const mueblesPosibles = N => [...new Set([...tipoDe(N).muebles, ...(tipoDe(N).modelo === 'inventario' ? Object.keys(D.muebles).filter(m => D.muebles[m].cats) : [])])];
  const catalogo = () => Object.keys(D.productos).filter(p => muebleDe(D.productos[p].cat));

  // ---- Dinero ----
  const DEDUCIBLE = ['renta', 'servicios', 'salarios', 'mercancia', 'marketing', 'intereses', 'equipo', 'viajes'];
  function gasto(S, cat, m) {
    m = r2(m);
    S.dinero = r2(S.dinero - m);
    S.hoy.gastos[cat] = r2((S.hoy.gastos[cat] || 0) + m);
    if (DEDUCIBLE.includes(cat)) S.periodo.gastos += m;
  }
  function ingreso(S, m, gravado = true) {
    S.dinero = r2(S.dinero + m);
    S.hoy.ingresos = r2(S.hoy.ingresos + m);
    if (gravado) S.periodo.ingresos += m;
  }
  const deuda = S => S.prestamos.reduce((s, p) => s + p.saldo, 0);
  function patrimonio(S) {
    let v = S.dinero - deuda(S) - (S.impuesto ? S.impuesto.monto : 0);
    for (const N of S.negocios) {
      v += valorMuebles(N) * B.valorEquipo;
      for (const p in N.stock) v += N.stock[p] * D.productos[p].costo;
    }
    return r2(v);
  }
  function limitePrestamo(S) {
    const P = B.prestamo;
    const rep = S.negocios.length ? S.negocios.reduce((s, n) => s + n.reputacion, 0) / S.negocios.length : 0;
    return Math.max(0, Math.floor((P.base + Math.max(0, patrimonio(S)) * P.patrimonio + rep * P.reputacion - deuda(S)) / 100) * 100);
  }
  // Embargo: se llevan mercancía (a costo) y luego muebles (a precio de reventa) hasta cubrir el monto.
  function embargar(S, monto) {
    let rec = 0;
    for (const N of S.negocios) for (const p in N.stock) {
      const n = Math.min(N.stock[p], Math.ceil((monto - rec) / D.productos[p].costo));
      if (n > 0) { N.stock[p] -= n; rec += n * D.productos[p].costo; }
    }
    for (const N of S.negocios) for (const m in N.muebles) {
      const v = D.muebles[m].costo * B.reventaEquipo;
      const n = Math.min(N.muebles[m], Math.ceil((monto - rec) / v));
      if (n > 0) { N.muebles[m] -= n; rec += n * v; }
    }
    return r2(Math.min(rec, monto));
  }

  // ---- Clientes y precios ----
  const ratioPrecio = (N, pid) => N.precios[pid] / (D.productos[pid].mercado * distritoDe(N).precio);
  // Fracción de compra: sobre el mercado cae hasta 0; por debajo compran un poco más.
  const compra = r => (r <= 1 ? Math.min(1.5, 1 + (1 - r) * B.elasticidad) : clamp(1 - (r - 1) / B.toleranciaPrecio, 0, 1));
  const puntosPrecio = r => clamp(100 - ((r - 0.9) / 0.6) * 100);
  const precioScore = N => (N.productos.length ? N.productos.reduce((s, p) => s + puntosPrecio(ratioPrecio(N, p)), 0) / N.productos.length : 100);
  const atractivo = (S, N) => (0.5 + N.reputacion / 100) * (1 + B.mktEfecto * N.marketing / 100) * (1 + B.interiorEfecto * N.interior) * dif(S).demanda;

  // ---- Empleados ----
  const trabaja = (e, d) => d >= e.inicia && !e.capacita && e.dias[(d - 1) % 7];
  const diasSemana = e => e.dias.filter(Boolean).length;
  function violaciones(e) { // condiciones del empleado que hoy no se cumplen
    const v = [];
    if (diasSemana(e) > D.jornadas[e.jornada].maxDias) v.push(`Aceptó máximo ${D.jornadas[e.jornada].maxDias} días por semana.`);
    if (e.demandas.includes('finesLibres') && (e.dias[5] || e.dias[6])) v.push('Pidió fines de semana libres.');
    return v;
  }
  function personal(S, N, h) {
    const d = dia(S), J = S.jugador;
    const gente = S.empleados.filter(e => e.negocio === N.id && trabaja(e, d) && enTurno(e.turno, h)).map(e => e.hab);
    if (J.lugar === N.local && !J.durmiendo && !J.ocupado && !J.enEmpleo) { // el dueño atiende si está en el local
      const r = rendimiento(S);
      gente.push({ servicio: B.habJugador * r, limpieza: 0, factor: r });
      J.trabajando = true;
    }
    return gente;
  }
  function candidato(S) {
    const hab = { servicio: Math.round(10 + azar(S) * 50), limpieza: Math.round(10 + azar(S) * 50) };
    const turnos = D.turnos.filter(() => azar(S) < 0.6).map(t => t.id);
    if (!turnos.length) turnos.push(D.turnos[Math.floor(azar(S) * D.turnos.length)].id);
    return {
      id: 'c' + S.sig++, nombre: D.nombres[Math.floor(azar(S) * D.nombres.length)], hab, turnos,
      jornada: azar(S) < 0.5 ? 'medio' : 'completo', demandas: azar(S) < 0.4 ? ['finesLibres'] : [],
      sueldo: r2(B.sueldoBase + (hab.servicio + hab.limpieza) * B.sueldoHab), expira: dia(S) + B.candidatoDias,
    };
  }

  function simHora(S, N, h) {
    const T = tipoDe(N), L = localDe(N), Dt = distDe(L.distrito), y = N.hoy, capEq = capacidad(N);
    if (h < N.abre || h >= N.cierra || !capEq) return;
    const gente = personal(S, N, h);
    const cap = gente.reduce((s, p) => s + T.velocidad * (0.6 + p.servicio / 100) * (p.factor ?? 1), 0);
    const habMedia = gente.length ? gente.reduce((s, p) => s + p.servicio, 0) / gente.length : 0;
    let serv = gente.length ? 70 + 0.3 * habMedia : 0;
    N.limpieza = clamp(N.limpieza + gente.reduce((s, p) => s + p.limpieza, 0) * B.limpiezaHora);
    y.horas++;
    if (gente.length) y.cubiertas++;
    if (T.modelo === 'membresia') {
      N.limpieza = clamp(N.limpieza - N.miembros * B.suciedadMiembro);
      y.servicio += serv;
      return;
    }
    const clientes = entero(S, T.clientesBase * T.curva[h] * Dt.trafico * L.trafico * atractivo(S, N) * (0.85 + 0.3 * azar(S)));
    const at = Math.min(clientes, Math.floor(cap), capEq);
    if (at < clientes) { if (capEq <= cap) y.limEquipo++; else y.limStaff++; }
    let dem = 0, ven = 0;
    for (const pid of N.productos) {
      const P = D.productos[pid], giro = T.productos.includes(pid) ? 1 : B.fueraDeGiro;
      const d = entero(S, at * P.peso * Dt.demanda[P.cat] * giro * compra(ratioPrecio(N, pid)));
      const v = Math.min(d, N.stock[pid] || 0);
      N.stock[pid] = (N.stock[pid] || 0) - v;
      dem += d; ven += v;
      y.costo = r2(y.costo + v * P.costo);
      y.ingresos = r2(y.ingresos + v * N.precios[pid]);
      ingreso(S, v * N.precios[pid]);
    }
    y.clientes += clientes; y.atendidos += at; y.demanda += dem; y.vendidos += ven;
    S.ventas += ven;
    N.limpieza = clamp(N.limpieza - at * B.suciedadCliente);
    if (clientes) { // la reputación se acerca poco a poco a la calidad de esta hora
      serv *= at / clientes;
      const w = B.pesosRep;
      const obj = w.servicio * serv + w.precio * precioScore(N) + w.limpieza * N.limpieza + w.stock * (dem ? ven / dem * 100 : 100) + N.interior * 3;
      N.reputacion = clamp(N.reputacion + (obj - N.reputacion) * B.repVel);
    }
    y.servicio += serv;
  }

  function cierreMembresia(S, N) {
    const T = tipoDe(N), L = localDe(N), Dt = distDe(L.distrito), y = N.hoy, w = B.pesosRep, pid = N.productos[0];
    const cap = capacidad(N);
    const serv = y.horas ? y.servicio / y.horas : 0;
    const espacio = cap ? clamp(100 - Math.max(0, N.miembros / cap - 0.8) * 250) : 0; // incomoda arriba de 80% de ocupación
    const calidad = clamp(w.servicio * serv + w.precio * precioScore(N) + w.limpieza * N.limpieza + w.stock * espacio + N.interior * 3);
    const bajas = entero(S, N.miembros * (B.membresia.bajaBase + B.membresia.bajaMax * (1 - calidad / 100)));
    const interesados = T.clientesBase * Dt.trafico * L.trafico * Dt.demanda[D.productos[pid].cat] * atractivo(S, N) * (y.cubiertas / 12) * (0.85 + 0.3 * azar(S));
    const nuevos = Math.min(entero(S, interesados * compra(ratioPrecio(N, pid))), Math.max(0, cap - N.miembros + bajas));
    N.miembros += nuevos - bajas;
    y.nuevos = nuevos; y.bajas = bajas; y.clientes = N.miembros;
    const cobro = r2(N.miembros * N.precios[pid] / 7);
    y.ingresos = cobro;
    ingreso(S, cobro);
    S.ventas += nuevos;
    if (y.horas) N.reputacion = clamp(N.reputacion + (calidad - N.reputacion) * B.repVel * 10);
  }

  function diagnosticar(S, N, problemas) {
    const T = tipoDe(N), y = N.hoy, p = (t, s) => problemas.push({ t: `${N.nombre}: ${t}`, s });
    const corto = D.muebles[cuello(N)].nombre.toLowerCase();
    if (!capacidad(N)) return p('no puede abrir, le faltan muebles.', `Compra ${corto} en Negocios › Local.`);
    if (y.horas > y.cubiertas) p(`${y.horas - y.cubiertas} h abierto sin nadie que atendiera.`, 'Contrata personal para ese turno y esos días, quédate en el local o recorta el horario.');
    if (T.modelo === 'inventario') {
      if (y.demanda && y.vendidos < y.demanda * 0.85) p(`faltó mercancía, ${y.demanda - y.vendidos} ventas perdidas.`, 'Reabastece antes de abrir: compra con el proveedor y descarga en el local.');
      if (y.clientes && y.atendidos < y.clientes * 0.85) {
        if (y.limEquipo > y.limStaff) p('filas largas, los muebles no dan abasto.', `Lo que te limita es ${corto}: compra más.`);
        else p('filas largas, falta personal.', 'Contrata a alguien más o capacita en servicio a quien ya tienes.');
      }
    } else if (N.miembros >= capacidad(N) * 0.9) p('está casi lleno.', `Para aceptar más socios compra ${corto}.`);
    if (N.limpieza < 40) p('está sucio.', 'Limpia tú mismo desde el Mapa o contrata a alguien con buena limpieza.');
    if (precioScore(N) < 50) p('los precios están muy por encima del mercado.', 'Baja precios hacia el sugerido; los clientes se están yendo sin comprar.');
  }

  function cierreDia(S) {
    const c = dia(S) - 1, J = S.jugador, k = dif(S).costos, problemas = [], Sat = B.satisfaccion;
    for (const N of S.negocios) {
      const T = tipoDe(N);
      if (T.modelo === 'membresia') cierreMembresia(S, N);
      else for (const p in N.stock) if (D.productos[p].merma) N.stock[p] = Math.floor(N.stock[p] * (1 - D.productos[p].merma));
      gasto(S, 'renta', rentaDe(S, N));
      gasto(S, 'servicios', T.servicios * k);
      if (N.marketing) gasto(S, 'marketing', N.marketing);
      diagnosticar(S, N, problemas);
      N.ayer = N.hoy;
      N.hoy = hoyVacio();
    }
    for (const e of [...S.empleados]) {
      if (c < e.inicia) continue;
      if (e.dias[(c - 1) % 7]) gasto(S, 'salarios', e.sueldo * B.horasTurno);
      if (e.capacita && c >= e.capacita.hasta) {
        e.hab[e.capacita.hab] = clamp(e.hab[e.capacita.hab] + B.capacitar.mejora);
        e.sueldo = r2(e.sueldo * 1.05);
        delete e.capacita;
        S.avisos.push(`${e.nombre} terminó su capacitación.`);
      }
      const rotas = violaciones(e).length;
      e.satisfaccion = clamp(e.satisfaccion + (rotas ? -Sat.baja * rotas : Sat.sube) - (J.animo < Sat.animoJefe ? Sat.bajaJefe : 0));
      if (e.satisfaccion <= 0) {
        S.empleados = S.empleados.filter(x => x !== e);
        S.avisos.push(`${e.nombre} renunció.`);
        problemas.push({ t: `${e.nombre} renunció: no se respetaron sus condiciones.`, s: 'Revisa la satisfacción de tu equipo en Negocios › Personal.' });
      }
    }
    gasto(S, 'vida', por(D.departamentos, J.depto).renta);
    J.novedad *= 0.85;
    if (c % 7 === 0) {
      for (const p of S.prestamos) {
        const abono = Math.min(p.abono, p.saldo);
        gasto(S, 'intereses', p.interes);
        gasto(S, 'abonos', abono);
        p.saldo = r2(p.saldo - abono);
      }
      S.prestamos = S.prestamos.filter(p => p.saldo > 0.005);
    }
    // Impuestos: se calculan por periodo, hay un plazo para pagar y después viene el embargo.
    if (S.impuesto && c >= S.impuesto.vence) {
      let m = r2(S.impuesto.monto * (1 + B.impuestoRecargo));
      const efectivo = Math.max(0, Math.min(S.dinero, m)), tomado = embargar(S, m - efectivo);
      gasto(S, 'impuestos', m - tomado); // lo que no cubren efectivo ni bienes queda como saldo negativo
      S.impuesto = null;
      S.avisos.push(tomado ? `Hacienda cobró con recargo y embargó bienes por $${Math.round(tomado)}.` : 'Hacienda cobró tus impuestos con recargo.');
      problemas.unshift({ t: 'No pagaste impuestos a tiempo: te cobraron con recargo' + (tomado ? ' y embargaron mercancía o muebles.' : '.'), s: 'Paga los impuestos en Finanzas antes de la fecha límite.' });
    }
    if (c % B.impuestoPeriodo === 0) {
      const base = S.periodo.ingresos - S.periodo.gastos;
      S.periodo = { ingresos: 0, gastos: 0 };
      if (base > 0) {
        S.impuesto = { monto: r2((S.impuesto ? S.impuesto.monto : 0) + base * B.impuesto), vence: c + B.impuestoPlazo };
        S.avisos.push(`Llegó la cuenta de impuestos: $${Math.round(S.impuesto.monto)}. Vence el día ${S.impuesto.vence}.`);
      }
    }
    S.candidatos = S.candidatos.filter(x => x.expira > c);
    for (const b of S.busquedas.filter(b => b.llega <= c + 1)) {
      for (let i = 0; i < B.candidatosPorBusqueda; i++) S.candidatos.push(candidato(S));
      S.avisos.push('La agencia mandó candidatos.');
    }
    S.busquedas = S.busquedas.filter(b => b.llega > c + 1);

    for (const [key, nom] of [['energia', 'energía'], ['hambre', 'hambre'], ['animo', 'ánimo']])
      if (J[key] <= 10) problemas.push({ t: `Tu ${nom} está por los suelos y rindes menos.`, s: key === 'energia' ? 'Ve a casa y duerme.' : key === 'hambre' ? 'Come algo.' : 'Date un rato de ocio.' });
    if (S.impuesto) problemas.push({ t: `Debes $${Math.round(S.impuesto.monto)} de impuestos. Vence el día ${S.impuesto.vence}.`, s: 'Paga en Finanzas antes del vencimiento para evitar recargo y embargo.' });
    S.diasNegativo = S.dinero < 0 ? S.diasNegativo + 1 : 0;
    if (S.diasNegativo >= B.diasQuiebra) { // el banco embarga; si ni así alcanza, es bancarrota
      S.dinero = r2(S.dinero + embargar(S, -S.dinero));
      if (S.dinero < 0) S.fin = 'derrota';
      else { S.diasNegativo = 0; S.avisos.push('El banco embargó bienes para cubrir tu saldo negativo.'); problemas.unshift({ t: 'El banco embargó mercancía o muebles para cubrir tu saldo negativo.', s: 'Revisa qué negocio se quedó sin muebles y recorta gastos.' }); }
    } else if (S.dinero < 0) problemas.unshift({ t: `Saldo negativo. En ${B.diasQuiebra - S.diasNegativo} días el banco embarga tus bienes.`, s: 'Recorta gastos, vende más o pide un préstamo si aún te lo dan.' });
    const gastos = S.hoy.gastos, total = Object.values(gastos).reduce((a, b) => a + b, 0);
    S.resumen = { dia: c, ingresos: S.hoy.ingresos, gastos, neto: r2(S.hoy.ingresos - total), problemas: problemas.map(x => x.t), sugerencia: problemas[0]?.s || 'Todo en orden. Si te sobra efectivo, mejora un local o abre otro negocio.' };
    S.historial.push({ dia: c, dinero: S.dinero, patrimonio: patrimonio(S) });
    S.hoy = { ingresos: 0, gastos: {} };
    if (!S.fin && S.modo === 'historia' && patrimonio(S) >= dif(S).meta) S.fin = 'victoria';
  }

  function tick(S) {
    if (S.fin) return;
    const J = S.jugador;
    J.trabajando = !!J.enEmpleo;
    for (const N of S.negocios) simHora(S, N, hh(S));
    if (J.durmiendo) {
      J.energia += B.suenoHora; J.hambre -= B.hambreSueno;
      J.animo += por(D.departamentos, J.depto).animo + J.novedad / 10;
    } else {
      J.energia -= B.energiaHora + (J.trabajando ? B.energiaTrabajo : 0);
      J.hambre -= B.hambreHora; J.animo -= B.animoHora;
    }
    for (const k of ['energia', 'hambre', 'animo']) J[k] = clamp(J[k]);
    S.hora++;
    if (hh(S) === 0) cierreDia(S);
  }
  function pasar(S, horas, bandera = 'ocupado') {
    S.jugador[bandera] = true;
    for (let i = 0; i < horas; i++) tick(S);
    S.jugador[bandera] = false;
  }

  function nueva(o = {}) {
    return {
      v: VERSION, rng: (o.semilla ?? Date.now()) | 0, nombre: o.nombre || 'Sin nombre', dificultad: o.dificultad || 'normal', modo: o.modo || 'historia',
      hora: B.horaInicio, dinero: o.dinero ?? D.dineroInicial[1],
      jugador: { lugar: 'casa', depto: D.departamentos[0].id, energia: 100, hambre: 80, animo: 70, novedad: 0, carga: {} },
      negocios: [], empleados: [], candidatos: [], busquedas: [], prestamos: [], cursos: {}, impuesto: null,
      hoy: { ingresos: 0, gastos: {} }, periodo: { ingresos: 0, gastos: 0 }, resumen: null, historial: [],
      diasNegativo: 0, fin: null, avisos: [], ventas: 0, contratados: 0, sig: 1,
    };
  }

  // ---- Acciones. Devuelven un texto si fallan; nada (o {msg}) si salen bien. ----
  const pagar = (S, cat, m) => (S.dinero < m ? `No te alcanza: cuesta $${Math.round(m)}.` : void gasto(S, cat, m));
  const aqui = (S, id) => S.jugador.lugar === id;
  const A = {
    viajar(S, { a }) {
      if (aqui(S, a)) return 'Ya estás aquí.';
      const v = viaje(S, a);
      gasto(S, 'viajes', v.costo); // sin saldo se viaja a crédito: quedarse varado bloquearía la partida
      pasar(S, v.horas);
      S.jugador.lugar = a;
    },
    rentar(S, { local, tipo }) {
      if (S.negocios.some(n => n.local === local)) return 'Ese local ya es tuyo.';
      const T = por(D.negocios, tipo), L = por(D.locales, local), Dt = distDe(L.distrito);
      const N = { id: 'n' + S.sig, local, tipo, nombre: `${T.corto} ${L.nombre}`, abre: T.horario[0], cierra: T.horario[1], muebles: {}, productos: [...T.productos], interior: 0, marketing: 0, limpieza: 100, reputacion: B.repInicial, stock: {}, precios: {}, miembros: 0, hoy: hoyVacio(), ayer: hoyVacio() };
      const e = pagar(S, 'renta', rentaDe(S, N) * B.depositoDias);
      if (e) return e;
      S.sig++;
      for (const p of T.productos) { N.precios[p] = Math.round(D.productos[p].sugerido * Dt.precio * 20) / 20; N.stock[p] = 0; }
      S.negocios.push(N);
      return { msg: `Rentaste ${L.nombre}.`, id: N.id };
    },
    cerrar(S, { id }) {
      const N = negocio(S, id);
      ingreso(S, valorMuebles(N) * B.reventaEquipo, false);
      S.empleados = S.empleados.filter(e => e.negocio !== id);
      S.negocios = S.negocios.filter(n => n.id !== id);
      return { msg: `Cerraste ${N.nombre}.` };
    },
    equipo(S, { id, mueble }) {
      const N = negocio(S, id);
      if (!mueblesPosibles(N).includes(mueble)) return 'Ese mueble no sirve en este negocio.';
      if (numMuebles(N) >= localDe(N).espacio) return 'No caben más muebles en este local.';
      const e = pagar(S, 'equipo', D.muebles[mueble].costo * dif(S).costos);
      if (e) return e;
      N.muebles[mueble] = (N.muebles[mueble] || 0) + 1;
    },
    producto(S, { id, prod }) { // poner o quitar un producto de la venta
      const N = negocio(S, id), P = D.productos[prod];
      if (tipoDe(N).modelo !== 'inventario' || !catalogo().includes(prod)) return 'Eso no se puede vender aquí.';
      if (N.productos.includes(prod)) { N.productos = N.productos.filter(p => p !== prod); return; }
      if (!exhibe(N, P.cat)) return `Primero compra ${D.muebles[muebleDe(P.cat)].nombre.toLowerCase()} en la pestaña Local.`;
      N.productos.push(prod);
      N.stock[prod] = N.stock[prod] || 0;
      N.precios[prod] = N.precios[prod] || Math.round(P.sugerido * distritoDe(N).precio * 20) / 20;
    },
    interior(S, { id }) {
      const N = negocio(S, id), costo = B.interior[N.interior + 1];
      if (costo == null) return 'El interior ya está al máximo.';
      const e = pagar(S, 'equipo', costo);
      if (e) return e;
      N.interior++;
    },
    marketing(S, { id, valor }) { if (!B.marketing.includes(valor)) return 'Presupuesto no válido.'; negocio(S, id).marketing = valor; },
    precio(S, { id, prod, valor }) { if (!(valor >= 0.05)) return 'Precio no válido.'; negocio(S, id).precios[prod] = r2(valor); },
    horario(S, { id, abre, cierra }) {
      if (!(abre >= 0 && abre < cierra && cierra <= 24)) return 'Horario no válido.';
      Object.assign(negocio(S, id), { abre, cierra });
    },
    comprar(S, { prod, cant }) {
      const P = por(D.proveedores, S.jugador.lugar);
      if (!P || !P.productos.includes(prod)) return 'Aquí no venden eso.';
      cant = Math.min(Math.floor(cant), B.cargaMax - cargaUsada(S));
      if (!(cant > 0)) return 'Ya no puedes cargar más.';
      const e = pagar(S, 'mercancia', cant * D.productos[prod].costo * dif(S).costos);
      if (e) return e;
      S.jugador.carga[prod] = (S.jugador.carga[prod] || 0) + cant;
    },
    descargar(S, { id }) {
      const N = negocio(S, id), C = S.jugador.carga;
      if (!aqui(S, N.local)) return 'Tienes que estar en el local.';
      let libre = localDe(N).almacen - Object.values(N.stock).reduce((a, b) => a + b, 0), n = 0;
      for (const p of N.productos) {
        const q = Math.min(C[p] || 0, libre);
        if (!q) continue;
        N.stock[p] += q; libre -= q; n += q;
        if (!(C[p] -= q)) delete C[p];
      }
      return n ? { msg: `Descargaste ${n} unidades.` } : 'No traes mercancía que este negocio venda, o el almacén está lleno.';
    },
    curso(S, { id }) {
      const c = por(D.cursos, id);
      if (S.cursos[id]) return 'Ya tomaste ese curso.';
      const e = pagar(S, 'equipo', c.costo);
      if (e) return e;
      pasar(S, c.horas);
      S.cursos[id] = true;
      return { msg: `Terminaste: ${c.nombre}.` };
    },
    buscar(S, { dias }) { // pagar a la agencia por una tanda de candidatos
      const o = B.agencia.find(x => x.dias === dias);
      if (!S.cursos.rrhh) return 'Primero toma el curso básico de RR. HH.';
      if (!o) return 'La agencia no ofrece ese plazo.';
      const e = pagar(S, 'salarios', o.costo * B.candidatosPorBusqueda);
      if (e) return e;
      S.busquedas.push({ llega: dia(S) + dias });
      return { msg: `La agencia manda candidatos el día ${dia(S) + dias}.` };
    },
    contratar(S, { cand, negocio: id, turno }) {
      const c = por(S.candidatos, cand);
      if (!S.cursos.rrhh) return 'Primero toma el curso básico de RR. HH.';
      if (!c || !c.turnos.includes(turno)) return 'Ese candidato ya no está disponible en ese turno.';
      const n = Math.min(D.jornadas[c.jornada].maxDias, 5); // por defecto entra de lunes en adelante, sin fin de semana
      S.candidatos = S.candidatos.filter(x => x !== c);
      S.empleados.push({ id: 'e' + S.sig++, nombre: c.nombre, hab: c.hab, sueldo: c.sueldo, jornada: c.jornada, demandas: c.demandas, satisfaccion: B.satisfaccion.inicial, dias: D.semana.map((_, i) => i < n), negocio: id, turno, inicia: dia(S) + 1 });
      S.contratados++;
      return { msg: `${c.nombre} empieza mañana.` };
    },
    diaLaboral(S, { emp, d }) { const e = por(S.empleados, emp); e.dias[d] = !e.dias[d]; },
    aumento(S, { emp }) {
      const e = por(S.empleados, emp);
      e.sueldo = r2(e.sueldo * (1 + B.satisfaccion.aumento));
      e.satisfaccion = clamp(e.satisfaccion + B.satisfaccion.subeAumento);
    },
    despedir(S, { emp }) {
      const e = por(S.empleados, emp);
      gasto(S, 'salarios', e.sueldo * B.horasTurno); // liquidación: un día de sueldo
      S.empleados = S.empleados.filter(x => x !== e);
    },
    capacitar(S, { emp, hab }) {
      const e = por(S.empleados, emp);
      if (e.capacita) return 'Ya está en capacitación.';
      if (e.hab[hab] >= 100) return 'Ya domina esa habilidad.';
      const err = pagar(S, 'salarios', B.capacitar.costo);
      if (err) return err;
      e.capacita = { hab, hasta: dia(S) + B.capacitar.dias - 1 };
      return { msg: `${e.nombre} vuelve en ${B.capacitar.dias} días.` };
    },
    prestamo(S, { monto }) {
      if (!(monto > 0) || monto > limitePrestamo(S)) return 'El banco no te presta esa cantidad.';
      const P = B.prestamo;
      S.prestamos.push({ id: 'p' + S.sig++, saldo: monto, abono: r2(monto / P.semanas), interes: r2(monto * P.interesSemanal) });
      S.dinero = r2(S.dinero + monto);
    },
    pagarPrestamo(S, { id }) {
      const p = por(S.prestamos, id), e = pagar(S, 'abonos', p.saldo);
      if (e) return e;
      S.prestamos = S.prestamos.filter(x => x !== p);
    },
    pagarImpuestos(S) {
      if (!S.impuesto) return 'No debes impuestos.';
      const e = pagar(S, 'impuestos', S.impuesto.monto);
      if (e) return e;
      S.impuesto = null;
      return { msg: 'Impuestos pagados.' };
    },
    dormir(S) {
      const J = S.jugador;
      if (!aqui(S, 'casa')) return 'Solo puedes dormir en tu casa.';
      if (J.energia >= 95) return 'No tienes sueño.';
      J.durmiendo = true;
      for (let i = 0; i < 12 && J.energia < 100 && !S.fin; i++) tick(S);
      J.durmiendo = false;
    },
    comer(S) {
      const c = aqui(S, 'casa') ? B.comerCasa : B.comerFuera, e = pagar(S, 'vida', c.costo);
      if (e) return e;
      S.jugador.hambre = clamp(S.jugador.hambre + c.hambre);
    },
    ocio(S) {
      const e = pagar(S, 'vida', B.ocio.costo);
      if (e) return e;
      pasar(S, B.ocio.horas);
      S.jugador.animo = clamp(S.jugador.animo + B.ocio.animo);
    },
    trabajar(S) {
      const E = por(D.empleos, S.jugador.lugar);
      if (!E) return 'Tienes que ir al empleo.';
      if (S.jugador.energia < 25) return 'Estás demasiado cansado para trabajar.';
      const pago = r2(E.pagoHora * E.horas * rendimiento(S));
      pasar(S, E.horas, 'enEmpleo');
      ingreso(S, pago, false);
      return { msg: `Ganaste $${pago}.` };
    },
    limpiar(S, { id }) {
      const N = negocio(S, id);
      if (!aqui(S, N.local)) return 'Tienes que estar en el local.';
      pasar(S, 1);
      N.limpieza = clamp(N.limpieza + B.limpiarJugador);
    },
    mudarse(S, { depto }) {
      const d = por(D.departamentos, depto);
      if (S.jugador.depto === depto) return 'Ya vives ahí.';
      const e = pagar(S, 'vida', d.renta * B.depositoDias);
      if (e) return e;
      Object.assign(S.jugador, { depto, novedad: d.novedad });
    },
    seguirLibre(S) { S.modo = 'libre'; S.fin = null; },
  };
  function hacer(S, accion, args) {
    if (S.fin && accion !== 'seguirLibre') return { ok: false, msg: 'La partida terminó.' };
    const r = A[accion](S, args || {});
    return typeof r === 'string' ? { ok: false, msg: r } : { ok: true, ...r };
  }

  // ---- Lecturas para la interfaz ----
  function insight(S, N) {
    const T = tipoDe(N), L = localDe(N), Dt = distDe(L.distrito), a = N.hoy.horas ? N.hoy : N.ayer, d = dia(S);
    const sueldos = S.empleados.filter(e => e.negocio === N.id && d >= e.inicia && e.dias[(d - 1) % 7]).reduce((s, e) => s + e.sueldo * B.horasTurno, 0);
    return {
      precio: precioScore(N),
      servicio: a.horas ? a.servicio / a.horas : null,
      trafico: clamp(Dt.trafico * L.trafico / 1.5 * 100),
      marketing: N.marketing / Math.max(...B.marketing) * 100,
      interior: N.interior / (B.interior.length - 1) * 100,
      limpieza: N.limpieza,
      stock: T.modelo !== 'inventario' ? null : a.demanda ? a.vendidos / a.demanda * 100 : N.productos.some(p => N.stock[p] > 0) ? 100 : 0,
      ingresos: N.hoy.ingresos,
      gastos: r2(rentaDe(S, N) + T.servicios * dif(S).costos + N.marketing + sueldos + N.hoy.costo),
      datos: a,
    };
  }
  // Desbloqueo gradual: cada sistema aparece cuando el jugador ya lo necesita.
  function desbloqueado(S, k) {
    if (k === 'prestamos') return S.negocios.length > 0 || dia(S) >= 3;
    if (k === 'empleados') return S.ventas > 0 || S.contratados > 0;
    if (k === 'mejoras') return S.contratados > 0 || (S.negocios.length > 0 && dia(S) >= 5);
    return true;
  }
  function asesor(S) {
    const N = S.negocios.find(n => !capacidad(n)) || S.negocios.find(n => tipoDe(n).modelo === 'inventario' && !n.productos.some(p => n.stock[p] > 0));
    if (!S.negocios.length) return { tab: 'mapa', texto: 'Abre el Mapa, toca un local y réntalo. La tienda es la más barata de arrancar; si te falta capital, el empleo de medio tiempo paga por turno.' };
    if (N && !capacidad(N)) return { tab: 'negocios', texto: `${N.nombre} no puede abrir: necesita al menos uno de cada mueble. Cómpralos en Negocios › Local.` };
    if (N) return { tab: 'mapa', texto: `${N.nombre} no tiene mercancía. Viaja al proveedor, compra y luego descarga en el local.` };
    if (!S.ventas) return { tab: 'mapa', texto: 'Quédate en tu local durante el horario de apertura: mientras estés ahí, tú atiendes. Dale velocidad al reloj.' };
    if (!S.cursos.rrhh) return { tab: 'personaje', texto: 'Ya vendes. Para contratar necesitas el curso básico de RR. HH.: tómalo en Personaje.' };
    if (!S.contratados) return { tab: 'negocios', texto: 'Pide candidatos a la agencia en Negocios › Personal. Esperar más días sale más barato.' };
    if (!desbloqueado(S, 'mejoras')) return { tab: 'negocios', texto: 'Revisa el Insight cada día: te dice qué está frenando las ventas.' };
    if (S.negocios.every(n => !n.marketing && !n.interior)) return { tab: 'negocios', texto: 'Ya puedes invertir en marketing e interior desde Negocios › Local. Traen más clientes, pero cuestan.' };
    if (S.negocios.length === 1) return { tab: 'finanzas', texto: 'Cuando el primer local se sostenga solo, abre un segundo. Un préstamo acelera, pero la cuota semanal no perdona.' };
    return null;
  }

  return { VERSION, nueva, tick, hacer, insight, asesor, desbloqueado, patrimonio, limitePrestamo, deuda, lugar, lugares, viaje, cargaUsada, rendimiento, rentaDe, ratioPrecio, puntosPrecio, enTurno, dia, hh, dif, capacidad, cuello, numMuebles, mueblesPosibles, muebleDe, exhibe, catalogo, violaciones };
})();
if (typeof module !== 'undefined') module.exports = Motor;
