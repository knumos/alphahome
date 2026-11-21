/* AlphaHome — service worker.
   Rutas relativas para que funcione en GitHub Pages bajo /alphahome/. */
const CACHE_VERSION = 'alphahome-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

const RUNTIME_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
]);

const TAILWIND_URL = 'https://cdn.tailwindcss.com';
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

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationFallback(request));
    return;
  }

  if (RUNTIME_HOSTS.has(url.hostname)) {
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
    await precacheCrossOrigin(cache);
  } catch (e) {
    /* La app igual queda instalada; el runtime cache reintenta en la siguiente visita. */
  }
}

async function cacheShell(cache, url) {
  const response = await fetch(new Request(url, { cache: 'reload' }));
  if (!response || !response.ok) {
    throw new Error('No se pudo precachear ' + url);
  }
  await cache.put(url, await asCacheableResponse(response));
}

async function precacheCrossOrigin(cache) {
  try {
    const tailwind = await fetch(TAILWIND_URL, { mode: 'no-cors', credentials: 'omit', redirect: 'follow' });
    if (tailwind && (tailwind.ok || tailwind.type === 'opaque')) {
      await cache.put(TAILWIND_URL, tailwind.clone());
      await cache.put(TAILWIND_URL + '/', tailwind.clone());
    }
  } catch (e) {}

  let cssText = '';
  try {
    const css = await fetch(FONTS_CSS_URL, { mode: 'cors', credentials: 'omit' });
    if (css && css.ok) {
      const stored = await asCacheableResponse(css);
      cssText = await stored.clone().text();
      await cache.put(FONTS_CSS_URL, stored);
    }
  } catch (e) {}

  const fontUrls = [];
  const matches = cssText.match(/url\(([^)]+)\)/g) || [];
  matches.forEach((raw) => {
    const cleaned = raw.slice(4, -1).replace(/["']/g, '').trim();
    if (!cleaned) return;
    try {
      fontUrls.push(new URL(cleaned, FONTS_CSS_URL).href);
    } catch (e) {}
  });

  await Promise.all(fontUrls.map(async (fontUrl) => {
    try {
      const font = await fetch(fontUrl, { mode: 'cors', credentials: 'omit' });
      if (!font || !font.ok) return;
      await cache.put(fontUrl, await asCacheableResponse(font));
    } catch (e) {}
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
      } catch (e) {}
    }
    return fresh;
  } catch (e) {
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
      } catch (e) {}
    }
    return fresh;
  } catch (e) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await matchRuntime(cache, request);
  const refresh = refreshRuntime(cache, request);
  if (event && typeof event.waitUntil === 'function') {
    event.waitUntil(refresh.then(() => undefined).catch(() => undefined));
  }
  if (cached) return cached;
  const fresh = await refresh;
  if (fresh) return fresh;
  return new Response('', { status: 504, statusText: 'Offline' });
}

async function matchRuntime(cache, request) {
  const direct = await cache.match(request, { ignoreVary: true });
  if (direct) return direct;
  try {
    const url = new URL(request.url);
    if (url.hostname === 'cdn.tailwindcss.com') {
      const alt = url.pathname === '/' && !request.url.endsWith('/')
        ? TAILWIND_URL + '/'
        : TAILWIND_URL;
      if (alt !== request.url) {
        return cache.match(alt, { ignoreVary: true });
      }
    }
  } catch (e) {}
  return null;
}

function refreshRuntime(cache, request) {
  return fetch(request, { credentials: 'omit' })
    .then(async (response) => {
      if (!response || !(response.ok || response.type === 'opaque')) return response;
      try {
        if (response.type === 'opaque') {
          await cache.put(request, response.clone());
        } else {
          await cache.put(request, await asCacheableResponse(response.clone()));
        }
      } catch (e) {}
      return response;
    })
    .catch(() => null);
}
