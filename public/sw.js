/* Expense Tracker service worker. Plain JS on purpose: it is served as-is from /sw.js.
 * - Pages: network first; the last good copy is kept so visited pages open offline.
 * - /_next/static assets: cache first (they are content-hashed).
 * - Never cached: API calls, sign-in pages, downloads (CSV/PDF), anything that is not a GET.
 * - Push: shows a notification built only from the short title/body the server sends.
 */
const PAGES = "pages-v1";
const STATIC = "static-v1";
const OFFLINE_URL = "/offline";
const MAX_PAGES = 60;
const APP_PATHS = ["/dashboard", "/expenses", "/income", "/recurring", "/goals", "/budgets", "/reports", "/debts", "/import", "/settings"];
const NEVER = ["/reports/pdf", "/expenses/export", "/api/"];

const isAppPath = (p) => APP_PATHS.some((a) => p === a || p.startsWith(a + "/")) && !NEVER.some((n) => p.startsWith(n));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_PAGES; i++) await cache.delete(keys[i]);
}

async function pageRequest(request, url) {
  const cache = await caches.open(PAGES);
  const key = url.pathname + url.search;
  try {
    const res = await fetch(request);
    // Only a plain 200 for an app page is kept (not redirects to /login, not errors).
    if (res.ok && !res.redirected && isAppPath(url.pathname)) {
      await cache.put(key, res.clone());
      await trim(cache);
    }
    return res;
  } catch {
    const hit = await cache.match(key);
    if (hit) return hit;
    if (request.mode === "navigate") {
      const off = await caches.match(OFFLINE_URL);
      if (off) return off;
    }
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }
  if (NEVER.some((n) => url.pathname.startsWith(n))) return;
  // Soft navigations (RSC data) are left to the browser; if they fail Next does a full page
  // load, which comes through here as a navigation.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  const warm = request.headers.get("X-Warm") === "1";
  if ((request.mode === "navigate" || warm) && (isAppPath(url.pathname) || url.pathname === OFFLINE_URL)) {
    event.respondWith(pageRequest(request, url));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = String(data.title || "Expense Tracker").slice(0, 80);
  const body = String(data.body || "").slice(0, 200);
  const path = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/dashboard";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag.slice(0, 120) : undefined,
      data: { url: path },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.focus();
          if ("navigate" in c) return c.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
