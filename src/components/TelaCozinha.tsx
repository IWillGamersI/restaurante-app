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
      const emPreparo = lista.filter(p =>
        ['fila', 'preparando'].includes(p.status.toLowerCase())
      );
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

    const novosProdutos = pedido.produtos.map(prod => 
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
            <div>
              <div>{p.codigoPedido}</div>
              <div>{p.ordemDiaria}</div>
              <strong>{p.nomeCliente}</strong> — {new Date(p.data).toLocaleDateString('pt-BR')}
            </div>
            <select
              value={p.status}
              onChange={(e) => atualizarStatus(p.id, e.target.value)}
              className={`px-3 py-1 border rounded text-sm font-semibold ${statusColor(p.status)}`}
            >
              <option value="Fila">Fila</option>
              <option value="Preparando">Preparando</option>
              <option value="Pronto">Pronto</option>
            </select>
          </div>

          <ul className="mt-2 space-y-1">
            {p.produtos.map(prod => (
              <div
                key={prod.id}
                className={`flex flex-col  px-3 py-2 rounded cursor-pointer ${
                  prod.concluido ? 'line-through text-gray-400' : ''
                } hover:bg-gray-100`}
                onClick={() => toggleProdutoConcluido(p.id, prod.id)}
              >
                <div className='font-semibold text-blue-600'> {prod.quantidade} - {prod.nome}</div>

                <div>{prod.extras.map((item)=>(
                    <div className='ml-3'> - {item.nome}</div>
                  ))}
                </div>
                
              </div>
            ))}
          </ul>

          
        </div>
      ))}
    </div>
  );
}
