/* Service worker : fait fonctionner le site hors ligne.
   Quand tu modifies un fichier, change VERSION pour forcer la mise à jour. */
const VERSION = 'zmajesty-v6';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'cloud.js', 'firebase-config.js', 'lang-fr.js', 'lang-en.js', 'lang-es.js', 'lang-de.js', 'lang-it.js', 'lang-pt.js', 'lang-br.js', 'lang-ru.js', 'lang-jp.js', 'lang-nl.js', 'lang-zh.js', 'lang-ko.js', 'lang-ar.js', 'lang-tr.js', 'lang-pl.js',
  'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url), sameOrigin = u.origin === location.origin;
  e.respondWith(
    fetch(e.request).then(res => {                       // réseau d'abord, pour avoir la dernière version
      if ((sameOrigin || u.hostname === 'www.gstatic.com') && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
