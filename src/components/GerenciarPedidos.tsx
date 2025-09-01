'use client';
import { getAuth } from 'firebase/auth';
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
} from 'lucide-react';

import { imprimir } from '@/lib/impressao';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  classe: string
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
  const [status, setStatus] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);
  const [produtosPedido, setProdutosPedido] = useState<ProdutoPedido[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extrasSelecionados, setExtrasSelecionados] = useState<Extra[]>([]);
  
  const [codigoPedido, setCodigoPedido] = useState('');

  

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
        classe: data.classe || ''
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
    setCliente('');
    setStatus('');
    setProdutosPedido([]);
    setProdutoSelecionado('');
    setQuantidadeSelecionada(1);
    setEditandoId(null);
    setErro('');
    setSucesso('');
    setExtrasSelecionados([]);
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
    extras: extrasSelecionados
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
    const dataLisboa = new Date(agora.toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));

    if (!cliente || produtosPedido.length === 0) return;

    const dados = {
      cliente,
      data: dataLisboa.toISOString(),
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

    imprimir(dados, 2);
    limparCampos();
  };

  const editar = (p: Pedido) => {
    setCliente(p.cliente);
    setStatus(p.status);
    setProdutosPedido(p.produtos.map(prod => ({
      ...prod,
      extras: prod.extras || [] // garante array
    })));
    setEditandoId(p.id);
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

   
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 ">
      {/* Formulário */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Package /> {editandoId ? 'Editar Pedido' : 'Novo Pedido'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex justify-center items-center bg-gray-200 rounded font-bold text-3xl">
            <p>{hoje.toLocaleDateString('pt-BR')}</p>
          </div>
          <input
            type="text"
            className="border p-3 rounded"
            value={codigoPedido}
            disabled
            readOnly
            placeholder="Código do Pedido"
          />
          <input
            type="text"
            className="border p-3 rounded"
            placeholder="Cliente"
            value={cliente}
            onChange={e => setCliente(e.target.value)}
          />
        </div>

        {/* Seleção de produto */}
        <div className="flex items-center gap-4 mt-4">
          <select
            className="border p-3 rounded w-full"
            value={produtoSelecionado}
            onChange={e => setProdutoSelecionado(e.target.value)}
          >
            <option value="">Selecione um produto</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} - € {p.preco.toFixed(2)}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="border p-3 rounded w-24"
            min={1}
            value={quantidadeSelecionada}
            onChange={e => setQuantidadeSelecionada(Number(e.target.value))}
          />
          <button
            onClick={adicionarProdutoAoPedido}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <Plus size={18} /> Adicionar
          </button>
        </div>

        {/* Extras dinâmicos */}
        <div className="grid grid-cols-3 gap-6 mt-4">
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
                          <label key={extra.id} className="flex items-center gap-2">
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
                            <span>
                              {extra.nome}
                              {extra.valor && extra.valor > 0 && (
                                <span className="text-sm text-gray-600 ml-1">
                                  (+€ {extra.valor.toFixed(2)})
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


        {/* Lista de produtos do pedido */}
        <ul className="mt-4 divide-y">
          {produtosPedido.map(p => (
            <li key={p.id} className="flex justify-between items-center py-2">
              <span>{p.nome} x {p.quantidade}</span>
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

        <div className="flex justify-between items-center mt-4">
          <span className="font-bold text-lg">Total: € {valorTotal.toFixed(2)}</span>
          <button
            onClick={salvarPedido}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            {editandoId ? <><Edit size={18} /> Atualizar</> : <><Plus size={18} /> Lançar</>}
          </button>
        </div>
      </div>

      {/* Listagem de Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[50vh] overflow-auto">
        {/* Pedidos Abertos */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-600 gap-2">
            <ClipboardList /> Pedidos Abertos
          </h3>
          {pedidosAbertos.length === 0 ? (
            <p className="text-gray-500">Nenhum pedido aberto.</p>
          ) : (
            pedidosAbertos.map(p => (
              <div key={p.id} className="flex w-[90%] m-auto border p-3 rounded mb-3">
                <div className="flex flex-col w-full">
                  <div className="flex justify-between items-center">
                    <div>
                      <strong>{p.cliente}</strong>
                      <p>{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="bg-blue-600 p-2 text-white rounded">{p.codigo}</div>
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
                    {p.produtos.map(item => {
                      const totalExtrasProduto = item.extras?.reduce((sum, e) => sum + (e.valor || 0), 0) || 0;
                      const subtotalProduto = item.preco * item.quantidade + totalExtrasProduto;

                      return (
                        <div
                            key={item.id + '-' + (item.extras?.map(e => e.id).join('_') || '') + '-'}
                            className="flex p-2 gap-10 justify-between bg-gray-200 rounded"
                          >
                          <div className="flex-1">
                            <div>{item.nome}</div>
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
                                        € {extra.valor?.toFixed(2)}
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
                  
                  <div className="flex justify-between mt-2 border-t-2 pt-2">
                    <p>Total: € {p.valor.toFixed(2)}</p>
                    <div className="flex gap-2">
                      <button onClick={() => imprimir(p)}>
                        <Printer size={24} />
                      </button>
                    </div>
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
              <div key={p.id} className="flex w-[90%] m-auto border p-3 rounded mb-3">
                <div className="flex flex-col w-full">
                  <div className="flex justify-between items-center">
                    <div>
                      <strong>{p.cliente}</strong>
                      <p>{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="bg-blue-600 p-2 text-white rounded">{p.codigo}</div>
                  </div>

                  <div className="w-full text-sm mt-1 text-gray-700 list-disc list-inside">
                    {p.produtos.map(item => (
                      <div key={item.id} className="flex p-2 gap-10 justify-between bg-gray-200 rounded">
                        <div className="flex-1">
                          {item.nome}
                          {item.extras?.length > 0 && (
                            <div className="mt-1 text-sm">
                              Extras:
                              <ul className="pl-5 list-disc">
                                {item.extras.map(extra => (
                                  <li key={extra.id}>
                                    {extra.nome} (+€ {extra.valor?.toFixed(2)})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div>{item.quantidade}</div>
                        <div>€ {(item.preco * item.quantidade).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between mt-2 border-t-2 pt-2">
                    <p>Total: € {p.valor.toFixed(2)}</p>
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
