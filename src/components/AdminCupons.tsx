'use client';

import { useState, useMemo } from "react";
import { useClientesParaResgate } from "@/hook/useClientesParaResgate";
import { Gift, User, CreditCard, PlusCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { regrasFidelidade } from "@/lib/regrasFidelidade"; // 👈 Importa regras locais

// 🔹 Função utilitária para gerar códigos de cupom padronizados
function gerarCodigoCupom(tipo: string) {
  return tipo.toUpperCase() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();
}

export default function AdminCupons() {
  const { clientesComCupons, clientesComPontosSuficientes, loading, error } =
    useClientesParaResgate();
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null);
  const [subAba, setSubAba] = useState<"disponiveis" | "resgatados">("disponiveis");
  const [gerando, setGerando] = useState<string | null>(null);

  // Combina as listas sem duplicar clientes
  const listaClientes = useMemo(() => {
    const mapa = new Map();
    [...(clientesComCupons || []), ...(clientesComPontosSuficientes || [])].forEach((c) => {
      if (!mapa.has(c.id)) mapa.set(c.id, c);
    });
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientesComCupons, clientesComPontosSuficientes]);

  // 🔹 Gera cupom manualmente para um tipo específico
  const gerarCupomManual = async (cliente: any, tipo: string) => {
    try {
      if (!regrasFidelidade[tipo]) {
        alert(`⚠️ O tipo "${tipo}" não existe nas regras de fidelidade.`);
        return;
      }

      setGerando(tipo);
      const codigo = gerarCodigoCupom(tipo);

      const novoCupom = {
        codigo,
        dataGeracao: new Date().toISOString(),
        tipo,
        origem: "manual",
      };

      // Atualiza o cartão correspondente com base nas regras locais
      const novosCartoes = cliente.cartaoFidelidade.map((cartao: any) => {
        if (cartao.tipo === tipo) {
          const novosCupons = [...(cartao.cupomGanho || []), novoCupom];
          const novoSaldo = (cartao.saldoCupom || 0) + 1;

          const regra = regrasFidelidade[tipo];
          return {
            ...cartao,
            limite: regra.limite,
            periodo: regra.periodo,
            cupomGanho: novosCupons,
            saldoCupom: novoSaldo,
          };
        }
        return cartao;
      });

      // Atualiza o Firestore
      await updateDoc(doc(db, "clientes", cliente.id), {
        cartaoFidelidade: novosCartoes,
      });

      alert(`✅ Cupom ${codigo} gerado com sucesso para ${cliente.nome} (${tipo})!`);

      // Atualiza o estado local
      setClienteSelecionado({ ...cliente, cartaoFidelidade: novosCartoes });
    } catch (err) {
      console.error("Erro ao gerar cupom:", err);
      alert("Erro ao gerar cupom. Veja o console para detalhes.");
    } finally {
      setGerando(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando dados...</div>;
  if (error) return <div className="p-6 text-center text-red-600">Erro: {error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 h-[80vh] bg-gray-50">
      {/* 🧭 Lista de clientes */}
      <div className="col-span-1 border-r bg-white flex flex-col h-[80vh]">
        <div className="p-4 border-b bg-white sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-800">Clientes</h2>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {listaClientes.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setClienteSelecionado(c);
                setSubAba("disponiveis");
              }}
              className={`p-3 rounded-lg cursor-pointer border shadow-sm transition ${
                clienteSelecionado?.id === c.id
                  ? "bg-blue-50 border-blue-400"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{c.nome}</p>
                  <p className="text-sm text-gray-500">
                    {c.telefone}
                    {c.dataNascimento && (
                      <> · {new Date(c.dataNascimento).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <span className="text-sm text-blue-600">
                  {c.cartaoFidelidade?.some((ct: any) => (ct.saldoCupom ?? 0) > 0)
                    ? "🎟️"
                    : "⭐"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🪪 Painel do cliente */}
      <div className="col-span-2 flex flex-col h-full overflow-hidden">
        {clienteSelecionado ? (
          <>
            <div className="p-4 border-b bg-white sticky top-0 z-10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" /> {clienteSelecionado.nome}
                </h2>
                <p className="text-gray-500 text-sm">
                  {clienteSelecionado.telefone}
                  {clienteSelecionado.dataNascimento && (
                    <> · {new Date(clienteSelecionado.dataNascimento).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => setClienteSelecionado(null)}
                className="text-blue-600 hover:underline text-sm"
              >
                ← Voltar
              </button>
            </div>

            {/* Conteúdo principal */}
            <div className="overflow-y-auto flex-1 p-4 space-y-6">
              {/* Cartões de fidelidade */}
              <section>
                <h3 className="font-bold text-blue-600 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Cartões de Fidelidade
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clienteSelecionado.cartaoFidelidade?.map((cartao: any) => {
                    const regra = regrasFidelidade[cartao.tipo] || { limite: cartao.limite };
                    const progresso = Math.min((cartao.quantidade / regra.limite) * 100, 100);
                    return (
                      <div key={cartao.tipo} className="p-3 border rounded-lg bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-blue-600 capitalize">{cartao.tipo}</h4>
                          <button
                            onClick={() => gerarCupomManual(clienteSelecionado, cartao.tipo)}
                            disabled={gerando === cartao.tipo}
                            className={`text-sm flex items-center gap-1 ${
                              gerando === cartao.tipo
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-green-600 hover:text-green-700"
                            }`}
                          >
                            <PlusCircle className="w-4 h-4" />
                            {gerando === cartao.tipo ? "Gerando..." : "Gerar"}
                          </button>
                        </div>
                        <p className="text-sm">Pontos: {cartao.quantidade} / {regra.limite}</p>
                        <div className="w-full bg-gray-200 h-2 rounded-full mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${progresso}%` }}
                          />
                        </div>
                        <p className="mt-2 text-sm font-medium">
                          Cupons disponíveis: {cartao.saldoCupom ?? 0}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Cupons */}
              <section>
                <h3 className="font-bold text-green-600 mb-3 flex items-center gap-2">
                  <Gift className="w-4 h-4" /> Cupons
                </h3>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSubAba("disponiveis")}
                    className={`flex-1 py-2 rounded-lg font-semibold ${
                      subAba === "disponiveis"
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    Disponíveis
                  </button>
                  <button
                    onClick={() => setSubAba("resgatados")}
                    className={`flex-1 py-2 rounded-lg font-semibold ${
                      subAba === "resgatados"
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    Resgatados
                  </button>
                </div>

                {/* Lista de cupons */}
                {clienteSelecionado.cartaoFidelidade?.map((cartao: any) => {
                  const lista =
                    subAba === "disponiveis"
                      ? cartao.cupomGanho?.filter(
                          (cupom: any) =>
                            !(cartao.cupomResgatado || []).some(
                              (r: any) => r.codigo === cupom.codigo
                            )
                        ) ?? []
                      : cartao.cupomResgatado ?? [];

                  return (
                    <div key={cartao.tipo} className="mb-4">
                      <h4 className="font-semibold text-green-700 mb-2 capitalize">
                        {cartao.tipo}
                      </h4>
                      {lista.length > 0 ? (
                        <ul className="space-y-1">
                          {lista.map((cupom: any) => (
                            <li
                              key={cupom.codigo}
                              className={`p-2 border rounded text-sm flex justify-between items-center ${
                                subAba === "disponiveis" ? "bg-green-50" : "bg-gray-100"
                              }`}
                            >
                              <span>{cupom.codigo}</span>
                              {(cupom.dataResgate || cupom.dataGeracao) && (
                                <span className="text-green-600 text-xs">
                                  {new Date(
                                    cupom.dataResgate || cupom.dataGeracao
                                  ).toLocaleDateString()}
                                </span>
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
              </section>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 italic">
            Selecione um cliente à esquerda
          </div>
        )}
      </div>
    </div>
  );
}
