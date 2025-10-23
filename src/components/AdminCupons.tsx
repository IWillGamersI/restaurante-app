'use client'

import { useState } from "react";
import { useClientesParaResgate } from "@/hook/useClientesParaResgate";

export default function AdminCupons() {
  const {
    clientesComCupons = [],
    clientesComPontosSuficientes = [],
    loading,
    error,
  } = useClientesParaResgate();

  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const toggleCliente = (id: string) => {
    setAbertos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading)
    return (
      <div className="p-6 text-center text-gray-600 animate-pulse">
        Carregando dados dos clientes...
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-center text-red-600">
        ⚠️ Erro ao carregar clientes: {error}
      </div>
    );

  const renderCliente = (c: any, mostrarCupons = false) => {
    const aberto = abertos[c.id] || false;

    return (
      <li
        key={c.id}
        className="border-b last:border-0 pb-2 hover:bg-gray-50 rounded-lg transition cursor-pointer"
      >
        <div
          onClick={() => toggleCliente(c.id)}
          className="flex justify-between items-center"
        >
          <div>
            <p className="font-semibold">{c.nome || "Sem nome"}</p>
            <p className="text-sm text-gray-500">
              <span className="text-blue-600 font-semibold">Fone: </span>
              {c.telefone || "—"}
            </p>
          </div>
          <div className="text-gray-400 text-sm">{aberto ? "⬆️" : "⬇️"}</div>
        </div>

        {aberto && c.cartoes && c.cartoes.length > 0 && (
          <ul className="ml-4 mt-2 text-xs text-blue-600 space-y-1">
            {c.cartoes.map(cartao => (
              <li key={cartao.tipo} className="flex flex-col">
                <span>
                  {cartao.tipo}:
                  <span className="ml-1 font-medium">{cartao.quantidade} pontos</span>
                </span>

                {mostrarCupons && cartao.saldoCupom && cartao.saldoCupom > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Array.from({ length: cartao.saldoCupom }).map((_, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs"
                      >
                        {i+1} - 🎟️ Cupom
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 p-4">
      {/* Coluna 1: Clientes com Cupons */}
      <div>
        <h2 className="text-lg font-bold mb-3">🎟️ Clientes com Cupons</h2>
        {clientesComCupons.length === 0 ? (
          <div className="text-gray-500 bg-gray-50 rounded-xl p-4 border">
            Nenhum cliente com cupom disponível.
          </div>
        ) : (
          <ul className="bg-white rounded-xl shadow p-4 space-y-3">
            {clientesComCupons.map(c => renderCliente(c, true))}
          </ul>
        )}
      </div>

      {/* Coluna 2: Clientes com +10 Pontos (sem cupons) */}
      <div>
        <h2 className="text-lg font-bold mb-3">⭐ Clientes com +10 Pontos</h2>
        {clientesComPontosSuficientes.filter(c => !clientesComCupons.some(cc => cc.id === c.id)).length === 0 ? (
          <div className="text-gray-500 bg-gray-50 rounded-xl p-4 border">
            Nenhum cliente elegível no momento.
          </div>
        ) : (
          <ul className="bg-white rounded-xl shadow p-4 space-y-3">
            {clientesComPontosSuficientes
              .filter(c => !clientesComCupons.some(cc => cc.id === c.id))
              .map(c => renderCliente(c, false))}
          </ul>
        )}
      </div>
    </div>
  );
}
