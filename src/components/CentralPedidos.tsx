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
  BookX,
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



export default function CentralPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

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


  const atualizarStatus = async (id: string, novoStatus: string) => {
    await updateDoc(doc(db, 'pedidos', id), { status: novoStatus });
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

  const pedidosAbertos = pedidos.filter(p => ['fila', 'preparando','pronto'].includes(p.status.toLowerCase()));
  const pedidosConcluidos = pedidos.filter(p => ['entregue'].includes(p.status.toLowerCase()));
  const pedidosCancelados = pedidos.filter(p => ['cancelado'].includes(p.status.toLowerCase()));


  pedidosAbertos.map((item)=>{
    console.log(item.valor) 
  })

  const calcularFaturamento = (lista: Pedido[])=>
    lista.reduce((acc,p)=> acc + Number(p.valor),0)

  const filtrarPorPeriodo = (lista: Pedido[]) => {
    if(!dataInicio || !dataFim) return lista

    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)

    fim.setHours(23,59,59,999)

    return lista.filter( p=> {
      const d = new Date(p.data)
      return d >= inicio && d <= fim
    })
  }

  const pedidosConcluidosFiltrados = filtrarPorPeriodo(pedidosConcluidos)
  const pedidosCanceladosFiltrados = filtrarPorPeriodo(pedidosCancelados)



  return (
    <div className="w-full mx-auto p-6 space-y-8">
      
      <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-600 gap-2"><ClipboardList className='text-gray-800' /> Central de Pedidos</h3>
     
      {/* Listas de Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Abertos */}
        <div className="bg-white p-4 rounded-lg shadow">

          <div className='flex justify-between  mb-3 text-center'>

            <div className='flex flex-col gap-2 min-w-[33%] bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Data de Hoje</div>
              <div>{diaHoje} / {mesHoje} / {anoHoje}</div>
            </div>

            <div className='flex flex-col gap-2 min-w-[33%] bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Faturamento</div>
              <div>€ {calcularFaturamento(pedidosAbertos).toFixed(2)}</div>
            </div> 

            <div className='flex flex-col gap-2 min-w-[33%] bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Número de Pedidos</div>
              <div>{pedidosAbertos.length}</div>
            </div> 
          </div>
          <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-600 gap-2"><ClipboardList /> Pedidos Abertos</h3>
          {pedidosAbertos.length === 0 ? <p className="text-gray-500">Nenhum pedido aberto.</p> : pedidosAbertos.map(p => (
            <div
                    key={p.id}
                    className="flex w-[90%] m-auto  border p-3 rounded mb-3"
                  >
                    <div className='flex flex-col w-full'>
                      <div className='flex flex-wrap justify-between items-center'>
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

        {/* Concluidos */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className='flex justify-between  mb-3 text-center'>
            <div className='flex flex-col gap-2 min-w-[33%] bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Selecione o Período</div>
              <div className="flex gap-2">
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
            </div>
            <div className='flex flex-col gap-2 bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Faturamento</div>
              <div>€ {calcularFaturamento(pedidosConcluidosFiltrados).toFixed(2)}</div>
            </div> 
            <div className='flex flex-col gap-2 bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Qt. Pedidos</div>
              <div>{pedidosConcluidos.length}</div>
            </div> 
          </div>
          <h3 className="text-lg font-semibold mb-4 flex items-center text-green-600 gap-2"><CheckCircle2 /> Pedidos Finalizados</h3>
          {pedidosConcluidosFiltrados.length === 0 ? <p className="text-gray-500">Nenhum pedido finalizado.</p> : pedidosConcluidosFiltrados.map(p => (
            <div
                    key={p.id}
                    className="flex w-[90%] m-auto  border p-3 rounded mb-3"
                  >
                    <div className='flex flex-col w-full'>
                      <div className='flex flex-wrap justify-between items-center'>
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

        {/* Cancelados */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className='flex justify-between  mb-3 text-center'>
            <div className='flex flex-col gap-2 min-w-[33%] bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Selecione o Período</div>
              <div></div>
            </div>
            <div className='flex flex-col gap-2 min-w-[33%] bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Faturamento</div>
              <div>€ {calcularFaturamento(pedidosCancelados).toFixed(2)}</div>
            </div> 
            <div className='flex flex-col gap-2 min-w-[33%] bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Número de Pedidos</div>
              <div>{pedidosCancelados.length}</div>
            </div> 
          </div>
          <h3 className="text-lg font-semibold mb-4 flex items-center text-red-600 gap-2"><BookX /> Pedidos Cancelados</h3>
          {pedidosCancelados.length === 0 ? <p className="text-gray-500">Nenhum pedido Cancelado.</p> : pedidosCancelados.map(p => (
            <div
                    key={p.id}
                    className="flex w-[90%] m-auto  border p-3 rounded mb-3"
                  >
                    <div className='flex flex-col w-full'>
                      <div className='flex flex-wrap justify-between items-center'>
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


      </div>
    </div>
  );
}
