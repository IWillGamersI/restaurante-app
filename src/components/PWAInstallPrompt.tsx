"use client";
import { useEffect, useState } from "react";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Detecta manifest correto
    const getManifestHref = () => {
      if (window.location.pathname.startsWith("/cliente")) {
        return "/manifest-cliente.json";
      } else if (window.location.pathname.startsWith("/pages/estabelecimento")) {
        return "/manifest-estabelecimento.json";
      }
      return null;
    };

    const href = getManifestHref();
    if (href) {
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

    // Detecta se já está rodando como PWA
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setLoading(true);
    setMessage("Aguarde, app em instalação...");
    deferredPrompt.prompt();

    const choiceResult = await deferredPrompt.userChoice;
    setLoading(false);

    if (choiceResult.outcome === "accepted") {
      setInstalled(true);
      setMessage("App instalado! Clique no botão abaixo para abrir o aplicativo.");
    } else {
      setMessage("Instalação cancelada.");
    }

    setDeferredPrompt(null);
    setShowButton(false);
  };

  const openApp = () => {
    // Redireciona para a raiz do app PWA
    window.location.href = "/";
  };

  if (installed) {
    return (
      <div className="fixed bottom-4 right-4 flex flex-col items-center gap-2">
        <button
          onClick={openApp}
          className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg"
        >
          Abrir App
        </button>
        {message && <p className="text-sm text-center text-gray-700">{message}</p>}
      </div>
    );
  }

  if (!showButton) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-center gap-2">
      <button
        onClick={handleInstall}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg"
        disabled={loading}
      >
        {loading ? "Instalando..." : "📲 Instalar App"}
      </button>
      {message && <p className="text-sm text-center text-gray-700">{message}</p>}
    </div>
  );
}
