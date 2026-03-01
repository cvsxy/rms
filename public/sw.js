const CACHE_NAME = "rms-v4";
const STATIC_ASSETS = ["/", "/es/pin-login", "/en/pin-login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Cache menu data with stale-while-revalidate
  if (url.pathname === "/api/menu/categories") {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Skip other API routes and Pusher requests
  if (
    url.pathname.startsWith("/api") ||
    url.hostname.includes("pusher") ||
    url.hostname.includes("sockjs")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && url.pathname.match(/\.(js|css|png|jpg|svg|ico)$/)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache for navigation requests
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, try to serve the cached root
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});

// ─── Web Push Notifications ─────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "RMS", body: event.data.text() };
  }

  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    tag: payload.tag || "rms-notification",
    renotify: true,
    data: payload.data || {},
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "RMS", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Try to focus existing window or open new one
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Try to find an existing RMS window
      for (const client of clients) {
        if (client.url.includes("/notifications") || client.url.includes("/tables")) {
          return client.focus();
        }
      }
      // Open new window to notifications page
      return self.clients.openWindow("/es/notifications");
    })
  );
});
