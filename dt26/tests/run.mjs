// Pruebas automáticas de DT26. Uso: npm test (desde la carpeta dt26). Filtrar: npm test -- nube
// Cada prueba abre el juego en un navegador real sin pantalla, con datos guardados limpios.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, serve, launch, openGame, newCareer, continueCareer, simDays, simSeason, realErrors, waitMenuReady } from './harness.mjs';

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
