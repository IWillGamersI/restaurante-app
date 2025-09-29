'use client';

import { useState } from "react";
import { Pedido } from "@/types";

interface Props {
  pedidos: Pedido[];
  loading: boolean;
}

export function AbasCompras({ pedidos, loading }: Props) {
  const [subAba, setSubAba] = useState<'atual' | 'anteriores'>('atual');

  if (loading) return <div className="p-4 text-center">Carregando pedidos...</div>;
  if (!pedidos || pedidos.length === 0) return <div className="p-4 text-center text-gray-500">Nenhum pedido encontrado</div>;

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const pedidosMesAtual = pedidos.filter(p => new Date(p.data!) >= inicioMes);
  const pedidosAnteriores = pedidos.filter(p => new Date(p.data!) < inicioMes);

  const listaPedidos = subAba === 'atual' ? pedidosMesAtual : pedidosAnteriores;

  return (
    <div className="p-4">
      <div className="flex justify-around mb-4">
        <button
          onClick={() => setSubAba('atual')}
          className={`px-4 py-2 rounded-full transition-colors duration-300 ${subAba === 'atual' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Mês Atual
        </button>
        <button
          onClick={() => setSubAba('anteriores')}
          className={`px-4 py-2 rounded-full transition-colors duration-300 ${subAba === 'anteriores' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Anteriores
        </button>
      </div>

      {listaPedidos.length === 0 ? (
        <div className="text-gray-500 text-center">Nenhum pedido {subAba === 'atual' ? 'neste mês' : 'anterior'}.</div>
      ) : (
        <div className="space-y-4">
          {listaPedidos.map(pedido => (
            <div
              key={pedido.id}
              className="bg-white p-4 rounded-xl shadow-md transition-transform duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="flex justify-between mb-2">
                <span className="font-semibold">📦 Compra</span>
                <span className="text-blue-600 text-sm">{new Date(pedido.data!).toLocaleDateString()}</span>
              </div>

              <ul className="text-sm space-y-1">
                {pedido.produtos?.map((item, i) => (
                  <div className="flex justify-between border-b border-gray-200 py-1" key={i}>
                    <div>{item.quantidade}</div>
                    <div className="flex-1">x {item.nome}</div>
                    <div>€{item.preco.toFixed(2)}</div>
                  </div>
                ))}
              </ul>

              <div className="font-bold flex justify-between text-blue-600 mt-2">
                <div>Total</div>
                <div>€{pedido.valor.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
