import { useCallback } from "react";

export function useCodigos(){

    const gerarCodigoPedido = useCallback((nome: string) => {
        const nomeLimpo = nome.trim().toUpperCase();
        if (nomeLimpo.length < 2) return '';
        const prefixo = nomeLimpo[0] + nomeLimpo[nomeLimpo.length - 1];
        const numero = Math.floor(Math.random() * 10000);
        const codigo = numero.toString().padStart(4, '0');
        return `${prefixo}-${codigo}`;
    },[])

    const gerarCodigoCliente = useCallback((nome: string, telefone: string) =>{
        if(!nome || !telefone) return ''
            const ultimos3 = telefone.slice(-3)
            const consoantes = nome
                                .replace(/[AEIOUaeiouÁÉÍÓÚáéíóúÂÊÎÔÛâêîôûÀàÇç\s]/g, '')
                                .toUpperCase()
            return `${consoantes}-${ultimos3}`
    },[])

    const hoje = new Date();
    

    return { gerarCodigoCliente, gerarCodigoPedido, hoje}
}