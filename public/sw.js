/* Roznamcha service worker — minimal.
   No fetch caching. It exists to (a) let routine reminders carry action
   buttons and (b) route Done / Snooze / Skip taps back into the app.
   Real background Web Push can be layered on later without changing this. */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Background reminder delivered by the routine-push edge function.
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = {};
  }
  const title = d.title || "Roznamcha";
  const options = {
    body: d.body || "",
    tag: d.tag || "roznamcha",
    renotify: true,
    requireInteraction: true,
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: {
      itemId: d.itemId || "",
      dateKey: d.dateKey || "",
      url: d.url || "/routine",
    },
    actions:
      d.kind === "interval"
        ? [
            { action: "plus", title: "+1" },
            { action: "snooze", title: "Snooze 15m" },
          ]
        : [
            { action: "done", title: "Done" },
            { action: "snooze", title: "Snooze 15m" },
          ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// The push service rotated the subscription; the app re-subscribes on next open.
self.addEventListener("pushsubscriptionchange", () => {});

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
