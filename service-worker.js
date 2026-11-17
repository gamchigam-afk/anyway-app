
const CACHE_NAME = "anyway-app-v1";

const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if(request.method !== "GET") return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;

  if(request.mode === "navigate"){
    event.respondWith(
      fetch(request)
        .then(response => {
          if(response.ok){
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache =>
              cache.put(request,copy)
            );
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match("./index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async cached => {
      if(cached) return cached;

      try{
        const response = await fetch(request);

        if(response.ok){
          const copy = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request,copy);
        }

        return response;
      }catch(error){
        return new Response("Offline",{status:503});
      }
    })
  );
});
