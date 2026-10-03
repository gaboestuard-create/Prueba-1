// DT26 como aplicación (vive en la carpeta dt26/ de GitHub Pages, junto a otros juegos: solo toca sus propias cachés): la página se pide siempre a internet (así cada actualización llega al abrir)
// y se guarda una copia para jugar sin conexión. Las librerías y fuentes se guardan la primera vez.
const CACHE = 'dt26-v1';
const CORE = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('dt26-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate' || (u.origin === location.origin && /\/(index\.html)?$/.test(u.pathname))) {
    e.respondWith(fetch(r, { cache: 'no-store' }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./', cp)); } return res; })
      .catch(() => caches.match('./')));
    return;
  }
  if (u.origin === location.origin || /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })));
  }
});
