const CACHE_NAME = "app-cache-v1";
const OFFLINE_URL = "/pages/cliente/login";

// Recursos que você quer manter em cache
const PRECACHE_RESOURCES = [
  OFFLINE_URL,
  "/", // raiz
  "/favicon.ico",
  "/manifest.json",
  // adicione mais arquivos essenciais se quiser
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // força instalação imediata
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_RESOURCES);
    })
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim(); // força SW ativo em todos os clients
  // limpa caches antigos se necessário
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Intercepta requisições para a raiz e redireciona para login do cliente
  if (url.origin === self.location.origin && url.pathname === "/") {
    event.respondWith(
      caches.match(OFFLINE_URL).then((cached) => cached || fetch(OFFLINE_URL))
    );
    return;
  }

  // Estratégia de cache para offline: primeiro tenta rede, depois cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // opcional: atualiza cache
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => caches.match(event.request)) // fallback offline
  );
});
