// Pruebas automáticas de DT26. Uso: npm test (desde la carpeta dt26). Filtrar: npm test -- nube
// Cada prueba abre el juego en un navegador real sin pantalla, con datos guardados limpios.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, serve, launch, openGame, newCareer, continueCareer, simDays, simSeason, realErrors, waitMenuReady, newPlayerCareer, simDaysJug } from './harness.mjs';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

let srv, browser;
// contexto nuevo = navegador con almacenamiento vacío
async function fresh() { return browser.newContext(); }

/* ---------- 1. funcionamiento básico ---------- */
test('arranca, crea partida y la guarda sin errores', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await newCareer(page);
  const r = await page.evaluate(async () => ({ ok: await saveNow(), v: validateWorld(W) }));
  assert(r.ok, 'saveNow devolvió false');
  assert(r.v.ok, 'la partida nueva no pasa la validación: ' + r.v.fatal);
  // las vistas principales se dibujan sin errores
  await page.evaluate(() => { for (const v of ['home', 'squad', 'tactics', 'cal', 'comp', 'world', 'inbox', 'club', 'settings', 'mgr', 'locker', 'cantera', 'staff', 'sel', 'scout', 'museum', 'trophy', 'market']) go(v); });
  await page.evaluate(() => bakModal());
  assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));
  await ctx.close();
});

test('tres temporadas seguidas: la partida sigue siendo válida y se guarda', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await newCareer(page);
  for (let i = 0; i < 3; i++) {
    await simSeason(page);
    const r = await page.evaluate(async () => ({ ok: await saveNow(), v: validateWorld(W), s: W.season }));
    assert(r.ok, `no se guardó al terminar la temporada ${r.s - 1}`);
    assert(r.v.ok, `temporada ${r.s}: partida no válida: ${r.v.fatal}`);
    if (r.v.warn.length) console.log(`      aviso temporada ${r.s}: ${r.v.warn.join(', ')}`);
  }
  const L = await page.evaluate(() => bakList());
  assert(L.filter(b => b.kind === 'season').length === 3, 'deberían quedar 3 copias de inicio de temporada, hay ' + L.filter(b => b.kind === 'season').length);
  assert(L.filter(b => b.kind === 'auto').length <= 3, 'hay más de 3 copias automáticas');
  assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));
  await ctx.close();
});

test('cerrar y volver a abrir conserva exactamente la partida', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await newCareer(a.page); await simDays(a.page, 40);
  const before = await a.page.evaluate(async () => { await saveNow(); return { s: W.season, d: W.day, c: W.userClub, n: W.players.length, bal: W.clubs[W.userClub].fin.bal, inbox: W.inbox.length }; });
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  assert(await b.page.evaluate(() => !!APP.game), 'el menú no ofrece continuar la partida');
  await continueCareer(b.page);
  const after = await b.page.evaluate(() => ({ s: W.season, d: W.day, c: W.userClub, n: W.players.length, bal: W.clubs[W.userClub].fin.bal, inbox: W.inbox.length }));
  assert(JSON.stringify(before) === JSON.stringify(after), `la partida cambió al reabrir:\n antes ${JSON.stringify(before)}\n después ${JSON.stringify(after)}`);
  assert(realErrors(b.errors).length === 0, 'errores: ' + realErrors(b.errors).join('\n'));
  await ctx.close();
});

/* ---------- 2. copias de seguridad ---------- */
test('se crean copias automáticas y se puede restaurar una', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await newCareer(page);
  await page.evaluate(() => saveNow());
  const day0 = await page.evaluate(() => W.day);
  await simDays(page, 30); await page.evaluate(() => saveNow());
  const L = await page.evaluate(() => bakList());
  assert(L.some(b => b.kind === 'auto') && L.some(b => b.kind === 'season'), 'faltan copias: ' + L.map(b => b.kind));
  const first = L.filter(b => b.kind === 'auto').sort((x, y) => x.t - y.t)[0];
  assert(first.day === day0, 'la primera copia no es del principio de la partida');
  await page.evaluate(k => bakRestoreGo(k), first.k);
  await page.waitForFunction(d => W.day === d, day0);
  const L2 = await page.evaluate(() => bakList());
  assert(L2.some(b => b.kind === 'replace'), 'restaurar no guardó antes la partida actual');
  assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));
  await ctx.close();
});

test('partida dañada al abrir: se aparta y se recupera la última copia', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await newCareer(a.page); await simDays(a.page, 20);
  const club = await a.page.evaluate(async () => { await saveNow(); return W.clubs[W.userClub].name; });
  // se rompe el archivo guardado como lo haría un corte a mitad de escritura
  await a.page.evaluate(async () => { const s = await Store.get('save'); await Store.set('save', s.slice(0, Math.floor(s.length / 2))); });
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const r = await b.page.evaluate(async () => ({ game: !!APP.game, club: APP.game && APP.game.clubs[APP.game.userClub].name, notice: APP.notice && APP.notice.title, bad: (await bakList()).filter(x => x.kind === 'bad').length, menu: document.querySelector('#menu').textContent }));
  assert(r.game, 'no se recuperó ninguna partida');
  assert(r.club === club, 'se recuperó otra partida');
  assert(r.bad === 1, 'la partida dañada no se conservó aparte');
  assert(/dañada/.test(r.notice) && r.menu.includes('dañada'), 'el menú no avisa de la recuperación');
  // y al reabrir otra vez ya está todo en orden, sin repetir el aviso
  await b.page.close();
  const c = await openGame(ctx, srv.url);
  const r2 = await c.page.evaluate(() => ({ game: !!APP.game, notice: APP.notice }));
  assert(r2.game && !r2.notice, 'tras recuperar, la partida no quedó guardada como principal');
  await ctx.close();
});

test('partida dañada sin copias: no se borra al empezar otra', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await newCareer(a.page);
  await a.page.evaluate(async () => { await saveNow(); for (const b of await bakList()) await Store.del(b.k); await Store.set('bak_index', [], true); await Store.set('save', 'gz:esto-no-es-una-partida'); });
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const r = await b.page.evaluate(() => ({ game: !!APP.game, notice: APP.notice && APP.notice.title }));
  assert(!r.game && /No se pudo abrir/.test(r.notice), 'no avisó de la partida perdida');
  await newCareer(b.page);
  const bad = await b.page.evaluate(async () => (await bakList()).filter(x => x.kind === 'bad').length);
  assert(bad === 1, 'la partida dañada desapareció al empezar una nueva');
  await ctx.close();
});

test('empezar otra partida, importar o borrar deja copia de la anterior', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await newCareer(page, { lg: 0 }); await page.evaluate(() => saveNow());
  const club1 = await page.evaluate(() => W.clubs[W.userClub].name);
  await page.evaluate(() => exitToMenu()); await waitMenuReady(page);
  await newCareer(page, { lg: 1 });
  let L = await page.evaluate(() => bakList());
  assert(L.some(b => b.kind === 'replace' && b.club === club1), 'empezar una partida nueva no guardó copia de la anterior');
  await page.evaluate(() => wipeGo()); await waitMenuReady(page);
  L = await page.evaluate(() => bakList());
  assert(L.filter(b => b.kind === 'replace').length === 2, 'borrar no guardó copia');
  assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));
  await ctx.close();
});

test('un estado dañado en memoria no se escribe encima del guardado bueno', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  await newCareer(page);
  const r = await page.evaluate(async () => {
    await saveNow(); const before = await Store.get('save');
    const keep = W.players[5]; W.players[5] = null;
    const ok = await saveNow(); const after = await Store.get('save'); W.players[5] = keep;
    return { ok, same: before === after, err: SAVE.err };
  });
  assert(!r.ok && r.same, 'se guardó una partida dañada encima de la buena');
  assert(/dañados/.test(r.err), 'no se explicó el motivo');
  await ctx.close();
});

test('un guardado que encoge de golpe conserva antes el anterior', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  await newCareer(page);
  const n = await page.evaluate(async () => { await saveNow(); const m = await Store.get('save_meta'); m.len *= 5; await Store.set('save_meta', m); await saveNow(); return (await bakList()).filter(b => b.kind === 'shrink').length; });
  assert(n === 1, 'no se guardó la copia de seguridad antes del guardado sospechoso');
  await ctx.close();
});

test('partida dañada: se recupera una copia de esa misma partida, no la de otra anterior', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await newCareer(a.page, { lg: 0 }); await a.page.evaluate(() => saveNow());
  await a.page.evaluate(() => exitToMenu()); await waitMenuReady(a.page);
  await newCareer(a.page, { lg: 1 }); // la primera queda como copia "antes de sustituirla", que es más reciente que las automáticas de la segunda
  await simDays(a.page, 10);
  const club = await a.page.evaluate(async () => { await saveNow(); return W.clubs[W.userClub].name; });
  await a.page.evaluate(async () => { await Store.set('save', 'gz:roto'); });
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const got = await b.page.evaluate(() => APP.game && APP.game.clubs[APP.game.userClub].name);
  assert(got === club, `se recuperó ${got} en vez de la partida en curso (${club})`);
  await ctx.close();
});

/* ---------- 3. varias pestañas ---------- */
test('dos pestañas: la nueva trae el último progreso y la anterior deja de guardar', async () => {
  const ctx = await fresh();
  const A = await openGame(ctx, srv.url);
  await newCareer(A.page); await A.page.evaluate(() => saveNow());
  const B = await openGame(ctx, srv.url); // B abre con el guardado de este momento
  await simDays(A.page, 25); await A.page.evaluate(() => autosave()); // A sigue jugando y deja un guardado pendiente
  const dayA = await A.page.evaluate(() => W.day);
  await continueCareer(B.page);
  const r = await Promise.all([A.page.evaluate(async () => ({ ro: APP.ro, saved: await saveNow(), modal: document.querySelector('#modal').textContent })), B.page.evaluate(async () => ({ day: W.day, saved: await saveNow() }))]);
  assert(r[1].day === dayA, `la pestaña nueva abrió un progreso viejo (día ${r[1].day} en vez de ${dayA})`);
  assert(r[0].ro === 'tab' && !r[0].saved, 'la pestaña anterior sigue guardando');
  assert(/otra pestaña/.test(r[0].modal), 'la pestaña anterior no avisa');
  assert(r[1].saved, 'la pestaña nueva no puede guardar');
  await ctx.close();
});

/* ---------- 4. nube ---------- */
const cloudMock = () => {
  const store = new Map(); window.__cloud = store; window.__cloudFail = 0;
  CAP.uid = 'u1';
  CAP.db = { doc: p => ({
    async set(v) { if (window.__cloudFail && --window.__cloudFail === 0) throw new Error('corte de red'); store.set(p, JSON.parse(JSON.stringify(v))); },
    async get() { const v = store.get(p); return { exists: v !== undefined, data: () => v }; }
  }) };
};
test('nube: un corte a mitad de subida no estropea la copia anterior', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  await newCareer(page);
  await page.evaluate(cloudMock);
  const d1 = await page.evaluate(async () => { await cloudSave(); return W.day; });
  await simDays(page, 10);
  await page.evaluate(async () => { window.__cloudFail = 2; await cloudSave(); }); // falla al subir el segundo fragmento
  const r = await page.evaluate(async () => { await cloudLoad(); await cloudLoadGo(); return W.day; });
  assert(r === d1, `tras el corte se cargó algo distinto de la copia buena (día ${r}, esperado ${d1})`);
  await ctx.close();
});
test('nube: si la última copia está incompleta se usa la anterior', async () => {
  const ctx = await fresh(); const { page } = await openGame(ctx, srv.url);
  await newCareer(page);
  await page.evaluate(cloudMock);
  const d1 = await page.evaluate(async () => { await cloudSave(); return W.day; });
  await simDays(page, 10);
  const d2 = await page.evaluate(async () => { await cloudSave(); return W.day; });
  assert(d1 !== d2, 'la prueba necesita dos copias distintas');
  const r = await page.evaluate(async () => { const m = window.__cloud.get('data/users/u1/dt26save'); window.__cloud.delete('data/users/u1/dt26' + m.slot + '0'); await cloudLoad(); await cloudLoadGo(); return W.day; });
  assert(r === d1, `no se recuperó la copia anterior de la nube (día ${r}, esperado ${d1})`);
  await ctx.close();
});

/* ---------- 5. compatibilidad entre versiones ---------- */
const compat = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/compat.json'), 'utf8')).versiones;
for (const v of compat) {
  test(`partidas de la versión ${v.commit} se abren y siguen funcionando`, async () => {
    const ctx = await fresh();
    const old = await openGame(ctx, srv.url + `v/${v.commit}.html`);
    await newCareer(old.page); await simDays(old.page, 30);
    // las versiones antiguas descartaban un guardado si había otro en marcha: se reintenta hasta que entra
    const before = await old.page.evaluate(async () => { for (let i = 0; i < 50 && !(await saveNow()); i++) await new Promise(r => setTimeout(r, 100)); return { s: W.season, d: W.day, c: W.clubs[W.userClub].name, n: W.players.length }; });
    await old.page.close();
    const cur = await openGame(ctx, srv.url);
    const notice = await cur.page.evaluate(() => APP.notice);
    assert(!notice, 'la partida antigua se trató como dañada: ' + JSON.stringify(notice));
    await continueCareer(cur.page);
    const after = await cur.page.evaluate(() => ({ s: W.season, d: W.day, c: W.clubs[W.userClub].name, n: W.players.length }));
    assert(JSON.stringify(before) === JSON.stringify(after), `la partida cambió al abrirla con la versión actual:\n antes ${JSON.stringify(before)}\n después ${JSON.stringify(after)}`);
    await simDays(cur.page, 30);
    const ok = await cur.page.evaluate(async () => (await saveNow()) && validateWorld(W).ok);
    assert(ok, 'tras seguir jugando, la partida antigua no se pudo guardar');
    assert(realErrors(cur.errors).length === 0, 'errores: ' + realErrors(cur.errors).join('\n'));
    await ctx.close();
  });
}

test('una partida de una versión más nueva se abre sin guardar encima', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await newCareer(a.page);
  await a.page.evaluate(async () => { await saveNow(); const w = JSON.parse(JSON.stringify(W)); w.v = VERSION + 1; await Store.set('save', await packWorld(w)); });
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const r = await b.page.evaluate(async () => { const before = await Store.get('save'); await ACT.mcont(); const ok = await saveNow(); return { ro: APP.ro, ok, same: before === await Store.get('save') }; });
  assert(r.ro === 'newer' && !r.ok && r.same, 'se guardó encima de una partida de una versión más nueva');
  await ctx.close();
});


/* ---------- 6. modo carrera de jugador ---------- */
async function simSeasonJug(page, opt) {
  const s0 = await page.evaluate(() => W.season);
  for (let k = 0; k < 40; k++) { const r = await simDaysJug(page, 15, opt); if (r.season > s0) return r; }
  throw new Error('la temporada del modo jugador no terminó');
}

test('modo jugador: se crea, todas sus pantallas se dibujan y las del técnico no se abren', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await newPlayerCareer(page);
  const r = await page.evaluate(async () => {
    const p = W.players[W.me], seen = {};
    for (const v of ['home', 'world', 'inbox', 'cal', 'jme', 'jtrain', 'jcon', 'jclub', 'comp', 'sel', 'trophy', 'settings']) { go(v); seen[v] = UI.view; }
    const dt = {}; for (const v of ['squad', 'tactics', 'market', 'club', 'staff', 'cantera', 'editor', 'mgr', 'locker']) { go(v); dt[v] = UI.view; }
    moreSheet(); closeModal(); palOpen(); closeModal(); bakModal(); closeModal();
    return { ok: await saveNow(), v: validateWorld(W), mode: W.mode, club: p.club, uc: W.userClub, age: p.age, seen, dt, mgrOk: W.clubs[p.club].mg >= 0 };
  });
  assert(r.ok && r.v.ok, 'la partida de jugador no se guardó: ' + r.v.fatal);
  assert(r.mode === 'jug' && r.club === r.uc && r.age === 17, 'datos de inicio incorrectos: ' + JSON.stringify(r));
  assert(r.mgrOk, 'el club del jugador se quedó sin entrenador');
  for (const [v, got] of Object.entries(r.seen)) assert(got === v || (v === 'jclub' && got === 'jclub'), `la vista ${v} no se abrió (${got})`);
  for (const [v, got] of Object.entries(r.dt)) assert(['home', 'jclub'].includes(got), `la vista de técnico ${v} se abrió en modo jugador`);
  // una acción de técnico pulsada en pantalla no hace nada
  const before = await page.evaluate(() => { const c = W.clubs[W.userClub]; const b = document.createElement('button'); b.dataset.a = 'autopick'; document.body.appendChild(b); const xi = JSON.stringify(c.xi); b.click(); b.remove(); return xi === JSON.stringify(c.xi); });
  assert(before, 'una acción de técnico funcionó en modo jugador');
  assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));
  await ctx.close();
});

test('modo jugador: tres temporadas sin errores y nadie lo mueve sin su firma', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await newPlayerCareer(page, { tal: 2 });
  await page.evaluate(() => { window.__moves = []; const p = W.players[W.me]; let c = p.club;
    window.__watch = setInterval(() => {}, 1e6); window.__chk = () => { if (p.club !== c) { window.__moves.push([W.season, W.day, c, p.club, !!p.loan]); c = p.club; } }; });
  for (let i = 0; i < 3; i++) {
    // día a día comprobando que el club solo cambia por fin de contrato (queda libre)
    const s0 = await page.evaluate(() => W.season);
    for (let k = 0; k < 60; k++) {
      const r = await page.evaluate(() => { for (let d = 0; d < 8; d++) { jugFixture(W); dayW(W); window.__chk(); if (W.stop) W.stop = null; if (W.userClub < 0) return { bad: 'userClub' }; } return { s: W.season }; });
      assert(!r.bad, 'W.userClub quedó en -1 fuera del avance del mundo');
      if (r.s > s0) break;
    }
    const r = await page.evaluate(async () => ({ ok: await saveNow(), v: validateWorld(W), p: W.players[W.me], pc: W.pc, s: W.season }));
    assert(r.ok && r.v.ok, `temporada ${r.s}: no se guardó o no es válida: ${r.v.fatal}`);
    assert(!r.p.ret && !r.pc.done, 'el jugador se retiró solo');
    assert(r.pc.hist.length === i + 1, 'falta el balance de la temporada en la trayectoria');
    if (r.v.warn.length) console.log(`      aviso temporada ${r.s}: ${r.v.warn.join(', ')}`);
  }
  const mv = await page.evaluate(() => window.__moves);
  for (const [s, d, from, to] of mv) assert(to === -1, `el jugador pasó de ${from} a ${to} sin firmar (temporada ${s}, día ${d})`);
  const info = await page.evaluate(() => { const p = W.players[W.me]; return { ap: W.pc.hist.reduce((a, h) => a + h.ap, 0), ovr: p.ovr, ovr0: W.pc.hist[0] && W.pc.hist[0].ovr, mail: W.inbox.filter(m => /^Balance de la temporada/.test(m.subj)).length }; });
  assert(info.mail >= 1, 'no llegó el balance de la temporada');
  console.log(`      ${info.ap} partidos en 3 temporadas, media ${info.ovr}`);
  assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));
  await ctx.close();
});

test('modo jugador: aceptar ofertas y renovaciones, guardar y reabrir', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await newPlayerCareer(a.page, { tal: 2 });
  let moves = 0; for (let i = 0; i < 2; i++) moves += (await simSeasonJug(a.page, { accept: true })).moves;
  const before = await a.page.evaluate(async () => { await saveNow(); const p = W.players[W.me]; return { me: W.me, club: p.club, uc: W.userClub, ovr: p.ovr, ce: p.ce, s: W.season, d: W.day, hist: W.pc.hist.length, inClub: p.club < 0 || W.clubs[p.club].pids.includes(p.id) }; });
  assert(before.inClub, 'el jugador no figura en la plantilla de su club');
  await a.page.close();
  const b = await openGame(ctx, srv.url);
  const label = await b.page.evaluate(() => document.querySelector('[data-a="mcont"]').textContent);
  assert(label.includes('Prueba Jugador'), 'el menú no muestra la carrera del jugador: ' + label);
  await continueCareer(b.page);
  const after = await b.page.evaluate(() => { const p = W.players[W.me]; return { me: W.me, club: p.club, uc: W.userClub, ovr: p.ovr, ce: p.ce, s: W.season, d: W.day, hist: W.pc.hist.length, inClub: p.club < 0 || W.clubs[p.club].pids.includes(p.id) }; });
  assert(JSON.stringify(before) === JSON.stringify(after), `cambió al reabrir:\n ${JSON.stringify(before)}\n ${JSON.stringify(after)}`);
  console.log(`      ${moves} fichaje(s) aceptado(s); contrato hasta ${after.ce}`);
  assert(realErrors(b.errors).length === 0 && realErrors(a.errors).length === 0, 'errores: ' + realErrors(a.errors.concat(b.errors)).join('\n'));
  await ctx.close();
});

test('modo jugador: partido en 3D de principio a fin', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await newPlayerCareer(page, { tal: 2, top: false });
  // hasta el primer partido en el que esté convocado
  const fid = await page.evaluate(() => { for (let i = 0; i < 200; i++) { const f = jugFixture(W); if (f) return f.id; dayW(W); if (W.stop) W.stop = null; } return null; });
  assert(fid != null, 'el jugador no fue convocado en 200 días');
  await page.evaluate(() => advance('next'));
  await page.waitForSelector('[data-a="play3d"]');
  await page.click('[data-a="play3d"]');
  await page.waitForFunction(() => APP.mode === 'match' && MX.on);
  const r = await page.evaluate(async (fid) => {
    mxCmd('kick'); await new Promise(r => setTimeout(r, 1500));
    const tac0 = JSON.stringify(MX.M.s[MX.us].tac); mxCmd('tac_m_2'); mxCmd('tac');
    const blocked = MX.panel !== 'tac' && tac0 === JSON.stringify(MX.M.s[MX.us].tac);
    const userSide = MX.M.s[0].user || MX.M.s[1].user;
    mxCmd('skip'); await new Promise(r => setTimeout(r, 300)); mxCmd('fin'); await new Promise(r => setTimeout(r, 300));
    return { blocked, userSide, mode: APP.mode, played: !!W.fx[fid].r, uc: W.userClub, same: W.players[W.me].club === W.userClub, ok: validateWorld(W).ok };
  }, fid);
  assert(r.blocked, 'en modo jugador se pudo cambiar la táctica durante el partido');
  assert(!r.userSide, 'el partido se jugó como si el usuario fuera el técnico');
  assert(r.mode === 'game' && r.played && r.same && r.ok, 'el partido no terminó bien: ' + JSON.stringify(r));
  assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));
  await ctx.close();
});

test('modo jugador: negociar ofertas, hablar con el técnico y cambiar de posición', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await newPlayerCareer(page, { pos: 'ST' });
  const r = await page.evaluate(() => {
    const p = W.players[W.me], c = W.clubs[p.club];
    // renovación: pedir más salario una sola vez
    jugRenewOffer(W, p, c); const m = W.inbox.find(x => x.act && x.act.t === 'pren' && !x.act.done), w0 = m.act.wage;
    mactDo(m.id, 'neg'); const w1 = m.act.wage, cnt = m.act.cnt; mactDo(m.id, 'neg'); const w2 = m.act.wage;
    mactDo(m.id, 'acc'); const renewed = p.wage === w2 && p.ce > W.season;
    // oferta de otro club: si se retira, no se puede firmar
    const o = W.clubs.find(x => !x.national && x.id !== c.id);
    mail(W, o.name, 'Prueba', '', '', { t: 'poff', c: o.id, fee: 0, wage: 5000, yrs: 2, role: 'Titular', exp: W.day + 7 });
    const mo = W.inbox[0]; mactDo(mo.id, 'neg'); const after = { done: mo.act.done, cnt: mo.act.cnt, club: p.club };
    if (!mo.act.done) mactDo(mo.id, 'rej');
    // charla con el técnico: una vez cada 30 días
    const n0 = W.inbox.length; jugAsk('tip'); const n1 = W.inbox.length; jugAsk('min'); const n2 = W.inbox.length;
    // cambio de posición cuando ya domina otra
    p.sec.AMC = 20; const b = document.createElement('button'); b.dataset.a = 'jpos'; b.dataset.v = 'AMC'; document.body.appendChild(b); b.click(); b.remove();
    return { w0, w1, w2, cnt, renewed, after, c0: c.id, tip: n1 - n0, min: n2 - n1, pos: p.pos, secST: p.sec.ST, ok: validateWorld(W).ok };
  });
  assert(r.cnt === 1 && r.w2 === r.w1 && r.w1 >= r.w0, 'la negociación no funcionó una sola vez: ' + JSON.stringify(r));
  assert(r.renewed, 'no se renovó con el salario negociado');
  assert(r.after.club === r.c0, 'negociar una oferta movió al jugador de club');
  assert(r.tip === 1 && r.min === 0, 'la charla con el técnico no respeta la espera de 30 días');
  assert(r.pos === 'AMC' && r.secST === 20, 'no cambió de posición principal');
  assert(r.ok, 'la partida quedó dañada');
  assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));
  await ctx.close();
});

test('modo jugador: la retirada termina la carrera y la guarda en el salón de la fama', async () => {
  const ctx = await fresh(); const { page, errors } = await openGame(ctx, srv.url);
  await newPlayerCareer(page);
  await page.evaluate(() => { W.players[W.me].age = 40; });
  await simSeasonJug(page);
  const r = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); const d0 = W.day; await advance('next'); go('home');
    return { done: !!W.pc.done, ret: W.players[W.me].ret, uc: W.userClub, moved: W.day !== d0, hof: (await Store.get('hofp')) || [], ok: await saveNow(), html: document.querySelector('#main').textContent }; });
  assert(r.done && r.ret, 'el jugador de 41 años no se retiró');
  assert(!r.moved, 'después de la retirada el calendario siguió avanzando');
  assert(r.uc >= 0 && r.ok, 'la partida del jugador retirado no se pudo guardar');
  assert(r.hof.length === 1 && r.hof[0].n === 'Prueba Jugador', 'no se guardó en el salón de la fama');
  assert(/Fin de una carrera/.test(r.html), 'no se muestra el epílogo');
  assert(realErrors(errors).length === 0, 'errores: ' + realErrors(errors).join('\n'));
  await ctx.close();
});

for (const v of compat.filter(v => v.guardado >= 5)) {
  test(`modo jugador: carreras de la versión ${v.commit} se abren y siguen funcionando`, async () => {
    const ctx = await fresh();
    const old = await openGame(ctx, srv.url + `v/${v.commit}.html`);
    await newPlayerCareer(old.page); await simDaysJug(old.page, 60);
    const before = await old.page.evaluate(async () => { await saveNow(); const p = W.players[W.me]; return { s: W.season, d: W.day, me: W.me, club: p.club, ovr: p.ovr, n: W.players.length }; });
    await old.page.close();
    const cur = await openGame(ctx, srv.url);
    await continueCareer(cur.page);
    const after = await cur.page.evaluate(() => { const p = W.players[W.me]; return { s: W.season, d: W.day, me: W.me, club: p.club, ovr: p.ovr, n: W.players.length }; });
    assert(JSON.stringify(before) === JSON.stringify(after), `la carrera cambió al abrirla:\n ${JSON.stringify(before)}\n ${JSON.stringify(after)}`);
    await simDaysJug(cur.page, 60);
    const ok = await cur.page.evaluate(async () => { for (const x of ['home', 'jme', 'jtrain', 'jcon', 'jclub']) go(x); return (await saveNow()) && validateWorld(W).ok; });
    assert(ok, 'tras seguir jugando, la carrera no se pudo guardar');
    assert(realErrors(cur.errors).length === 0, 'errores: ' + realErrors(cur.errors).join('\n'));
    await ctx.close();
  });
}

test('modo jugador: las versiones anteriores del juego la abren sin guardar encima', async () => {
  const ctx = await fresh(); const a = await openGame(ctx, srv.url);
  await newPlayerCareer(a.page); await simDaysJug(a.page, 20);
  const before = await a.page.evaluate(async () => { await saveNow(); return Store.get('save'); });
  await a.page.close();
  // la última versión publicada que todavía no conocía el modo jugador
  const last = compat.filter(v => v.guardado < 5).pop().commit;
  const old = await openGame(ctx, srv.url + `v/${last}.html`);
  const r = await old.page.evaluate(async () => { await ACT.mcont(); await new Promise(r => setTimeout(r, 300)); const ok = await saveNow(); return { ro: APP.ro, ok }; });
  assert(r.ro === 'newer' && !r.ok, 'una versión anterior guardó encima de la partida de jugador');
  await old.page.close();
  const c = await openGame(ctx, srv.url);
  const same = await c.page.evaluate(async (b) => (await Store.get('save')) === b, before);
  assert(same, 'la partida de jugador cambió al abrirla con una versión anterior');
  await ctx.close();
});

/* ---------- ejecución ---------- */
const filter = process.argv.slice(2).join(' ').toLowerCase();
const list = tests.filter(t => !filter || t.name.toLowerCase().includes(filter));
srv = await serve(); browser = await launch();
let fails = 0; const t0 = Date.now();
for (const t of list) {
  const s = Date.now();
  try { await t.fn(); console.log(`  ✓ ${t.name} (${((Date.now() - s) / 1000).toFixed(1)} s)`); }
  catch (e) { fails++; console.log(`  ✗ ${t.name}\n      ${String(e && e.stack || e).split('\n').slice(0, 6).join('\n      ')}`); }
}
await browser.close(); await srv.close();
console.log(`\n${list.length - fails} de ${list.length} pruebas superadas en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fails ? 1 : 0);
