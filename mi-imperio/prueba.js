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
  for (let i = 0; i < (tipo === 'tienda' ? 1 : 2); i++) assert(h('equipo', { id: N.id }).ok);
  if (estilo === 'descuidado') { // precios abusivos, surte una vez y se desentiende
    surtir(N);
    for (const p of T.productos) h('precio', { id: N.id, prod: p, valor: N.precios[p] * 1.5 });
  }
  let visto = 0;
  while (M.dia(S) <= dias && !S.fin) {
    if (estilo === 'razonable') {
      surtir(N);
      if (S.ventas > 0) for (const t of ['manana', 'tarde']) {
        const c = S.candidatos.find(x => x.turnos.includes(t));
        if (c && !S.empleados.some(e => e.turno === t)) h('contratar', { cand: c.id, negocio: N.id, turno: t });
      }
      if (N.miembros >= N.equipo * T.equipo.capacidad * 0.9 && S.dinero > 2500) h('equipo', { id: N.id }); // reinvierte cuando se llena
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
      if (ver) console.log(`día ${String(visto).padStart(2)}  dinero ${S.dinero.toFixed(0).padStart(6)}  neto ${S.resumen.neto.toFixed(0).padStart(5)}  patrimonio ${M.patrimonio(S).toFixed(0).padStart(6)}  reputación ${N.reputacion.toFixed(0)}  inventario ${T.productos.reduce((s, p) => s + N.stock[p], 0)}  socios ${N.miembros}  empleados ${S.empleados.length}`);
    }
  }
  return S;
}

console.log('— Jugador razonable, tienda en Barrio Fundidores —');
const a = jugar('razonable', 30, 'tienda', 'o1', true);
const semana = a.historial.slice(-8);
assert(!a.fin, 'el jugador razonable no debe quebrar');
assert(semana[7].patrimonio > semana[0].patrimonio, 'la tienda debe ser rentable en la última semana');
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

console.log('OK: 30 días simulados, economía estable y determinista.');
