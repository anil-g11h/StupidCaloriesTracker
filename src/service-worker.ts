/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST);

// Clean old caches
cleanupOutdatedCaches();

// Allow SW to control pages immediately
self.skipWaiting();
clientsClaim();

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const action = event.action;

    if (action === 'close') {
        notification.close();
    } else {
        // Find all client windows
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
                         client.focus(); // Optional: bring to front
                         notification.close();
                    }
                } else {
                     // If no client is open, maybe open one?
                     if (clients.openWindow) {
                         // clients.openWindow(notification.data.url);
                     }
                      notification.close();
                }
            })
        );
    }
});

// Listen for messages from client to show notification
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, options } = event.data.payload;
        self.registration.showNotification(title, options);
    }
});
