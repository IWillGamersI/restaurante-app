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
import { div } from 'framer-motion/client';


interface Produto {
  id: string;
  nome: string;
  preco: number;
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
    <div className="w-full mx-auto space-y-8">
      
      <h3 className="text-3xl font-semibold mb-4 flex items-center text-blue-600 gap-2"><ClipboardList className='text-gray-800' /> Central de Pedidos</h3>
     
      {/* Listas de Pedidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        
        {/* Abertos */}
        <div className="bg-white  p-4 rounded-lg shadow">

          <div className='flex w-full gap-2 justify-between  mb-3 text-center'>
            <div className='w-full flex flex-col gap-2 bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'> Pedidos</div>
              <div className='text-3xl'>{pedidosAbertos.length}</div>
            </div> 

            <div className='w-full flex flex-col gap-2 bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Faturamento</div>
              <div className='flex p-2 text-lg justify-between font-semibold'>
                <div>
                   €
                </div>
                <div>
                  {calcularFaturamento(pedidosAbertos).toFixed(2)}
                </div>
              </div>
            </div> 

          </div>

          <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-600 gap-2"><ClipboardList /> Pedidos Abertos</h3>
          {pedidosAbertos.length === 0 ? <p className="text-gray-500">Nenhum pedido aberto.</p> : pedidosAbertos.map(p => (
            <div
                    key={p.id}
                    className="flex w-full m-auto  border p-2 rounded mb-3"
                  >
                    <div className='flex flex-col w-full'>
                      <div className='flex flex-wrap justify-between items-center'>
                        <div>
                          <div className='flex w-full justify-between '>
                            <div className='w-full'><strong>{p.nomeCliente}</strong></div>                            
                          </div> 
                          <p>{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                        </div>

                        <div className='flex text-lg bg-blue-600 text-white rounded font-bold p-1'>{p.codigoPedido}</div> 
 
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
          <div className='flex gap-2 justify-between  mb-3 text-center'>
            
            <div className='flex w-full flex-col gap-2 bg-gray-200 p-2 rounded'>
              <div className='font-black text-blue-600'>Qt. Pedidos</div>
              <div className='text-3xl'>{pedidosConcluidos.length}</div>
            </div> 
            
            <div className='flex w-full flex-col gap-2 bg-gray-200 p-2 rounded'>
              
              <div className='font-black text-blue-600'>Faturamento</div>
              <div className='flex text-lg font-semibold p-2 justify-between'>
                <div>€ </div>
                <div>
                  {calcularFaturamento(pedidosConcluidosFiltrados).toFixed(2)}

                </div>
              </div>
            
            </div> 
            
          </div>
          <h3 className="text-lg font-semibold mb-4 flex items-center text-green-600 gap-2"><CheckCircle2 /> Pedidos Finalizados</h3>
          <div className="bg-white p-4 rounded-lg shadow">
        
            {pedidosConcluidosFiltrados.length === 0 ? (
              <p className="text-gray-500">Nenhum pedido finalizado.</p>
            ) : (
            pedidosConcluidosFiltrados
              .slice()
              .sort((a,b)=> new Date(b.data).getTime() - new Date(a.data).getTime())
              .map(p => (
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
                    <div className='flex items-center justify-between'>
                      <div className='font-semibold text-right' >
                        <span className='text-blue-600'>Status:</span> <span className='text-red-500'>{p.status}</span>
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

                    :
                      <div className='flex items-center justify-between'>

                        <div className='font-semibold text-right' >
                            <span className='text-blue-600'>Status:</span> <span className='text-green-500'>{p.status}</span>
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
                    }
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
                    className="flex w-full m-auto  border p-3 rounded mb-3"
                  >
                    <div className='flex flex-col w-full'>
                      <div className='flex flex-wrap justify-between items-center'>
                        <div>
                          <strong>{p.nomeCliente}</strong> 
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
                            <div className='flex gap-5 justify-between ' key={item.id}>
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
