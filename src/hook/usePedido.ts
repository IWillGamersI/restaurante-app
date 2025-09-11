import { db } from "@/lib/firebase";
import { Extra, Pedido, Produto, ProdutoPedido } from "@/types";
import { gerarCodigoCliente } from "@/utils/pedido";
import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";

export function usePedido(){
    const [pedidos, setPedidos] = useState<Pedido[]>([])
    const [produtosPedido, setProdutosPedido] = useState<ProdutoPedido[]>([]);
    const [produtoModal, setProdutoModal] = useState<Produto | null>(null);
    const [modalAberto, setModalAberto] = useState(false);
    const [extrasSelecionados, setExtrasSelecionados] = useState<Extra[]>([]);
    const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);
    const [ajuste, setAjuste] = useState(0)

    useEffect(()=>{
        const q = query(collection(db,'pedidos'), orderBy('criadoEm', 'asc'))
        const unsub = onSnapshot(q,snap =>{
            setPedidos(snap.docs.map(doc => ({id: doc.id, ...doc.data()} as Pedido)))
        })
        return () => unsub()
    },[])

    async function salvarPedido({
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
            limparCampos,
            imprimir
        }: {
            tipoFatura: string;
            tipoPagamento: string
            tipoVenda: string;
            clienteNome: string;
            clienteTelefone?: string | null;
            idCliente?: string;
            codigoCliente?: string;
            produtosPedido: ProdutoPedido[];
            extrasSelecionados: Extra[];
            codigoPedido: string;
            valorTotal: number;
            querImprimir?: boolean;
            limparCampos: () => void;
            imprimir: (dados: any, copias: number) => void;
        }) {
        

        if(!tipoFatura){
            alert('Informe se é CF ou SF!')
            return
        }

        if(!tipoVenda){
            alert('Informe qual o tipo de VENDA!')
            return
        }

        if (!clienteNome) {
            alert('Informe o NOME do cliente!');
            return;
        }
        if (produtosPedido.length === 0) {
            alert('Adicione pelo menos um PRODUTO!');
            return;
        }

        if(!tipoFatura){
            alert('Informe o tipo de PAGAMENTO!')
            return
        }

        const agora = new Date();
        const dataLisboa = new Date(
            agora.toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })
        );

        let clienteIdFinal = idCliente;
        let codigoClienteFinal = codigoCliente;

        const clientesRef = collection(db, 'clientes');

        if (clienteTelefone) {
            const q = query(clientesRef, where('telefone', '==', clienteTelefone));
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
                const q = query(clientesRef, where('codigoCliente', '==', 'CLNT123'));
                const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                clienteIdFinal = snapshot.docs[0].id;
            } else {
                const docRef = await addDoc(clientesRef, {
                nome: 'Cliente Genérico',
                telefone: null,
                codigoCliente: 'CLNT123',
            });
                clienteIdFinal = docRef.id;
            }
                codigoClienteFinal = 'CLNT123';
        }

        const dados: Omit<Pedido, 'id'> & {telefoneCliente?: string | null}= {
            idCliente: clienteIdFinal!,
            nomeCliente: clienteNome,
            telefoneCliente: clienteTelefone || null,
            codigoCliente: codigoClienteFinal!,
            tipoFatura,
            tipoPagamento,
            data: dataLisboa.toISOString(),
            status: 'Fila',
            tipoVenda,
            valor: valorTotal,
            produtos: produtosPedido,
            extras: extrasSelecionados,
            codigoPedido,
            criadoEm: serverTimestamp(),
        };

    try {
        await addDoc(collection(db, 'pedidos'), dados);

            if (querImprimir) imprimir(dados, 2);
            else alert('Pedido salvo com sucesso!');

            limparCampos();
        } catch (error) {
            console.error('Erro ao salvar pedido:', error);
            alert('Erro ao salvar pedido. Verifique se você tem permissão.');
        }
    }


    async function atualizarStatus(id: string, novoStatus: string) {
        return updateDoc(doc(db, 'pedidos',id),{status: novoStatus})
    }

    const confirmarProduto = () => {
        if (!produtoModal) return
    
        const novoProduto: ProdutoPedido = {
          id: produtoModal.id,
          nome: produtoModal.nome,
          preco: produtoModal.preco,
          quantidade: quantidadeSelecionada,
          extras: extrasSelecionados,
          categoria: produtoModal.categoria,
        }
    
        setProdutosPedido(prev => {
          // procurar se já existe o mesmo produto com os mesmos extras
          const index = prev.findIndex(p =>
            p.id === novoProduto.id &&
            JSON.stringify(p.extras.map(e => e.id).sort()) === JSON.stringify(novoProduto.extras.map(e => e.id).sort())
          )
    
          if (index !== -1) {
            // já existe → soma a quantidade
            const copia = [...prev]
            copia[index] = {
              ...copia[index],
              quantidade: copia[index].quantidade + novoProduto.quantidade,
            }
            return copia
          }
    
          // não existe → adiciona novo item
          return [...prev, novoProduto]
        })
    
        setModalAberto(false)
        setProdutoModal(null)
        setExtrasSelecionados([])
        setQuantidadeSelecionada(1)
    }

    async function removerProdutoPedido(id: string){

    setProdutosPedido(produtosPedido.filter(p => p.id !== id));
  
}


    const aumentar = () => setAjuste((prev)=> parseFloat((prev + 0.10).toFixed(2)))
    const diminuir = () => setAjuste((prev)=> parseFloat((prev - 0.10).toFixed(2)))

    const abrirModalProduto = (produto: Produto) => {
        setProdutoModal(produto)
        // reseta extras e quantidade
        setExtrasSelecionados([])
        setQuantidadeSelecionada(1)
        setModalAberto(true)
    }

    
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
        diminuir
    }
}