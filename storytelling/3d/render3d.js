// Renderiza la versión 3D en paralelo: node render3d.js [procesos]  ->  ../video_storytelling_3d.mp4 (sin audio; luego ../mezcla.sh)
// Si se interrumpe, volver a correrlo continúa desde los cuadros ya guardados en tmp/.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');

const FPS = 30, DUR = 60, JOBS = +(process.argv[2] || 3), dir = __dirname, tmp = path.join(dir, 'tmp');
fs.mkdirSync(tmp, { recursive: true });

async function chunk(k, from, to) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.route('http://local/**', r => r.fulfill({ path: path.join(dir, decodeURIComponent(new URL(r.request().url()).pathname)) }));
  await page.goto('http://local/index.html');
  await page.waitForFunction('window.ready', null, { timeout: 180000 });
  const out = path.join(tmp, `parte${k}_${from}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = from; i < to; i++) {
    await page.evaluate(t => render(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - from) % 60 === 0) console.log(`parte ${k}: ${i - from}/${to - from}`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close();
  return out;
}

(async () => {
  const total = FPS * DUR, n = Math.ceil(total / JOBS);
  const frames = f => +execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f]).toString().trim() || 0;
  const pieces = k => fs.readdirSync(tmp).filter(f => f.startsWith(`parte${k}_`)).map(f => path.join(tmp, f)).sort((a, b) => +a.match(/_(\d+)/)[1] - +b.match(/_(\d+)/)[1]);
  await Promise.all(Array.from({ length: JOBS }, (_, k) => {
    const from = k * n + pieces(k).reduce((a, f) => a + frames(f), 0), to = Math.min(total, (k + 1) * n);
    return from < to ? chunk(k, from, to) : null;
  }));
  const parts = Array.from({ length: JOBS }, (_, k) => pieces(k)).flat();
  console.assert(parts.reduce((a, f) => a + frames(f), 0) === total, 'faltan cuadros');
  const list = path.join(tmp, 'lista.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(dir, '..', 'video_storytelling_3d.mp4')]);
  fs.rmSync(tmp, { recursive: true });
  console.log('listo');
})();
