const CACHE_NAME = "v2";
const urlsToCache = [
    "",
    "index.html",
    "style.css",
    "script.js",
    "icons/icon-192x192.png",
    "icons/icon-512x512.png",
];

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then((registration) => {
                console.log(
                    "Service Worker registriert mit dem Scope:",
                    registration.scope
                );
            })
            .catch((error) => {
                console.error(
                    "Service Worker Registrierung fehlgeschlagen:",
                    error
                );
            });
    });
}

// Installieren des Service Workers und Caching der Ressourcen
self.addEventListener("install", (event) => {
    console.log("Service Worker installiert");
    event.waitUntil(
        caches.open("my-cache").then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Abrufen von Ressourcen aus dem Cache oder Netz
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});

// Aktivieren des Service Workers und Aufräumen alter Caches
self.addEventListener("activate", (event) => {
    // Alle alten Caches löschen
    const cacheWhitelist = ["v2"]; // Neue Version des Caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

