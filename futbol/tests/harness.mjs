// Arnés de pruebas: abre Pelotazo en Chromium sin pantalla, con su propio almacenamiento,
// y ofrece utilidades para manejar el juego desde las pruebas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE = path.join(ROOT, 'node_modules/three/build/three.min.js');

// el artefacto de claude.ai envuelve la página en este esqueleto; aquí hacemos lo mismo
const envolver = html => '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + html + '</body></html>';

// versión del juego guardada en git (para comprobar que los datos de versiones publicadas siguen abriendo)
export function gitVersion(commit) {
  return execFileSync('git', ['show', `${commit}:futbol/index.html`], { cwd: ROOT, maxBuffer: 64 << 20 }).toString('utf8');
}

// servidor mínimo: IndexedDB necesita un origen http real.
// '/' es el juego actual; '/v/<commit>.html' sirve versiones anteriores desde git (mismo origen = mismos datos guardados).
export function serve() {
  const cache = new Map();
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      try {
        const u = req.url.split('?')[0];
        let body = null;
        if (u === '/' || u === '/index.html') body = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
        else if (/^\/v\/[0-9a-f]{7,40}\.html$/.test(u)) {
          const c = u.slice(3, -5);
          if (!cache.has(c)) cache.set(c, gitVersion(c));
          body = cache.get(c);
        }
        if (body == null) { rsp.writeHead(404); rsp.end(); return; }
        rsp.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        rsp.end(envolver(body));
      } catch (e) { rsp.writeHead(500); rsp.end(String(e)); }
    });
    srv.listen(0, '127.0.0.1', () => res({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => new Promise(r => srv.close(r)) }));
  });
}

export async function launch() {
  const opts = { headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  try { return await chromium.launch(opts); }
  catch (e) { return chromium.launch({ ...opts, executablePath: '/opt/pw-browsers/chromium' }); }
}

// abre el juego en un contexto (perfil del navegador); devuelve la página y los errores capturados
export async function openGame(ctx, url, { init } = {}) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    r => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(THREE) }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.addInitScript(() => addEventListener('error', () => { window.__fallo = true; }));
  if (init) await page.addInitScript(init);
  await page.goto(url);
  // si el código del juego tiene un error, falla al momento y lo dice (en vez de esperar 30 s)
  await page.waitForFunction(() => (window.G && G.listo) || window.__fallo, null, { timeout: 30000 }).catch(() => { });
  if (!(await page.evaluate(() => !!(window.G && G.listo)))) throw new Error('el juego no arrancó:\n' + errors.join('\n'));
  return { page, errors };
}

// errores que no son del juego (avisos de WebGL del navegador sin pantalla)
export const realErrors = errs => errs.filter(e => !/GPU stall|WebGL|swiftshader|GL Driver/i.test(e));

// cierra la pantalla de inicio y empieza a jugar
export async function empezar(page) {
  await page.click('#bJugar');
  await page.waitForFunction(() => !G.pausa);
}

// coloca una jugada de prueba: el jugador controlado con el balón en (x, z), sin saque pendiente
export async function prepararJugada(page, { x = 0, z = 0, cara = 0, semilla = 1 } = {}) {
  await page.evaluate(({ x, z, cara, semilla }) => {
    G.pausa = true; nuevoPartido(semilla); G.saque = null;
    const p = G.eqs[0].pl[9];
    // aparta a todos para que la jugada sea limpia
    G.todos.forEach((q, i) => { if (q !== p && !q.por) { q.x = -40 + (i % 11) * 2; q.z = q.eq.i ? 30 : -30; } q.vx = q.vz = 0; });
    p.x = x; p.z = z; p.cara = cara; G.balon.dueno = null; tomar(p); G.balon.x = x + Math.cos(cara) * .55; G.balon.z = z + Math.sin(cara) * .55;
    p.protegido = 5; controlar(p);
  }, { x, z, cara, semilla });
}
