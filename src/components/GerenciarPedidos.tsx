// GerenciarPedidos.tsx
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
  serverTimestamp
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
} from 'lucide-react';


interface Produto {
  id: string;
  nome: string;
  preco: number;
}

interface Extra {
  id: string
  nome: string
  tipo: string
}

interface ProdutoPedido {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface Pedido {
  id: string;
  codigo: string
  cliente: string;
  data: string;
  status: string;
  valor: number;
  produtos: ProdutoPedido[];
  extras: Extra[]
}



export default function GerenciarPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cliente, setCliente] = useState('');
  const [data, setData] = useState('');
  const [status, setStatus] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);
  const [produtosPedido, setProdutosPedido] = useState<ProdutoPedido[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extrasSelecionados, setExtrasSelecionados] = useState<Extra[]>([]);
  const [tiposColapsados, setTiposColapsados] = useState<Record<string, boolean>>({});
  const [codigoPedido, setCodigoPedido] = useState('');

  

// Puxa os extras do Firestore
useEffect(() => {
  const q = query(collection(db, 'pedidos'));

  const unsubscribe = onSnapshot(q, (snap) => {
    const lista = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Pedido[];

    // Ordena pelos timestamp (quem foi criado primeiro aparece primeiro)
    const ordenado = lista.sort((a, b) => {
      const t1 = (a as any).criadoEm?.seconds || 0;
      const t2 = (b as any).criadoEm?.seconds || 0;
      return t1 - t2;
    });

    setPedidos(ordenado);
  });

  return () => unsubscribe();
}, []);



const extrasPorTipo = extras.reduce((acc, extra) => {
  if (!acc[extra.tipo]) acc[extra.tipo] = [];
  acc[extra.tipo].push(extra);
  return acc;
}, {} as Record<string, Extra[]>);


useEffect(() => {
  carregarProdutos();
}, []);

  

useEffect(() => {
  const q = query(collection(db, 'pedidos'));
  const unsubscribe = onSnapshot(q, (snap) => {
    const lista = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Pedido[];
    setPedidos(lista);
  });

  return () => unsubscribe(); // remove listener ao desmontar componente
}, []);


  const carregarProdutos = async () => {
      const snap = await getDocs(collection(db, 'produtos'));
      const lista = snap.docs.map(doc => {
          const data = doc.data() as Produto;
          const { id, ...rest } = data;  // remove 'id' vindo do banco se existir
          return { id: doc.id, ...rest };
      });
      setProdutos(lista);
  };

  const limparCampos = () => {
  setCliente('');
  setData('');
  setStatus('');
  setProdutosPedido([]);
  setProdutoSelecionado('');
  setQuantidadeSelecionada(1);
  setEditandoId(null);
  setErro('');
  setSucesso('');
  setExtrasSelecionados([]); // 👈 limpa os extras  
  setTiposColapsados({});
};


  const adicionarProdutoAoPedido = () => {
    if (!produtoSelecionado || quantidadeSelecionada <= 0) return;
    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;

    const existe = produtosPedido.find(p => p.id === produto.id);
    if (existe) {
      setProdutosPedido(produtosPedido.map(p =>
        p.id === produto.id ? { ...p, quantidade: p.quantidade + quantidadeSelecionada } : p
      ));
    } else {
      setProdutosPedido([...produtosPedido, {
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        quantidade: quantidadeSelecionada,
      }]);
    }
    setProdutoSelecionado('');
    setQuantidadeSelecionada(1);
  };

  const removerProdutoPedido = (id: string) => {
    setProdutosPedido(produtosPedido.filter(p => p.id !== id));
  };

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await updateDoc(doc(db, 'pedidos', id), { status: novoStatus });
  };


  const valorTotal = produtosPedido.reduce((acc, p) => acc + p.preco * p.quantidade, 0);

  const salvarPedido = async () => {
    if (!cliente || !data || produtosPedido.length === 0) return;
    const dados = {
      cliente,
      data,
      status: 'Fila',
      valor: valorTotal,
      produtos: produtosPedido,
      codigo: codigoPedido,
      extras: extrasSelecionados,
      criadoEm: serverTimestamp()
    };
    if (editandoId) {
      await updateDoc(doc(db, 'pedidos', editandoId), dados);
    } else {
      await addDoc(collection(db, 'pedidos'), dados);
    }
    limparCampos();
  };

  const editar = (p: Pedido) => {
    setCliente(p.cliente);
    setData(p.data);
    setStatus(p.status);
    setProdutosPedido(p.produtos);
    setEditandoId(p.id);
  };

  const remover = async (id: string) => {
    if (!confirm('Remover este pedido?')) return;
    await deleteDoc(doc(db, 'pedidos', id));
  };

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'fila': return 'bg-gray-300 text-gray-800';
      case 'preparando': return 'bg-cyan-200 text-cyan-700';
      case 'pronto': return 'bg-blue-100 text-blue-700';
      case 'entregue': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const hoje = new Date()
  const diaHoje = hoje.getDate()
  const mesHoje = hoje.getMonth()
  const anoHoje = hoje.getFullYear()

  const pedidosDoDia = pedidos.filter(p=>{
    const pData = new Date(p.data)
    return(
      pData.getDate() === diaHoje && pData.getMonth() === mesHoje && pData.getFullYear() === anoHoje
    )
  })

  const pedidosAbertos = pedidosDoDia.filter(p => ['fila', 'preparando','pronto'].includes(p.status.toLowerCase()));
  const pedidosFechados = pedidosDoDia.filter(p => [ 'entregue', 'cancelado'].includes(p.status.toLowerCase()));

  const toggleExtraSelecionado = (extra: Extra) => {
    setExtrasSelecionados((prevSelecionados) => {
      const jaExiste = prevSelecionados.some(e => e.id === extra.id);
      if (jaExiste) {
        // Remove da lista
        return prevSelecionados.filter(e => e.id !== extra.id);
      } else {
        // Adiciona à lista
        return [...prevSelecionados, extra];
      }
    });
  };

  const toggleColapso = (tipo: string) => {
    setTiposColapsados(prev => ({
      ...prev,
      [tipo]: !prev[tipo],
    }));
  };

  const gerarCodigoPedido = (nome: string) => {
    const nomeLimpo = nome.trim().toUpperCase();
    if (nomeLimpo.length < 2) return '';

    const prefixo = nomeLimpo[0] + nomeLimpo[nomeLimpo.length - 1];
    const numero = Math.floor(Math.random() * 10000);
    const codigo = numero.toString().padStart(4, '0');

    return `${prefixo}-${codigo}`;
  };

  useEffect(() => {
    if (cliente.trim().length >= 2) {
      const novoCodigo = gerarCodigoPedido(cliente);
      setCodigoPedido(novoCodigo);
    } else {
      setCodigoPedido('');
    }
  }, [cliente]);



  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      
      {/* Formulário */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Package /> {editandoId ? 'Editar Pedido' : 'Novo Pedido'}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" className="border p-3 rounded" value={codigoPedido} disabled readOnly placeholder="Código do Pedido"/>

          <input type="text" className="border p-3 rounded" placeholder="Cliente" value={cliente} onChange={e => setCliente(e.target.value)} />
          <input type="date" className="border p-3 rounded" value={data} onChange={e => setData(e.target.value)} />
          
        </div>

        <div className="flex items-center gap-4 mt-4">
          <select className="border p-3 rounded w-full" value={produtoSelecionado} onChange={e => setProdutoSelecionado(e.target.value)}>
            <option value="">Selecione um produto</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>{p.nome} - € {p.preco.toFixed(2)}</option>
            ))}
          </select>
          <input type="number" className="border p-3 rounded w-24" min={1} value={quantidadeSelecionada} onChange={e => setQuantidadeSelecionada(Number(e.target.value))} />
          <button onClick={adicionarProdutoAoPedido} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"><Plus size={18} /> Adicionar</button>
        </div>           

        <div className='grid grid-cols-3 gap-6'>
          {Object.entries(extrasPorTipo).map(([tipo, lista]) => {
            const estaColapsado = tiposColapsados[tipo] ?? false;
            return (
              <div key={tipo} className="flex flex-col mt-3 border rounded ">
                <button
                  onClick={() => toggleColapso(tipo)}
                  className="flex justify-center border-b items-center text-gray-600 font-semibold capitalize px-3 py-1 cursor-pointer hover:bg-blue-600 hover:text-white"
                >
                  {tipo} {estaColapsado ? <ChevronRight size={18} /> : <ChevronDown size={18} />} 
                </button>

                {!estaColapsado && (
                  <div className="flex flex-wrap p-2 gap-4 ">
                    {lista.map(extra => (
                      <label
                        key={extra.id}
                        className="flex items-center gap-2 border rounded px-3 py-1 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={extrasSelecionados.some(e => e.id === extra.id)}
                          onChange={() => toggleExtraSelecionado(extra)}
                        />
                        <span>{extra.nome}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lista de produtos do pedido */}
        <ul className="mt-4 divide-y">
          {produtosPedido.map(p => (
            <li key={p.id} className="flex justify-between items-center py-2">
              <span>{p.nome} x {p.quantidade}</span>
              <span>€ {(p.preco * p.quantidade).toFixed(2)}</span>
              <button onClick={() => removerProdutoPedido(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>  

        <div className="flex justify-between items-center mt-4">
          <span className="font-bold text-lg">Total: € {valorTotal.toFixed(2)}</span>
          <button onClick={salvarPedido} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
            {editandoId ? <><Edit size={18} /> Atualizar</> : <><Plus size={18} /> Lançar</>}
          </button>
        </div>
      </div>

       

      {/* Listas de Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Abertos */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-600 gap-2"><ClipboardList /> Pedidos Abertos</h3>
          {pedidosAbertos.length === 0 ? <p className="text-gray-500">Nenhum pedido aberto.</p> : pedidosAbertos.map(p => (
            <div
                    key={p.id}
                    className="flex w-[90%] m-auto  border p-3 rounded mb-3"
                  >
                    <div className='flex flex-col w-full'>
                      <div className='flex justify-between items-center'>
                        <div>
                          <div className='flex w-full justify-between '>
                            <div className='w-full'><strong>{p.cliente}</strong></div>                            
                          </div> 
                          <p>{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                        </div>

                        <div className='flex text-2xl bg-blue-600 text-white rounded font-bold p-1'>{p.codigo}</div> 
 
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
                      <div className="w-full text-sm mt-1 text-gray-700 list-disc list-inside ">
                        <div className='flex justify-between px-2 gap-1 text-md font-bold border-b-2 '>
                            <div className='flex-1'>Produto</div>
                            <div>Quant</div>
                            <div>Sub-Total</div>
                        </div>
                        <div className='flex flex-col mb-1 mt-1 gap-1 '>
                          {p.produtos?.map((item) => (
                              <div className='flex p-2 gap-10 justify-between bg-gray-200 rounded' key={item.id}>
                                  <div className='flex-1'>
                                    <div>{item.nome}</div>
                                    <div>
                                      {p.extras?.length > 0 && (
                                        <div className="mt-2">
                                          <p className="text-sm font-medium">Extras:</p>
                                          <ul className="flex flex-col justify-between pl-5 list-disc text-sm text-gray-700">
                                            {p.extras.map((extra, index) => (
                                              <p key={index}>- {extra.nome}</p>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                    </div>
                                  </div>
                                  <div>{item.quantidade}</div>
                                  <div>€ {(item.preco * item.quantidade).toFixed(2)}</div>
                              </div>
                          ))}

                        </div>
                          <div>
                            <div className='flex justify-between border-t-2'>
                              <div>Total:</div>
                              <p className="text-gray-600 text-sm"> € {Number(p.valor).toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between">
                              <button
                                onClick={() => editar(p)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Editar pedido"
                              >
                                <Edit size={24} />
                              </button>
                              <button
                                onClick={() => remover(p.id)}
                                className="text-red-600 p-2 cursor-pointer rounded-full hover:bg-red-600 hover:text-white"
                                title="Remover pedido"
                              >
                                <Trash2 size={24} />
                              </button>
                            </div>

                          </div>

                      </div>

                    </div>
                    
            </div>
          ))}
        </div>

        {/* Finalizados */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-green-600 gap-2"><CheckCircle2 /> Pedidos Finalizados</h3>
          {pedidosFechados.length === 0 ? <p className="text-gray-500">Nenhum pedido finalizado.</p> : pedidosFechados.map(p => (
            <div
                    key={p.id}
                    className="flex w-[90%] m-auto  border p-3 rounded mb-3"
                  >
                    <div className='flex flex-col w-full'>
                      <div className='flex justify-between items-center'>
                        <div>
                          <strong>{p.cliente}</strong> 
                          <p>{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                        </div>

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
                      <div className="w-full text-sm mt-1 text-gray-700 list-disc list-inside">
                        <div className='flex justify-between gap-2 text-lg font-bold '>
                            <div className='flex-1'>Produto</div>
                            <div>Quant</div>
                            <div>Sub-Total</div>
                        </div>
                        {p.produtos?.map((item) => (
                            <div className='flex gap-10 justify-between ' key={item.id}>
                                <div className='flex-1'>{item.nome}</div>
                                <div>{item.quantidade}</div>
                                <div>€ {(item.preco * item.quantidade).toFixed(2)}</div>
                                
                            </div>
                        ))}
                          <div>
                            <div className='flex justify-between border-t-2'>
                              <div>Total:</div>
                              <p className="text-gray-600 text-sm"> € {Number(p.valor).toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between">
                              <button
                                onClick={() => editar(p)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Editar pedido"
                              >
                                <Edit size={24} />
                              </button>
                              
                            </div>

                          </div>

                        </div>

                    </div>
                    
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
