self.addEventListener("install", (event) => {
  // força instalação imediata da nova versão
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // força todos os clientes a usarem o SW novo
  event.waitUntil(clients.claim());
});

// Se quiser cache offline básico, pode colocar aqui.
// Neste exemplo não cacheamos nada → sempre pega a última versão da Vercel.
