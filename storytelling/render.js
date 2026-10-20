// Renderiza animacion.html a video: node render.js [inicio] [fin]  (requiere playwright y ffmpeg)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const FPS = 30, from = +(process.argv[2] || 0), to = +(process.argv[3] || 60);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('file://' + path.join(__dirname, 'animacion.html'));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-ss', String(from), '-i', path.join(__dirname, 'musica.wav'), '-t', String(to - from), '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-c:a', 'aac', '-b:a', '160k',
    path.join(__dirname, 'video_storytelling.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = Math.round(from * FPS); i < Math.round(to * FPS); i++) {
    await page.evaluate(t => render(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
})();
