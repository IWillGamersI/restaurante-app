import { useEffect } from "react";
import { useCodigos } from "./useCodigos";
import { useStados } from '@/hook/useStados'

export function useCliente(){

    const {gerarCodigoPedido} = useCodigos()
    const {setCodigoPedido, cliente} = useStados()

    useEffect(() => {
        if (cliente.trim().length >= 2) {
            setCodigoPedido(gerarCodigoPedido(cliente));

        } else {
            setCodigoPedido('');
        }
    }, [cliente]);
}