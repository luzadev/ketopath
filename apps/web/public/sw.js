// KetoPath service worker — minimo necessario per Web Push (PRD §5.6).
// Niente caching offline complesso: solo gestione `push` e `notificationclick`.

self.addEventListener('install', (event) => {
  // attiva subito senza aspettare i tab vecchi
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (_err) {
    payload = { title: 'KetoPath', body: event.data.text() };
  }
  const title = payload.title || 'KetoPath';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: payload.url || '/' },
    // niente tag → l'utente vede ogni notifica separata
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        // se c'è già una tab aperta sull'app, focus + navigate
        if ('focus' in client) {
          client.navigate(url).catch(() => {
            /* navigate non sempre supportato */
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});
