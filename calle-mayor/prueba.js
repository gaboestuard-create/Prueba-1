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
    if (S.decision) h('decidir', { i: 0 }).ok || h('decidir', { i: 1 }); // el bot toma la primera salida si le alcanza
    if (M.hh(S) === 8) {
      for (const N of S.negocios) {
        if (N.ayer.perdidos > N.ayer.clientes * 0.1 && N.emp < D.negocios[N.tipo].empMax && !['estudio', 'fabrica'].includes(D.negocios[N.tipo].clase)) h('empleados', { id: N.id, cambio: 1 });
        if (N.nivel < M.nivelMax(S) && S.dinero > M.costoMejora(N) * 3) h('mejorar', { id: N.id });
      }
      let t = PLAN[paso], libre = lotes.find(id => !M.ocupado(S, id));
      const presa = [...S.rival.negocios].sort((x, y) => M.precioCompra(x) - M.precioCompra(y))[0];
      if (t && !libre && presa && S.dinero > M.precioCompra(presa) * 2) { // sin lugar: le compra a Ferrán y usa el lote
        const r = h('adquirir', { id: presa.id });
        if (r.ok) { h('vender', { id: r.id }); libre = presa.lote; }
      }
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
      if (ver && d % 10 === 0) console.log(`día ${String(d).padStart(3)}  dinero ${S.dinero.toFixed(0).padStart(9)}  neto ${S.resumen.neto.toFixed(0).padStart(7)}  patrimonio ${M.patrimonio(S).toFixed(0).padStart(9)}  rango ${D.rangos[S.rango].nombre.padEnd(11)}  negocios ${S.negocios.map(n => n.tipo + n.nivel + 'x' + n.emp).join(' ')}  rival ${S.rival.negocios.map(n => n.tipo).join(' ')} (${S.rival.dinero.toFixed(0)})  hitos ${Object.keys(S.hitos).length}`);
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
const repB = () => (b.negocios[0] || b.rival.negocios.find(n => n.lote === 'l1')).rep;
for (let i = 0; i < 24 * 30 && !b.fin; i++) { M.tick(b); b.ofertas = []; } // el descuidado ignora las ofertas
console.log(`Descuidado: dinero ${b.dinero.toFixed(0)}, reputación ${repB().toFixed(0)}, final ${b.fin}`);
assert(repB() < 40 && b.fin === 'comprado' && M.rivalEn(b, 'l1'), 'con un solo negocio en rojo, Ferrán se lo queda y se acaba la partida');

// Sin dinero infinito: comprar y vender acciones el mismo día cuesta la comisión.
const c = M.nueva({ semilla: 1 });
c.rango = 2; c.dinero = 10000;
for (const H of D.hitos) M.migrar(c).hitos[H.id] = 1; // sin premios de hitos que muevan las cuentas
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
assert(q.fin === 'comprado', 'un solo negocio: final por compra');
// Varios negocios en rojo: llegan ofertas que bajan cada día, y si no vendes, quiebra.
const v = M.nueva({ semilla: 6 });
v.rango = 1; v.dinero = 30000;
for (const [l, t] of [['l1', 'cafeteria'], ['l2', 'panaderia'], ['l3', 'taller']]) M.hacer(v, 'construir', { lote: l, tipo: t });
for (const N of v.negocios) { M.hacer(v, 'empleados', { id: N.id, cambio: 2 }); M.hacer(v, 'precio', { id: N.id, valor: N.precio * 3 }); }
v.dinero = -100;
const vistas = [];
for (let i = 0; i < 24 * 30 && !v.fin; i++) { M.tick(v); for (const o of v.ofertas) if (!vistas.some(x => x.id === o.id)) vistas.push({ ...o, inv: v.negocios.find(n => n.id === o.negocio).invertido }); }
console.log(`Ofertas en rojo: ${vistas.map(o => Math.round(o.precio / o.inv * 100) + '%').join(' ')} · plazo ${M.plazoQuiebra(v)} · final ${v.fin}`);
assert(vistas.length >= 2 && vistas[vistas.length - 1].precio / vistas[vistas.length - 1].inv < vistas[0].precio / vistas[0].inv, 'las ofertas bajan cada día en rojo');
assert(v.fin === 'quiebra', 'varios negocios sin vender: quiebra');
// Aceptar una oferta: el dinero entra y el lote pasa al comprador.
const w = M.nueva({ semilla: 9 });
w.rango = 1; w.dinero = 20000;
M.hacer(w, 'construir', { lote: 'l4', tipo: 'cafeteria' }); M.hacer(w, 'construir', { lote: 'l5', tipo: 'limonada' });
w.rival.dinero = 1e6;
w.ofertas.push({ id: 'oX', negocio: w.negocios[0].id, comprador: 'ferran', precio: 5000, vence: 99, regateo: false });
const antesW = w.dinero;
assert(M.hacer(w, 'aceptarOferta', { id: 'oX' }).ok && w.dinero === antesW + 5000 && M.rivalEn(w, 'l4'), 'vender a Ferrán');
// Historia: capítulos en orden y la elección del final.
const hst = M.nueva({ semilla: 12, modo: 'historia' });
assert(hst.avisos.some(a => a.tipo === 'dialogo' && a.id === 'cap1'));
for (let i = 0; i < 24 * 10; i++) M.tick(hst);
assert(!hst.rival.negocios.length, 'en historia Ferrán no llega antes del capítulo 3');
M.hacer(hst, 'construir', { lote: 'l4', tipo: 'limonada' }); hst.dinero += 3000;
for (let i = 0; i < 24; i++) M.tick(hst);
assert(hst.capitulo === 1, 'capítulo 1 cumplido');
hst.capitulo = 5; hst.rango = 3; M.tick(hst);
assert(hst.esperando === 'final' && hst.avisos.some(a => a.id === 'cap6-fin'));
assert(M.hacer(hst, 'elegirFinal', { valor: 'socios' }).ok && hst.fin === 'final' && hst.finalId === 'socios', 'final socios');
assert(M.hacer(hst, 'seguir').ok && hst.fin === 'libre' && hst.modo === 'sandbox', 'después del final se sigue en sandbox');
// Sandbox: dinero inicial y sin rival.
const sb = M.nueva({ semilla: 13, modo: 'sandbox', dinero: 50000, rival: false });
for (let i = 0; i < 24 * 20; i++) M.tick(sb);
assert(sb.rango === 2 && !sb.rival.negocios.length, 'sandbox con $50,000 y sin rival');

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

// Rival: abre después de su día de inicio, nunca ahoga la calle, y se le puede comprar.
const r = M.nueva({ semilla: 5 });
for (let i = 0; i < 24 * 40; i++) M.tick(r);
const libres = D.lotes.filter(l => !M.ocupado(r, l.id)).length;
console.log(`Rival: ${r.rival.negocios.length} negocios el día 40, ${libres} lotes libres`);
assert(r.rival.negocios.length > 0 && r.rival.negocios.length <= D.rival.maxNegocios && libres >= D.rival.lotesLibresMin - 1, 'el rival juega sin ahogar la calle');
r.dinero = 50000;
const presa = r.rival.negocios[0];
assert(!M.hacer(r, 'construir', { lote: presa.lote, tipo: 'limonada' }).ok, 'no se construye sobre el rival');
const compra = M.hacer(r, 'adquirir', { id: presa.id });
assert(compra.ok && M.negocioEn(r, presa.lote) && r.rival.comprados === 1 && r.hitos['gana-rival'], 'comprarle al rival');
// Decisiones: se ofrecen, se resuelven una vez, y la huelga detiene las plantas.
const q2 = M.nueva({ semilla: 8 });
for (let i = 0; i < 24 * 12 && !q2.decision; i++) M.tick(q2);
assert(q2.decision, 'llega una decisión');
q2.dinero = 5000;
assert(M.hacer(q2, 'decidir', { i: 1 }).ok && !q2.decision && !M.hacer(q2, 'decidir', { i: 0 }).ok, 'se decide una sola vez');

// Vecindad: el café gana con la panadería al lado y el puesto pierde junto a una planta.
const vz = M.nueva({ semilla: 14, modo: 'sandbox', dinero: 50000, rival: false });
vz.rango = 2;
M.hacer(vz, 'construir', { lote: 'l2', tipo: 'cafeteria' });
M.hacer(vz, 'construir', { lote: 'l3', tipo: 'panaderia' });
M.hacer(vz, 'construir', { lote: 'l6', tipo: 'planta' });
assert(M.factorVecindad(vz, 'l2', 'cafeteria') > 1 && M.factorVecindad(vz, 'l3', 'panaderia') > 1, 'café y pan se ayudan');
assert(M.factorVecindad(vz, 'l5', 'limonada') < 1 && M.factorVecindad(vz, 'l9', 'limonada') === 1, 'la planta espanta a su vecino');
// Anaquel: tu bebida en tu puesto deja dinero extra y le da fama al producto.
const an = M.nueva({ semilla: 15, modo: 'sandbox', dinero: 50000, rival: false });
an.rango = 2;
M.hacer(an, 'construir', { lote: 'l4', tipo: 'limonada' });
M.hacer(an, 'construir', { lote: 'l1', tipo: 'estudio' });
M.hacer(an, 'proyecto', { cat: 'bebida', nombre: 'Volt', presupuesto: 8000, mezcla: D.categorias.bebida.ideal });
while (an.proyecto) M.tick(an);
const Pa = an.productos[0], Na = an.negocios.find(n => n.tipo === 'limonada');
assert(!M.hacer(an, 'anaquel', { id: an.negocios.find(n => n.tipo === 'estudio').id, prod: Pa.id }).ok, 'el estudio no tiene mostrador');
assert(M.hacer(an, 'anaquel', { id: Na.id, prod: Pa.id }).ok);
for (let i = 0; i < 24 * 3; i++) M.tick(an);
console.log(`Anaquel: ${Pa.tienda} unidades vendidas en tu puesto en 3 días`);
assert(Pa.tienda > 0 && Pa.tiendaAyer > 0, 'se vende en tu mostrador');
Pa.dia = 999; M.tick(an); for (let i = 0; i < 24; i++) M.tick(an);
assert(!Pa.activo && Na.anaquel === null, 'un producto retirado sale del anaquel');

console.log('OK: economía estable, determinista y sin trucos de dinero infinito.');
