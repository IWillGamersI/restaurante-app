import { useCallback } from "react";

export function useCodigos() {

 const gerarCodigoPedido = useCallback((nome?: string) => {
  const numero = Math.floor(Math.random() * 10000).toString().padStart(4, "0");

  if (!nome || nome.trim().length < 2) {
    return `PD-${numero}`;
  }

  const nomeLimpo = nome.trim().toUpperCase();
  const prefixo = `${nomeLimpo[0]}${nomeLimpo[nomeLimpo.length - 1]}`;

  return `${prefixo}-${numero}`;
}, []);


  const TELEFONE_CLIENTE_GENERICO = "999999999";

  const gerarCodigoCliente = useCallback((nome?: string, telefone?: string) => {
    // Usa telefone padrão se não houver
    const tel = telefone || TELEFONE_CLIENTE_GENERICO;

    // Só números no telefone
    const telefoneNumerico = tel.replace(/\D/g, "");
    const ultimos3 = telefoneNumerico.slice(-3).padStart(3, "0");

    // Extrair até 3 consoantes do nome, ou usar "GEN" se não houver nome
    let consoantes = nome
      ? nome
          .normalize("NFD") // remove acentos
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[AEIOUaeiou\s]/g, "")
          .toUpperCase()
          .slice(0, 3)
      : "GEN";

    // Se não tiver 3 consoantes, completa com X
    consoantes = consoantes.padEnd(3, "X");

    return `${consoantes}-${ultimos3}`;
  }, []);




  const hoje = new Date();

  return { gerarCodigoPedido, gerarCodigoCliente, hoje };
}
