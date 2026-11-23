/* AlphaHome — Service Worker v2 (100% offline sin dependencia de CDN de estilos)
   Rutas relativas para funcionar en GitHub Pages bajo /alphahome/. */
const CACHE_VERSION = 'alphahome-v4';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/app.js',
  './js/state.js',
  './js/utils.js',
  './js/data/catalog.js',
  './js/data/templates.js',
  './js/engine/progression.js',
  './js/engine/timers.js',
  './js/svg/rig3d.js',
  './js/svg/poses.js',
  './js/svg/modal.js',
  './js/ui/onboarding.js',
  './js/ui/routineEditor.js',
  './js/ui/trainView.js',
  './js/ui/progressView.js',
  './js/ui/weightView.js',
  './js/ui/settingsView.js'
];

const FONT_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com'
]);

const FONTS_CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0 && 'focus' in clients[0]) {
        return clients[0].focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
      return undefined;
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationFallback(request));
    return;
  }

  if (FONT_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event, request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  }
});

async function precache() {
  const cache = await caches.open(CACHE_VERSION);
  await Promise.all(SHELL.map((url) => cacheShell(cache, url)));
  try {
    await precacheFonts(cache);
  } catch {
    /* La app queda 100% funcional con fuente del sistema aunque no haya internet. */
  }
}

async function cacheShell(cache, url) {
  const response = await fetch(new Request(url, { cache: 'reload' }));
  if (!response || !response.ok) {
    throw new Error('No se pudo precachear ' + url);
  }
  await cache.put(url, await asCacheableResponse(response));
}

async function precacheFonts(cache) {
  let cssText = '';
  try {
    const css = await fetch(FONTS_CSS_URL, { mode: 'cors', credentials: 'omit' });
    if (css && css.ok) {
      const stored = await asCacheableResponse(css);
      cssText = await stored.clone().text();
      await cache.put(FONTS_CSS_URL, stored);
    }
  } catch {}

  const fontUrls = [];
  const matches = cssText.match(/url\(([^)]+)\)/g) || [];
  matches.forEach((raw) => {
    const cleaned = raw.slice(4, -1).replace(/["']/g, '').trim();
    if (!cleaned) return;
    try {
      fontUrls.push(new URL(cleaned, FONTS_CSS_URL).href);
    } catch {}
  });

  await Promise.all(fontUrls.map(async (fontUrl) => {
    try {
      const font = await fetch(fontUrl, { mode: 'cors', credentials: 'omit' });
      if (!font || !font.ok) return;
      await cache.put(fontUrl, await asCacheableResponse(font));
    } catch {}
  }));
}

async function asCacheableResponse(response) {
  const headers = new Headers(response.headers);
  headers.delete('Vary');
  headers.delete('vary');
  headers.delete('Content-Encoding');
  headers.delete('content-encoding');
  headers.delete('Content-Length');
  headers.delete('content-length');
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function navigationFallback(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && fresh.type !== 'opaque') {
      try {
        await cache.put('./index.html', await asCacheableResponse(fresh.clone()));
      } catch {}
    }
    return fresh;
  } catch {
    return (await cache.match('./index.html'))
      || (await cache.match('./'))
      || new Response('Sin conexión', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      try {
        await cache.put(request, await asCacheableResponse(fresh.clone()));
      } catch {}
    }
    return fresh;
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request, { ignoreVary: true });
  const refresh = fetch(request, { credentials: 'omit' })
    .then(async (response) => {
      if (!response || !response.ok) return response;
      try {
        await cache.put(request, await asCacheableResponse(response.clone()));
      } catch {}
      return response;
    })
    .catch(() => null);

  if (event && typeof event.waitUntil === 'function') {
    event.waitUntil(refresh.then(() => undefined).catch(() => undefined));
  }
  if (cached) return cached;
  const fresh = await refresh;
  return fresh || new Response('', { status: 504, statusText: 'Offline' });
}
