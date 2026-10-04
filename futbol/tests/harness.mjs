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

// archivo de una versión del juego guardada en git (para comprobar que los datos de versiones publicadas siguen abriendo)
export function gitVersion(commit, archivo = 'index.html') {
  return execFileSync('git', ['show', `${commit}:futbol/${archivo}`], { cwd: ROOT, maxBuffer: 64 << 20 });
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
// servidor mínimo: IndexedDB necesita un origen http real.
// '/' es el juego actual (y sus archivos, p. ej. '/js/motor.js'); '/v/<commit>/<archivo>' sirve una versión anterior
// desde git (mismo origen = mismos datos guardados). La página principal se envuelve como en el artefacto.
export function serve() {
  const cache = new Map();
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      try {
        let u = decodeURIComponent(req.url.split('?')[0]);
        if (u === '/') u = '/index.html';
        let body = null, archivo = u.slice(1);
        const v = u.match(/^\/v\/([0-9a-f]{7,40})\/(.+)$/);
        if (v) {
          archivo = v[2];
          const k = v[1] + ':' + archivo;
          if (!cache.has(k)) { try { cache.set(k, gitVersion(v[1], archivo)); } catch (e) { cache.set(k, null); } }
          body = cache.get(k);
        } else if (!archivo.includes('..') && !archivo.startsWith('node_modules') && fs.existsSync(path.join(ROOT, archivo))) {
          body = fs.readFileSync(path.join(ROOT, archivo));
        }
        if (body == null) { rsp.writeHead(404); rsp.end(); return; }
        const ext = path.extname(archivo);
        rsp.writeHead(200, { 'content-type': TIPOS[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
        rsp.end(archivo.endsWith('index.html') ? envolver(body.toString('utf8')) : body);
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
export async function openGame(ctx, url, { init, portada = false } = {}) {
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
  // las pruebas no pasan por la pantalla previa de los partidos (hay una prueba aparte para ella)
  await page.evaluate(() => { DATOS.ajustes.previa = 'no'; });
  // pasa la portada ("Pulsa cualquier botón") salvo que la prueba quiera verla
  if (!portada) await page.evaluate(() => { if (typeof APP !== 'undefined' && APP.enPortada && typeof salirPortada === 'function') salirPortada(); });
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
