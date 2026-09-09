/* Roznamcha service worker — intentionally minimal.
   No fetch caching yet; it exists so notification clicks focus the app and
   so real Web Push can be added later without changing registration. */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if (client.url.includes("/routine") && "focus" in client) {
          return client.focus();
        }
      }
      for (const client of clients) {
        if ("focus" in client) {
          if ("navigate" in client) {
            try {
              await client.navigate("/routine");
            } catch {
              /* ignore */
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/routine");
      }
      return undefined;
    })(),
  );
});
