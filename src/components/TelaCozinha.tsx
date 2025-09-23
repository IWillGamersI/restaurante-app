'use client';

import { useEffect, useState } from 'react';
import { ProdutoPedido, Pedido } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from 'firebase/firestore';


export default function TelaCozinha() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pedidos'), (snap) => {
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pedido));
      
      
      const emPreparo = lista
      .filter(p => 
        ['fila', 'preparando'].includes((p.status ?? '').toLowerCase()) && // só em andamento
        p.produtos?.some((item)=>item.classe !== 'acai') // remove pedidos de açaí
      )
      .sort((a, b) => (a.criadoEm?.seconds ?? 0) - (b.criadoEm?.seconds ?? 0)); // do mais antigo para o mais novo

    setPedidos(emPreparo);


    });

    return () => unsub();
  }, []);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    await updateDoc(doc(db, 'pedidos', id), { status: novoStatus });
  };

  const toggleProdutoConcluido = async (pedidoId: string, produtoId: string) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    const novosProdutos = pedido.produtos?.map(prod => 
      prod.id === produtoId
        ? { ...prod, concluido: !prod.concluido }
        : prod
    );

    await updateDoc(doc(db, 'pedidos', pedidoId), {
      produtos: novosProdutos
    });
  };

  const statusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'fila': return 'bg-gray-800 text-white';
      case 'preparando': return 'bg-blue-100 text-blue-800';
      case 'pronto': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      

      {pedidos.length === 0 && <p className="text-gray-500">Nenhum pedido em andamento.</p>}

      {pedidos.map(p => (
        <div key={p.id} className="border p-4 rounded shadow bg-white space-y-2 text-gray-800">
          <div className="flex justify-between items-center">
            <div >
              <div>{p.codigoPedido}</div>
              <strong>{p.nomeCliente}</strong> — {new Date(p.data || p.criadoEm).toLocaleDateString('pt-PT')}
            </div>
              <div className='bg-blue-600 py-2 px-4 rounded-full text-white font-black text-3xl'>{p.ordemDiaria}</div>
            <select
              value={p.status}
              onChange={(e) => atualizarStatus(p.id || '', e.target.value)}
              className={`px-3 py-1 border rounded text-sm font-semibold ${statusColor(p.status || '')}`}
            >
              <option value="Fila">Fila</option>
              <option value="Preparando">Preparando</option>
              <option value="Pronto">Pronto</option>
              <option value="Pronto">Entregue</option>
            </select>
          </div>

          <ul className="mt-2 space-y-1">
            {p.produtos?.map(prod => (            
              prod.classe !== 'acai' ?(
                <div
                  key={prod.id}
                  className={`flex flex-col  px-3 py-2 rounded cursor-pointer ${
                    prod.concluido ? 'line-through text-gray-400' : ''
                  } hover:bg-gray-100`}
                  onClick={() => toggleProdutoConcluido(p.id || '', prod.id)}
                >
                  <div className='font-semibold text-blue-600'> {prod.quantidade} - {prod.nome}</div>
  
                  <div>{prod.extras.map((item)=>(
                      <div key={item.id} className='ml-3'> - {item?.nome}</div>
                    ))}
                  </div>
                                    
                </div>): null                
            ))}
          </ul>
            {p.obs !=='' ?
                <div className='bg-red-500 p-2 text-white font-bold rounded text-center'>{p.obs}</div>
                : ''
            }
        </div>
      ))}
    </div>
  );
}
