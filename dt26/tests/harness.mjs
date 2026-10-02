// Arnés de pruebas: abre DT26 en Chromium sin pantalla, con su propio almacenamiento,
// y ofrece utilidades para manejar el juego desde las pruebas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE = path.join(ROOT, 'node_modules/three/build/three.min.js');

// versión del juego guardada en git (para probar que las partidas de versiones publicadas siguen abriendo)
export function gitVersion(commit) {
  return execFileSync('git', ['show', `${commit}:dt26/index.html`], { cwd: ROOT, maxBuffer: 64 << 20 }).toString('utf8');
}

// servidor estático mínimo: IndexedDB necesita un origen http real.
// '/' es el juego actual; '/v/<commit>.html' sirve versiones anteriores desde git (mismo origen = mismos datos guardados).
export function serve() {
  const cache = new Map();
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      try {
        const u = req.url.split('?')[0];
        let body = null;
        if (u === '/' || u === '/index.html') body = fs.readFileSync(path.join(ROOT, 'index.html'));
        else if (/^\/v\/[0-9a-f]{7,40}\.html$/.test(u)) {
          const c = u.slice(3, -5);
          if (!cache.has(c)) cache.set(c, gitVersion(c));
          body = cache.get(c);
        }
        if (body == null) { rsp.writeHead(404); rsp.end(); return; }
        rsp.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        rsp.end(body);
      } catch (e) { rsp.writeHead(500); rsp.end(String(e)); }
    });
    srv.listen(0, '127.0.0.1', () => res({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => new Promise(r => srv.close(r)) }));
  });
}

export async function launch() {
  return chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
}

// abre el juego en un contexto (perfil del navegador); devuelve la página y los errores capturados
export async function openGame(ctx, url, { waitMenu = true } = {}) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(THREE) }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(url);
  if (waitMenu) await waitMenuReady(page);
  return { page, errors };
}

export async function waitMenuReady(page) {
  await page.waitForFunction(() => typeof APP !== 'undefined' && APP.mode === 'menu', null, { timeout: 60000 });
}

// crea una partida nueva en la liga indicada con el club de más reputación
export async function newCareer(page, { lg = 0, name = 'Prueba' } = {}) {
  await page.evaluate(async ({ lg, name }) => {
    menuNew();
    await new Promise(r => { const t = setInterval(() => { if (!APP.gen && APP.pick.step === 1) { clearInterval(t); r(); } }, 50); });
    const L = W.leagues[lg];
    APP.pick.lg = L.id; APP.pick.club = L.clubs.slice().sort((a, b) => W.clubs[b].rep - W.clubs[a].rep)[0]; APP.pick.name = name;
    await menuStart();
  }, { lg, name });
  await page.waitForFunction(() => APP.mode === 'game' && W.userClub >= 0);
}

// pulsa "Continuar partida" en el menú principal
export async function continueCareer(page) {
  await page.evaluate(() => ACT.mcont());
  await page.waitForFunction(() => APP.mode === 'game' && W.userClub >= 0);
}

// simula días sin interfaz: partidos del usuario en simulación rápida, decisiones ignoradas
export async function simDays(page, n) {
  return page.evaluate(n => {
    for (let i = 0; i < n; i++) {
      if (W.jobless) { const c = W.clubs.find(x => x.id !== W.userClub); newJob(c.id); }
      const f = userFixture(W);
      if (f) { fixLineup(W, W.clubs[f.h]); fixLineup(W, W.clubs[f.a]); playFixture(W, f); continue; }
      processDay(W);
      if (W.stop) W.stop = null;
      if (W.board.conf <= 8) W.board.conf = 40; // las pruebas no buscan el despido
    }
    return { season: W.season, day: W.day };
  }, n);
}

export async function simSeason(page) {
  const s0 = await page.evaluate(() => W.season);
  for (let k = 0; k < 40; k++) { const r = await simDays(page, 15); if (r.season > s0) return r; }
  throw new Error('la temporada no terminó');
}

// errores reales (se ignoran los avisos que el propio juego escribe a propósito en las pruebas)
export function realErrors(errors, allow = []) {
  return errors.filter(e => !allow.some(a => e.includes(a)));
}
