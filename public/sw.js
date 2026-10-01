/* Service worker de Antola.
 * - Caché solo de recursos estáticos (JS/CSS con hash, iconos, página offline).
 * - NUNCA se cachean páginas HTML ni respuestas de /api: contienen datos privados.
 * - Push: muestra la notificación y abre la URL al tocarla.
 * - Si el navegador renueva la suscripción push, se vuelve a registrar sola.
 */
const VERSION = "v3";
const STATIC_CACHE = `antola-static-${VERSION}`;
const PRECACHE = [
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/badge-96.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith("antola-") && k !== STATIC_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/manifest.json"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: siempre a la red; sin conexión, página offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline.html").then((r) => r || new Response("Sin conexión", { status: 503 })),
      ),
    );
    return;
  }

  // Estáticos con hash: caché primero (son inmutables y no tienen datos de usuario).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
  // Todo lo demás (incluida /api) va directo a la red sin cachear.
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Antola", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Antola";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: data.tag || undefined,
    // Como un mensaje de WhatsApp: aunque sustituya a otro aviso con la misma
    // etiqueta, vuelve a sonar y a mostrarse (no se actualiza en silencio).
    renotify: !!data.tag,
    silent: false,
    vibrate: [200, 100, 200], // Android
    data: { url: data.url || "/" },
    timestamp: data.timestamp || Date.now(),
  };

  const tasks = [self.registration.showNotification(title, options)];
  if (typeof data.badgeCount === "number" && self.navigator && "setAppBadge" in self.navigator) {
    tasks.push(
      (data.badgeCount > 0
        ? self.navigator.setAppBadge(data.badgeCount)
        : self.navigator.clearAppBadge()
      ).catch(() => {}),
    );
  }
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  // Solo abrimos URLs de nuestra propia app.
  const href = target.origin === self.location.origin ? target.href : self.location.origin + "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(href);
            } catch {
              client.postMessage({ type: "navigate", url: href });
            }
          }
          return;
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});

// El navegador puede caducar y renovar la suscripción: la reenviamos al servidor
// (la cookie de sesión viaja con la petición, igual que desde la app).
self.addEventListener("pushsubscriptionchange", (event) => {
  const old = event.oldSubscription;
  const key = old && old.options ? old.options.applicationServerKey : null;
  if (!key) return;
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: key })
      .then((sub) => {
        const json = sub.toJSON();
        return fetch("/api/push/subscribe", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
        });
      })
      .catch(() => {}),
  );
});
