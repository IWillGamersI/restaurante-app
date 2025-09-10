'use client';
import { useCodigos } from "@/hook/useCodigos";
import { useStatus } from "@/hook/useStatusColor";
import { calcularSubTotalProduto, calcularTotalExtras, calcularTotalPedido } from "@/utils/calculos";
import { Produto, ProdutoPedido } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  onSnapshot,
  serverTimestamp,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Plus,
  Trash2,
  Edit,
  Package,
  Calendar,
  CheckCircle2,
  Hourglass,
  ClipboardList,
  Printer,
  PlusCircleIcon,
  Delete,
} from 'lucide-react';

import { imprimir } from '@/lib/impressao';
import { Button } from './ui/button';



interface Extra {
  id: string
  nome: string
  tipo: string
  valor?: number
}



interface Pedido {
  id: string;
  codigoPedido: string
  nomeCliente: string;
  data: string;
  status: string;
  valor: number;
  produtos: ProdutoPedido[];
  extras: Extra[]
  tipoVenda: string
  tipoFatura: string
  tipoPagamento:string
  numeroMesa: string
}

interface Cliente {
  id: string
  nome: string
  telefone:string
  codigoCliente:string
}

export default function GerenciarPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cliente, setCliente] = useState('');
  const [status, setStatus] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);
  const [produtosPedido, setProdutosPedido] = useState<ProdutoPedido[]>([]);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extrasSelecionados, setExtrasSelecionados] = useState<Extra[]>([]);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [codigoCliente, setCodigoCliente] = useState('');
  const [codigoPedido, setCodigoPedido] = useState('');
  const [idCliente, setIdCliente] = useState<string | null>(null);
  const [classeSelecionada, setClasseSelecionada] = useState("");
  const [tipoVenda, setTipoVenda] = useState("");
  const [tipoFatura, setTipoFatura] = useState('')
  const [tipoPagamento, setTipoPagamento] = useState('')
  const [querImprimir, setQuerImprimir] = useState(false)
  const [ajuste, setAjuste] = useState(0)
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoModal, setProdutoModal] = useState<Produto | null>(null)


  const aumentar = () => setAjuste((prev)=> parseFloat((prev + 0.10).toFixed(2)))
  const diminuir = () => setAjuste((prev)=> parseFloat((prev - 0.10).toFixed(2)))

  const {gerarCodigoPedido, gerarCodigoCliente} = useCodigos()
  const {statusColor} = useStatus()


  const handleToggleExtra = (extra: Extra) => {
    if (!produtoModal) return;

    // Determinar limite baseado na classe e categoria
    let limite: number | null = null;

    if (produtoModal.classe === "massa" || produtoModal.classe === "pizza-escolha") {
      if (extra.tipo === "molho") limite = 1;
      if (extra.tipo === "ingrediente") limite = 3;
      if (extra.tipo === "ingredienteplus") limite = null; // sem limite
    }

    // regra especial: estudante + categoria massa
    if (produtoModal.classe === "estudante" && produtoModal.categoria === "massa") {
      if (extra.tipo === "molho") limite = 1;
      if (extra.tipo === "ingrediente") limite = 2;
      if (extra.tipo === "ingredienteplus") limite = null;
    }

    const selecionadosDoMesmoTipo = extrasSelecionados.filter(x => x.tipo === extra.tipo);

    if (extrasSelecionados.some(x => x.id === extra.id)) {
      // desmarcando
      setExtrasSelecionados(prev => prev.filter(x => x.id !== extra.id));
    } else {
      // adicionando
      if (limite !== null && selecionadosDoMesmoTipo.length >= limite) {
        alert(`Você só pode escolher até ${limite} "${extra.tipo}" para este produto.`);
        return;
      }
      setExtrasSelecionados(prev => [...prev, extra]);
    }
  };




  
const abrirModalProduto = (produto: Produto) => {
  setProdutoModal(produto)
  // reseta extras e quantidade
  setExtrasSelecionados([])
  setQuantidadeSelecionada(1)
  setModalAberto(true)
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
}

 

  // Puxa os pedidos do Firestore
  useEffect(() => {
    const q = query(collection(db, 'pedidos'), orderBy('criadoEm', 'asc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pedido));
      setPedidos(lista);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    carregarProdutos();
    carregarExtras();
  }, []);

  const carregarProdutos = async () => {
    const q = query(collection(db, 'produtos'), orderBy('nome', 'asc'));
    const snap = await getDocs(q);
    const lista: Produto[] = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        img: data.imagemUrl,
        nome: data.nome || '',
        preco: data.preco || 0,
        classe: data.classe || '',
        categoria: data.categoria || ''
      };
    });
    setProdutos(lista);
  };

  const carregarExtras = async () => {
    const q = query(collection(db, "extras"), orderBy("nome", "asc"));
    const snap = await getDocs(q);
    const lista: Extra[] = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome || "",
        tipo: data.tipo || "",
        valor: data.valor || 0,
      };
    });
    setExtras(lista);
  };

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

  

  const removerProdutoPedido = (id: string) => {
    setProdutosPedido(produtosPedido.filter(p => p.id !== id));
  };

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await updateDoc(doc(db, 'pedidos', id), { status: novoStatus });
  };

  const valorTotal = calcularTotalPedido(produtosPedido) + ajuste
  

  

  const salvarPedido  = async () => {
    const agora = new Date();
    const dataLisboa = new Date(
      agora.toLocaleString('en-US', { timeZone: 'Europe/Lisbon' })
    );

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

    if(!tipoPagamento){
      alert('Informe o tipo de PAGAMENTO!')
      return
    }

    let clienteIdFinal = idCliente;
    let codigoClienteFinal = codigoCliente;

    // Se cliente tem telefone → buscar ou criar no banco
    if (clienteTelefone) {
      const clientesRef = collection(db, 'clientes');
      const q = query(clientesRef, where('telefone', '==', clienteTelefone));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Cliente já existe
        const clienteDoc = snapshot.docs[0];
        clienteIdFinal = clienteDoc.id;
        codigoClienteFinal = clienteDoc.data().codigoCliente;
      } else {
        // Criar cliente só agora (não no blur)
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
      // Cliente genérico
      const clientesRef = collection(db, 'clientes');
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

    const dados = {
      idCliente: clienteIdFinal,
      nomeCliente: clienteNome,
      telefoneCliente: clienteTelefone || null,
      codigoCliente: codigoClienteFinal,
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
      // Sempre cria novo pedido
      await addDoc(collection(db, 'pedidos'), dados);

      if(querImprimir){
        imprimir(dados, 2);

      }else{
        alert('Pedido salvo com Sucesso!!!')
      }

      limparCampos();

    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      alert('Erro ao salvar pedido. Verifique se você tem permissão.');
    }
  };

 

  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const mesHoje = hoje.getMonth();
  const anoHoje = hoje.getFullYear();

  const pedidosDoDia = pedidos.filter(p => {
    const pData = new Date(p.data);
    return pData.getDate() === diaHoje && pData.getMonth() === mesHoje && pData.getFullYear() === anoHoje;
  });

  const pedidosAbertos = pedidosDoDia.filter(p => ['fila', 'preparando', 'pronto'].includes(p.status.toLowerCase()));
  const pedidosFechados = pedidosDoDia.filter(p => ['entregue', 'cancelado'].includes(p.status.toLowerCase()));

  
  useEffect(() => {
    if (cliente.trim().length >= 2) {
      setCodigoPedido(gerarCodigoPedido(cliente));

    } else {
      setCodigoPedido('');
    }
  }, [cliente]);

  const extrasPorClasse: Record<string, string[]> = {
    acai: ['acai', 'acaiplus'],
    entrada: [],
    prato: ['acompanhamento', 'ingredienteplus'],
    pizza: ['ingredienteplus'],
    "pizza-escolha": ['ingrediente', 'ingredienteplus'],
    massa: ['molho', 'ingrediente', 'ingredienteplus'],
    bebida: [],
    sobremesa: [],
    estudante: ['molho', 'ingrediente', 'ingredienteplus']
  };

  // Pega todas as classes distintas
  const classes = [...new Set(produtos.map(p => p.classe))];
  const categoriaEstudante = [...new Set(produtos.map(p => p.categoria))]

  // Filtra produtos pela classe escolhida
  const produtosFiltrados = classeSelecionada
    ? produtos.filter(p => p.classe === classeSelecionada)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 ">
      {/* Formulário */}
      <div className="flex flex-col gap-3 bg-white p-6 rounded-lg shadow">
        <div className='flex justify-between items-center'>
          <h2 className="text-3xl font-bold  flex items-center gap-2">
            <Package /> Novo Pedido
          </h2>
          <div className="flex justify-center items-center rounded font-bold text-3xl">
            <p>{hoje.toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <hr />

        <div className="flex justify-between">


          <div className='flex flex-col justify-around bg-blue-600 px-4 rounded text-white'>
            <label className='flex gap-1 cursor-pointer'>
              <input
                type='radio' 
                name='imprimir'
                checked={querImprimir === false}
                onChange={()=> setQuerImprimir(false)}
                className='cursor-pointer' 
                required        
              />
               Não Imprimir
            </label>
            <label className='flex gap-1 cursor-pointer'>
              <input
                type='radio' 
                name='imprimir'
                checked={querImprimir === true}
                onChange={()=> setQuerImprimir(true)}  
                className='cursor-pointer'
                required       
              />
               Imprimir
            </label>
          </div>

          {/* Código do pedido */} 
          <input
            type="text"
            className="border p-3 rounded max-w-[130px]"
            placeholder="Código Pedido"
            value={codigoPedido}
            readOnly
            disabled
          />

          {/* Código do cliente */}
          <input
            type="text"
            className="border p-3 rounded max-w-[130px]"
            placeholder="Código do Cliente"
            value={codigoCliente}
            readOnly
            disabled
          />

          <div className='flex flex-col justify-around bg-blue-600 px-4 rounded text-white'>
            <label className='flex gap-1 cursor-pointer'>
              <input
                type='radio' 
                name='fatura'
                value={'CF'}
                checked={tipoFatura === 'cf'}
                onChange={()=> setTipoFatura('cf')}
                className='cursor-pointer' 
                required        
              />
               CF
            </label>
            <label className='flex gap-1 cursor-pointer'>
              <input
                type='radio' 
                name='fatura'
                value={'SF'}
                checked={tipoFatura === 'sf'}
                onChange={()=> setTipoFatura('sf')}  
                className='cursor-pointer'
                required       
              />
               SF
            </label>
          </div>

          <select
            className="border p-3 rounded"
            value={tipoVenda}
            onChange={e=> setTipoVenda(e.target.value)}
            required
          >
            <option value="">Tipo de Venda</option>
            <option value="balcao">Balcao</option>
            <option value="mesa">Mesa</option>
            <option value="glovo">Glovo</option>
            <option value="uber">Uber</option>
            <option value="bolt">Bolt</option>
            <option value="app">App Top pizzas</option> 
          </select>

          

          {/* Telefone do cliente */}
          <input
            type="text"
            className="border p-3 rounded"
            placeholder="Telefone Cliente..."
            value={clienteTelefone}
            disabled = {tipoVenda === 'glovo' || tipoVenda === 'uber' || tipoVenda === 'bolt' }
            onChange={e => {
              const telefone = e.target.value
              setClienteTelefone(telefone)

              if (!telefone) {
                setClienteNome("");
                setCodigoCliente("");
                setIdCliente(null);
                setCodigoPedido("");
              }
            }}
            onBlur={async () => {
              if (!clienteTelefone) return              

              // 🔹 Só busca cliente existente
              const clientesRef = collection(db, 'clientes');
              const q = query(clientesRef, where('telefone', '==', clienteTelefone));
              const snapshot = await getDocs(q);

              if (!snapshot.empty) {
                const clienteDoc = snapshot.docs[0];
                const data = clienteDoc.data();

                setClienteNome(data.nome);
                setClienteTelefone(data.telefone);
                setCodigoCliente(data.codigoCliente);
                setIdCliente(clienteDoc.id);

                // Atualiza código do pedido caso o nome seja diferente
                setCodigoPedido(gerarCodigoPedido(data.nome));
              } else {
                // 🔹 Se não achar, não cria aqui. Só cria no salvarPedido.
                console.log("Cliente não encontrado. Será criado apenas ao salvar pedido.");
              }
            }}
          />

        {/* Nome do cliente */}
          <input
            type="text"
            className="border p-3 rounded"
            placeholder="Nome Cliente..."
            value={clienteNome}
            
            onChange={e => {
              const nome = e.target.value;
              setClienteNome(nome);

              // Atualiza o código do pedido
              setCodigoPedido(gerarCodigoPedido(nome));

            }}
            disabled={!!idCliente}
          />
        </div>
         
        {/* Botões de classe */}
        <div className="flex justify-between gap-2 flex-wrap">
          {classes.map(c => (
            <button
              key={c}
              onClick={() => {
                setClasseSelecionada(c);
                setProdutoSelecionado(""); // reset ao trocar classe
              }}
              className={`px-4 py-2 rounded cursor-pointer ${
                classeSelecionada === c
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

          <div className="w-full flex justify-between min-h-80 ">

            {/* Lista de produtos do pedido */}
            <div className="flex flex-col w-1/2 border-2 border-blue-600  rounded max-h-90">
                <div className="grid grid-cols-6 text-center border-b-2 p-2 text-blue-600 font-bold">
                  <div>Quant</div>
                  <div className="col-span-3">Produtos</div>
                  <div>Valor</div>
                  <div>Excluir</div>
                </div>                
              <ul className="flex-1 border-blue-600  rounded max-h-70 overflow-auto">
                <div className="flex-1">
                  {produtosPedido.map((p,i) => (
                    <li key={p.id + i} className="">
                      <div className="grid grid-cols-6 text-center border-b">
                        <div>{p.quantidade}</div>
                        <div className="col-span-3">{p.nome}</div>
                        <div>€ {(p.preco * p.quantidade).toFixed(2)}</div>
                        <div>
                          <button
                            onClick={() => removerProdutoPedido(p.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                          <Trash2 size={16} />
                        </button></div>
                      </div>
                    </li>
                  ))}                
                </div>
              </ul>

              <div className=" flex justify-between p-2 border-t-2 border-blue-600">

                  <div className=" flex justify-center items-center px-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={diminuir} 
                        className="px-3 py-1 bg-red-500 text-white rounded cursor-pointer font-black"
                      >
                        -
                      </button>

                      <input
                        type="text"
                        value={`€ ${ajuste.toFixed(2)}`}
                        readOnly
                        className="text-center w-24 border rounded p-1"
                      />

                      <button 
                        onClick={aumentar} 
                        className="px-3 py-1 bg-green-500 text-white rounded cursor-pointer font-black"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span className="flex gap-2 px-15 justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>€ {(valorTotal + ajuste).toFixed(2) }</span>
                  </span>

              </div>

            </div>

            <div className="w-1/2 flex flex-col justify-between">
              <div className="grid grid-cols-3 gap-1 p-2 max-h-74 overflow-auto ">
                {produtosFiltrados.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setProdutoSelecionado(p.id)}
                    className={`cursor-pointer p-2 rounded-lg shadow border flex
                      ${produtoSelecionado === p.id ? "bg-blue-500 text-white" : "bg-white hover:bg-gray-100"}`}
                  >
                    <div className='w-full flex flex-col justify-center items-center'>
                      <img className='w-20 h-20 rounded-full' src={p.img}/>
                      <div className='flex flex-col'>
                        <p className="text-sm font-semibold">{p.nome}</p>

                      </div>
                        <div className='w-full flex justify-between items-center'>
                          <p className="text-2xl">€ {p.preco.toFixed(2)}</p>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => abrirModalProduto(p)}
                            className="mt-2 flex items-center gap-1 bg-blue-600 rounded-full  text-white font-black cursor-pointer"
                          >
                            <Plus size={16} />
                          </Button>
                        </div>
                    </div>

                  </div>
                ))}
              </div>

              {/*Lançar pedido*/}
              <div className="flex justify-between items-center mt-4 p-2 gap-2">
                
                <div className='flex flex-1 justify-between bg-blue-600 text-white rounded p-2'>
                  <label className='flex gap-1 cursor-pointer'>
                    <input
                      type='radio' 
                      name='pagamento'
                      value={'dinheiro'}
                      checked={tipoPagamento === 'dinheiro'}
                      onChange={()=> setTipoPagamento('dinheiro')} 
                      className='cursor-pointer'
                      required        
                    />
                    Dinheiro
                  </label>
                  <label className='flex gap-1 cursor-pointer'>
                    <input
                      type='radio' 
                      name='pagamento'
                      value={'cartao'}
                      checked={tipoPagamento === 'cartao'}
                      onChange={()=> setTipoPagamento('cartao')} 
                      className='cursor-pointer' 
                      required       
                    />
                    Cartão
                  </label>
                  <label className='flex gap-1 cursor-pointer'>
                    <input
                      type='radio' 
                      name='pagamento'
                      value={'mbway'}
                      checked={tipoPagamento === 'mbway'}
                      onChange={()=> setTipoPagamento('mbway')} 
                      className='cursor-pointer' 
                      required       
                    />
                    MbWay
                  </label>
                  <label className='flex gap-1 cursor-pointer'>
                    <input
                      type='radio' 
                      name='pagamento'
                      value={'aplicativo'}
                      checked={tipoPagamento === 'aplicativo'}
                      onChange={()=> setTipoPagamento('aplicativo')} 
                      className='cursor-pointer' 
                      required       
                    />
                    Aplicativos
                  </label>
                </div>

              
                <button
                  onClick={salvarPedido}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={18} /> Lançar
                </button>
              </div>

            </div>

            
          {/*Modal*/}
          </div>
            <Dialog open={modalAberto} onOpenChange={setModalAberto}>
              <DialogContent className="max-w-3xl bg-white">
                <DialogHeader>
                  <DialogTitle>{produtoModal?.nome}</DialogTitle>
                </DialogHeader>

                {produtoModal && (
                  <div className="space-y-4">
                    <p className="text-gray-700">Preço base: € {produtoModal.preco.toFixed(2)}</p>

                    {/* Quantidade */}
                    <div className="flex items-center gap-2">
                      <span>Quantidade:</span>
                      <input
                        type="number"
                        min={1}
                        value={quantidadeSelecionada}
                        onChange={e => setQuantidadeSelecionada(Number(e.target.value))}
                        className="w-20 border rounded p-1 text-center cursor-pointer"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Extras */}
                      {(() => {
                        const tiposExtras = (() => {
                          if (!produtoModal) return [];

                          if (produtoModal.classe === "estudante") {
                            // estudante + categoria massa → mostra todos
                            if (produtoModal.categoria === "massa") {
                              return ["molho", "ingrediente", "ingredienteplus"];
                            }
                            // estudante + outras categorias → só ingredienteplus
                            return ["ingredienteplus"];
                          }

                          // outras classes seguem o mapa normal
                          return extrasPorClasse[produtoModal.classe] || [];
                        })();

                        if (tiposExtras.length === 0) return <p>Sem extras disponíveis</p>

                        return tiposExtras.map(tipo => (
                          <div key={tipo} className="border rounded p-2">
                            <h4 className="font-semibold capitalize text-blue-600 mb-2">{tipo}</h4>
                            <div className="flex flex-col gap-1">
                              {extras.filter(e => e.tipo === tipo).map(extra => {
                                const checked = extrasSelecionados.some(e => e.id === extra.id)
                                return (
                                  <label key={extra.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={extrasSelecionados.some(e => e.id === extra.id)}
                                      onChange={() => handleToggleExtra(extra)}
                                      className="cursor-pointer"
                                    />
                                    <span>{extra.nome}</span>
                                    {extra.valor ? (
                                      <span className="text-sm text-gray-600">(+€ {extra.valor.toFixed(2)})</span>
                                    ) : null}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ))
                      })()}

                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setModalAberto(false)} className="bg-red-600 text-white hover:bg-red-800 cursor-pointer">Cancelar<Delete/></Button>
                  <Button onClick={confirmarProduto} className="bg-green-600 text-white hover:bg-green-800 cursor-pointer"> <PlusCircleIcon/> Confirmar</Button>
                </div>
              </DialogContent>
            </Dialog>
      </div>

      {/* Listagem de Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[100vh] overflow-auto">
        {/* Pedidos Abertos */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-600 gap-2">
            <ClipboardList /> Pedidos Abertos
          </h3>
          {pedidosAbertos.length === 0 ? (
            <p className="text-gray-500">Nenhum pedido aberto.</p>
          ) : (
            pedidosAbertos.map(p => (
              <div key={p.id} className="flex w-full m-auto border p-3 rounded mb-3">
                <div className="flex flex-col w-full">
                  <div className="flex justify-between items-center">
                    <div>
                      <p>{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                      <strong>{p.nomeCliente}</strong>
                      {p.numeroMesa ? <p className='text-xs'>Mesa: {p.numeroMesa}</p> : ''}
                    </div>
                    <div className="bg-blue-600 p-2 text-white rounded">{p.codigoPedido}</div>
                    <select
                      value={p.status}
                      onChange={(e) => atualizarStatus(p.id, e.target.value)}
                      className={`w-[150px] text-center inline-block px-3 py-1 border rounded text-sm font-semibold mt-1 cursor-pointer ${statusColor(p.status)}`}
                    >
                      <option value="Fila">Fila</option>
                      <option value="Preparando">Preparando</option>
                      <option value="Pronto">Pronto</option>
                      <option value="Entregue">Entregue</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>

                  </div>

                  <div className="flex flex-col gap-3 w-full text-sm mt-1 text-gray-700 list-disc list-inside">                    
                    {p.produtos.map((item, i) => {
                      const totalExtrasProduto = calcularTotalExtras(item)
                      const subtotalProduto = calcularSubTotalProduto(item)

                      return (
                        <div
                            key={item.id + i + '-' + (item.extras?.map(e => e.id).join('_') || '') + '-'}
                            className="flex p-2 gap-5 justify-between bg-gray-200 rounded"
                          >
                          <div className="flex-1">
                            <div>{item.nome} - {item.categoria}</div>
                            {item.extras?.length > 0 && (
                              <div className="mt-1 text-sm">
                                <div className='font-semibold border-t-1'>
                                 - Extras
                                </div>
                                <div className="pl-5">
                                  {item.extras.map(extra => (
                                    <div className='flex justify-between' key={extra.id}>
                                      <div>
                                        {extra.nome} 
                                      </div>
                                      <div>
                                        {extra.valor && extra.valor > 0 ?`€ ${extra.valor?.toFixed(2)}`:''}                                        
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <hr />
                                
                                <div className='flex justify-between font-bold'>
                                  <div>Total Extras</div>
                                  <div>€ {totalExtrasProduto.toFixed(2)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>{item.quantidade}</div>
                          <div>€ {subtotalProduto.toFixed(2)}</div>
                        </div>
                      );
                    })}

                  </div>
                  
                  <div className="flex justify-between font-black pt-2 border-t-2 gap-6 items-center">
                    <div className="flex gap-2">
                      <button className='text-blue-600 hover:bg-blue-600 p-2 rounded-full hover:text-white' onClick={() => imprimir(p)}>
                        <Printer className='cursor-pointer' size={24} />
                      </button>
                    </div>
                    <div>
                      Total  
                    </div>
                    <p className='flex-1 text-right text-xl'>€ {p.valor.toFixed(2)}</p>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>

        {/* Pedidos Finalizados */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-green-600 gap-2">
            <CheckCircle2 /> Pedidos Finalizados
          </h3>
          {pedidosFechados.length === 0 ? (
            <p className="text-gray-500">Nenhum pedido finalizado.</p>
          ) : (
            pedidosFechados.map(p => (
              <div key={p.id} className="flex w-full m-auto border p-3 rounded mb-3">
                <div className="flex flex-col w-full">
                  <div className="flex justify-between items-center">
                    <div>
                      <p>{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                      <strong>{p.nomeCliente}</strong>
                    </div>
                    <div className="bg-blue-600 p-2 text-white rounded">{p.codigoPedido}</div>
                  </div>

                  <div className="flex flex-col gap-3 w-full text-sm mt-1 text-gray-700 list-disc list-inside">                    
                    {p.produtos.map(item => {
                      const totalExtrasProduto = item.extras?.reduce((sum, e) => sum + (e.valor || 0), 0) || 0;
                      const subtotalProduto = item.preco * item.quantidade + totalExtrasProduto;

                      return (
                        <div
                            key={item.id + '-' + (item.extras?.map(e => e.id).join('_') || '') + '-'}
                            className="flex p-2 gap-5 justify-between bg-gray-200 rounded"
                          >
                          <div className="flex-1">
                            <div>{item.nome} - {item.categoria}</div>
                            {item.extras?.length > 0 && (
                              <div className="mt-1 text-sm">
                                <div className='font-semibold border-t-1'>
                                 - Extras
                                </div>
                                <div className="pl-5">
                                  {item.extras.map(extra => (
                                    <div className='flex justify-between' key={extra.id}>
                                      <div>
                                        {extra.nome} 
                                      </div>
                                      <div>
                                        {extra.valor && extra.valor > 0 ?`€ ${extra.valor?.toFixed(2)}`:''} 
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <hr />
                                <div className='flex justify-between font-bold'>
                                  <div>Total Extras</div>
                                  <div>€ {totalExtrasProduto.toFixed(2)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>{item.quantidade}</div>
                          <div>€ {subtotalProduto.toFixed(2)}</div>
                        </div>
                      );
                    })}

                  </div>

                  <div className="flex justify-between font-black p-2 border-t-2 pt-2">
                    <div className="flex gap-2">
                      <button className='text-blue-600 hover:bg-blue-600 p-2 rounded-full hover:text-white' onClick={() => imprimir(p)}>
                        <Printer className='cursor-pointer' size={24} />
                      </button>
                    </div>
                    <p>Total</p>
                    <p>€ {p.valor.toFixed(2)}</p>
                  </div>
                  <hr className='border-1'/>
                  <div >
                    {p.status == 'Cancelado' ? 
                      <div className='font-semibold text-right' >
                        <span className='text-blue-600'>Status:</span> <span className='text-red-500'>{p.status}</span>
                      </div>

                    :<div className='font-semibold text-right' >
                        <span className='text-blue-600'>Status:</span> <span className='text-green-500'>{p.status}</span>
                      </div>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
