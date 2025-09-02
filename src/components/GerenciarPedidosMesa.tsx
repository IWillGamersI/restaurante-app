'use client';
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
  ChevronRight,
  ChevronDown,
  CheckCheckIcon,
  Printer,
  Store,
} from 'lucide-react';

import { imprimir } from '@/lib/impressao';
import { hr } from 'framer-motion/client';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  classe: string
  categoria: string
}

interface Extra {
  id: string
  nome: string
  tipo: string
  valor?: number
}

interface ProdutoPedido {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  extras: Extra[] // ❌ agora sempre array, não opcional
  categoria: string
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
  };

  const adicionarProdutoAoPedido = () => {
  if (!produtoSelecionado || quantidadeSelecionada <= 0) return;
  const produto = produtos.find(p => p.id === produtoSelecionado);
  if (!produto) return;

  const novoProduto: ProdutoPedido = {
    id: produto.id,
    nome: produto.nome,
    preco: produto.preco,
    quantidade: quantidadeSelecionada,
    extras: extrasSelecionados,
    categoria: produto.categoria
  };

  // Verifica se já existe um produto com mesmo id e MESMOS extras
  const existeIgual = produtosPedido.find(p => 
    p.id === produto.id &&
    JSON.stringify(p.extras || []) === JSON.stringify(extrasSelecionados)
  );

  if (existeIgual) {
    // Se for exatamente igual (mesmo extras), aumenta quantidade
    setProdutosPedido(produtosPedido.map(p =>
      p === existeIgual ? { ...p, quantidade: p.quantidade + quantidadeSelecionada } : p
    ));
  } else {
    // Caso contrário, adiciona como novo item
    setProdutosPedido([...produtosPedido, novoProduto]);
  }

  // Reset campos
  setProdutoSelecionado('');
  setQuantidadeSelecionada(1);
  setExtrasSelecionados([]);
  };


  const removerProdutoPedido = (id: string) => {
    setProdutosPedido(produtosPedido.filter(p => p.id !== id));
  };

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await updateDoc(doc(db, 'pedidos', id), { status: novoStatus });
  };

  const valorTotal =
    produtosPedido.reduce((acc, p) => {
      const extrasValor = p.extras.reduce((sum, e) => sum + (e.valor || 0), 0);
      return acc + p.preco * p.quantidade + extrasValor;
    }, 0);

  const salvarPedido = async () => {
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

      
      alert('✅ Pedido realizado com Sucesso!!!')
      limparCampos();

    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      alert('Erro ao salvar pedido. Verifique se você tem permissão.');
    }
  };



  

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'fila': return 'bg-gray-300 text-gray-800';
      case 'preparando': return 'bg-yellow-200 text-blue-700';
      case 'pronto': return 'bg-blue-100 text-blue-700';
      case 'entregue': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
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

  const gerarCodigoPedido = (nome: string) => {
    const nomeLimpo = nome.trim().toUpperCase();
    if (nomeLimpo.length < 2) return '';
    const prefixo = nomeLimpo[0] + nomeLimpo[nomeLimpo.length - 1];
    const numero = Math.floor(Math.random() * 10000);
    const codigo = numero.toString().padStart(4, '0');
    return `${prefixo}-${codigo}`;
  };

  const gerarCodigoCliente = (nome: string, telefone: string) =>{
    if(!nome || !telefone) return ''
    const ultimos3 = telefone.slice(-3)
    const consoantes = nome
                          .replace(/[AEIOUaeiouÁÉÍÓÚáéíóúÂÊÎÔÛâêîôûÀàÇç\s]/g, '')
                          .toUpperCase()
    return `${consoantes}${ultimos3}`
  }


  async function buscarCliente(telefone: string): Promise<Cliente | null> {
    if (!telefone) return null;

    const clienteRef = collection(db, 'clientes');
    const q = query(clienteRef, where('telefone', '==', telefone));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const clienteDoc = querySnapshot.docs[0];
      const data = clienteDoc.data();
      return {
        id: clienteDoc.id,
        nome: data.nome,
        telefone: data.telefone,
        codigoCliente: data.codigoCliente || gerarCodigoCliente(data.nome, data.telefone)
      };
    }
      return null
  }

  async function criarCliente(nome: string, telefone: string): Promise<Cliente | null>{
    
    const clienteRef = collection(db, 'clientes');
    const codigoCliente = gerarCodigoCliente(nome, telefone);
    const docRef = await addDoc(clienteRef, { nome, telefone, codigoCliente });
    return { id: docRef.id, nome, telefone, codigoCliente };
   
  }




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

  // Filtra produtos pela classe escolhida
  const produtosFiltrados = classeSelecionada
    ? produtos.filter(p => p.classe === classeSelecionada)
    : [];


   
  return (
    <div className="max-w-6xl mx-auto space-y-6 ">
      {/* Formulário */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-lg shadow">
        <div className='flex flex-col items-center'>
          <h2 className="text-3xl font-bold  flex items-center gap-2">
            <Package /> Novo Pedido
          </h2>
          <div className="flex justify-center items-center rounded font-bold text-3xl">
            <p>{hoje.toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <hr />
       

        <div className="grid grid-cols-3 gap-2 justify-between">
          {/* Código do pedido */}
          <input
            type="text"
            className="border p-3 rounded "
            placeholder="Código Pedido"
            value={codigoPedido}
            readOnly
            disabled
          />

          {/* Código do cliente */}
          <input
            type="text"
            className="border p-3 rounded "
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


        {/* Seleção de produto */}

         
        {/* Botões de classe */}
        <div className=" grid grid-cols-3 gap-2 flex-wrap">
          {classes.map(c => (
            <button
              key={c}
              onClick={() => {
                setClasseSelecionada(c);
                setProdutoSelecionado(""); // reset ao trocar classe
              }}
              className={`px-2 py-2 rounded cursor-pointer ${
                classeSelecionada === c
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <select
            className="border p-3 rounded w-full"
            value={produtoSelecionado}
            onChange={e => setProdutoSelecionado(e.target.value)}
            disabled={!classeSelecionada} // só habilita depois de escolher classe
          >
            <option value="">
              {classeSelecionada
                ? "Selecione um produto"
                : "Escolha uma classe primeiro"}
            </option>
            {produtosFiltrados.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} - € {p.preco.toFixed(2)}
              </option>
            ))}
          </select>
          <div className='flex justify-between'>
            <input
              type="number"
              className="border text-center p-2 rounded w-24"
              min={1}
              value={quantidadeSelecionada}
              onChange={e => setQuantidadeSelecionada(Number(e.target.value))}
            />
            <button
              onClick={adicionarProdutoAoPedido}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 cursor-pointer"
            >
              <Plus size={18} /> Adicionar
            </button>

          </div>
        </div>
            <hr />
            <p className='font-semibold text-blue-600'>Extras</p>
        {/* Extras dinâmicos */}
        <div className="grid grid-cols-1 gap-3 mt-4">
          {produtoSelecionado &&
            (() => {
              const produto = produtos.find(p => p.id === produtoSelecionado);
              if (!produto) return null;

              const tiposExtras = extrasPorClasse[produto.classe || ''] || [];

              const maxSelecionadosPorTipo: Record<string, number> = {
                molho: 1,
                ingrediente: 3,
                acai: 3,
                acompanhamento: 1,
              };
              
              return tiposExtras.map(tipo => (              
                <div key={tipo} className="bg-gray-100 p-3 rounded shadow">
                  
                  <h4 className="font-semibold mb-2 capitalize">{tipo}</h4>
                  <div className="flex flex-col gap-1">
                    {extras
                      .filter(ex => ex.tipo === tipo)
                      .map(extra => {
                        const checked = extrasSelecionados.some(e => e.id === extra.id);
                        const qtdSelecionadosTipo = extrasSelecionados.filter(e => e.tipo === tipo).length;

                        return (
                          <label key={extra.id} className="flex justify-between items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!checked && qtdSelecionadosTipo >= (maxSelecionadosPorTipo[tipo] || 10)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setExtrasSelecionados(prev => [...prev, extra]);
                                } else {
                                  setExtrasSelecionados(prev =>
                                    prev.filter(exSel => exSel.id !== extra.id)
                                  );
                                }
                              }}
                            />
                            <div className='flex-1'>
                              {extra.nome}

                            </div>
                            <span>
                              {(extra.valor ?? 0) > 0 && (
                                <span className="text-sm text-gray-600 ml-1">
                                  (+€ {(extra.valor ?? 0).toFixed(2)})
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ));
            })()}
            
        </div>
          
        <hr />
        
        {/* Lista de produtos do pedido */}
        <ul className="divide-y">
          {produtosPedido.map((p,i) => (
            <li key={p.id + i} className="flex justify-between items-center ">
              <span>{p.nome} - {p.categoria} x {p.quantidade}</span>
              <span>€ {(p.preco * p.quantidade).toFixed(2)}</span>
              <button
                onClick={() => removerProdutoPedido(p.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-col justify-between gap-2 items-center">
          
          <div className='flex w-full justify-between bg-blue-600 text-white rounded p-2'>
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
          </div>
          <div className='flex justify-between w-full'>
              <span className="flex justify-between items-center flex-1 gap-2 px-2  font-bold text-2xl">
                <span>Total</span>
                <span className='flex-1 text-right'>€ {valorTotal.toFixed(2)}</span>
              </span>

              <button
                onClick={salvarPedido}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
              >
                <Plus size={18} /> Lançar
              </button>
          </div>
         
        </div>
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
                    </div>
                    <div className="bg-blue-600 p-2 text-white rounded">{p.codigoPedido}</div>
                    <div className={` text-center inline-block px-3 py-1 border rounded text-sm font-semibold mt-1 ${statusColor(p.status)}`}>{p.status}</div>
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
                  
                  <div className="flex justify-between font-black pt-2 border-t-2 pt-2 gap-6 items-center">
                   
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
