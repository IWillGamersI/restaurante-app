import { useCallback } from "react";

export function useCodigos() {

  const gerarCodigoPedido = useCallback((nome?: string) => {
    const numero = Math.floor(Math.random() * 10000).toString().padStart(4, "0");

    if (!nome || nome.trim().length < 2) {
      // Pedido genérico
      return `PD-${numero}`;
    }

    const nomeLimpo = nome.trim().toUpperCase();
    const prefixo = nomeLimpo[0] + nomeLimpo[nomeLimpo.length - 1];
    return `${prefixo}-${numero}`;
  }, []);

  const gerarCodigoCliente = useCallback((nome?: string, telefone?: string) => {
    if (!nome || !telefone) {
      // Cliente genérico
      return "CLT-123";
    }

    const ultimos3 = telefone.slice(-3);
    const consoantes = nome
            .replace(/[AEIOUaeiouÁÉÍÓÚáéíóúÂÊÎÔÛâêîôûÀàÇç\s]/g, "")
            .toUpperCase()
            .slice(0,3)

    return `${consoantes}-${ultimos3}`;
  }, []);

  const hoje = new Date();

  return { gerarCodigoPedido, gerarCodigoCliente, hoje };
}
