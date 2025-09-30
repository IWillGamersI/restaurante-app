"use client";
import { useEffect, useState } from "react";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Cria dinamicamente o link do manifest correto
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";

    if (window.location.pathname.startsWith("/pages/cliente")) {
      manifestLink.href = "/manifest-cliente.json";
    } else if (window.location.pathname.startsWith("/pages/estabelecimento")) {
      manifestLink.href = "/manifest-estabelecimento.json";
    }

    document.head.appendChild(manifestLink);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      document.head.removeChild(manifestLink);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowButton(false);
    // Não precisa redirecionar, o start_url do manifest define a rota inicial
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
