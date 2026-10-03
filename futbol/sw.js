/* Pelotazo · guarda los archivos del juego para jugar sin conexión cuando está instalado como app.
   Primero intenta la red (así siempre llegan las versiones nuevas) y, si no hay conexión, usa lo guardado.
   La biblioteca 3D y las fuentes, que no cambian, salen directamente de lo guardado. */
const CACHE = 'pelotazo';
const ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/sonido.js', 'js/motor.js', 'js/datos.js', 'js/mundo.js', 'js/interfaz.js', 'js/guardado.js', 'js/menus.js', 'js/portada.js',
  'js/torneos.js', 'js/temporada.js', 'js/carrera_dt.js', 'js/carrera_jug.js', 'js/cartas.js', 'js/estrella.js', 'js/editor.js', 'js/arranque.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ARCHIVOS.map(u => c.add(u).catch(() => { })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url), fijo = u.hostname === 'cdnjs.cloudflare.com' || u.hostname.endsWith('gstatic.com') || u.hostname === 'fonts.googleapis.com';
  if (fijo) {
    e.respondWith(caches.match(r).then(g => g || fetch(r).then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); return res; })));
    return;
  }
  if (u.origin !== self.location.origin) return;
  // solo los archivos de Pelotazo: otras carpetas del mismo sitio (por ejemplo dt26/) son otros juegos
  const rel = r.url.slice(self.registration.scope.length).split('?')[0];
  if (rel.includes('/') && !rel.startsWith('js/') && !rel.startsWith('icons/')) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(g => g || caches.match('index.html'))));
});
