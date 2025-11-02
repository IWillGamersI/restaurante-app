import { db } from "@/lib/firebase";
import { Extra, Pedido, Produto, ProdutoPedido } from "@/types";
import { useCodigos } from "@/hook/useCodigos";
import { getLimiteExtra } from "@/utils/pedido";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useStados } from "./useStados";
import { useResgateCupom } from "./useResgateCupom";

interface SalvarPedidoArgs {
  id?:string
  tipoFatura: string;
  tipoVenda: string;
  tipoPagamento: string;
  clienteNome: string;
  clienteTelefone?: string | null;
  idCliente?: string;
  codigoCliente?: string;
  produtosPedido: ProdutoPedido[];
  extrasSelecionados: Extra[];
  codigoPedido: string;
  valorTotal: number;
  numeroMesa?: string
  querImprimir?: boolean;
  imprimir: (dados: any, copias: number) => void;
  obs?:string
}

export interface Cupom {
  codigo: string;
  dataGanho: string;
  dataResgate?: string;
  quantidade: number;
}

export interface CartaoFidelidade {
  tipo: string;
  quantidade: number;
  limite: number;
  periodo: number;
  cupomGanho: Cupom[];
  cupomResgatado: Cupom[];
  saldoCupom: number;
}

export function usePedido(stados: ReturnType<typeof useStados>) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtosPedido, setProdutosPedido] = useState<ProdutoPedido[]>([]);
  const [produtoModal, setProdutoModal] = useState<Produto | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [extrasSelecionados, setExtrasSelecionados] = useState<Extra[]>([]);
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);
  const [ajuste, setAjuste] = useState(0);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>("");
  const {gerarCodigoCliente, hoje, gerarCodigoPedido} = useCodigos()

  const { 
    setClienteNome, setClienteTelefone, setCodigoPedido, setCodigoCliente,
    setStatus, setErro, setSucesso,
    setClasseSelecionada, setTipoVenda, setTipoFatura, setTipoPagamento,
    setQuerImprimir, setNumeroMesa, setObs, codigoCliente,
  } = stados;

  const { 
          cuponsDisponiveis,
          cuponsSelecionados,
          toggleCupom,
          carregarCupons,
          limparCuponsSelecionados,
          marcarCupomComoUsado,
          resgatarCupons
        } = useResgateCupom(codigoCliente || undefined)
  
  useEffect(()=>{
    if(codigoCliente){
      carregarCupons()
    }
  }, [codigoCliente])

  useEffect(() => {
  if (cuponsDisponiveis.length > 0) {
    }
  }, [cuponsDisponiveis]);
  
  // dentro de usePedido
  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("criadoEm", "asc")); // ordenar por criadoEm (timestamp) é mais confiável
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => {
        const data = d.data() as any;

        // Normaliza: criadoEmDate será um Date (prefira este para cálculos e filtros)
        const criadoEmDate =
          data.criadoEm?.toDate ? data.criadoEm.toDate() :
          data.data ? new Date(data.data) : // se tiver data (ISO string)
          undefined;

        return {
          id: d.id,
          ...data,
          // adiciona campos normalizados para uso no front
          criadoEm: criadoEmDate,          // Date | undefined
          dataISO: data.data || (criadoEmDate ? criadoEmDate.toISOString() : undefined),
        } as Pedido & { criadoEm?: Date; dataISO?: string };
      });

      setPedidos(lista);
    });
    return () => unsub();
  }, []);



  const salvarPedido = async ({
    id,
    tipoFatura,
    tipoVenda,
    tipoPagamento,
    clienteNome,
    clienteTelefone,
    idCliente,
    codigoCliente,
    produtosPedido,
    extrasSelecionados,
    codigoPedido,
    valorTotal,
    numeroMesa,
    imprimir,
    obs
  }: SalvarPedidoArgs) => {

    // Validações obrigatórias
    if (!tipoFatura) { alert('Informe se é CF ou SF!'); return; }
    if (!tipoVenda) { alert('Informe qual o tipo de VENDA!'); return; }
    if (produtosPedido.length === 0) { alert('Adicione pelo menos um PRODUTO!'); return; }
    if (!tipoPagamento) { alert('Informe o tipo de PAGAMENTO!'); return; }

    
    if(id){
      const pedidoRef = doc(db,'pedidos',id)
      const pedidoSnap = await getDoc(pedidoRef)
      
      if(pedidoSnap.exists()){
        const pedidoAtual = pedidoSnap.data() as Pedido

        const novosProdutos = produtosPedido
        const novoValor = (pedidoAtual.valor || 0) + novosProdutos.reduce((acc,p)=>{
          const extras = p.extras?.reduce((sum,e)=> sum + (e.valor || 0),0) || 0
          return acc + p.precoVenda * p.quantidade + extras
        },0)

        
        const valorNovosProdutos = novosProdutos.reduce((acc,p)=>{
          const extras = p.extras?.reduce((sum,e)=> sum + (e.valor || 0),0) || 0
          return acc + p.precoVenda * p.quantidade + extras
        },0)

        await updateDoc(pedidoRef,{
          produtos: [...pedidoAtual.produtos || '', ...novosProdutos],
          valor: novoValor,
          atualizadoEm: serverTimestamp()
        })

        await imprimir({
          codigo:pedidoAtual.codigoPedido,
          cliente:pedidoAtual.nomeCliente,
          codigoCliente: pedidoAtual.codigoCliente,
          produtos:novosProdutos,
          valor:valorNovosProdutos,
          data:hoje,
          tipoVenda:pedidoAtual.tipoVenda === 'mesa' ? `Mesa ${pedidoAtual.numeroMesa}` : pedidoAtual.tipoVenda,

        },1)

        limparCampos()
        alert(`Produtos adicionados aos Pedido ${pedidoAtual.codigoPedido}`)

        return

      }
      
    }

    const agora = new Date();
    const dataLisboa = new Date(agora.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));

    let clienteIdFinal = idCliente;
    let codigoClienteFinal = codigoCliente;
    let codigoPedidoFinal = codigoPedido;

    const clientesRef = collection(db, "clientes");

    // Se houver telefone, verifica se já existe cliente
    if (clienteTelefone) {
    const q = query(clientesRef, where("telefone", "==", clienteTelefone));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // 🔹 Cliente já existe
      const clienteDoc = snapshot.docs[0];
      clienteIdFinal = clienteDoc.id;
      codigoClienteFinal = clienteDoc.data().codigoCliente;
    } else {
      // 🔹 Cria novo cliente
      const novoCodigo = gerarCodigoCliente(clienteNome, clienteTelefone);
      const docRef = await addDoc(clientesRef, {
        nome: clienteNome || "Cliente CLNT",
        telefone: clienteTelefone,
        codigoCliente: novoCodigo,
        codigoPais: '351'
      });
      clienteIdFinal = docRef.id;
      codigoClienteFinal = novoCodigo;
    }

    // ✅ Atualiza estado e carrega cupons do cliente encontrado/criado
    setCodigoCliente(codigoClienteFinal || '');
    await carregarCupons();

  } else {
    // ⚠️ Cliente genérico (sem telefone, sem fidelidade)
    clienteIdFinal = clienteIdFinal || "CLT-123";
    codigoClienteFinal = codigoClienteFinal || "CLT-123";
    clienteNome = clienteNome || "Cliente";
    clienteTelefone = clienteTelefone || '999999999';
    codigoPedidoFinal = gerarCodigoPedido();

    // ❌ Não tenta carregar cupons (cliente genérico não tem fidelidade)
    setCodigoCliente(codigoClienteFinal);
  }


    try {

      const numeroMesaFinal = numeroMesa ?? stados.numeroMesa ?? ''
      
      if (tipoVenda === 'mesa' && !numeroMesaFinal.trim()) {
        alert("Informe o número da mesa antes de salvar o pedido!");
        return;
      }else{
        // ===== Pedido mesa existente =====
        if (tipoVenda === 'mesa') {
          const pedidosRef = collection(db, 'pedidos');
          const q = query(
            pedidosRef,
            where('tipoVenda', '==', 'mesa'),
            where('numeroMesa', '==', numeroMesaFinal),
            where('status', 'in', ['Fila', 'Preparando', 'Pronto'])
          );
  
          const snap = await getDocs(q);
  
          if (!snap.empty) {
            const pedidoDoc = snap.docs[0];
            const pedidoAtual = pedidoDoc.data() as Pedido;
  
            // Apenas anexar produtos novos
            const novosProdutos = produtosPedido;
  
            const novoValor = (pedidoAtual.valor || 0) +
              novosProdutos.reduce((acc, p) => {
                const extras = p.extras?.reduce((sum, e) => sum + (e.valor || 0), 0) || 0;
                return acc + p.preco * p.quantidade + extras;
              }, 0);

              pedidoAtual.status = 'Fila'
  
            await updateDoc(doc(db, 'pedidos', pedidoDoc.id), {
              produtos: [...pedidoAtual.produtos || '', ...novosProdutos],
              valor: novoValor,
              atualizadoEm: serverTimestamp(),
            });
  
            // Imprimir apenas os novos produtos 
            const dadosParciais = {
              codigo:pedidoAtual.codigoPedido,
              cliente:pedidoAtual.nomeCliente,
              codigoCliente: pedidoAtual.codigoCliente,
              produtos:novosProdutos,
              data:hoje,
              tipoVenda:pedidoAtual.tipoVenda === 'mesa' ? `Mesa ${pedidoAtual.numeroMesa}` : pedidoAtual.tipoVenda,
              valor: novosProdutos.reduce((acc, p) => {
                const extras = p.extras?.reduce((sum, e) => sum + (e.valor || 0), 0) || 0;
                return acc + p.preco * p.quantidade + extras;
              }, 0),
            };
  
            await imprimir(dadosParciais, 1);
  
            limparCampos();
            alert(`Produtos adicionados à Mesa ${numeroMesa}.`);
            return;
          }
        }

      }


      // ===== Criar novo pedido =====
       let ordemDiaria = pedidosDoDia.length + 1
       
       
      const dados: Omit<Pedido, "id"> & { telefoneCliente?: string | null } = {
        idCliente: clienteIdFinal!,
        nomeCliente: clienteNome,
        telefoneCliente: clienteTelefone,
        codigoCliente: codigoClienteFinal!,
        tipoFatura,
        tipoPagamento,
        data: dataLisboa.toISOString(),
        status: "Fila",
        tipoVenda,
        numeroMesa: tipoVenda === 'mesa' ? numeroMesaFinal : null,
        valor: valorTotal,
        produtos: produtosPedido,
        extras: extrasSelecionados,
        codigoPedido: codigoPedidoFinal!,
        criadoEm: serverTimestamp(),
        ordemDiaria,
        obs: obs || ''
      };

     
      const docRef = await addDoc(collection(db, "pedidos"), dados);

      const dadosCompleto = {
        codigo:dados.codigoPedido,
        cliente:dados.nomeCliente,
        codigoCliente: dados.codigoCliente,
        produtos:dados.produtos,
        valor:dados.valor,
        data:hoje,
        tipoVenda:dados.tipoVenda === 'mesa' ? `Mesa ${dados.numeroMesa}` : dados.tipoVenda,        
        id: docRef.id,
      };


      await imprimir(dadosCompleto, 1);

      

      limparCampos();
      alert("Pedido criado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      alert("Erro ao salvar pedido. Verifique se você tem permissão ou índices no Firestore.");
    }
  };

  


  const atualizarStatus = async (id: string, novoStatus: string) => {
    return updateDoc(doc(db, "pedidos", id), { status: novoStatus });
  };

  const confirmarProduto = () => {
    if (!produtoModal) return;

    // 🔹 Filtra cupons válidos para este produto
    const cuponsDoProduto = cuponsSelecionados.filter(
      (c) => c.tipo.toLowerCase() === produtoModal.classe?.toLowerCase()
    );

    // 🔹 Pega apenas o primeiro cupom válido (se houver)
    const cupomDoProduto = cuponsDoProduto[0];

    // 🔹 Se houver cupom válido, o preço fica 0 — mas o cupom ainda NÃO é resgatado
    const precoComDesconto = cupomDoProduto ? 0 : produtoModal.precoVenda;

    const novoProduto: ProdutoPedido = {
      id: produtoModal.id,
      nome: produtoModal.nome,
      descricao: produtoModal.descricao,
      preco: precoComDesconto,
      precoVenda: produtoModal.precoVenda,
      custo: produtoModal.custo,
      quantidade: quantidadeSelecionada,
      extras: extrasSelecionados,
      categoria: produtoModal.categoria,
      classe: produtoModal.classe,
      imagemUrl: produtoModal.imagemUrl,
      ...(cupomDoProduto && {
        cupomAplicado: {
          codigo: cupomDoProduto.codigo,
          tipo: cupomDoProduto.tipo,
          valorCupom: produtoModal.precoVenda, // conforme combinamos: valorCupom = preço do produto
          resgatado: false,
          // dataResgate fica undefined até ser resgatado
        }
      }),
      ignorarParaFidelidade: !!cupomDoProduto,

    };

    // 🔹 Adiciona ou atualiza produto no pedido
    setProdutosPedido((prev) => {
      const index = prev.findIndex(
        (p) =>
          p.id === novoProduto.id &&
          JSON.stringify(p.extras.map((e) => e.id).sort()) ===
            JSON.stringify(novoProduto.extras.map((e) => e.id).sort())
      );

      if (index !== -1) {
        const copia = [...prev];
        copia[index] = {
          ...copia[index],
          quantidade: copia[index].quantidade + novoProduto.quantidade,
          preco: precoComDesconto,
          cupomAplicado: cupomDoProduto
            ? {
                codigo: cupomDoProduto.codigo,
                tipo: cupomDoProduto.tipo,
                valorCupom: produtoModal.precoVenda, // 💡 igual ao produto
                resgatado: false, // ainda não foi resgatado
                // dataResgate ficará undefined até entrega
              }
            : copia[index].cupomAplicado,
          ignorarParaFidelidade: !!cupomDoProduto,
        };
        return copia;
      }

      return [...prev, novoProduto];
    });


    // ❌ NADA de marcar cupom como usado aqui
    // Ele será resgatado apenas quando o status do pedido for "Entregue"

    // 🔹 Fecha modal e reseta seleção
    setModalAberto(false);
    setProdutoModal(null);
    setExtrasSelecionados([]);
    setQuantidadeSelecionada(1);
  };






  const removerProdutoPedido = (id: string) => {
    setProdutosPedido((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleExtra = (extra: Extra) => {
    if (!produtoModal) return;

    const limite = getLimiteExtra(produtoModal, extra.tipo);
    const selecionadosDoMesmoTipo = extrasSelecionados.filter((x) => x.tipo === extra.tipo);

    if (extrasSelecionados.some((x) => x.id === extra.id)) {
      setExtrasSelecionados((prev) => prev.filter((x) => x.id !== extra.id));
    } else {
      if (limite !== null && selecionadosDoMesmoTipo.length >= limite) {
        alert(`Você só pode escolher até ${limite} "${extra.tipo}" para este produto.`);
        return;
      }
      setExtrasSelecionados((prev) => [...prev, extra]);
    }
  };

  const limparCampos = () => {
    setClienteNome("");
    setClienteTelefone("");
    setCodigoPedido("");
    setCodigoCliente("");
    setStatus("");
    setProdutosPedido([]);
    setProdutoSelecionado("");
    setQuantidadeSelecionada(1);
    setErro("");
    setSucesso("");
    setExtrasSelecionados([]);
    setClasseSelecionada("");
    setTipoVenda("");
    setTipoFatura("");
    setTipoPagamento("");
    setQuerImprimir(false);
    setAjuste(0);
    setNumeroMesa('')
    setObs('')

  };

  const aumentar = () => setAjuste((prev) => parseFloat((prev + 0.1).toFixed(2)));
  const diminuir = () => setAjuste((prev) => parseFloat((prev - 0.1).toFixed(2)));

  const abrirModalProduto = (produto: Produto) => {
    setProdutoModal(produto);
    setExtrasSelecionados([]);
    setQuantidadeSelecionada(1);
    setModalAberto(true);
  };

  
  const pedidosDoDia = pedidos.filter((p) => {
  const pData = p.criadoEm instanceof Date ? p.criadoEm : (p.data ? new Date(p.data) : null);
  if (!pData) return false;
  return (
    pData.getDate() === hoje.getDate() &&
    pData.getMonth() === hoje.getMonth() &&
    pData.getFullYear() === hoje.getFullYear()
  );
});

  return {
    pedidos,
    salvarPedido,
    atualizarStatus,
    removerProdutoPedido,
    produtosPedido,
    setProdutosPedido,
    abrirModalProduto,
    produtoModal,
    setProdutoModal,
    modalAberto,
    setModalAberto,
    extrasSelecionados,
    setExtrasSelecionados,
    quantidadeSelecionada,
    setQuantidadeSelecionada,
    confirmarProduto,
    ajuste,
    setAjuste,
    aumentar,
    diminuir,
    hoje,
    pedidosDoDia,
    handleToggleExtra,
    limparCampos,
    produtoSelecionado,
    setProdutoSelecionado,
    cuponsDisponiveis,
    cuponsSelecionados,
    toggleCupom,
    marcarCupomComoUsado,
    resgatarCupons
  };
}
