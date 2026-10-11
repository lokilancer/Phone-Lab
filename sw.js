const C = 'laptop-lab-v5', F = ['./', 'index.html', 'style.css', 'app.js', 'logo.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(F))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))));
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return; // never touch speed-test traffic
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
