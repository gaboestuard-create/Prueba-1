// Prueba sin interfaz: node prueba.js
// Un jugador razonable juega 120 días y uno descuidado 30; la economía no debe romperse.
const assert = require('assert');
const D = require('./datos.js');
const M = require('./motor.js');
const ver = process.argv.includes('--ver');

// Orden en que el bot razonable abre negocios cuando le alcanza.
const PLAN = ['limonada', 'hotdogs', 'flores', 'cafeteria', 'panaderia', 'estudio', 'planta', 'taller', 'boutique', 'restaurante', 'ensamble'];

function razonable(dias, semilla = 7) {
  const S = M.nueva({ semilla, empresa: 'Bot' });
  const h = (a, args) => M.hacer(S, a, args);
  // Primero las esquinas y los lotes con más gente.
  const lotes = [...D.lotes].sort((a, b) => b.trafico - a.trafico).map(l => l.id);
  let paso = 0;
  while (M.dia(S) <= dias && !S.fin) {
    if (M.hh(S) === 8) {
      for (const N of S.negocios) {
        if (N.ayer.perdidos > N.ayer.clientes * 0.1 && N.emp < D.negocios[N.tipo].empMax && !['estudio', 'fabrica'].includes(D.negocios[N.tipo].clase)) h('empleados', { id: N.id, cambio: 1 });
        if (N.nivel < M.nivelMax(S) && S.dinero > M.costoMejora(N) * 3) h('mejorar', { id: N.id });
      }
      const t = PLAN[paso], libre = lotes.find(id => !M.negocioEn(S, id));
      if (t && libre && D.negocios[t].rango <= S.rango && S.dinero > D.negocios[t].costo * 1.3 && h('construir', { lote: libre, tipo: t }).ok) paso++;
      const E = M.estudio(S);
      if (E && !S.proyecto) { // la categoría de moda a su alcance, con la mezcla ideal
        const [cat, C] = Object.entries(D.categorias).filter(([, c]) => c.rango <= S.rango && S.dinero > c.presupuestoRef * 1.5).sort((a, b) => S.tendencias[b[0]] - S.tendencias[a[0]])[0] || [];
        if (C) h('proyecto', { cat, nombre: 'Bot ' + cat, presupuesto: C.presupuestoRef, mezcla: C.ideal });
      }
      if (E && E.emp < 3 && S.dinero > 20000) h('empleados', { id: E.id, cambio: 1 });
      for (const F of S.negocios.filter(n => n.lineas)) { // cada línea libre fabrica el producto más nuevo que le toque
        F.lineas.forEach((id, i) => {
          if (id) return;
          const P = S.productos.find(p => p.activo && D.negocios[F.tipo].sirve.includes(p.cat) && !S.negocios.some(n => n.lineas && n.lineas.includes(p.id)));
          if (P) h('linea', { id: F.id, i, prod: P.id });
        });
        if (F.emp < F.lineas.filter(Boolean).length * D.negocios[F.tipo].porLinea) h('empleados', { id: F.id, cambio: 1 });
      }
    }
    M.tick(S);
    if (M.hh(S) === 0) {
      for (const v of [S.dinero, M.patrimonio(S)]) assert(Number.isFinite(v), 'valor no finito');
      const d = M.dia(S) - 1;
      if (ver && d % 10 === 0) console.log(`día ${String(d).padStart(3)}  dinero ${S.dinero.toFixed(0).padStart(9)}  neto ${S.resumen.neto.toFixed(0).padStart(7)}  patrimonio ${M.patrimonio(S).toFixed(0).padStart(9)}  rango ${D.rangos[S.rango].nombre.padEnd(11)}  negocios ${S.negocios.map(n => n.tipo + n.nivel + 'x' + n.emp).join(' ')}  productos ${S.productos.map(p => p.nota).join(' ')}`);
    }
  }
  return S;
}

const a = razonable(120);
const rangoDia = r => (a.historial.find(x => x.pat >= D.rangos[r].min) || {}).dia;
console.log(`Razonable: patrimonio ${M.patrimonio(a).toFixed(0)} · Comerciante día ${rangoDia(1)} · Empresario día ${rangoDia(2)} · Magnate día ${rangoDia(3)} · productos ${a.productos.length}`);
assert(!a.fin || a.fin !== 'quiebra', 'el jugador razonable no quiebra');
assert(rangoDia(1) <= 15, 'Comerciante en las primeras dos semanas');
assert(rangoDia(2) <= 45, 'Empresario antes del día 45');
assert(a.productos.length >= 2, 'el estudio lanza productos');
assert.deepStrictEqual(razonable(120), a, 'misma semilla, mismo resultado');

// Descuidado: abre un puesto a precio abusivo y lo deja solo.
const b = M.nueva({ semilla: 3 });
M.hacer(b, 'construir', { lote: 'l1', tipo: 'limonada' });
M.hacer(b, 'precio', { id: b.negocios[0].id, valor: 3.6 });
for (let i = 0; i < 24 * 30 && !b.fin; i++) M.tick(b);
console.log(`Descuidado: dinero ${b.dinero.toFixed(0)}, reputación ${b.negocios[0].rep.toFixed(0)}`);
assert(b.dinero < 150 && b.negocios[0].rep < 40, 'el precio abusivo no paga');

// Sin dinero infinito: comprar y vender acciones el mismo día cuesta la comisión.
const c = M.nueva({ semilla: 1 });
c.rango = 2; c.dinero = 10000;
M.hacer(c, 'comprarAccion', { id: 'NBL', n: 100 });
M.hacer(c, 'venderAccion', { id: 'NBL', n: 100 });
assert(c.dinero < 10000 && !c.cartera.NBL, 'la bolsa no regala dinero');
// Comprar un terreno no cambia el patrimonio; venderlo pierde un poco.
c.rango = 1;
const antes = M.patrimonio(c);
M.hacer(c, 'comprarLote', { lote: 'l3' });
assert(Math.abs(M.patrimonio(c) - antes) < 0.01);
M.hacer(c, 'venderLote', { lote: 'l3' });
assert(M.patrimonio(c) < antes);
// Las acciones bloqueadas respetan el rango.
const d = M.nueva({ semilla: 2 });
assert(!M.hacer(d, 'construir', { lote: 'l1', tipo: 'cafeteria' }).ok, 'la cafetería necesita Comerciante');
assert(!M.hacer(d, 'comprarAccion', { id: 'BRS', n: 1 }).ok, 'la bolsa necesita Empresario');
// La quiebra llega si te quedas en rojo.
const q = M.nueva({ semilla: 4 });
q.rango = 1; q.dinero = 6000;
M.hacer(q, 'construir', { lote: 'l4', tipo: 'cafeteria' });
M.hacer(q, 'empleados', { id: q.negocios[0].id, cambio: 3 });
M.hacer(q, 'precio', { id: q.negocios[0].id, valor: 20 });
for (let i = 0; i < 24 * 40 && !q.fin; i++) M.tick(q);
assert(q.fin === 'quiebra', 'quiebra tras días en rojo');

// Planta: el mismo producto deja más con planta propia que maquilado, aun pagando obreros y energía.
function conPlanta(usar) {
  const S = M.nueva({ semilla: 11 });
  S.rango = 2; S.dinero = 60000; S.maxPat = 60000;
  M.hacer(S, 'construir', { lote: 'l1', tipo: 'estudio' });
  M.hacer(S, 'proyecto', { cat: 'bebida', nombre: 'Prueba', presupuesto: 8000, mezcla: D.categorias.bebida.ideal });
  while (S.proyecto) M.tick(S);
  const P = S.productos[0];
  if (usar) {
    const r = M.hacer(S, 'construir', { lote: 'l2', tipo: 'planta' });
    assert(r.ok, r.msg);
    const F = S.negocios.find(n => n.tipo === 'planta');
    assert(!M.hacer(S, 'linea', { id: F.id, i: 0, prod: 'zzz' }).ok);
    assert(M.hacer(S, 'linea', { id: F.id, i: 0, prod: P.id }).ok);
    S.dinero += D.negocios.planta.costo; // compara solo la operación, no la compra
  }
  const antes = S.dinero;
  for (let i = 0; i < 24 * 30; i++) M.tick(S);
  return { neto: S.dinero - antes, propias: P.propias || 0, S };
}
const sin = conPlanta(false), con = conPlanta(true);
console.log(`Planta: 30 días sin planta ${sin.neto.toFixed(0)}, con planta ${con.neto.toFixed(0)} (${con.propias} unidades propias)`);
assert(con.propias > 0 && con.neto > sin.neto, 'la planta paga');
const Fq = con.S.negocios.find(n => n.tipo === 'planta');
assert(Fq.lineas.every(x => x === null || con.S.productos.some(p => p.id === x && p.activo)), 'un producto retirado libera su línea');

console.log('OK: economía estable, determinista y sin trucos de dinero infinito.');
