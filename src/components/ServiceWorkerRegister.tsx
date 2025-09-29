"use client";
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("✅ Service Worker registrado"))
        .catch((err) => console.error("Erro ao registrar SW:", err));
    }
  }, []);

  return null;
}
