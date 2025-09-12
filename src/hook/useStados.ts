import { useState } from "react";
import { usePedido } from "./usePedido";  
import { Produto } from "@/types";
import { useProdutos } from '@/hook/useProdutos'


export function useStados(){

    const [cliente, setCliente] = useState('');
    const [status, setStatus] = useState('');
    const [produtoSelecionado, setProdutoSelecionado] = useState('');
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [clienteNome, setClienteNome] = useState('');
    const [clienteTelefone, setClienteTelefone] = useState('');
    const [codigoCliente, setCodigoCliente] = useState('');
    const [codigoPedido, setCodigoPedido] = useState('');
    const [idCliente, setIdCliente] = useState<string | null>(null);
    
    const [tipoVenda, setTipoVenda] = useState("");
    const [tipoFatura, setTipoFatura] = useState('')
    const [tipoPagamento, setTipoPagamento] = useState('')
    const [querImprimir, setQuerImprimir] = useState(false)
    const [produtos, setProdutos] = useState<Produto[]>([])
    
    const {setClasseSelecionada, classeSelecionada} = useProdutos()
    const {setProdutosPedido, setQuantidadeSelecionada, setExtrasSelecionados, setAjuste} = usePedido()

    
    const limparCampos = () => {
        setClienteNome('');
        setClienteTelefone('');
        setCodigoPedido('')
        setCodigoCliente('')
        setStatus('');
        setProdutosPedido([]);
        setProdutoSelecionado('');
        setQuantidadeSelecionada(1);
        setErro('');
        setSucesso('');
        setExtrasSelecionados([]);
        setClasseSelecionada('')
        setTipoVenda('')
        setTipoFatura('')
        setTipoPagamento('')
        setQuerImprimir(false)
        setAjuste(0)
    };

    return {
        limparCampos, 
        cliente, 
        setCliente,
        status,
        setStatus,
        produtoSelecionado,
        setProdutoSelecionado,
        erro, 
        setErro,
        sucesso, 
        setSucesso,
        clienteNome, 
        setClienteNome,
        clienteTelefone, 
        setClienteTelefone,
        codigoCliente, 
        setCodigoCliente,
        codigoPedido, 
        setCodigoPedido,
        idCliente, 
        setIdCliente,
        classeSelecionada, 
        setClasseSelecionada,
        tipoVenda, 
        setTipoVenda,
        tipoFatura, 
        setTipoFatura,
        tipoPagamento, 
        setTipoPagamento,
        querImprimir, 
        setQuerImprimir,
        produtos,
        setProdutos

    }
}

