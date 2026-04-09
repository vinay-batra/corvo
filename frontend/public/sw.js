// Corvo Service Worker — handles push notifications
self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Corvo";
  const options = {
    body: data.body || "",
    icon: "/corvo-logo.svg",
    badge: "/corvo-logo.svg",
    tag: "corvo-alert",
    renotify: true,
    data: { url: data.url || "/app" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/app") && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/app");
    })
  );
});
