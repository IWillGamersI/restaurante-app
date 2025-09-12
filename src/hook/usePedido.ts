import { db } from "@/lib/firebase";
import { Extra, Pedido, Produto, ProdutoPedido } from "@/types";
import { gerarCodigoCliente, getLimiteExtra } from "@/utils/pedido";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useStados } from "./useStados";

interface SalvarPedidoArgs {
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
  querImprimir?: boolean;
  imprimir: (dados: any, copias: number) => void;
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

  const { 
    setClienteNome, setClienteTelefone, setCodigoPedido, setCodigoCliente,
    setStatus, setErro, setSucesso,
    setClasseSelecionada, setTipoVenda, setTipoFatura, setTipoPagamento,
    setQuerImprimir
  } = stados;

  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("criadoEm", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setPedidos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Pedido)));
    });
    return () => unsub();
  }, []);

  const salvarPedido = async ({
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
    querImprimir,
    imprimir,
  }: SalvarPedidoArgs) => {
    if (!tipoFatura || !tipoVenda || !clienteNome || produtosPedido.length === 0) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    const agora = new Date();
    const dataLisboa = new Date(
      agora.toLocaleString("en-US", { timeZone: "Europe/Lisbon" })
    );

    let clienteIdFinal = idCliente;
    let codigoClienteFinal = codigoCliente;

    const clientesRef = collection(db, "clientes");

    if (clienteTelefone) {
      const q = query(clientesRef, where("telefone", "==", clienteTelefone));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const clienteDoc = snapshot.docs[0];
        clienteIdFinal = clienteDoc.id;
        codigoClienteFinal = clienteDoc.data().codigoCliente;
      } else {
        const novoCodigo = gerarCodigoCliente(clienteNome, clienteTelefone);
        const docRef = await addDoc(clientesRef, {
          nome: clienteNome,
          telefone: clienteTelefone,
          codigoCliente: novoCodigo,
        });
        clienteIdFinal = docRef.id;
        codigoClienteFinal = novoCodigo;
      }
    } else {
      clienteIdFinal = clienteIdFinal || "CLNT123";
      codigoClienteFinal = codigoClienteFinal || "CLNT123";
    }

    const dados: Omit<Pedido, "id"> & { telefoneCliente?: string | null } = {
      idCliente: clienteIdFinal!,
      nomeCliente: clienteNome,
      telefoneCliente: clienteTelefone || null,
      codigoCliente: codigoClienteFinal!,
      tipoFatura,
      tipoPagamento,
      data: dataLisboa.toISOString(),
      status: "Fila",
      tipoVenda,
      valor: valorTotal,
      produtos: produtosPedido,
      extras: extrasSelecionados,
      codigoPedido,
      criadoEm: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "pedidos"), dados);

      if (querImprimir) imprimir(dados, 2);
      else alert("Pedido salvo com sucesso!");

      limparCampos();
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
      alert("Erro ao salvar pedido. Verifique se você tem permissão.");
    }
  };

  const atualizarStatus = async (id: string, novoStatus: string) => {
    return updateDoc(doc(db, "pedidos", id), { status: novoStatus });
  };

  const confirmarProduto = () => {
    if (!produtoModal) return;

    const novoProduto: ProdutoPedido = {
      id: produtoModal.id,
      nome: produtoModal.nome,
      preco: produtoModal.preco,
      quantidade: quantidadeSelecionada,
      extras: extrasSelecionados,
      categoria: produtoModal.categoria,
    };

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
        };
        return copia;
      }

      return [...prev, novoProduto];
    });

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
  };

  const aumentar = () => setAjuste((prev) => parseFloat((prev + 0.1).toFixed(2)));
  const diminuir = () => setAjuste((prev) => parseFloat((prev - 0.1).toFixed(2)));

  const abrirModalProduto = (produto: Produto) => {
    setProdutoModal(produto);
    setExtrasSelecionados([]);
    setQuantidadeSelecionada(1);
    setModalAberto(true);
  };

  const hoje = new Date();
  const pedidosDoDia = pedidos.filter((p) => {
    const pData = new Date(p.data);
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
  };
}
