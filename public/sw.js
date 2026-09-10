/* MizanKhata service worker — minimal.
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
  const title = d.title || "MizanKhata";
  const isInterval = d.kind === "interval";
  const isPrayer = d.category === "prayer";
  let actions;
  if (isInterval) {
    actions = [
      { action: "plus", title: "+1" },
      { action: "snooze", title: "Later" },
    ];
  } else if (isPrayer) {
    actions = [
      { action: "done", title: "I'm praying now" },
      { action: "snooze", title: "Remind me later" },
    ];
  } else {
    actions = [
      { action: "done", title: "Done" },
      { action: "snooze", title: "Snooze" },
      { action: "skip", title: "Skip" },
    ];
  }
  const options = {
    // iOS shows no action buttons, so tapping the body is the whole
    // interaction: for an interval reminder that counts as +1 (see
    // notificationclick).
    body: d.body || "",
    tag: d.tag || "mizankhata",
    renotify: true,
    requireInteraction: true,
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: {
      itemId: d.itemId || "",
      dateKey: d.dateKey || "",
      kind: d.kind || "",
      category: d.category || "",
      url: d.url || "/routine",
    },
    actions,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// The push service rotated the subscription; the app re-subscribes on next open.
self.addEventListener("pushsubscriptionchange", () => {});

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  // A plain tap on the body (no button, e.g. always on iOS): for an interval
  // reminder that means "I did one" → +1; otherwise just open the app.
  let action = event.action || "open";
  if (action === "open" && data.kind === "interval") action = "plus";
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
