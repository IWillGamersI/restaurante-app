import { useState } from "react";
import { Produto, Pedido, FiltroPeriodo,Despesa,DespesasPaga, FaturamentoSemanal, ResumoMensal, FaturamentoDiario } from "@/types";
import { useProdutos } from '@/hook/useProdutos';


export function useStados() {
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
  const [tipoFatura, setTipoFatura] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState('');
  const [querImprimir, setQuerImprimir] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [numeroMesa, setNumeroMesa] = useState<string>('')
  const [idPedidoSelecionado, setIdPedidoSelecionado] = useState<string | null>(null);
  const [obs, setObs] = useState('')
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('hoje');
  const [moeda, setMoeda] = useState('€'); // pode trocar para 'R$' etc.
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [despesasPagas,setDespesasPagas] = useState<DespesasPaga[]>([])
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [resumoSemanal, setResumoSemanal] = useState<FaturamentoSemanal>({almoco:{},jantar:{},semanas:[0,0,0,0,0],categorias:{}})

  const [faturamentoPorDia, setFaturamentoPorDia] = useState<{ [key: number]: {diaSemana:string; almoco: FaturamentoDiario; jantar: FaturamentoDiario } }>({});
  const [resumoMensal, setResumoMensal] = useState<ResumoMensal>({
    faturamentoTotal: 0,
    totalProdutos: {},
    almocoTotal: 0,
    jantarTotal: 0,
    produtos:{}
  });

  const { setClasseSelecionada, classeSelecionada } = useProdutos();

  return {
    cliente, setCliente,
    status, setStatus,
    produtoSelecionado, setProdutoSelecionado,
    erro, setErro,
    sucesso, setSucesso,
    clienteNome, setClienteNome,
    clienteTelefone, setClienteTelefone,
    codigoCliente, setCodigoCliente,
    codigoPedido, setCodigoPedido,
    idCliente, setIdCliente,
    classeSelecionada, setClasseSelecionada,
    tipoVenda, setTipoVenda,
    tipoFatura, setTipoFatura,
    tipoPagamento, setTipoPagamento,
    querImprimir, setQuerImprimir,
    produtos, setProdutos,
    numeroMesa, setNumeroMesa,
    idPedidoSelecionado, setIdPedidoSelecionado,
    obs,setObs,
    pedidos, setPedidos,
    loading, setLoading,
    filtroPeriodo, setFiltroPeriodo,
    moeda, setMoeda,
    despesas, setDespesas,
    despesasPagas,setDespesasPagas,
    mesSelecionado, setMesSelecionado,
    anoSelecionado, setAnoSelecionado,
    resumoSemanal, setResumoSemanal,
    resumoMensal, setResumoMensal,
    faturamentoPorDia, setFaturamentoPorDia
  };
}
