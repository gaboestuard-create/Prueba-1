// Renderiza demo.html cuadro por cuadro a MP4 (1920x1080, 30 fps).
// Uso: node turistab/render.js [salida.mp4]        → video completo
//      node turistab/render.js --stills 5,15,30    → PNGs de prueba en turistab/stills/
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const FPS = 30, DUR = 80;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.resolve(__dirname, 'demo.html'));
  await p.waitForFunction(() => window.READY === 1);
  const arg = process.argv[2] || path.resolve(__dirname, 'turistab_demo.mp4');

  if (arg === '--stills') {
    const dir = path.resolve(__dirname, 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const t of process.argv[3].split(',').map(Number)) {
      await p.evaluate(t => render(t), t);
      await p.screenshot({ path: path.join(dir, `t${String(t).padStart(5, '0')}.png`) });
    }
    return b.close();
  }

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', arg],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < FPS * DUR; f++) {
    await p.evaluate(t => render(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`${(f / FPS).toFixed(0)} s / ${DUR} s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close();
})();
