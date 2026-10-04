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
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url, { portada: true });
  const p0 = await page.evaluate(() => ({ portada: !!document.querySelector('.ini-pulsa') && !$('bJugar'), menu3d: !!R.menu }));
  assert(p0.portada, 'no aparece la portada "Pulsa cualquier botón"');
  assert(p0.menu3d, 'no se creó la escena del menú');
  await page.keyboard.press('Enter');
  const r = await page.evaluate(() => ({ n: G.todos.length, ini: !$('capa').hidden && !!$('bJugar'), ver: SAVE.estado }));
  assert(r.n === 22, 'debería haber 22 jugadores y hay ' + r.n);
  assert(r.ini, 'al pulsar una tecla no aparece el menú principal');
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
      const choques = [['#marcador', '#radar'], ['#radar', '#bPausa'], ['#marcador', '#bPausa'], ['.b[data-b="pass"]', '.b[data-b="shot"]'], ['.b[data-b="pass"]', '.b[data-b="through"]'], ['.b[data-b="pass"]', '.b[data-b="long"]'], ['.b[data-b="long"]', '.b[data-b="through"]'], ['.b[data-b="long"]', '.b[data-b="shot"]'], ['.b[data-b="pass"]', '.b[data-b="sprint"]'], ['.b[data-b="through"]', '.b[data-b="shot"]'], ['.b[data-b="through"]', '.b[data-b="sprint"]'], ['.b[data-b="shot"]', '.b[data-b="sprint"]'], ['#stickBase', '.b[data-b="pass"]']].filter(([a, b]) => choca(a, b));
      return { choques, tactil: document.body.classList.contains('tactil'), botones: ['.b[data-b="pass"]', '.b[data-b="shot"]', '.b[data-b="through"]', '.b[data-b="long"]', '.b[data-b="sprint"]', '#stickBase', '#marcador'].filter(s => !ver(s)), scroll: document.documentElement.scrollWidth > innerWidth };
    });
    assert(r.tactil, `${viewport.width}x${viewport.height}: no se muestran los controles táctiles`);
    assert(!r.botones.length, `${viewport.width}x${viewport.height}: se salen de la pantalla: ${r.botones}`);
    assert(!r.scroll, 'la página se desplaza de lado');
    assert(!r.choques.length, `${viewport.width}x${viewport.height}: elementos encimados: ${JSON.stringify(r.choques)}`);
    sinErrores(errors); await ctx.close();
  }
});

test('menú principal: páginas, teclado, mando y volver', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const pag = () => page.evaluate(() => APP.pagMenu);
  // con el teclado: la primera flecha enfoca una baldosa y E / Q cambian de página
  await page.keyboard.press('ArrowRight');
  const f1 = await page.evaluate(() => document.activeElement.className);
  assert(/tile/.test(f1), 'la flecha no enfoca una baldosa: ' + f1);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1000);
  assert(await pag() === 1, 'E no pasa a la página de Carreras');
  const f2 = await page.evaluate(() => document.activeElement.dataset.id);
  assert(f2 === 'dt', 'en Carreras debería enfocarse la carrera de técnico: ' + f2);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1000);
  assert(await pag() === 2, 'la flecha desde el borde no pasa a la página siguiente');
  await page.keyboard.press('KeyQ'); await page.keyboard.press('KeyQ'); await page.waitForTimeout(1000);
  assert(await pag() === 0, 'Q no vuelve a la primera página');
  // las pestañas también cambian de página, y la página se ve
  await page.click('.mp-tab[data-i="3"]'); await page.waitForTimeout(1000);
  const vis = await page.evaluate(() => { const r = document.querySelector('[data-acc="ajustes"]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; });
  assert(vis && await pag() === 3, 'la pestaña Más no muestra su página');
  // Intro elige y Esc vuelve
  await page.focus('[data-acc="ajustes"]'); await page.keyboard.press('Enter');
  assert(await page.evaluate(() => !!document.querySelector('.barra h2') && document.querySelector('.barra h2').textContent === 'Ajustes'), 'Intro no abre Ajustes');
  await page.keyboard.press('Escape');
  assert(await page.evaluate(() => !!$('mpPags') && APP.pagMenu === 3), 'Esc no vuelve al menú en la misma página');
  // el fondo del menú no se pone en marcha al pulsar Esc
  assert(await page.evaluate(() => G.pausa && document.body.classList.contains('en-menu')), 'Esc en el menú reanudó el partido de fondo');
  // mando (simulado): la cruceta mueve y A elige
  await page.evaluate(() => {
    const bt = () => Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: bt() };
    navigator.getGamepads = () => [window.__pad];
  });
  const pulsa = async i => { await page.evaluate(i => { __pad.buttons[i].pressed = true; }, i); await page.waitForTimeout(80); await page.evaluate(i => { __pad.buttons[i].pressed = false; }, i); await page.waitForTimeout(80); };
  await pulsa(4); await page.waitForTimeout(900);
  assert(await pag() === 2, 'LB no cambia de página');
  await pulsa(0);
  assert(await page.evaluate(() => !$('mpPags') && !!DATOS.estrella), 'A no abre la baldosa enfocada (Equipo Estrella)');
  await pulsa(1);
  assert(await page.evaluate(() => !!$('mpPags')), 'B no vuelve al menú principal');
  sinErrores(errors); await ctx.close();
});

/* ---------- reglas: faltas, tiros libres, penaltis y tarjetas ---------- */
test('faltas: tiro libre con barrera, penalti, tarjetas y expulsión', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const out = { libre: [], penalti: [] };
    const falta = (usuario, semilla, x, z, dentro) => {
      nuevoPartido({ semilla, usuario }); G.pausa = false; G.avanzar(400); G.saque = null;
      const A = G.eqs[0], D = G.eqs[1], o = A.pl[9], p = D.pl[5];
      o.x = dentro ? 40 : x; o.z = dentro ? 3 : z; o.cara = 0; p.x = o.x - 1; p.z = o.z; G.balon.dueno = null; tomar(o);
      cometerFalta(p, o, true, true);
      let w = 0; while (G.pendiente && w++ < 400) G.avanzar(1);
      G.avanzar(3);
      const sq = G.saque, info = { tipo: sq && sq.tipo, muro: sq && sq.muro ? sq.muro.length : 0, dist: 99, goles0: A.goles };
      if (sq && sq.muro) info.dist = Math.min(...sq.muro.map(m => hyp(m.p.x - G.balon.x, m.p.z - G.balon.z)));
      if (usuario === 0) { Object.assign(G.prueba, { activo: true, shot: true }); G.avanzar(40); Object.assign(G.prueba, { shot: false }); }
      let i = 0; while (i < 900 && G.saque === sq && G.fase === 'juego') { G.avanzar(10); i += 10; }
      info.salio = G.saque !== sq; info.tiros = G.stats.tiros[0]; info.pend = !!G.pendiente;
      return info;
    };
    for (let s = 1; s <= 4; s++) { out.libre.push(falta(s % 2 ? 0 : -1, s, 30, 6, false)); out.penalti.push(falta(s % 2 ? 0 : -1, s, 0, 0, true)); }
    // tarjetas: amarilla, doble amarilla = roja, y el expulsado sale del campo
    nuevoPartido({ semilla: 9, usuario: 0 }); G.pausa = false; G.avanzar(300);
    const d = G.eqs[1].pl[4], c0 = G.ctrl; d.id = 9001; G.ctrl.id = 9002;
    sacarTarjeta(d, 'am'); const tras1 = { am: d.am, exp: !!d.exp, n: G.eqs[1].pl.length };
    sacarTarjeta(d, 'am'); const tras2 = { exp: !!d.exp, n: G.eqs[1].pl.length, todos: G.todos.length, rojas: G.stats.rojas[1], amar: G.stats.amarillas[1] };
    // el jugador que manejas es expulsado: pasas a manejar a otro
    const mio = G.ctrl; sacarTarjeta(mio, 'ro'); const ctrlNuevo = G.ctrl && G.ctrl !== mio && !G.ctrl.exp;
    G.avanzar(60 * 20);
    const sale = Math.abs(d.z) > 36;
    const res = resultadoPartido();
    return { out, tras1, tras2, ctrlNuevo, sale, rojasRes: Object.values(res.jug).filter(j => j.ro).length, n0: G.eqs[0].pl.length, fase: G.fase };
  });
  for (const k of ['libre', 'penalti']) for (const i of r.out[k]) {
    assert(i.tipo === (k === 'libre' ? 'falta' : 'penalti'), `${k}: debería haber ${k} y hay ${i.tipo}`);
    assert(i.salio, `${k}: se quedó parado sin cobrarse: ${JSON.stringify(i)}`);
    if (k === 'penalti') assert(i.tiros >= 1, `penalti: debería terminar en tiro: ${JSON.stringify(i)}`);
  }
  assert(r.out.libre.filter(i => i.tiros >= 1).length >= 3, 'el tiro libre a tiro debería chutarse casi siempre: ' + JSON.stringify(r.out.libre));
  assert(r.out.libre.every(i => i.muro >= 2 && i.dist > 8.5), 'el tiro libre a tiro debe tener barrera a más de 9 pasos: ' + JSON.stringify(r.out.libre));
  assert(r.tras1.am === 1 && !r.tras1.exp && r.tras1.n === 11, 'una amarilla no expulsa: ' + JSON.stringify(r.tras1));
  assert(r.tras2.exp && r.tras2.n === 10 && r.tras2.todos === 22 && r.tras2.rojas === 1 && r.tras2.amar === 1, 'la doble amarilla debería expulsar: ' + JSON.stringify(r.tras2));
  assert(r.ctrlNuevo, 'al expulsar al jugador que manejas debería pasar a otro');
  assert(r.sale, 'el expulsado debería salir del campo');
  assert(r.rojasRes === 2 && r.n0 === 10, 'el resultado debe recordar las rojas: ' + JSON.stringify({ rojasRes: r.rojasRes, n0: r.n0 }));
  sinErrores(errors); await ctx.close();
});

test('faltas en un partido entero: se pitan pero no demasiadas, y el partido termina', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    let f = 0, am = 0, ro = 0, term = 0;
    for (let s = 1; s <= 4; s++) {
      nuevoPartido({ semilla: 20 + s, usuario: -1 }); G.autoplay = true; G.pausa = false;
      for (let i = 0; i < 9 * 60 * 60 && G.fase !== 'fin'; i += 60) G.avanzar(60); // 5 min de reloj + paradas
      f += G.stats.faltas[0] + G.stats.faltas[1]; am += G.stats.amarillas[0] + G.stats.amarillas[1]; ro += G.stats.rojas[0] + G.stats.rojas[1]; term += G.fase === 'fin' ? 1 : 0;
    }
    return { f, am, ro, term };
  });
  assert(r.term === 4, 'los partidos con faltas deben terminar: ' + JSON.stringify(r));
  assert(r.f >= 8 && r.f <= 140, 'cantidad rara de faltas en 4 partidos: ' + r.f);
  assert(r.ro <= 5, 'demasiadas rojas: ' + r.ro);
  sinErrores(errors); await ctx.close();
});

test('celular en horizontal: los menús caben en la pantalla y las pestañas van en una columna', async () => {
  const ctx = await fresh({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const { page, errors } = await openGame(ctx, srv.url);
  const pant = {
    'menú principal': 'menuPrincipal()', amistoso: 'menuAmistoso()', ajustes: 'menuAjustes(menuPrincipal)', copias: 'menuCopias()', torneos: 'menuTorneos()',
    'Equipo Estrella': "menuEstrella(); hubEstrella('inicio')", 'carrera de técnico': "nuevaCarreraDT(0, 'Yo'); hubDT('inicio')",
  };
  const malos = [];
  for (const [n, js] of Object.entries(pant)) {
    const r = await page.evaluate(js => { eval(js); return new Promise(ok => setTimeout(() => {
      const capa = $('capa'), barra = capa.querySelector('.barra'), cu = capa.querySelector('.contenido') || capa.querySelector('.cuerpo');
      const rail = capa.querySelector('.con-rail > .chips');
      ok({ capaScroll: capa.scrollHeight - capa.clientHeight, pagina: document.documentElement.scrollHeight - innerHeight, ancho: document.documentElement.scrollWidth - innerWidth,
        barra: !barra || barra.getBoundingClientRect().top >= 0, rail: rail ? getComputedStyle(rail).flexDirection : null, cuerpo: cu ? cu.scrollHeight - cu.clientHeight : 0 });
    }, 250)); }, js);
    if (r.capaScroll > 2 || r.pagina > 2 || r.ancho > 2 || !r.barra) malos.push(n + ': ' + JSON.stringify(r));
    if (n === 'Equipo Estrella' && r.rail !== 'column') malos.push('las pestañas de Equipo Estrella deberían ir en columna: ' + r.rail);
    if (['amistoso', 'ajustes', 'copias', 'torneos', 'Equipo Estrella', 'menú principal'].includes(n) && r.cuerpo > 2) malos.push(n + ' no cabe sin bajar (' + r.cuerpo + ' px)');
  }
  assert(!malos.length, 'pantallas que no caben: \n' + malos.join('\n'));
  sinErrores(errors); await ctx.close();
});

test('exportar e importar la partida a otro sitio', async () => {
  const a = await fresh(); const A = await openGame(a, srv.url);
  const archivo = await A.page.evaluate(async () => {
    menuEstrella(); DATOS.estrella.monedas = 123456; DATOS.estad.jugados = 7; await guardarAhora();
    nuevaCarreraDT(3, 'Exportador'); await guardarDT(true);
    return exportarPartida();
  });
  await a.close();
  // otro navegador (sin nada guardado): primero un archivo malo, luego el bueno
  const b = await fresh(); const B = await openGame(b, srv.url);
  const r = await B.page.evaluate(async t => {
    const malo = await importarPartida('{"hola":1}');
    const roto = await importarPartida(JSON.stringify({ ...JSON.parse(t), save: 'js:{rotos' }));
    const antes = DATOS.estad.jugados;
    const bueno = await importarPartida(t);
    return { malo: malo.ok, roto: roto.ok, antes, bueno: bueno.ok };
  }, archivo);
  assert(!r.malo && !r.roto && r.antes === 0, 'debería rechazar archivos malos sin tocar nada: ' + JSON.stringify(r));
  assert(r.bueno, 'no importó la partida buena');
  await B.page.close();
  const C = await openGame(b, srv.url);
  const d = await C.page.evaluate(async () => { const r = await cargarRanura('dt'); return { jugados: DATOS.estad.jugados, monedas: DATOS.estrella && DATOS.estrella.monedas, tecnico: r.datos && r.datos.tecnico, copias: (await bakList()).length }; });
  assert(d.jugados === 7 && d.monedas === 123456 && d.tecnico === 'Exportador', 'al reabrir no está la partida importada: ' + JSON.stringify(d));
  sinErrores([...B.errors, ...C.errors]); await b.close();
});

test('instalable como app: manifiesto, iconos y lista de archivos sin conexión', async () => {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  assert(man.display === 'fullscreen' && man.orientation === 'landscape' && man.icons.length >= 3, 'manifiesto incompleto');
  for (const ic of man.icons) assert(fs.existsSync(path.join(ROOT, ic.src)), 'falta el icono ' + ic.src);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert(html.includes('rel="manifest"') && html.includes('name="viewport"'), 'index.html sin manifiesto o sin viewport');
  const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
  const faltan = scripts.filter(f => !sw.includes("'" + f + "'"));
  assert(!faltan.length, 'sw.js no guarda para jugar sin conexión: ' + faltan.join(', '));
  new Function(sw.replace(/self\./g, 'void 0&&self.'));
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
  assert(r.sprint.max > r.trote.max + .1, 'al esprintar los toques deberían ser más largos: ' + JSON.stringify(r));
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

test('giros con el balón al esprintar: se completan sin trabarse ni perder el balón', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const out = [];
    for (const grados of [45, 90, 135, 180]) {
      nuevoPartido(3); G.saque = null;
      const p = G.eqs[0].pl[9]; G.todos.forEach(q => { if (q !== p) { q.x = q.eq.i ? 48 : -48; q.z = q.k * 3 - 15; } });
      p.x = -10; p.z = 0; p.cara = 0; G.balon.dueno = null; tomar(p); p.protegido = 99; controlar(p);
      Object.assign(G.prueba, { activo: true, mx: 1, mz: 0, sprint: true }); G.avanzar(90);
      const a = grados * Math.PI / 180, ux = Math.cos(a), uz = Math.sin(a);
      Object.assign(G.prueba, { mx: ux, mz: uz });
      let t = 0, ok = false;
      for (; t < 180 && G.balon.dueno === p; t++) {
        G.avanzar(1);
        const sp = hyp(p.vx, p.vz), cos = sp > .5 ? (p.vx * ux + p.vz * uz) / sp : 0;
        if (cos > .94 && sp > 3 && ((G.balon.x - p.x) * ux + (G.balon.z - p.z) * uz) > 0) { ok = true; break; }
      }
      out.push({ grados, ok, s: +(t / 60).toFixed(2), conBalon: G.balon.dueno === p });
    }
    G.prueba.activo = false;
    return out;
  });
  for (const x of r) assert(x.ok && x.conBalon, `giro de ${x.grados}° con el balón: no se completó en 3 s o perdió el balón: ` + JSON.stringify(x));
  assert(r[0].s < r[3].s, 'un giro suave debería ser más rápido que una media vuelta: ' + JSON.stringify(r));
  await ctx.close();
});

test('primer toque: un pase fuerte se controla y no se escapa', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    nuevoPartido(5); G.saque = null;
    const p = G.eqs[0].pl[9]; G.todos.forEach(q => { if (q !== p) { q.x = q.eq.i ? 48 : -48; q.z = q.k * 3 - 15; } });
    p.x = 0; p.z = 0; p.vx = p.vz = 0; controlar(p);
    Object.assign(G.balon, { dueno: null, x: -12, y: BR, z: 0, vx: 18, vy: 0, vz: 0, tipo: 'pase', destino: p, pateador: G.eqs[0].pl[5], id: 99 });
    G.avanzar(90);
    return { dueno: G.balon.dueno === p, dist: hyp(G.balon.x - p.x, G.balon.z - p.z) };
  });
  assert(r.dueno && r.dist < 2, 'el pase fuerte no se controló: ' + JSON.stringify(r));
  await ctx.close();
});

test('resistencia: esprintar sin parar cansa y baja la velocidad punta; trotar recupera', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    nuevoPartido(6); G.saque = null;
    const p = G.eqs[0].pl[5], gk = G.eqs[0].pl[0]; G.balon.dueno = null; G.balon.x = gk.x; G.balon.z = gk.z; tomar(gk); gk.retener = 999;
    G.todos.forEach(q => { if (q !== p && !q.por) { q.x = q.eq.i ? 48 : -48; q.z = q.k * 3 - 15; } });
    p.x = -40; p.z = -20; controlar(p);
    Object.assign(G.prueba, { activo: true, mx: 1, mz: 0, sprint: true }); G.avanzar(60);
    const v1 = hyp(p.vx, p.vz), e1 = p.energia;
    Object.assign(G.prueba, { mx: 0, mz: 1 }); G.avanzar(300); Object.assign(G.prueba, { mx: 0, mz: -1 }); G.avanzar(300); // 10 s más esprintando
    const v2 = hyp(p.vx, p.vz), e2 = p.energia;
    Object.assign(G.prueba, { mx: 0, mz: 0, sprint: false }); G.avanzar(600);
    G.prueba.activo = false;
    return { v1, e1, v2, e2, e3: p.energia };
  });
  assert(r.e2 < .6 && r.v2 < r.v1 - .3, 'esprintar no cansa: ' + JSON.stringify(r));
  assert(r.e3 > r.e2 + .3, 'no se recupera al descansar: ' + JSON.stringify(r));
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
    return { saque: G.saque && G.saque.tipo, saca: G.saque && G.saque.tomador.eq.i, bx: G.balon.x, marcador: $('gL').textContent + ' - ' + $('gV').textContent, fase: G.fase }; });
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

test('pantalla previa: medias, alineación sobre el campo y banquillo antes del partido', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    DATOS.ajustes.previa = 'si';
    AMISTOSO.local = APP.mundo.clubes.find(c => c.nombre === 'Real Madrid').id; AMISTOSO.visita = APP.mundo.clubes.find(c => c.nombre === 'Arsenal').id; AMISTOSO.lado = 0;
    empezarAmistoso();
    const capa = $('capa'), previa = !!capa.querySelector('.previa');
    return { previa, pausa: G.pausa, huecos: capa.querySelectorAll('.cancha-est .hueco').length, ovr: [...capa.querySelectorAll('.pv-ovr')].map(e => parseInt(e.textContent)), banquillo: capa.querySelectorAll('.banquillo > span').length, jugar: !!capa.querySelector('[data-acc="jugar"]') };
  });
  assert(r.previa && r.pausa && r.jugar, 'no aparece la pantalla previa: ' + JSON.stringify(r));
  assert(r.huecos === 11, 'la alineación debería mostrar 11 jugadores: ' + r.huecos);
  assert(r.ovr.length === 2 && r.ovr.every(o => o >= 60 && o <= 99), 'faltan las medias de los equipos: ' + JSON.stringify(r.ovr));
  assert(r.banquillo >= 5, 'debería verse el banquillo: ' + r.banquillo);
  await page.click('[data-acc="jugar"]');
  const d = await page.evaluate(() => ({ pausa: G.pausa, modo: G.cfg && G.cfg.modo, capa: $('capa').hidden }));
  assert(!d.pausa && d.modo === 'amistoso' && d.capa, 'al tocar "¡A jugar!" debería empezar el partido: ' + JSON.stringify(d));
  // con el ajuste en No, el partido empieza directamente
  const e = await page.evaluate(() => { DATOS.ajustes.previa = 'no'; G.pausa = true; empezarAmistoso(); return { pausa: G.pausa, previa: !$('capa').hidden && !!$('capa').querySelector('.previa') }; });
  assert(!e.pausa && !e.previa, 'con la previa apagada no debería salir: ' + JSON.stringify(e));
  sinErrores(errors); await ctx.close();
});

test('ayudas en pantalla: nombres sobre los jugadores y línea de apunte en los saques', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    salirDeMenus(); G.pausa = false; G.saque = null; G.avanzar(300); G.pausa = false;
    const visibles = () => Array.from(document.querySelectorAll('#etiquetas .et')).filter(e => !e.hidden).map(e => e.textContent);
    const conBalon = () => { actualizarEtiquetas(); return visibles(); };
    // el jugador que manejas aparece con su nombre
    const yo = G.ctrl, a = conBalon();
    DATOS.ajustes.nombres = 'no'; const b = conBalon(); DATOS.ajustes.nombres = 'si';
    // tiro libre con el jugador cerca del área: sale la línea de apunte
    const o = G.eqs[0].pl[9], p = G.eqs[1].pl[5]; o.x = 30; o.z = 6; p.x = 29; p.z = 6; G.balon.dueno = null; tomar(o);
    cometerFalta(p, o, true, true); let w = 0; while (G.pendiente && w++ < 400) G.avanzar(1); G.avanzar(5);
    Object.assign(G.prueba, { activo: true, mx: 1, mz: 0 }); G.avanzar(2);
    actualizarLineaApunte(); const linea = !!R.linea && R.linea.visible;
    // al chutar, la línea desaparece
    G.saque = null; actualizarLineaApunte(); const luego = R.linea.visible;
    return { a, yo: yo.nombre, b, linea, luego };
  });
  assert(r.a.includes(r.yo), 'debería verse el nombre del jugador que manejas: ' + JSON.stringify(r.a));
  assert(r.b.length === 0, 'con "Nombres" en No no debería verse ninguno: ' + JSON.stringify(r.b));
  assert(r.linea && !r.luego, 'la línea de apunte debería verse en el tiro libre y desaparecer al sacar: ' + JSON.stringify(r));
  sinErrores(errors); await ctx.close();
});

test('compañeros: presionan solos al defender y se desmarcan al atacar', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    nuevoPartido({ semilla: 4, usuario: 0 }); G.pausa = false; G.avanzar(400); G.saque = null;
    // el rival tiene el balón en nuestro campo: aunque no aprietes Presión, un compañero cierra
    const rival = G.eqs[1].pl[9]; rival.x = -20; rival.z = 4; G.balon.dueno = null; tomar(rival); G.balon.x = -19.5; G.balon.z = 4;
    G.eqs[0].pl.forEach(q => { if (!q.por) { q.x = -5 - Math.random() * 10; q.z = (Math.random() - .5) * 30; } });
    G.avanzar(3);
    const pres = !!(G.eqs[0].presiona || G.eqs[0].presiona2);
    // contrapresión: justo después de perder el balón presionan los tres más cercanos
    G.eqs[0].perdioT = G.t; G.avanzar(2);
    const contra = !!G.eqs[0].presiona && !!G.eqs[0].presiona2;
    // atacando: con el balón en campo rival, varios delanteros/medios se desmarcan en profundidad
    const yo = G.eqs[0].pl[9]; yo.x = 10; yo.z = 0; G.balon.dueno = null; tomar(yo); G.balon.x = 10.5; G.balon.z = 0;
    Object.assign(G.prueba, { activo: true, mx: 1, mz: 0 });
    let max = 0; for (let i = 0; i < 20; i++) { G.avanzar(30); max = Math.max(max, G.eqs[0].pl.filter(q => q.desmarque).length); if (G.balon.dueno !== yo) break; }
    return { pres, contra, desmarcados: max };
  });
  assert(r.pres, 'al defender, un compañero debería presionar sin que lo pidas');
  assert(r.contra, 'tras perder el balón deberían presionar dos o más (contrapresión)');
  assert(r.desmarcados >= 1, 'al atacar, algún compañero debería desmarcarse en profundidad: ' + r.desmarcados);
  sinErrores(errors); await ctx.close();
});

test('esprintando con el balón, pasar y tirar siempre salen (no se queda la pierna a medias)', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const res = await page.evaluate(() => {
    const out = {};
    for (const boton of ['pass', 'shot', 'through', 'long']) {
      let fallos = 0, prueba = 0;
      for (let n = 0; n < 30; n++) {
        G.pausa = true; nuevoPartido(n + 1); G.saque = null; Object.assign(G.prueba, { activo: true, mx: 1, mz: 0, sprint: true, pass: false, shot: false, long: false, through: false });
        const p = G.eqs[0].pl[9], b = G.balon;
        G.todos.forEach(q => { if (q !== p && !q.por) { q.x = q.eq.i ? 45 : -45; q.z = 30; } q.vx = q.vz = 0; });
        p.x = -30; p.z = 0; p.cara = 0; b.dueno = null; tomar(p); b.x = p.x + .55; b.z = 0; p.protegido = 20; controlar(p);
        G.avanzar(40 + (n * 7) % 70);
        for (const q of G.todos) if (q !== p && !q.por) { q.x = q.eq.i ? 45 : -45; q.z = 30; }
        if (b.dueno !== p) continue;
        prueba++; const n0 = G.stats.pases[0] + G.stats.tiros[0];
        G.prueba[boton] = true; G.avanzar(boton === 'shot' || boton === 'through' ? 10 : 3); G.prueba[boton] = false;
        for (let t = 0; t < 100 && G.stats.pases[0] + G.stats.tiros[0] === n0; t++) G.avanzar(1);
        if (G.stats.pases[0] + G.stats.tiros[0] === n0) fallos++;
      }
      out[boton] = { fallos, prueba };
    }
    return out;
  });
  for (const [b, r] of Object.entries(res)) { assert(r.prueba >= 20, `${b}: pocas pruebas válidas (${r.prueba})`); assert(r.fallos === 0, `${b}: ${r.fallos} de ${r.prueba} veces no hizo nada al esprintar`); }
  sinErrores(errors); await ctx.close();
});

test('ningún jugador se hunde en el césped (barrida, caído, estirada del portero)', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    G.pausa = true;
    const minY = idx => {
      let m = 9; const v = new THREE.Vector3(), M = new THREE.Matrix4();
      for (const k of ['rTorso', 'rShort', 'rCabeza', 'rMuslo', 'rTibia', 'rBota', 'rBrazo', 'rAntebrazo']) {
        const mesh = R[k]; mesh.geometry.computeBoundingBox(); const bb = mesh.geometry.boundingBox;
        for (const i of (mesh.count === G.todos.length * 2 ? [idx * 2, idx * 2 + 1] : [idx])) {
          mesh.getMatrixAt(i, M);
          for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { v.set(x, y, z).applyMatrix4(M); if (v.y < m) m = v.y; }
        }
      }
      return m;
    };
    const p = G.eqs[0].pl[5], k = G.eqs[0].pl[0], i = G.todos.indexOf(p), ik = G.todos.indexOf(k), out = {};
    const poner = f => { p.entrada = null; p.suelo = 0; p.tropiezo = 0; p.vx = p.vz = 0; p.patadaT = 0; k.estirada = null; for (const q of G.todos) { q.x = 40; q.z = 30; } p.x = 0; p.z = 0; p.cara = 0; k.x = 0; k.z = 0; f(); dibujarReal(); };
    for (const [n, f] of Object.entries({ quieto: () => { }, corre: () => { p.vx = 7; }, barrida: () => { p.entrada = 'barrida'; p.vx = 5; }, caido: () => { p.suelo = .4; }, pie: () => { p.entrada = 'pie'; }, patada: () => { p.patadaT = .15; } })) { poner(f); out[n] = minY(i); }
    poner(() => { k.estirada = { z: 2, y: 1, t: .3, reac: .1, T: .5, lado: 1, para: true }; }); out.estirada = minY(ik);
    return out;
  });
  for (const [n, y] of Object.entries(r)) assert(y > -.06, `en "${n}" una parte del jugador se hunde ${(-y).toFixed(2)} m en el césped`);
  sinErrores(errors); await ctx.close();
});

test('pase bombeado: el botón lo lanza por el aire hasta el compañero', async () => {
  const ctx = await fresh({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); const { page, errors } = await openGame(ctx, srv.url);
  await empezar(page);
  await prepararJugada(page, { x: -10, z: 0 });
  await page.evaluate(() => { G.pausa = false; const m = G.eqs[0].pl[7]; m.x = 16; m.z = 4; m.vx = m.vz = 0; Object.assign(G.prueba, { activo: true, mx: 1, mz: 0 }); G.avanzar(2); G.prueba.mx = 0; });
  const bb = await (await page.$('.b[data-b="long"]')).boundingBox();
  const toque = (tipo, id) => page.evaluate(({ tipo, id, x, y }) => document.querySelector('.b[data-b="long"]').dispatchEvent(new PointerEvent(tipo, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true })), { tipo, id, x: bb.x + 20, y: bb.y + 20 });
  await toque('pointerdown', 9); await page.waitForTimeout(80); await toque('pointerup', 9);
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => ({ tipo: G.balon.tipo, alto: G.balon.y, vy: G.balon.vy, pases: G.stats.pases[0] }));
  assert(r.pases === 1 && r.tipo === 'largo' && (r.alto > .5 || r.vy > 1), 'el pase bombeado no sale por el aire: ' + JSON.stringify(r));
  sinErrores(errors); await ctx.close();
});

test('regates: cambio de ritmo, recorte y ruleta conservan el balón', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const res = {};
  for (const [n, sx, sz] of [['ritmo', 1, 0], ['recorte', 0, 1], ['ruleta', -1, 0]]) {
    let bien = 0, nombres = new Set(), giro = 0;
    for (let s = 1; s <= 5; s++) {
      await prepararJugada(page, { x: 0, z: 0, semilla: s });
      const r = await page.evaluate(({ sx, sz }) => {
        const p = G.ctrl, b = G.balon;
        Object.assign(G.prueba, { activo: true, mx: 1, mz: 0 }); G.avanzar(40);
        Object.assign(G.prueba, { skill: { x: sx, z: sz }, mx: sx, mz: sz }); G.avanzar(1);
        const aviso = G.ultimoAviso; G.avanzar(45);
        return { tiene: b.dueno === p, aviso, dir: Math.atan2(p.vz, p.vx), haciaX: Math.cos(Math.atan2(p.vz, p.vx)) * sx + Math.sin(Math.atan2(p.vz, p.vx)) * sz };
      }, { sx, sz });
      if (r.tiene) bien++; nombres.add(r.aviso); if (r.haciaX > .7) giro++;
    }
    res[n] = { bien, nombres: [...nombres], giro };
  }
  assert(res.ritmo.bien >= 4 && res.recorte.bien >= 4 && res.ruleta.bien >= 4, 'los regates pierden el balón: ' + JSON.stringify(res));
  assert(res.ritmo.nombres.includes('Cambio de ritmo') && res.recorte.nombres.includes('Recorte') && res.ruleta.nombres.includes('Ruleta'), 'no hizo el regate esperado: ' + JSON.stringify(res));
  assert(res.recorte.giro >= 4 && res.ruleta.giro >= 4, 'tras el regate debería ir hacia el lado elegido: ' + JSON.stringify(res));
  sinErrores(errors); await ctx.close();
});

test('pase en profundidad: raso o bombeado al hueco por delante del compañero', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  for (const alto of [false, true]) {
    await prepararJugada(page, { x: -10, z: 0 });
    const r = await page.evaluate(alto => {
      const p = G.ctrl, m = G.eqs[0].pl[7], b = G.balon; m.x = 5; m.z = 6; m.vx = 3; m.vz = 0;
      Object.assign(G.prueba, { activo: true, mx: 1, mz: 0, through: true }); G.avanzar(alto ? 25 : 1);
      Object.assign(G.prueba, { through: false }); G.avanzar(12);
      const info = { tipo: b.tipo, destino: b.destino === m, delante: m.recibe ? (m.recibe.x - m.x) * p.eq.dir : -99 };
      G.avanzar(150); info.recibe = b.dueno === m;
      return info;
    }, alto);
    assert(r.tipo === (alto ? 'largo' : 'pase') && r.destino, `${alto ? 'bombeado' : 'raso'}: no fue al compañero: ` + JSON.stringify(r));
    assert(r.delante > 1.5, 'el pase debería ir al hueco, por delante del receptor: ' + JSON.stringify(r));
    assert(r.recibe, 'el receptor debería llegar al balón: ' + JSON.stringify(r));
  }
  sinErrores(errors); await ctx.close();
});

test('pantalla táctil: deslizar sobre Sprint hace un regate y Disparo al defender es entrada', async () => {
  const ctx = await fresh({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const { page, errors } = await openGame(ctx, srv.url);
  await empezar(page);
  const toque = (sel, tipo, x, y, id) => page.evaluate(({ sel, tipo, x, y, id }) => {
    document.querySelector(sel).dispatchEvent(new PointerEvent(tipo, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
  }, { sel, tipo, x, y, id });
  await prepararJugada(page, { x: 0, z: 0 });
  await page.evaluate(() => { G.pausa = false; G.prueba.activo = false; });
  const sb = await (await page.$('.b[data-b="sprint"]')).boundingBox(), cx = sb.x + sb.width / 2, cy = sb.y + sb.height / 2;
  await toque('.b[data-b="sprint"]', 'pointerdown', cx, cy, 5);
  await toque('.b[data-b="sprint"]', 'pointermove', cx, cy + 40, 5);
  await page.waitForTimeout(150);
  await toque('.b[data-b="sprint"]', 'pointerup', cx, cy + 40, 5);
  const reg = await page.evaluate(() => ({ aviso: G.ultimoAviso, cd: G.ctrl.regCD }));
  assert(['Recorte', 'Ruleta', 'Cambio de ritmo'].includes(reg.aviso), 'deslizar sobre Sprint no hizo un regate: ' + JSON.stringify(reg));
  // defendiendo: el botón Disparo hace una entrada (no barrida)
  const def = await page.evaluate(() => {
    G.pausa = true; nuevoPartido(3); G.saque = null; const r = G.eqs[1].pl[9]; G.balon.dueno = null; tomar(r); controlar(G.eqs[0].pl[5]);
    actualizarBotones(); return document.querySelector('.b[data-b="shot"]').textContent;
  });
  const shb = await (await page.$('.b[data-b="shot"]')).boundingBox();
  await toque('.b[data-b="shot"]', 'pointerdown', shb.x + 20, shb.y + 20, 6);
  const t = await page.evaluate(() => ({ tackle: TACT.tackle, shot: TACT.shot }));
  await toque('.b[data-b="shot"]', 'pointerup', shb.x + 20, shb.y + 20, 6);
  assert(def === 'Entrada' && t.tackle && !t.shot, 'al defender Disparo debería ser Entrada: ' + JSON.stringify({ def, t }));
  sinErrores(errors); await ctx.close();
});

test('cámara de televisión por defecto (y quien tenía la de antes pasa a ella)', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const nuevo = DATOS.ajustes.cam;
    const viejo = { ajustes: { cam: 'diag' }, estad: {}, historial: [] }; arreglarDatos(viejo);
    const elegida = { ajustes: { cam: 'lejos' }, estad: {}, historial: [] }; arreglarDatos(elegida);
    return { nuevo, viejo: viejo.ajustes.cam, elegida: elegida.ajustes.cam };
  });
  assert(r.nuevo === 'tele' && r.viejo === 'tele' && r.elegida === 'lejos', 'cámara por defecto mal: ' + JSON.stringify(r));
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

/* ---------- 3b. mundo, motor configurable y menús ---------- */
test('base de datos: 8 ligas con sus clubes reales y plantillas completas', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const M = APP.mundo;
    return { ligas: M.ligas.map(l => l.nombre + ':' + l.clubes.length), plantillas: M.clubes.every(c => c.plantilla.length >= 23 && c.plantilla.filter(id => M.jug[id].pos === 'POR').length >= 2),
      nombres: ['Real Madrid', 'Manchester City', 'Paris Saint-Germain', 'Juventus', 'Ajax', 'Benfica', 'América', 'Bayern München'].every(n => M.clubes.some(c => c.nombre === n)),
      fuerte: fuerzaDe(M, M.clubes.find(c => c.nombre === 'Real Madrid')), debil: fuerzaDe(M, M.clubes.find(c => c.nombre === 'Alverca')), valido: validarMundo(M) };
  });
  assert(r.ligas.length === 8, 'deberían ser 8 ligas: ' + r.ligas);
  assert(r.nombres, 'faltan clubes conocidos');
  assert(r.plantillas, 'hay plantillas incompletas o sin porteros');
  assert(r.fuerte > r.debil + 8, `poca diferencia entre un grande y un pequeño (${r.fuerte} / ${r.debil})`);
  assert(!r.valido.length, 'mundo no válido: ' + r.valido);
  sinErrores(errors); await ctx.close();
});

test('motor: todas las formaciones juegan un partido completo sin errores', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const M = APP.mundo, out = [];
    for (const f of Object.keys(FORMACIONES)) {
      const a = M.clubes[0], b = M.clubes[25]; a.formacion = f; b.formacion = f === '3-5-2' ? '5-3-2' : '4-4-2';
      let fin = null;
      G.pausa = true; nuevoPartido({ semilla: 9, local: equipoParaPartido(M, a.id), visita: equipoParaPartido(M, b.id), usuario: -1, alTerminar: res => { fin = res; } });
      DATOS.ajustes.dur = 3; let n = 0, parte2 = false;
      while (!fin && n < 20000) { G.avanzar(100); n += 100; if (G.parte === 2) parte2 = true; }
      out.push({ f, fin: !!fin, parte2, dir: G.eqs[0].dir, pases: fin && fin.stats.pases[0], jug: fin && Object.keys(fin.jug).length });
      a.formacion = b.formacion = '4-3-3';
    }
    G.autoplay = false;
    return out;
  });
  for (const x of r) {
    assert(x.fin && x.jug === 22, `${x.f}: el partido no terminó bien: ` + JSON.stringify(x));
    assert(x.parte2 && x.dir === -1, `${x.f}: no hubo cambio de campo en el descanso: ` + JSON.stringify(x));
    assert(x.pases > 10, `${x.f}: casi no hubo pases`);
  }
  sinErrores(errors); await ctx.close();
});

test('un solo jugador (carrera de jugador): solo controlas al tuyo y puedes pedir el balón', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const M = APP.mundo, c = M.clubes[3], once = alineacionDe(M, c), yo = once[9];
    G.pausa = true; nuevoPartido({ semilla: 4, local: equipoParaPartido(M, c.id, once), visita: equipoParaPartido(M, 40), usuario: 0, jugadorId: yo, alTerminar() { } });
    const p = G.unJugador; G.saque = null;
    const mate = G.eqs[0].pl.find(q => q !== p && !q.por);
    G.balon.dueno = null; tomar(mate); mate.protegido = 9;
    const ctrl1 = G.ctrl === p;
    p.x = mate.x + 12; p.z = mate.z;
    Object.assign(G.prueba, { activo: true, pass: true }); G.avanzar(1); G.prueba.pass = false;
    let recibe = false; for (let i = 0; i < 180 && !recibe; i++) { G.avanzar(1); if (G.balon.dueno === p) recibe = true; }
    // al perderla no cambia a otro jugador
    const rival = G.eqs[1].pl[5]; G.balon.dueno = null; G.balon.x = rival.x; G.balon.z = rival.z; tomar(rival); G.avanzar(60);
    G.prueba.activo = false;
    return { hay: !!p, ctrl1, recibe, sigue: G.ctrl === p };
  });
  assert(r.hay && r.ctrl1, 'no se controla al jugador de la carrera');
  assert(r.recibe, 'pedir el balón no hizo que te lo pasaran');
  assert(r.sigue, 'el control pasó a otro jugador');
  await ctx.close();
});

test('amistoso desde el menú: elegir equipos, jugar, simular el resto y ver el resultado', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await page.click('[data-acc="modo"][data-id="amistoso"]');
  await page.click('[data-acc="elegir"][data-cual="visita"]');
  await page.click('.chip:has-text("Liga MX")');
  await page.click('.club:has-text("Toluca")');
  const txt = await page.textContent('.vs');
  assert(txt.includes('Toluca') && txt.includes('Real Madrid'), 'no se eligió el equipo: ' + txt);
  await page.click('[data-acc="jugar"]');
  await page.waitForFunction(() => !G.pausa && APP.enPartido);
  const r1 = await page.evaluate(() => ({ nombres: G.eqs.map(e => e.nombre), hud: document.getElementById('nomV').textContent }));
  assert(r1.nombres[1] === 'Toluca' && r1.hud === 'TOL', 'el partido no es con los equipos elegidos: ' + JSON.stringify(r1));
  await page.click('#bPausa'); await page.click('#bSimular');
  await page.waitForFunction(() => document.querySelector('.marcador-final'));
  const r2 = await page.evaluate(() => ({ txt: document.querySelector('.marcador-final').textContent, jugados: DATOS.estad.jugados }));
  assert(r2.txt.includes('Toluca') && r2.jugados === 1, 'no se mostró o registró el resultado: ' + JSON.stringify(r2));
  sinErrores(errors); await ctx.close();
});

test('ranuras de guardado: se guardan comprimidas, se recuperan de la copia y no se escriben si están dañadas', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  const r = await page.evaluate(async () => {
    const M = generarMundo(1);
    const ok1 = await guardarRanura('mundo', M, true);
    M.clubes[0].nombre = 'Club Cambiado'; const ok2 = await guardarRanura('mundo', M, true);
    const raw = await KV.get('r_mundo');
    const malo = JSON.parse(JSON.stringify(M)); malo.jug = null; const ok3 = await guardarRanura('mundo', malo, true);
    const sigue = (await cargarRanura('mundo')).datos.clubes[0].nombre;
    await KV.set('r_mundo', 'gz:basura');
    const rec = await cargarRanura('mundo');
    return { ok1, ok2, ok3, comprimida: raw.startsWith('gz:') && raw.length < 600000, sigue, estado: rec.estado, nombre: rec.datos && rec.datos.clubes[0].nombre, danado: (await KV.keys()).some(k => k.startsWith('danado_r_mundo')) };
  });
  assert(r.ok1 && r.ok2 && r.ok3 === false, 'guardar ranura: ' + JSON.stringify(r));
  assert(r.comprimida, 'la ranura no está comprimida');
  assert(r.sigue === 'Club Cambiado', 'los datos dañados sustituyeron a los buenos');
  assert(r.estado === 'recuperada' && r.nombre === 'Real Madrid', 'no se recuperó de la copia anterior: ' + JSON.stringify(r));
  assert(r.danado, 'no se apartó la ranura dañada');
  await ctx.close();
});

/* ---------- 3c. modos de juego ---------- */
test('torneos: liga, copa y Copa de Campeones llegan a un campeón y se guardan', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(async () => {
    const M = APP.mundo, out = {};
    for (const [tipo, eq] of [['liga', ligaDe(M, 'por').clubes], ['copa', mejoresClubes(M, 16)], ['campeones', mejoresClubes(M, 16)]]) {
      const T = crearTorneo(tipo, eq, eq[2], tipo); let n = 0;
      while (!T.terminado && n++ < 100) { simularResto_T(T); cerrarJornada(T); }
      out[tipo] = { terminado: T.terminado, campeon: eq.includes(T.campeon), goleadores: Object.keys(T.goleadores).length, rondas: T.rondas ? T.rondas.length : 0 };
    }
    APP.torneo = crearTorneo('copa', mejoresClubes(M, 8), mejoresClubes(M, 8)[0], 'Copa de 8'); await guardarTorneo();
    hubTorneo();
    return { out, guardado: !!(await KV.get('save')), hub: !!document.querySelector('[data-acc="jugar"]') };
  });
  for (const t of ['liga', 'copa', 'campeones']) assert(r.out[t].terminado && r.out[t].campeon && r.out[t].goleadores > 3, t + ': ' + JSON.stringify(r.out[t]));
  assert(r.out.copa.rondas === 4 && r.out.campeones.rondas === 3, 'rondas de eliminatoria mal: ' + JSON.stringify(r.out));
  assert(r.hub, 'el torneo no ofrece jugar el partido del usuario');
  sinErrores(errors); await ctx.close();
});

test('carrera de técnico: temporada completa, fichaje, alineación y se reabre igual', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  const r1 = await a.page.evaluate(async () => {
    nuevaCarreraDT(APP.mundo.clubes.find(c => c.nombre === 'Sevilla').id, 'Prueba');
    const M = CDT.mundo, c = miClub(); c.presupuesto = 2e8;
    // fichar a un jugador de otro club
    const objetivo = M.jug.filter(j => j.club >= 0 && j.club !== CDT.club && j.pos === 'DC').sort((x, y) => y.med - x.med)[5];
    hacerOferta(objetivo.id); document.querySelectorAll('[data-acc="ofrecer"]')[5].click();
    const fichado = objetivo.club === CDT.club;
    c.formacion = '4-4-2'; c.alineacion = null;
    let n = 0; while (!temporadaTerminada(CDT) && n++ < 50) jugarPartidoDT(true);
    const pj = Object.values(CDT.ligas[c.liga].tabla).find(f => f.id === CDT.club).pj;
    finTemporadaDT();
    await guardarDT(true);
    return { fichado, pj, temp: CDT.temporada, hist: CDT.historial.length, club: CDT.club, n: CDT.noticias.length, valido: validarMundo(CDT.mundo) };
  });
  assert(r1.fichado, 'no se pudo fichar con presupuesto de sobra');
  assert(r1.pj === 38 && r1.temp === 2026 && r1.hist === 1, 'la temporada no se completó bien: ' + JSON.stringify(r1));
  assert(!r1.valido.length, 'el mundo de la carrera quedó dañado: ' + r1.valido);
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const r2 = await b.page.evaluate(async () => { await menuCarreraDT(); return { club: CDT.club, temp: CDT.temporada, hist: CDT.historial.length, form: miClub().formacion, hub: !!document.querySelector('[data-acc="jugar"]') }; });
  assert(r2.club === r1.club && r2.temp === 2026 && r2.hist === 1 && r2.form === '4-4-2' && r2.hub, 'la carrera no se reabrió igual: ' + JSON.stringify(r2));
  sinErrores(a.errors); sinErrores(b.errors); await ctx.close();
});

test('carrera de jugador: crear jugador, jugar controlándolo, progresar y cambiar de club', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(async () => {
    nuevaCarreraJug({ n1: 'Gabo', n: 'Prueba', nac: 'MX', pos: 'DC' }, APP.mundo.clubes.find(c => c.nombre === 'Toluca').id);
    const yo = yoJ(); fijarMedia(yo, 88); yo.pot = 95;
    partidoJug(false);
    const enPartido = { solo: G.unJugador && G.unJugador.id === CJ.yo, ctrl: G.ctrl === G.unJugador, nombre: G.unJugador && G.unJugador.nombre };
    G.pausa = true; simularResto();
    const tras = { pj: yoJ().st.pj, notas: CJ.notas.length };
    let n = 0; while (!temporadaTerminada(CJ) && n++ < 50) partidoJug(true);
    finTemporadaJug();
    const ofertas = CJ.ofertas.length;
    if (ofertas) responderOfertaJug(0, true);
    await guardarJug(true);
    return { enPartido, tras, ofertas, club: CJ.club, edad: yoJ().edad, hist: CJ.historial.length, valido: validarMundo(CJ.mundo) };
  });
  assert(r.enPartido.solo && r.enPartido.ctrl && r.enPartido.nombre === 'Prueba', 'en el partido no controlas a tu jugador: ' + JSON.stringify(r.enPartido));
  assert(r.tras.pj === 1 && r.tras.notas === 1, 'el partido jugado no contó: ' + JSON.stringify(r.tras));
  assert(r.edad === 18 && r.hist === 1, 'no avanzó la temporada: ' + JSON.stringify(r));
  assert(r.ofertas > 0, 'un jugador de media 88 debería recibir ofertas');
  assert(!r.valido.length, 'mundo dañado: ' + r.valido);
  sinErrores(errors); await ctx.close();
});

test('Equipo Estrella: equipo inicial, sobres con monedas del juego, partidos y divisiones', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(async () => {
    menuEstrella(); const E = DATOS.estrella;
    const ini = { cartas: E.cartas.length, once: E.once.filter(u => cartaPorUid(E, u)).length, monedas: E.monedas };
    abrirSobre('plata'); const trasSobre = { cartas: E.cartas.length, monedas: E.monedas };
    E.monedas = 0; abrirSobre('oro'); const sinDinero = E.cartas.length;
    for (let i = 0; i < PARTIDOS_DIVISION; i++) partidoEstrella(true);
    // un partido de verdad con las cartas
    partidoEstrella(false); const motor = { nombre: G.eqs[0].nombre, jug: G.eqs[0].pl.length };
    G.pausa = true; simularResto();
    await colaGuardado;
    return { ini, trasSobre, sinDinero, motor, monedas: E.monedas, pj: E.temp.pj, division: E.division, guardado: (await KV.get('save')).includes('estrella') };
  });
  assert(r.ini.cartas >= 11 && r.ini.once === 11 && r.ini.monedas === 20000, 'equipo inicial mal: ' + JSON.stringify(r.ini));
  assert(r.trasSobre.monedas === 18000 && r.trasSobre.cartas > r.ini.cartas, 'el sobre no se cobró o no dio cartas: ' + JSON.stringify(r.trasSobre));
  assert(r.sinDinero === r.trasSobre.cartas, 'se abrió un sobre sin monedas suficientes');
  assert(r.monedas > 0 && r.pj === 1, 'los partidos no dieron monedas o no contaron: ' + JSON.stringify(r));
  assert(r.motor.nombre === 'Mi Equipo Estrella' && r.motor.jug === 11, 'el partido no usa tus cartas');
  assert(r.guardado, 'Equipo Estrella no se guardó');
  sinErrores(errors); await ctx.close();
});

test('cartas: base de estrellas y leyendas, atributos con fórmula, sobres especiales y cartas antiguas', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    const malos = [];
    const nombres = new Set();
    for (const e of CARTAS_ESTRELLA) {
      const c = cartaDeEstrella(e);
      if (!PAISES[e.nac]) malos.push('país ' + e.nac + ' ' + e.corto);
      if (!PERFIL_CARTA[e.pos]) malos.push('puesto ' + e.pos + ' ' + e.corto);
      if (Math.abs(mediaCarta(e.pos, c.st) - e.med) > 1) malos.push('media ' + e.corto + ' ' + mediaCarta(e.pos, c.st) + '≠' + e.med);
      if (Object.values(c.at).some(v => !(v >= 10 && v <= 99))) malos.push('atributos ' + e.corto);
      if (!(e.hab >= 1 && e.hab <= 5 && e.pm >= 1 && e.pm <= 5)) malos.push('estrellas ' + e.corto);
      const club = clubCarta(e.club); if (!club.corto || club.corto === '???') malos.push('club ' + e.club);
      if (e.tipo === 'normal' || e.tipo === 'leyenda') { if (nombres.has(e.nombre)) malos.push('repetido ' + e.nombre); nombres.add(e.nombre); }
      if (!retratoSVG(c.look, 0xff0000).includes('<svg')) malos.push('retrato ' + e.corto);
    }
    const cuenta = t => CARTAS_ESTRELLA.filter(e => e.tipo === t).length;
    // cada línea de cartas especiales encuentra a su jugador
    const sinBase = ESPECIALES_TXT.trim().split('\n').length - ESPECIALES.length;
    const flashMessio = CARTAS_ESTRELLA.filter(e => e.tipo === 'flashback' && e.corto === 'Messio').length;
    // sobres especiales
    menuEstrella(); const E = DATOS.estrella; E.monedas = 1e6;
    const antes = E.cartas.length;
    for (let i = 0; i < 6; i++) abrirSobre('estrella');
    const nuevas = E.cartas.slice(antes), deEstrellas = nuevas.filter(c => c.s).length;
    abrirSobre('leyenda');
    const ultima = E.cartas[E.cartas.length - 1];
    // una carta guardada por una versión anterior (sin atributos de carta ni aspecto) se completa sola
    const vieja = { uid: 999, j: APP.mundo.jug[3].id, nombre: 'Viejo', nombre1: 'Un', pos: 'MC', med: 70, nac: 'ES', club: 'Real Madrid', liga: 'esp', at: { vel: 60, tir: 60, pas: 75, reg: 70, def: 62, par: 10 }, piel: 0xd9a27b, pelo: 0x1d1510, num: 8 };
    const html = cartaHTML(vieja);
    // el partido usa los atributos de las cartas de estrellas
    autoOnce(E); const eq = equipoEstrella(E);
    const okMotor = eq.jugadores.every(j => j && j.atrib && j.atrib.vel > 0 && j.piel != null);
    hubEstrella('album'); const album = document.querySelectorAll('#capa .fc').length;
    return { malos, sinBase, flashMessio, n: { normal: cuenta('normal'), figura: cuenta('figura'), leyenda: cuenta('leyenda'), flashback: cuenta('flashback'), cumbre: cuenta('cumbre'), promesa: cuenta('promesa') }, deEstrellas, nuevas: nuevas.length, ultima: { s: ultima.s, med: ultima.med }, vieja: { st: !!vieja.st, look: !!vieja.look, hab: vieja.hab, html: html.includes('fc-plata') }, okMotor, album };
  });
  assert(!r.malos.length, 'problemas en la base de estrellas: ' + r.malos.slice(0, 10).join(', '));
  assert(r.n.normal >= 250 && r.n.leyenda >= 150 && r.n.figura >= 30 && r.n.flashback >= 50 && r.n.cumbre >= 5 && r.n.promesa >= 8, 'pocas cartas: ' + JSON.stringify(r.n));
  assert(r.sinBase === 0, 'hay cartas especiales sin su jugador: ' + r.sinBase);
  assert(r.flashMessio >= 2 && r.flashMessio <= 3, 'Messio debería tener 2 o 3 Flashback: ' + r.flashMessio);
  assert(r.deEstrellas >= 12, 'el sobre de estrellas debería dar estrellas conocidas: ' + r.deEstrellas + ' de ' + r.nuevas);
  assert(r.ultima.s && r.ultima.med >= 86, 'el sobre leyenda debería dar una carta 86+: ' + JSON.stringify(r.ultima));
  assert(r.vieja.st && r.vieja.look && r.vieja.hab >= 1 && r.vieja.html, 'una carta antigua no se completó: ' + JSON.stringify(r.vieja));
  assert(r.okMotor, 'el once de cartas no llega bien al motor');
  assert(r.album === r.n.normal, 'el álbum debería mostrar todas las estrellas: ' + r.album);
  sinErrores(errors); await ctx.close();
});

test('plantilla en el campo: intercambiar, meter reservas y no repetir jugador', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(() => {
    menuEstrella(); const E = DATOS.estrella;
    const base = darCartaEstrella(E, CARTAS_ESTRELLA.find(e => e.tipo === 'normal' && e.corto === 'Messio'));
    const flash = darCartaEstrella(E, CARTAS_ESTRELLA.find(e => e.tipo === 'flashback' && e.corto === 'Messio'));
    autoOnce(E);
    const messiosEnOnce = E.once.filter(u => [base.uid, flash.uid].includes(u)).length;
    hubEstrella('equipo');
    const huecos = document.querySelectorAll('.cancha-est .hueco').length, mini = document.querySelectorAll('.cancha-est .fc-mini').length;
    // tocar dos cartas del campo las intercambia
    const a0 = E.once[1], b0 = E.once[2];
    document.querySelector('.cancha-est [data-k="1"]').click(); const sel = APP.selHueco;
    document.querySelector('.cancha-est [data-k="2"]').click();
    const cambiadas = E.once[1] === b0 && E.once[2] === a0 && APP.selHueco == null;
    // seleccionar un hueco y tocar una reserva la mete
    const fuera = E.cartas.find(c => !E.once.includes(c.uid) && personaCarta(c) !== personaCarta(base));
    tocarHueco(3); tocarReserva(fuera.uid); const metida = E.once[3] === fuera.uid;
    // la otra versión del mismo jugador no puede entrar
    const enOnce = E.once.includes(base.uid) ? base : flash, otra = enOnce === base ? flash : base;
    const k = E.once.findIndex(u => u !== enOnce.uid); tocarHueco(k); tocarReserva(otra.uid);
    const noRepite = !E.once.includes(otra.uid);
    return { messiosEnOnce, huecos, mini, sel, cambiadas, metida, noRepite };
  });
  assert(r.messiosEnOnce === 1, 'el once automático no debe repetir jugador: ' + r.messiosEnOnce);
  assert(r.huecos === 11 && r.mini === 11, 'el campo debería mostrar 11 cartas: ' + JSON.stringify(r));
  assert(r.sel === 1 && r.cambiadas, 'tocar dos cartas no las intercambió: ' + JSON.stringify(r));
  assert(r.metida, 'no se metió la reserva');
  assert(r.noRepite, 'dejó poner dos versiones del mismo jugador');
  sinErrores(errors); await ctx.close();
});

test('editor dentro de cada modo: carrera de técnico, carrera de jugador y Equipo Estrella', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  const r = await page.evaluate(async () => {
    const clic = sel => { const b = document.querySelector('#capa ' + sel); if (!b) throw new Error('no está ' + sel); b.click(); };
    const cambiar = (sel, v) => { const el = document.querySelector('#capa ' + sel); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
    // carrera de técnico
    nuevaCarreraDT(0, 'Yo'); hubDT('editor');
    const pestana = !!document.querySelector('#capa [data-acc="tab"][data-id="editor"].sel');
    const mio = plantillaDe(CDT.mundo, CDT.mundo.clubes[0]); mio[2].les = 5; mio[3].san = 2;
    clic('[data-acc="edCurar"]'); clic('[data-acc="edPerdonar"]');
    cambiar('[data-k="presuM"]', '321.5');
    const dt = { curado: mio[2].les === 0, perdonado: mio[3].san === 0, presu: CDT.mundo.clubes[0].presupuesto };
    clic('[data-acc="edClub"][data-id="1"]'); const enClub = document.querySelector('.barra h2').textContent;
    clic('[data-acc="__atras"]'); const vuelve = !!document.querySelector('#capa [data-acc="tab"][data-id="editor"].sel');
    // cambiar un jugador de la carrera no toca la base de datos
    const id = mio[0].id, antes = APP.mundo.jug[id].med; ED.destino = 'dt'; fijarMedia(CDT.mundo.jug[id], 99);
    const baseIntacta = APP.mundo.jug[id].med === antes;
    // carrera de jugador: editar tu jugador
    nuevaCarreraJug({ n1: 'Gabo', n: 'Prueba', nac: 'MX', pos: 'DC' }, 3); hubJug('editor');
    clic('[data-acc="edYo"]'); const editaYo = document.querySelector('.barra h2').textContent === 'Editar jugador';
    cambiar('[data-k="med"]', '91'); const media = yoJ().med;
    // Equipo Estrella: monedas, añadir una carta buscándola y editarla
    menuEstrella(); hubEstrella('editor'); const E = DATOS.estrella;
    cambiar('[data-cambio="edEst"][data-k="monedas"]', '777777');
    clic('[data-acc="edMas"][data-n="5000"]');
    cambiar('[data-cambio="edBuscar"]', 'messio');
    const n0 = E.cartas.length; clic('[data-acc="edAnadir"][data-clave]');
    const nueva = E.cartas[E.cartas.length - 1], st0 = { ...nueva.st }, med0 = nueva.med;
    fichaCarta(nueva.uid); cambiar('[data-cambio="edCarta"][data-k="med"]', String(med0 - 2));
    const subio = nueva.med === med0 - 2 && Object.keys(st0).every(k => nueva.st[k] === Math.max(15, st0[k] - 2));
    await colaGuardado;
    return { pestana, dt, enClub, vuelve, baseIntacta, editaYo, media, monedas: E.monedas, anadida: E.cartas.length === n0 + 1 && /Messio/.test(nueva.nombre), subio };
  });
  assert(r.pestana && r.vuelve, 'la pestaña Editor de la carrera de técnico no funciona: ' + JSON.stringify(r));
  assert(r.dt.curado && r.dt.perdonado && r.dt.presu === 321500000, 'los atajos del editor de la carrera fallan: ' + JSON.stringify(r.dt));
  assert(r.enClub === 'Editar club', 'no abre el club desde el editor de la carrera');
  assert(r.baseIntacta, 'editar la carrera cambió la base de datos');
  assert(r.editaYo && r.media === 91, 'no se edita tu jugador en la carrera de jugador: ' + JSON.stringify(r));
  assert(r.monedas === 782777, 'las monedas no se editan bien: ' + r.monedas);
  assert(r.anadida && r.subio, 'añadir o editar cartas falla: ' + JSON.stringify(r));
  sinErrores(errors); await ctx.close();
});

test('editor: cambiar club y jugador, subir una foto, curar y se conserva al reabrir', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await a.page.evaluate(() => menuEditor());
  await a.page.click('.club:has-text("Real Madrid")');
  await a.page.fill('[data-k="estadio"]', 'Estadio de Prueba'); await a.page.press('[data-k="estadio"]', 'Tab');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR42mP8z8Dwn4EIwMg0EjQCAMN+A/3yZxuNAAAAAElFTkSuQmCC', 'base64');
  await a.page.setInputFiles('[data-cambio="escudo"]', { name: 'escudo.png', mimeType: 'image/png', buffer: png });
  await a.page.waitForFunction(() => APP.mundo.clubes[0].escudo);
  const jid = await a.page.evaluate(() => { const j = APP.mundo.jug[APP.mundo.clubes[0].plantilla[3]]; j.les = 4; editarJugador(j.id); return j.id; });
  await a.page.fill('[data-k="med"]', '95'); await a.page.press('[data-k="med"]', 'Tab');
  await a.page.click('[data-acc="curar"]');
  await a.page.setInputFiles('[data-cambio="foto"]', { name: 'foto.png', mimeType: 'image/png', buffer: png });
  await a.page.waitForFunction(id => APP.mundo.jug[id].foto, jid);
  await a.page.waitForTimeout(700); await a.page.evaluate(() => colaGuardado);
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const r = await b.page.evaluate(id => { const c = APP.mundo.clubes[0], j = APP.mundo.jug[id]; return { estadio: c.estadio, escudo: (c.escudo || '').slice(0, 15), med: j.med, les: j.les, foto: !!j.foto }; }, jid);
  assert(r.estadio === 'Estadio de Prueba' && r.escudo.startsWith('data:image/png'), 'no se guardó el club: ' + JSON.stringify(r));
  assert(r.med === 95 && r.les === 0 && r.foto, 'no se guardó el jugador: ' + JSON.stringify(r));
  sinErrores(a.errors); sinErrores(b.errors); await ctx.close();
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
  assert(meta && meta.v === 2, 'falta la versión del guardado');
  sinErrores(b.errors); await ctx.close();
});

test('guardado: al terminar un partido se guarda y se crea una copia de seguridad', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await empezar(page);
  await page.evaluate(async () => { G.pausa = true; G.eqs[0].goles = 2; G.parte = 2; G.reloj = 5399.9; G.saque = null; G.avanzar(5); await colaGuardado; });
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
  assert(r.estado === 'ok' && r.v === 2 && r.cam === 'arriba' && r.j === 1, 'no se convirtió bien: ' + JSON.stringify(r));
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
    const viejo = await openGame(ctx, srv.url + 'v/' + v.commit + '/index.html');
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
