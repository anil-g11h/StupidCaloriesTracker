// Migrated from service-worker.ts
// @ts-nocheck

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';

self.__WB_MANIFEST && precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const action = event.action;

    if (action === 'close') {
        notification.close();
    } else {
        event.waitUntil(
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
                let client = windowClients.find((c) => c.url === notification.data.url && 'focus' in c);
                if (client) {
                    client.postMessage({
                        type: 'TIMER_ACTION',
                        action: action,
                        timerId: notification.data.timerId
                    });
                    if (!action.startsWith('check')) {
                        client.focus();
                        notification.close();
                    }
                }
            })
        );
    }
});
