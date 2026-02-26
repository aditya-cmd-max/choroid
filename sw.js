const CACHE_NAME = 'choroid-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0,1'
];

// Install service worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate and clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch from cache first, then network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(response => response || fetch(e.request))
  );
});

// Background sync for alarms
self.addEventListener('sync', (e) => {
  if (e.tag === 'alarm-sync') {
    e.waitUntil(checkAlarms());
  }
});

// Push notifications
self.addEventListener('push', (e) => {
  const data = e.data.json();
  
  const options = {
    body: data.body,
    icon: 'icon-192x192.png',
    badge: 'icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
      alarmId: data.alarmId
    },
    actions: [
      { action: 'snooze', title: 'Snooze 5m' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'snooze') {
    // Handle snooze
    e.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Send message to client to snooze alarm
        clientList.forEach(client => {
          client.postMessage({
            type: 'SNOOZE_ALARM',
            alarmId: e.notification.data.alarmId
          });
        });
      })
    );
  } else if (e.action === 'dismiss') {
    // Handle dismiss
    e.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        clientList.forEach(client => {
          client.postMessage({
            type: 'DISMISS_ALARM',
            alarmId: e.notification.data.alarmId
          });
        });
      })
    );
  } else {
    // Open app
    e.waitUntil(
      clients.openWindow(e.notification.data.url || '/')
    );
  }
});
