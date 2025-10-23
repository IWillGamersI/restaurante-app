'use client';

import { useState } from "react";
import { useClientesParaResgate } from "@/hook/useClientesParaResgate";
import { Gift, User, CreditCard } from "lucide-react";
import { regrasFidelidade } from "@/types";

export default function AdminCupons() {
  const { clientesComCupons, clientesComPontosSuficientes, loading, error } = useClientesParaResgate();
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null);
  const [subAba, setSubAba] = useState<"disponiveis" | "resgatados">("disponiveis");

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando dados...</div>;
  if (error) return <div className="p-6 text-center text-red-600">Erro: {error}</div>;

  const listaClientes = [...clientesComCupons, ...clientesComPontosSuficientes];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
      
      {/* Lista de Clientes */}
      <div className="col-span-1">
        <h2 className="text-lg font-bold mb-3">Clientes</h2>
        <ul className="space-y-2">
          {listaClientes.map(c => (
            <li
              key={c.id}
              onClick={() => setClienteSelecionado(c)}
              className="p-3 bg-white shadow rounded-lg cursor-pointer hover:bg-gray-50 border flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{c.nome}</p>
                <p className="text-sm text-gray-500">{c.telefone}</p>
              </div>
              <div className="text-sm text-blue-600">
                {c.cartoes.some((ct: any) => ct.saldoCupom > 0) ? "🎟️ Cupons" : "⭐ Pontos"}
              </div>
            </li>
          ))}
          {listaClientes.length === 0 && (
            <p className="text-center text-gray-500 bg-gray-50 p-4 rounded-lg border">Nenhum cliente encontrado.</p>
          )}
        </ul>
      </div>

      {/* Detalhes do Cliente */}
      {clienteSelecionado && (
        <div className="col-span-2">
          <button
            onClick={() => setClienteSelecionado(null)}
            className="text-blue-600 mb-4 hover:underline"
          >
            ← Voltar
          </button>

          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" /> {clienteSelecionado.nome}
            </h2>
            <p className="text-gray-500">Telefone: {clienteSelecionado.telefone}</p>
          </div>

          {/* Cartões de Fidelidade */}
          <div className="mb-6">
            <h3 className="font-bold text-blue-600 mb-2 flex items-center gap-1">
              <CreditCard className="w-4 h-4" /> Cartões de Fidelidade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clienteSelecionado.cartoes.map((cartao: any) => {
                const regra = regrasFidelidade[cartao.tipo];
                const limite = regra?.limite ?? 1;
                const pontosAtuais = cartao.quantidade % limite;
                const saldoCupom = ((cartao.cupomGanho?.length || 0) - (cartao.cupomResgatado?.length || 0));

                return (
                  <div key={cartao.tipo} className="p-3 border rounded-lg shadow-sm">
                    <h4 className="font-semibold text-blue-600 mb-1">{cartao.tipo}</h4>
                    <p>Pontos: {pontosAtuais} / {limite}</p>
                    <div className="w-full bg-gray-200 h-2 rounded-full mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(pontosAtuais / limite) * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 font-medium">Cupons: {saldoCupom}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cupons */}
          <div>
            <h3 className="font-bold text-green-600 mb-2 flex items-center gap-1">
              <Gift className="w-4 h-4" /> Cupons
            </h3>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSubAba("disponiveis")}
                className={`flex-1 py-2 rounded-lg font-semibold ${subAba === "disponiveis" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}`}
              >
                Disponíveis
              </button>
              <button
                onClick={() => setSubAba("resgatados")}
                className={`flex-1 py-2 rounded-lg font-semibold ${subAba === "resgatados" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}`}
              >
                Resgatados
              </button>
            </div>

            {clienteSelecionado.cartoes.map((cartao: any) => {
              const lista =
                subAba === "disponiveis"
                  ? cartao.cupomGanho.filter((cupom: any) =>
                      cartao.cupomResgatado.every((r: any) => r.codigo !== cupom.codigo)
                    )
                  : cartao.cupomResgatado;

              return (
                <div key={cartao.tipo} className="mb-4">
                  <h4 className="font-semibold text-green-600 mb-2">{cartao.tipo}</h4>
                  {lista.length > 0 ? (
                    <ul className="space-y-1">
                      {lista.map((cupom: any) => (
                        <li key={cupom.codigo} className={`p-2 border rounded text-sm flex justify-between ${subAba === "disponiveis" ? 'bg-green-50' : 'bg-gray-100'}`}>
                          <span>{cupom.codigo}</span>
                          {cupom.dataResgate && (
                            <span className="text-green-600">{new Date(cupom.dataResgate).toLocaleDateString()}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum cupom nesta aba.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
