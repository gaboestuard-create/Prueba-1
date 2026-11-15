// Prueba sin interfaz: node prueba.js
// Juega 30 días con un jugador razonable y uno descuidado, y comprueba que la economía no se rompe.
const assert = require('assert');
const D = require('./datos.js');
const M = require('./motor.js');

function jugar(estilo, dias, tipo = 'tienda', local = 'o1', ver = false) {
  const S = M.nueva({ semilla: 7, nombre: estilo, dinero: 5000, dificultad: 'normal' });
  const h = (a, args) => M.hacer(S, a, args);
  const T = D.negocios.find(t => t.id === tipo);
  const prov = D.proveedores.find(p => p.productos.includes(T.productos[0]));
  const surtir = N => {
    if (!prov) return;
    h('viajar', { a: prov.id });
    const falta = T.productos.map(p => Math.max(0, Math.round(D.productos[p].peso * 400) - N.stock[p]));
    const escala = Math.min(1, D.balance.cargaMax / (falta.reduce((a, b) => a + b, 0) || 1)); // reparte la carga entre todos los productos
    T.productos.forEach((p, i) => falta[i] && h('comprar', { prod: p, cant: Math.floor(falta[i] * escala) }));
    h('viajar', { a: N.local });
    h('descargar', { id: N.id });
  };
  if (tipo === 'gimnasio') h('prestamo', { monto: 4000 }); // el gimnasio no arranca sin capital prestado
  assert(h('rentar', { local, tipo }).ok);
  const N = S.negocios[0];
  for (const m of T.muebles) assert(h('equipo', { id: N.id, mueble: m }).ok);
  if (estilo === 'descuidado') { // precios abusivos, surte una vez y se desentiende
    surtir(N);
    for (const p of T.productos) h('precio', { id: N.id, prod: p, valor: N.precios[p] * 1.5 });
  }
  let visto = 0;
  while (M.dia(S) <= dias && !S.fin) {
    if (estilo === 'razonable') {
      surtir(N);
      if (S.impuesto) h('pagarImpuestos');
      if (S.ventas > 0) { // curso, agencia y un empleado por turno; el dueño cubre los fines de semana
        if (!S.cursos.rrhh) h('curso', { id: 'rrhh' });
        const faltan = ['manana', 'tarde'].filter(t => !S.empleados.some(e => e.turno === t));
        for (const t of faltan) {
          const c = S.candidatos.find(x => x.turnos.includes(t));
          if (c) h('contratar', { cand: c.id, negocio: N.id, turno: t });
        }
        if (faltan.length && !S.candidatos.length && !S.busquedas.length) h('buscar', { dias: 3 });
      }
      const y = N.ayer; // reinvierte en el mueble que limita cuando hay filas o el gimnasio se llena
      if (S.dinero > 2500 && (y.limEquipo > 2 || (T.modelo === 'membresia' && N.miembros >= M.capacidad(N) * 0.9))) h('equipo', { id: N.id, mueble: M.cuello(N) });
      h('viajar', { a: N.local });
      if (N.limpieza < 50) h('limpiar', { id: N.id });
      if (S.jugador.hambre < 50) h('comer');
      if (S.jugador.animo < 30) h('ocio');
      while (M.hh(S) >= 6 && M.hh(S) < 21 && !S.fin) M.tick(S);
      h('viajar', { a: 'casa' }); h('comer'); h('dormir');
      do M.tick(S); while (M.hh(S) < 6 && !S.fin);
    } else M.tick(S);
    if (S.resumen && S.resumen.dia !== visto) {
      visto = S.resumen.dia;
      for (const v of [S.dinero, M.patrimonio(S), N.reputacion, S.jugador.energia]) assert(Number.isFinite(v), 'valor no finito');
      if (ver) console.log(`día ${String(visto).padStart(2)}  dinero ${S.dinero.toFixed(0).padStart(6)}  neto ${S.resumen.neto.toFixed(0).padStart(5)}  patrimonio ${M.patrimonio(S).toFixed(0).padStart(6)}  reputación ${N.reputacion.toFixed(0)}  inventario ${Object.values(N.stock).reduce((a, b) => a + b, 0)}  socios ${N.miembros}  empleados ${S.empleados.length}  capacidad ${M.capacidad(N)}`);
    }
  }
  return S;
}

console.log('— Jugador razonable, tienda en Barrio Fundidores —');
const a = jugar('razonable', 30, 'tienda', 'o1', true);
const semana = a.historial.slice(-8);
assert(!a.fin, 'el jugador razonable no debe quebrar');
assert(semana[7].patrimonio > semana[0].patrimonio, 'la tienda debe ser rentable en la última semana');
assert(a.empleados.length >= 1 && a.empleados.every(e => e.satisfaccion > 50), 'el equipo bien tratado sigue contento');
assert.deepStrictEqual(jugar('razonable', 30), a, 'misma semilla, mismo resultado');

console.log('— Jugador descuidado —');
const b = jugar('descuidado', 30, 'tienda', 'o1', true);
assert(M.patrimonio(b) < 5000, 'el descuidado debe perder dinero');

for (const [tipo, local] of [['cafeteria', 'm1'], ['gimnasio', 'm2']]) {
  const s = jugar('razonable', 30, tipo, local);
  const u = s.historial.slice(-8);
  assert(!s.fin && u[7].patrimonio > u[0].patrimonio, `${tipo} debe ser rentable en la última semana`);
  console.log(`— ${tipo} razonable: patrimonio ${M.patrimonio(s).toFixed(0)}, última semana ${(u[7].patrimonio - u[0].patrimonio).toFixed(0)}, socios ${s.negocios[0].miembros}`);
}

// Sin truco de dinero infinito: pedir prestado no sube el patrimonio ni el límite.
const c = M.nueva({ semilla: 1 });
const antes = M.patrimonio(c);
while (M.limitePrestamo(c) > 0) M.hacer(c, 'prestamo', { monto: M.limitePrestamo(c) });
assert(M.patrimonio(c) === antes && c.prestamos.length === 1);

// Sistemas nuevos, cada uno con su caso mínimo.
const d = M.nueva({ semilla: 3, dinero: 9000 });
const hd = (x, args) => M.hacer(d, x, args);
hd('rentar', { local: 'o1', tipo: 'tienda' });
const Nd = d.negocios[0];
assert(M.capacidad(Nd) === 0, 'sin muebles no hay capacidad');
for (const m of ['estante', 'refrigerador', 'caja']) hd('equipo', { id: Nd.id, mueble: m });
assert(M.capacidad(Nd) === 20 && M.cuello(Nd) === 'estante', 'manda el mueble más corto');
assert(!hd('producto', { id: Nd.id, prod: 'cafe' }).ok, 'no se vende café sin máquina');
hd('equipo', { id: Nd.id, mueble: 'maquina' });
assert(hd('producto', { id: Nd.id, prod: 'cafe' }).ok && Nd.productos.includes('cafe') && Nd.precios.cafe > 0, 'con el mueble sí');
assert(!hd('buscar', { dias: 1 }).ok, 'la agencia exige el curso');
hd('curso', { id: 'rrhh' });
assert(hd('buscar', { dias: 1 }).ok && !d.candidatos.length, 'los candidatos no llegan al instante');
while (M.dia(d) < 2) M.tick(d);
assert(d.candidatos.length === D.balance.candidatosPorBusqueda, 'llegan al día siguiente');
const cd = d.candidatos[0];
hd('contratar', { cand: cd.id, negocio: Nd.id, turno: cd.turnos[0] });
const ed = d.empleados[0];
for (let i = 0; i < 7; i++) if (!ed.dias[i]) hd('diaLaboral', { emp: ed.id, d: i }); // lo pone a trabajar los 7 días
assert(M.violaciones(ed).length > 0);
for (let i = 0; i < 24 * 20 && d.empleados.length; i++) M.tick(d);
assert(!d.empleados.length, 'el empleado explotado renuncia');
d.impuesto = { monto: 20000, vence: M.dia(d) }; // impuesto impagable: debe terminar en embargo
const muebles = M.numMuebles(Nd);
while (d.impuesto && !d.fin) M.tick(d);
assert(M.numMuebles(Nd) < muebles && Number.isFinite(d.dinero), 'Hacienda embarga muebles');

console.log('OK: 30 días simulados, economía estable y determinista.');
