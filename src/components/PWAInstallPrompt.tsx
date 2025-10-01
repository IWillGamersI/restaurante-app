"use client";
import { useEffect, useState } from "react";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Detecta manifest correto
    const getManifestHref = () => {
      if (window.location.pathname.startsWith("/pages/cliente")) {
        return "/manifest-cliente.json";
      } else if (window.location.pathname.startsWith("/pages/estabelecimento")) {
        return "/manifest-estabelecimento.json";
      }
      return null;
    };

    const href = getManifestHref();
    if (href) {
      // Remove manifest antigo se existir
      const oldManifest = document.querySelector('link[rel="manifest"]');
      if (oldManifest) oldManifest.remove();

      const manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = href;
      document.head.appendChild(manifestLink);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowButton(false);
  };

  if (!showButton) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg"
    >
      📲 Instalar App
    </button>
  );
}
