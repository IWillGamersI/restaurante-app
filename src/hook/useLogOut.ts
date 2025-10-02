// src/hooks/useLogOut.ts
"use client";

import { useRouter } from "next/navigation";

export function useLogOut() {
  const router = useRouter();

  const logOut = (rota: string) => {
    localStorage.removeItem("clienteCodigo");

    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isPWA) {
      window.location.href = rota;
    } else {
      router.push(rota);
    }
  };

  return logOut;
}
