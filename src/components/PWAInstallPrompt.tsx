"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true); // exibe botão customizado
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("Instalação resultado:", outcome);
    setDeferredPrompt(null);
    setShowButton(false);

    if (outcome === "accepted") {
      // Redireciona automaticamente para login do cliente
      router.push("/pages/cliente/login");
    }
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
