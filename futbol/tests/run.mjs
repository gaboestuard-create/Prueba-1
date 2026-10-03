// Pruebas automáticas de Pelotazo. Uso: npm test (desde la carpeta futbol). Filtrar: npm test -- guardado
// Cada prueba abre el juego en un navegador real sin pantalla, con datos guardados limpios.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, serve, launch, openGame, realErrors, empezar, prepararJugada } from './harness.mjs';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const sinErrores = errors => assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));

let srv, browser;
// contexto nuevo = navegador con almacenamiento vacío
const fresh = (opts = {}) => browser.newContext({ viewport: { width: 1280, height: 720 }, ...opts });

/* ---------- 1. arranque ---------- */
test('arranca sin errores, dibuja el campo y muestra la pantalla de inicio', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => ({ n: G.todos.length, ini: !$('capa').hidden && !!$('bJugar'), ver: SAVE.estado }));
  assert(r.n === 22, 'debería haber 22 jugadores y hay ' + r.n);
  assert(r.ini, 'no aparece la pantalla de inicio');
  await empezar(page);
  await page.waitForFunction(() => G.frames > 20);
  // el lienzo tiene algo dibujado (no está todo de un color)
  const colores = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 36; const x = c.getContext('2d');
    R.renderer.render(R.scene, R.cam); x.drawImage($('cv'), 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 36).data, s = new Set(); for (let i = 0; i < d.length; i += 16) s.add(d[i] >> 4 << 8 | d[i + 1] >> 4 << 4 | d[i + 2] >> 4); return s.size;
  });
  assert(colores > 5, 'el campo no parece dibujado (colores distintos: ' + colores + ')');
  sinErrores(errors); await ctx.close();
});

test('jugadores realistas y de caricatura: se cambia de uno a otro y se dibujan', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await empezar(page);
  const r = await page.evaluate(async () => {
    const vis = () => ({ real: R.rTorso.visible, caric: R.torso.visible, balon: R.balon === R.balonR, sombras: R.sol.castShadow });
    const a = vis();
    document.querySelector('#bPausa').click();
    document.getElementById('op-modelo-caricatura').click();
    const b = vis();
    document.getElementById('op-modelo-real').click();
    DATOS.ajustes.calidad = 'baja'; ajustarTamano(); const c = vis();
    // los números de la espalda corresponden a cada jugador
    const nums = Array.from(R.rNum.geometry.attributes.aNum.array).join(',') === G.todos.map(p => p.num).join(',');
    R.renderer.render(R.scene, R.cam);
    return { a, b, c, nums, llamadas: R.renderer.info.render.calls };
  });
  assert(r.a.real && !r.a.caric && r.a.balon, 'al empezar deberían verse los jugadores realistas: ' + JSON.stringify(r.a));
  assert(!r.b.real && r.b.caric && !r.b.balon && !r.b.sombras, 'no cambió a caricatura: ' + JSON.stringify(r.b));
  assert(r.c.real && !r.c.sombras, 'con gráficos bajos no debería haber sombras de verdad: ' + JSON.stringify(r.c));
  assert(r.nums, 'los números de la espalda no coinciden con los jugadores');
  assert(r.llamadas < 80, 'demasiadas llamadas de dibujo para un celular: ' + r.llamadas);
  sinErrores(errors); await ctx.close();
});

test('se ve bien en un teléfono en vertical y en horizontal', async () => {
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    const ctx = await fresh({ viewport, hasTouch: true, isMobile: true }); const { page, errors } = await openGame(ctx, srv.url);
    await empezar(page);
    const r = await page.evaluate(() => {
      const ver = s => { const e = document.querySelector(s), b = e.getBoundingClientRect(); return b.width > 0 && b.left >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1; };
      const choca = (a, b) => { const r = document.querySelector(a).getBoundingClientRect(), q = document.querySelector(b).getBoundingClientRect(); return r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom; };
      const choques = [['#marcador', '#radar'], ['#radar', '#bPausa'], ['#marcador', '#bPausa'], ['.b[data-b="pass"]', '.b[data-b="shot"]'], ['.b[data-b="pass"]', '.b[data-b="long"]'], ['.b[data-b="sprint"]', '.b[data-b="tackle"]'], ['#stickBase', '.b[data-b="sprint"]']].filter(([a, b]) => choca(a, b));
      return { choques, tactil: document.body.classList.contains('tactil'), botones: ['.b[data-b="pass"]', '.b[data-b="shot"]', '.b[data-b="long"]', '.b[data-b="tackle"]', '.b[data-b="sprint"]', '#stickBase', '#marcador'].filter(s => !ver(s)), scroll: document.documentElement.scrollWidth > innerWidth };
    });
    assert(r.tactil, `${viewport.width}x${viewport.height}: no se muestran los controles táctiles`);
    assert(!r.botones.length, `${viewport.width}x${viewport.height}: se salen de la pantalla: ${r.botones}`);
    assert(!r.scroll, 'la página se desplaza de lado');
    assert(!r.choques.length, `${viewport.width}x${viewport.height}: elementos encimados: ${JSON.stringify(r.choques)}`);
    sinErrores(errors); await ctx.close();
  }
});

/* ---------- 2. jugadas ---------- */
test('pase corto: llega al compañero y pasas a controlarlo', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await prepararJugada(page, { x: 0, z: 0 });
  const r = await page.evaluate(() => {
    const p = G.ctrl, m = G.eqs[0].pl[7]; m.x = 12; m.z = 2; m.vx = m.vz = 0;
    Object.assign(G.prueba, { activo: true, mx: 1, mz: 0, pass: true }); G.avanzar(1);
    Object.assign(G.prueba, { pass: false, mx: 0 }); G.avanzar(8); // la pierna se prepara y golpea
    const destino = G.balon.destino, ctrl = G.ctrl;
    G.avanzar(120); G.prueba.activo = false;
    return { destinoOk: destino === m, ctrlOk: ctrl === m, dueno: G.balon.dueno === m, tipo: G.balon.tipo };
  });
  assert(r.destinoOk, 'el pase no fue al compañero que estaba en esa dirección');
  assert(r.ctrlOk, 'el control no pasó al que recibe');
  assert(r.dueno, 'el compañero no recibió el balón');
  sinErrores(errors); await ctx.close();
});

test('asistencia de pase: apuntando algo desviado, el pase va al compañero y llega', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    let llegan = 0, aEl = 0;
    for (let k = 0; k < 20; k++) {
      nuevoPartido(40 + k); G.saque = null;
      const p = G.eqs[0].pl[9];
      G.todos.forEach((q, i) => { if (q !== p && !q.por) { q.x = -40 + (i % 11) * 2; q.z = q.eq.i ? 30 : -30; } q.vx = q.vz = 0; });
      p.x = 0; p.z = 0; G.balon.dueno = null; tomar(p); p.protegido = 9; controlar(p);
      const m = G.eqs[0].pl[7], dist = 10 + (k % 4) * 5, ang = (k % 2 ? 1 : -1) * .3;
      m.x = Math.cos(ang) * dist; m.z = Math.sin(ang) * dist;
      // el control apunta unos 30-40 grados al lado del compañero
      const a = ang + (k % 2 ? -.6 : .6);
      Object.assign(G.prueba, { activo: true, mx: Math.cos(a), mz: Math.sin(a), pass: true }); G.avanzar(8);
      if (G.balon.destino === m) aEl++;
      Object.assign(G.prueba, { pass: false }); // sigue empujando el control hacia el mismo lado
      G.avanzar(150); G.prueba.activo = false;
      if (G.balon.dueno === m) llegan++;
    }
    return { llegan, aEl };
  });
  assert(r.aEl === 20, `solo ${r.aEl} de 20 pases fueron dirigidos al compañero`);
  assert(r.llegan >= 18, `solo ${r.llegan} de 20 pases llegaron (el receptor debe ir al balón aunque empujes el control)`);
  await ctx.close();
});

test('portero: para algunos tiros, pero no todos', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    let aPuerta = 0, goles = 0;
    for (let k = 0; k < 40; k++) {
      nuevoPartido(700 + k); G.saque = null;
      const p = G.eqs[0].pl[9];
      G.todos.forEach((q, i) => { if (q !== p && !q.por) { q.x = -40 + (i % 11) * 2; q.z = q.eq.i ? 30 : -30; } });
      const x = 32 + (k % 4) * 2, z = (k % 5) * 3 - 6;
      p.x = x; p.z = z; p.cara = 0; G.balon.dueno = null; tomar(p); G.balon.x = x + .55; G.balon.z = z; p.protegido = 9; controlar(p);
      G.avanzar(60);
      const s0 = G.stats.aPuerta[0];
      Object.assign(G.prueba, { activo: true, mx: 0, mz: (k % 3) - 1, shot: true }); G.avanzar(18 + (k % 3) * 6);
      G.prueba.shot = false; G.avanzar(1); G.prueba.activo = false; G.avanzar(90);
      if (G.stats.aPuerta[0] > s0) { aPuerta++; if (G.eqs[0].goles) goles++; }
    }
    return { aPuerta, goles };
  });
  const paradas = r.aPuerta - r.goles;
  assert(r.aPuerta >= 20, 'muy pocos tiros a puerta: ' + JSON.stringify(r));
  assert(paradas >= r.aPuerta * .25, `el portero casi no para: ${paradas} de ${r.aPuerta}`);
  assert(r.goles >= r.aPuerta * .2, `el portero lo para todo: ${paradas} de ${r.aPuerta}`);
  console.log(`      paradas: ${paradas} de ${r.aPuerta} tiros a puerta desde 16-22 m`);
  await ctx.close();
});

test('al perder el balón pasas a controlar al mejor defensor', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    nuevoPartido(12); G.saque = null;
    const lejos = G.eqs[0].pl[9]; lejos.x = 30; lejos.z = 0; G.balon.dueno = null; tomar(lejos); controlar(lejos); lejos.protegido = 5;
    G.avanzar(60);
    const rival = G.eqs[1].pl[5]; rival.x = -5; rival.z = 5;
    const def = G.eqs[0].pl[2]; def.x = -12; def.z = 4;           // entre el balón y nuestra portería
    G.balon.dueno = null; G.balon.x = -5; G.balon.z = 5; tomar(rival);
    G.avanzar(5);
    const ctrl = G.ctrl;
    const d = hyp(ctrl.x - G.balon.x, ctrl.z - G.balon.z);
    // vale el que está entre el balón y la portería, o uno pegado al rival que puede presionarlo ya
    return { cambio: ctrl !== lejos, cerca: d < 12, detras: (G.balon.x - ctrl.x) > -1 || d < 3 };
  });
  assert(r.cambio && r.cerca && r.detras, 'no se cambió a un defensor cercano y entre el balón y la portería: ' + JSON.stringify(r));
  await ctx.close();
});

test('inercia: a toda velocidad gira en curva y para dar la vuelta primero frena', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const prep = () => { nuevoPartido(5); G.saque = null; const p = G.eqs[0].pl[5]; G.balon.dueno = null; const gk = G.eqs[0].pl[0]; G.balon.x = gk.x; G.balon.z = gk.z; tomar(gk); gk.protegido = 99; gk.retener = 99; p.x = -20; p.z = 0; p.vx = p.vz = 0; p.cara = 0; controlar(p); G.todos.forEach(q => { if (q !== p && !q.por) { q.x = 30; q.z = -30; } }); return p; };
    // desde parado: cuánto tarda en dar 3 m hacia atrás
    let p = prep(); Object.assign(G.prueba, { activo: true, mx: -1, mz: 0 });
    let t0 = 0; const x0 = p.x; while (p.x > x0 - 3 && t0 < 200) { G.avanzar(1); t0++; }
    // a toda velocidad hacia delante y luego hacia atrás
    p = prep(); Object.assign(G.prueba, { mx: 1, mz: 0, sprint: true }); G.avanzar(90);
    const vMax = hyp(p.vx, p.vz);
    Object.assign(G.prueba, { mx: -1 }); let t1 = 0; const x1 = p.x; let xMax = p.x;
    while (!(p.x < xMax - 3) && t1 < 300) { G.avanzar(1); t1++; xMax = Math.max(xMax, p.x); }
    // giro de 90 grados a toda velocidad: radio de la curva
    p = prep(); Object.assign(G.prueba, { mx: 1, mz: 0, sprint: true }); G.avanzar(90);
    const ax = p.x; Object.assign(G.prueba, { mx: 0, mz: 1 }); let t2 = 0; while (p.vx > .5 && t2 < 200) { G.avanzar(1); t2++; }
    G.prueba.activo = false;
    return { t0, t1, vMax, avance: p.x - ax };
  });
  assert(r.vMax > 7.5, 'no llega a velocidad de sprint: ' + r.vMax);
  assert(r.t1 > r.t0 + 15, `dar la vuelta corriendo debería costar más que desde parado (${r.t1} vs ${r.t0} pasos)`);
  assert(r.avance > 1.2 && r.avance < 8, 'el giro a toda velocidad debería ser una curva de unos metros: ' + r.avance.toFixed(2));
  await ctx.close();
});

test('conducción: el balón rueda delante con toques, más largos al correr, y no se pierde', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const prueba = sprint => {
      nuevoPartido(6); G.saque = null;
      const p = G.eqs[0].pl[9]; G.todos.forEach(q => { if (q !== p) { q.x = q.eq.i ? 45 : -45; q.z = q.k * 2 - 10; } });
      p.x = -30; p.z = 0; p.cara = 0; G.balon.dueno = null; tomar(p); controlar(p); p.protegido = 99;
      Object.assign(G.prueba, { activo: true, mx: 1, mz: 0, sprint });
      let max = 0, min = 9, toques = 0, t = G.balon.toque || 0;
      for (let i = 0; i < 200; i++) { G.avanzar(1); const d = hyp(G.balon.x - p.x, G.balon.z - p.z); if (i > 40) { max = Math.max(max, d); min = Math.min(min, d); } }
      toques = (G.balon.toque || 0) - t;
      G.prueba.activo = false;
      return { max, min, toques, sigue: G.balon.dueno === p, vel: hyp(p.vx, p.vz) };
    };
    return { trote: prueba(false), sprint: prueba(true) };
  });
  assert(r.trote.sigue && r.sprint.sigue, 'perdió el balón conduciendo en línea recta: ' + JSON.stringify(r));
  assert(r.trote.toques >= 5 && r.sprint.toques >= 4, 'debería conducir a base de toques: ' + JSON.stringify(r));
  assert(r.trote.max - r.trote.min > .2, 'el balón no se separa del pie entre toques: ' + JSON.stringify(r.trote));
  assert(r.sprint.max > r.trote.max + .2, 'al esprintar los toques deberían ser más largos: ' + JSON.stringify(r));
  await ctx.close();
});

test('giro con el balón: cambia de sentido sin perderlo', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    nuevoPartido(7); G.saque = null;
    const p = G.eqs[0].pl[9]; G.todos.forEach(q => { if (q !== p) { q.x = q.eq.i ? 45 : -45; q.z = q.k * 2 - 10; } });
    p.x = 0; p.z = 0; p.cara = 0; G.balon.dueno = null; tomar(p); controlar(p); p.protegido = 99;
    Object.assign(G.prueba, { activo: true, mx: 1, mz: 0 }); G.avanzar(80);
    const x0 = p.x; Object.assign(G.prueba, { mx: -1 }); G.avanzar(110);
    G.prueba.activo = false;
    return { sigue: G.balon.dueno === p, retrocede: x0 - p.x, vx: p.vx };
  });
  assert(r.sigue, 'perdió el balón al girar');
  assert(r.retrocede > 2 && r.vx < -2, 'no se dio la vuelta con el balón: ' + JSON.stringify(r));
  await ctx.close();
});

test('golpeo: el balón sale cuando el pie llega, con el pie del lado del balón', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const res = [];
    for (const lado of [1, -1]) {
      nuevoPartido(8); G.saque = null;
      const p = G.eqs[0].pl[9], m = G.eqs[0].pl[7]; G.todos.forEach(q => { if (q !== p && q !== m) { q.x = q.eq.i ? 45 : -45; q.z = q.k * 2 - 10; } });
      p.x = 0; p.z = 0; p.cara = 0; m.x = 15; m.z = 0; G.balon.dueno = null; tomar(p); controlar(p); p.protegido = 99;
      G.balon.x = .45; G.balon.z = lado * .2;
      Object.assign(G.prueba, { activo: true, pass: true }); let pasos = 0;
      G.avanzar(1); G.prueba.pass = false;
      while (G.balon.dueno === p && pasos < 60) { G.avanzar(1); pasos++; }
      G.prueba.activo = false;
      res.push({ pasos, pie: p.pie, lado });
    }
    return res;
  });
  for (const x of r) {
    assert(x.pasos >= 3 && x.pasos <= 9, 'el pase debería salir tras una preparación corta (~0,1 s): ' + JSON.stringify(x));
    assert(x.pie === (x.lado > 0 ? 1 : 0), 'golpeó con el pie del otro lado: ' + JSON.stringify(x));
  }
  await ctx.close();
});

test('pase al primer toque: se prepara mientras llega el balón', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  await prepararJugada(page, { x: 0, z: 0 });
  const r = await page.evaluate(() => {
    const a = G.eqs[0].pl[7], c = G.eqs[0].pl[5]; a.x = 12; a.z = 0; c.x = 14; c.z = 14;
    Object.assign(G.prueba, { activo: true, mx: 1, mz: 0, pass: true }); G.avanzar(1);
    Object.assign(G.prueba, { pass: false }); G.avanzar(10);
    Object.assign(G.prueba, { mx: 0, mz: 1, pass: true }); G.avanzar(1); // pulsar mientras viene el balón
    Object.assign(G.prueba, { pass: false, mx: 0, mz: 0 });
    let segundo = false;
    for (let i = 0; i < 200 && !segundo; i++) { G.avanzar(1); if (G.balon.destino === c) segundo = true; }
    G.prueba.activo = false;
    return { segundo };
  });
  assert(r.segundo, 'el pase preparado no salió al recibir el balón');
  await ctx.close();
});

test('tiro: entra en la portería, sube el marcador y hay saque inicial', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  let goles = 0;
  for (let k = 0; k < 5; k++) {
    await prepararJugada(page, { x: 40, z: 0, semilla: 10 + k });
    goles += await page.evaluate(() => {
      const gk = G.eqs[1].pl[0]; gk.x = HL - 1; gk.z = 3.4; // portero mal colocado
      Object.assign(G.prueba, { activo: true, mx: 0, mz: -1, shot: true }); G.avanzar(20);
      Object.assign(G.prueba, { shot: false }); G.avanzar(1); G.prueba.activo = false;
      G.avanzar(90);
      return G.eqs[0].goles;
    });
  }
  assert(goles >= 3, `solo ${goles} de 5 tiros a placer acabaron en gol`);
  // después de un gol: celebración y saque inicial del equipo que lo recibió
  await prepararJugada(page, { x: 40, z: 0, semilla: 30 });
  const r = await page.evaluate(() => {
    G.saque = null; G.balon.dueno = null; G.eqs[1].pl[0].z = 30;
    Object.assign(G.balon, { x: HL - 2, y: .5, z: 0, vx: 25, vy: 0, vz: 0, ultimo: G.ctrl });
    for (let i = 0; i < 400 && !(G.saque && G.saque.tipo === 'inicial'); i++) G.avanzar(1);
    return { saque: G.saque && G.saque.tipo, saca: G.saque && G.saque.tomador.eq.i, bx: G.balon.x, marcador: $('goles').textContent, fase: G.fase }; });
  assert(r.fase === 'juego' && r.saque === 'inicial', 'después del gol no hay saque inicial: ' + JSON.stringify(r));
  assert(r.saca === 1, 'debería sacar el equipo que recibió el gol');
  assert(r.marcador === '1 - 0', 'el marcador muestra ' + r.marcador);
  sinErrores(errors); await ctx.close();
});

test('el balón que cruza la línea entre los postes es gol; fuera de ellos no', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const res = [];
    for (const [z, y] of [[0, .5], [2.5, 1.5], [6, .5], [0, 3.5]]) {
      nuevoPartido(3); G.saque = null; G.balon.dueno = null; G.eqs[1].pl[0].z = 30;
      Object.assign(G.balon, { x: HL - 2, y, z, vx: 25, vy: 0, vz: 0, ultimo: G.eqs[0].pl[9] });
      G.avanzar(20); res.push(G.eqs[0].goles + ':' + (G.pendiente ? G.pendiente.tipo : G.fase));
    }
    return res;
  });
  assert(r[0] === '1:gol' && r[1] === '1:gol', 'tiros dentro de la portería no contaron como gol: ' + r);
  assert(r[2] === '0:puerta' && r[3] === '0:puerta', 'tiros fuera deberían ser saque de puerta: ' + r);
  await ctx.close();
});

test('saques de banda y córner: el balón sale y se reanuda con el equipo correcto', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    nuevoPartido(4); G.saque = null; G.balon.dueno = null;
    Object.assign(G.balon, { x: 10, y: BR, z: HW - 1, vx: 0, vy: 0, vz: 10, ultimo: G.eqs[0].pl[5] });
    G.avanzar(30); const banda = G.pendiente && G.pendiente.tipo, eqB = G.pendiente && G.pendiente.eq.i;
    G.avanzar(60); const sacaB = G.saque && G.saque.tomador.eq.i;
    nuevoPartido(4); G.saque = null; G.balon.dueno = null;
    Object.assign(G.balon, { x: HL - 2, y: BR, z: 15, vx: 20, vy: 0, vz: 0, ultimo: G.eqs[1].pl[3] });
    G.avanzar(20); const corner = G.pendiente && G.pendiente.tipo;
    G.avanzar(60); const t = G.saque && G.saque.tomador;
    return { banda, eqB, sacaB, corner, eqC: t && t.eq.i, cx: t && t.x, cz: t && t.z };
  });
  assert(r.banda === 'banda' && r.eqB === 1 && r.sacaB === 1, 'saque de banda mal: ' + JSON.stringify(r));
  assert(r.corner === 'corner' && r.eqC === 0 && r.cx > HL_ - 1 && r.cz > 30, 'córner mal: ' + JSON.stringify(r));
  await ctx.close();
});
const HL_ = 52.5;

test('entrada: se puede robar el balón a un rival', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const robos = await page.evaluate(() => {
    let robos = 0;
    for (let k = 0; k < 10; k++) {
      nuevoPartido(100 + k); G.saque = null;
      const r = G.eqs[1].pl[9], yo = G.eqs[0].pl[5];
      r.x = 0; r.z = 0; r.cara = Math.PI; G.balon.dueno = null; tomar(r); r.protegido = 0;
      yo.x = -1.6; yo.z = 0; yo.cara = 0; controlar(yo);
      G.avanzar(2);
      Object.assign(G.prueba, { activo: true, tackle: true }); G.avanzar(1); G.prueba.tackle = false; G.avanzar(30); G.prueba.activo = false;
      if (G.balon.dueno !== r) robos++;
    }
    return robos;
  });
  assert(robos >= 4, `solo se robó el balón ${robos} de 10 veces`);
  await ctx.close();
});

test('partido completo entre la computadora: sin errores ni posiciones imposibles', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const t0 = Date.now();
  const r = await page.evaluate(() => {
    G.pausa = true; G.autoplay = true; DATOS.ajustes.dur = 5; nuevoPartido(2026);
    let malo = null, n = 0;
    while (G.fase !== 'fin' && n < 30000) {
      G.avanzar(60); n += 60;
      for (const p of G.todos) if (!isFinite(p.x) || !isFinite(p.z) || Math.abs(p.x) > HL + 5 || Math.abs(p.z) > HW + 4) malo = 'jugador fuera de sitio: ' + p.nombre + ' ' + p.x + ',' + p.z;
      const b = G.balon; if (!isFinite(b.x) || !isFinite(b.y) || b.y < 0 || Math.abs(b.x) > HL + 3 || Math.abs(b.z) > HW + 3) malo = 'balón fuera de sitio: ' + [b.x, b.y, b.z];
      if (malo) break;
    }
    return { malo, fase: G.fase, n, s: G.stats, goles: G.eqs.map(e => e.goles) };
  });
  assert(!r.malo, r.malo);
  assert(r.fase === 'fin', 'el partido no terminó (pasos: ' + r.n + ')');
  assert(r.s.pases[0] + r.s.pases[1] > 60, 'muy pocos pases: ' + JSON.stringify(r.s.pases));
  assert(r.s.pasesOk[0] + r.s.pasesOk[1] > (r.s.pases[0] + r.s.pases[1]) * .45, 'demasiados pases fallados: ' + JSON.stringify(r.s));
  assert(r.s.tiros[0] + r.s.tiros[1] >= 3, 'casi no hubo tiros: ' + JSON.stringify(r.s.tiros));
  assert(r.s.pos[0] > 0 && r.s.pos[1] > 0, 'un equipo nunca tuvo el balón');
  console.log(`      ${r.goles.join('-')} · tiros ${r.s.tiros.join('-')} · pases buenos ${r.s.pasesOk.join('-')} · ${(Date.now() - t0) / 1000}s`);
  sinErrores(errors); await ctx.close();
});

/* ---------- 3. controles ---------- */
test('teclado: las flechas mueven al jugador y J pasa el balón', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await empezar(page);
  await page.evaluate(() => { G.saque = null; G.ctrl.protegido = 10; });
  const x0 = await page.evaluate(() => G.ctrl.x);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(600); await page.keyboard.up('ArrowLeft');
  const x1 = await page.evaluate(() => G.ctrl.x);
  assert(x1 < x0 - 1, `no se movió con la flecha izquierda (${x0} → ${x1})`);
  await page.keyboard.down('KeyJ'); await page.waitForTimeout(80); await page.keyboard.up('KeyJ');
  assert(await page.evaluate(() => G.stats.pases[0]) === 1, 'J no hizo un pase');
  sinErrores(errors); await ctx.close();
});

test('pantalla táctil: el joystick mueve y el botón Pase pasa', async () => {
  const ctx = await fresh({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const { page, errors } = await openGame(ctx, srv.url);
  await empezar(page);
  await page.evaluate(() => { G.saque = null; G.ctrl.protegido = 10; });
  const x0 = await page.evaluate(() => G.ctrl.x);
  // arrastrar el joystick hacia la izquierda (eventos de puntero táctiles)
  const toque = (sel, tipo, x, y, id) => page.evaluate(({ sel, tipo, x, y, id }) => {
    document.querySelector(sel).dispatchEvent(new PointerEvent(tipo, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
  }, { sel, tipo, x, y, id });
  await toque('#zonaStick', 'pointerdown', 150, 280, 1);
  await toque('#zonaStick', 'pointermove', 60, 280, 1);
  const tact = await page.evaluate(() => ({ mx: TACT.mx, sprint: TACT.sprint }));
  assert(tact.mx < -.9 && tact.sprint, 'el joystick no marca izquierda con sprint: ' + JSON.stringify(tact));
  await page.waitForTimeout(600);
  await toque('#zonaStick', 'pointerup', 60, 280, 1);
  const x1 = await page.evaluate(() => G.ctrl.x);
  assert(x1 < x0 - 1, `no se movió con el joystick (${x0} → ${x1})`);
  const b = await page.$('.b[data-b="pass"]'); const bb = await b.boundingBox();
  await toque('.b[data-b="pass"]', 'pointerdown', bb.x + 20, bb.y + 20, 2);
  await page.waitForTimeout(80);
  await toque('.b[data-b="pass"]', 'pointerup', bb.x + 20, bb.y + 20, 2);
  assert(await page.evaluate(() => G.stats.pases[0]) === 1, 'el botón Pase no hizo un pase');
  sinErrores(errors); await ctx.close();
});

test('mando: el stick mueve y A pasa el balón', async () => {
  const ctx = await fresh();
  const init = () => {
    window.__pad = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), connected: true, id: 'Mando de prueba', mapping: 'standard', index: 0 };
    navigator.getGamepads = () => [window.__pad];
  };
  const { page, errors } = await openGame(ctx, srv.url, { init });
  await empezar(page);
  await page.evaluate(() => { G.saque = null; G.ctrl.protegido = 10; });
  const x0 = await page.evaluate(() => G.ctrl.x);
  await page.evaluate(() => { __pad.axes[0] = -1; });
  await page.waitForTimeout(600);
  await page.evaluate(() => { __pad.axes[0] = 0; });
  const x1 = await page.evaluate(() => G.ctrl.x);
  assert(x1 < x0 - 1, `no se movió con el stick (${x0} → ${x1})`);
  await page.evaluate(() => { __pad.buttons[0].pressed = true; });
  const f0 = await page.evaluate(() => G.frames); await page.waitForFunction(f => G.frames > f + 3, f0);
  await page.evaluate(() => { __pad.buttons[0].pressed = false; });
  assert(await page.evaluate(() => G.stats.pases[0]) === 1, 'el botón A no hizo un pase');
  sinErrores(errors); await ctx.close();
});

test('defendiendo: "Pase" cambia al compañero más cercano al balón', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    nuevoPartido(9); G.saque = null;
    const r = G.eqs[1].pl[9]; r.x = 20; r.z = 0; G.balon.dueno = null; tomar(r); G.balon.x = 19.5; G.balon.z = 0;
    const lejos = G.eqs[0].pl[9]; lejos.x = -30; controlar(lejos);
    const cerca = G.eqs[0].pl[2]; cerca.x = 18; cerca.z = 1;
    Object.assign(G.prueba, { activo: true, pass: true }); G.avanzar(1); G.prueba.activo = false;
    return G.ctrl === cerca;
  });
  assert(r, 'no se cambió al jugador más cercano al balón');
  await ctx.close();
});

/* ---------- 4. guardado protegido ---------- */
const leer = (page, k) => page.evaluate(k => KV.get(k), k);
const escribir = (page, k, v) => page.evaluate(([k, v]) => KV.set(k, v), [k, v]);

test('guardado: ajustes y resultados se conservan al cerrar y volver a abrir', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await a.page.evaluate(async () => { DATOS.ajustes.cam = 'arriba'; DATOS.ajustes.dif = 2; await registrarPartido(3, 1); await registrarPartido(0, 0); });
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const r = await b.page.evaluate(() => ({ cam: DATOS.ajustes.cam, dif: DATOS.ajustes.dif, e: DATOS.estad, h: DATOS.historial.length, estado: SAVE.estado }));
  assert(r.cam === 'arriba' && r.dif === 2, 'los ajustes no se conservaron: ' + JSON.stringify(r));
  assert(r.e.jugados === 2 && r.e.ganados === 1 && r.e.empatados === 1 && r.e.gf === 3 && r.e.gc === 1, 'las estadísticas no se conservaron: ' + JSON.stringify(r.e));
  assert(r.h === 2 && r.estado === 'ok', 'historial o estado mal: ' + JSON.stringify(r));
  const meta = await leer(b.page, 'save_meta');
  assert(meta && meta.v === 1, 'falta la versión del guardado');
  sinErrores(b.errors); await ctx.close();
});

test('guardado: al terminar un partido se guarda y se crea una copia de seguridad', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await empezar(page);
  await page.evaluate(async () => { G.pausa = true; G.eqs[0].goles = 2; G.reloj = 5399.9; G.saque = null; G.avanzar(5); await colaGuardado; });
  const r = await page.evaluate(async () => ({ e: DATOS.estad, copias: (await bakList()).map(b => b.tipo), final: !$('capa').hidden && $('capa').textContent.includes('Final del partido') }));
  assert(r.final, 'no se muestra la pantalla final');
  assert(r.e.jugados === 1 && r.e.ganados === 1, 'no se registró el partido: ' + JSON.stringify(r.e));
  assert(r.copias.includes('partido'), 'no se creó la copia tras el partido: ' + r.copias);
  sinErrores(errors); await ctx.close();
});

test('guardado dañado al abrir: se aparta y se recupera la última copia', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await a.page.evaluate(async () => { await registrarPartido(1, 0); });
  await escribir(a.page, 'save', 'js:{"v":1,"estad":{"jugados":"mucho"'); // texto cortado a medias
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const r = await b.page.evaluate(async () => ({ estado: SAVE.estado, e: DATOS.estad, claves: await KV.keys() }));
  assert(r.estado === 'recuperado', 'no se recuperó: ' + r.estado);
  assert(r.e.jugados === 1, 'no se recuperó el partido jugado');
  assert(r.claves.some(k => k.startsWith('danado_')), 'no se apartó el guardado dañado');
  await ctx.close();
});

test('guardado: datos con daños graves no se escriben encima de los buenos', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  await page.evaluate(async () => { await registrarPartido(2, 2); });
  const antes = await leer(page, 'save');
  const ok = await page.evaluate(async () => { DATOS.estad.jugados = -5; return guardarAhora(); });
  assert(ok === false, 'guardó datos dañados');
  assert(await leer(page, 'save') === antes, 'el guardado bueno cambió');
  await ctx.close();
});

test('guardado de una versión más nueva: no se sobrescribe', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  const futuro = 'js:' + JSON.stringify({ v: 99, ajustes: { cam: 'lejos' }, estad: { jugados: 7 }, algoNuevo: true });
  await escribir(a.page, 'save', futuro); await a.page.close();
  const b = await openGame(ctx, srv.url);
  const r = await b.page.evaluate(async () => ({ estado: SAVE.estado, cam: DATOS.ajustes.cam, ok: await guardarAhora() }));
  assert(r.estado === 'futuro' && r.ok === false, 'debería abrir sin guardar: ' + JSON.stringify(r));
  assert(r.cam === 'lejos', 'debería respetar los ajustes de la versión nueva');
  assert(await leer(b.page, 'save') === futuro, 'se modificó el guardado de la versión nueva');
  await ctx.close();
});

test('guardado sin número de versión (formato antiguo): se convierte y se abre', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await escribir(a.page, 'save', JSON.stringify({ ajustes: { cam: 'arriba' }, estad: { jugados: 1, ganados: 1, empatados: 0, perdidos: 0, gf: 2, gc: 0 }, historial: [] }));
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const r = await b.page.evaluate(() => ({ estado: SAVE.estado, v: DATOS.v, cam: DATOS.ajustes.cam, j: DATOS.estad.jugados }));
  assert(r.estado === 'ok' && r.v === 1 && r.cam === 'arriba' && r.j === 1, 'no se convirtió bien: ' + JSON.stringify(r));
  await ctx.close();
});

test('restaurar una copia guarda antes lo que había', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(async () => {
    await registrarPartido(1, 0);              // copia "partido" con 1 jugado
    await registrarPartido(0, 3);              // ahora hay 2 jugados
    const L = await bakList(), vieja = L.filter(b => b.tipo === 'partido').sort((a, b) => a.t - b.t)[0];
    const ok = await bakRestore(vieja.k);
    return { ok, j: DATOS.estad.jugados, tipos: (await bakList()).map(b => b.tipo) };
  });
  assert(r.ok && r.j === 1, 'no se restauró la copia: ' + JSON.stringify(r));
  assert(r.tipos.includes('reemplazo'), 'no se guardó copia antes de restaurar');
  await ctx.close();
});

test('dos pestañas: solo la última que se abre guarda', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url); const b = await openGame(ctx, srv.url);
  await a.page.waitForFunction(() => !SAVE.dueno, null, { timeout: 5000 });
  const ra = await a.page.evaluate(() => guardarAhora()), rb = await b.page.evaluate(() => guardarAhora());
  assert(ra === false && rb === true, `la pestaña vieja guardó (${ra}) o la nueva no (${rb})`);
  await ctx.close();
});

// versiones publicadas: sus datos guardados tienen que abrirse en la versión actual
test('compatibilidad: los datos de cada versión publicada se abren en la actual', async () => {
  const lista = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/compat.json'), 'utf8'));
  for (const v of lista) {
    const ctx = await fresh();
    const viejo = await openGame(ctx, srv.url + 'v/' + v.commit + '.html');
    await viejo.page.evaluate(async () => { DATOS.ajustes.cam = 'lejos'; await registrarPartido(2, 1); });
    await viejo.page.close();
    const nuevo = await openGame(ctx, srv.url);
    const r = await nuevo.page.evaluate(() => ({ estado: SAVE.estado, cam: DATOS.ajustes.cam, j: DATOS.estad.jugados, gf: DATOS.estad.gf }));
    assert(r.estado === 'ok' && r.cam === 'lejos' && r.j === 1 && r.gf === 2, `versión ${v.nombre} (${v.commit}): ${JSON.stringify(r)}`);
    sinErrores(nuevo.errors);
    await ctx.close();
  }
  if (!lista.length) console.log('      (todavía no hay versiones publicadas en tests/compat.json)');
});

/* ---------- ejecutar ---------- */
const filtro = process.argv.slice(2).join(' ').toLowerCase();
const elegidas = tests.filter(t => !filtro || t.name.toLowerCase().includes(filtro));
srv = await serve(); browser = await launch();
let fallos = 0; const t0 = Date.now();
for (const t of elegidas) {
  const s = Date.now();
  try { await t.fn(); console.log(`  ✓ ${t.name} (${((Date.now() - s) / 1000).toFixed(1)} s)`); }
  catch (e) { fallos++; console.log(`  ✗ ${t.name}\n      ${String(e.message || e).split('\n').join('\n      ')}`); }
}
await browser.close(); await srv.close();
console.log(`\n${elegidas.length - fallos} de ${elegidas.length} pruebas bien · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fallos ? 1 : 0);
