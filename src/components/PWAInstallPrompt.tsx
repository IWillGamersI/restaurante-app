"use client";
import { useEffect, useState } from "react";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");
  const [counter, setCounter] = useState(10); // contagem de 10 segundos

  useEffect(() => {
    // Detecta manifest correto
    const getManifestHref = () => {
      if (window.location.pathname.startsWith("/cliente")) return "/manifest-cliente.json";
      if (window.location.pathname.startsWith("/pages/estabelecimento")) return "/manifest-estabelecimento.json";
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

    setInstalling(true);
    setCounter(3);
    setMessage("Aguarde, app em instalação...");
    deferredPrompt.prompt();

    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      const timer = setInterval(() => {
        setCounter((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setInstalling(false);
            setInstalled(true);
            setMessage("🎉 App instalado! Abra o aplicativo pela tela inicial do seu celular.");
            return 0;
          }
          setMessage(`Aguarde, app em instalação... ${prev - 1}s`);
          return prev - 1;
        });
      }, 20000); // 1s por decremento
    } else {
      setInstalling(false);
      setMessage("Instalação cancelada.");
    }

    setDeferredPrompt(null);
    setShowButton(false);
  };

  const openApp = () => {
    // PWA não permite abrir automaticamente, orienta usuário
    setMessage("Abra o app pela tela inicial do seu celular.");
  };

  if (!showButton && !installed) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-700 via-purple-700 to-pink-600 bg-opacity-95 z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center gap-4 w-80">
        <img src="/logo.png" alt="Logo" className="w-28 h-28 mb-2 animate-bounce rounded-full" />

        {/* Barra de progresso */}
        {installing && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${((20 - counter) / 20) * 100}%` }}
              ></div>
            </div>
            <p className="text-gray-700 text-center mt-2">{message}</p>
          </>
        )}

        {/* Botão instalar */}
        {!installing && !installed && (
          <>
            <p className="text-gray-700 text-center">
              Instale nosso aplicativo para uma experiência completa!
            </p>
            <button
              onClick={handleInstall}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 w-full transform transition-transform hover:scale-105 flex justify-center items-center gap-2"
            >
              📲 Instalar App
            </button>
            {message && <p className="text-sm text-center text-gray-700">{message}</p>}
          </>
        )}

        {/* Botão abrir app */}
        {installed && (
          <>
            <p className="text-gray-700 text-center">{message}</p>
            <button
              onClick={openApp}
              className="bg-green-600 text-white px-6 py-2 rounded-lg shadow hover:bg-green-700 w-full transform transition-transform hover:scale-105"
            >
              Abrir App
            </button>
          </>
        )}
      </div>
    </div>
  );
}
