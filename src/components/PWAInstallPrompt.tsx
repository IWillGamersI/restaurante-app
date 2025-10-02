"use client";
import { useEffect, useState } from "react";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");
  const [counter, setCounter] = useState(3);

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

  // Contagem regressiva para simular instalação
  useEffect(() => {
    if (installing && counter > 0) {
      const timer = setTimeout(() => setCounter(counter - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [installing, counter]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    setMessage("Aguarde, app em instalação...");
    setCounter(5);

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      // Simula 3s de instalação
      const timer = setInterval(() => {
        if (counter <= 1) {
          clearInterval(timer);
          setInstalling(false);
          setInstalled(true);
          setMessage(
            "App instalado! Clique no botão abaixo para abrir o aplicativo."
          );
        } else {
          setCounter((prev) => prev - 1);
          setMessage(`Aguarde, app em instalação... ${counter - 1}s`);
        }
      }, 1000);
    } else {
      setInstalling(false);
      setMessage("Instalação cancelada.");
    }

    setDeferredPrompt(null);
    setShowButton(false);
  };

  const openApp = () => {
    window.location.href = "/cliente/login";
  };

  if (installed) {
    return (
      <div className="fixed bottom-4 right-4 flex flex-col items-center gap-2 bg-white p-4 rounded-lg shadow-lg w-60">
        <img src="/logo.png" alt="Logo" className="w-16 h-16 mb-2" />
        <button
          onClick={openApp}
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 w-full"
        >
          Abrir App
        </button>
        {message && <p className="text-sm text-center text-gray-700">{message}</p>}
      </div>
    );
  }

  if (!showButton) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-center gap-2 bg-white p-4 rounded-lg shadow-lg w-60">
      <img src="/logo.png" alt="Logo" className="w-16 h-16 mb-2" />
      <button
        onClick={handleInstall}
        className={`bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 w-full flex justify-center items-center gap-2`}
        disabled={installing}
      >
        {installing && (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        )}
        {installing ? `Instalando... ${counter}s` : "📲 Instalar App"}
      </button>
      {message && <p className="text-sm text-center text-gray-700">{message}</p>}
    </div>
  );
}
