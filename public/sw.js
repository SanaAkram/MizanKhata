/* Roznamcha service worker — minimal.
   No fetch caching. It exists to (a) let routine reminders carry action
   buttons and (b) route Done / Snooze / Skip taps back into the app.
   Real background Web Push can be layered on later without changing this. */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  const action = event.action || "open";
  const data = event.notification.data || {};
  event.notification.close();

  event.waitUntil(
    (async () => {
      const msg = {
        type: "routine-action",
        action: action,
        itemId: data.itemId || "",
        dateKey: data.dateKey || "",
      };

      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      let target =
        clients.find((c) => c.url.includes("/routine")) || clients[0];

      if (target) {
        try {
          target.postMessage(msg);
        } catch {
          /* ignore */
        }
        if ("focus" in target) {
          if (!target.url.includes("/routine") && "navigate" in target) {
            try {
              await target.navigate("/routine");
            } catch {
              /* ignore */
            }
          }
          return target.focus();
        }
      }

      if (self.clients.openWindow) {
        const q =
          "?ra=" +
          encodeURIComponent(action) +
          "&ri=" +
          encodeURIComponent(data.itemId || "") +
          "&rd=" +
          encodeURIComponent(data.dateKey || "");
        return self.clients.openWindow("/routine" + q);
      }
      return undefined;
    })(),
  );
});
