'use client';

import { useState, useMemo } from "react";
import { useClientesParaResgate } from "@/hook/useClientesParaResgate";
import { Gift, User, CreditCard, PlusCircle } from "lucide-react";
import { regrasFidelidade } from "@/types";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export default function AdminCupons() {
  const { clientesComCupons, clientesComPontosSuficientes, loading, error } =
    useClientesParaResgate();
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null);
  const [subAba, setSubAba] = useState<"disponiveis" | "resgatados">("disponiveis");
  const [gerando, setGerando] = useState<string | null>(null);

  // Combina os dois arrays sem duplicar
  const listaClientes = useMemo(() => {
    const mapa = new Map();
    [...(clientesComCupons || []), ...(clientesComPontosSuficientes || [])].forEach((c) => {
      if (!mapa.has(c.id)) mapa.set(c.id, c);
    });
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clientesComCupons, clientesComPontosSuficientes]);

  // Gera cupom manualmente
  const gerarCupomManual = async (cliente: any, tipo: string) => {
    try {
      setGerando(tipo);
      const codigo = `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const ref = doc(db, "clientes", cliente.id);

      await updateDoc(ref, {
        [`cartoes.${tipo}.cupomGanho`]: arrayUnion({
          codigo,
          dataGeracao: new Date().toISOString(),
          tipo,
          origem: "manual",
        }),
      });

      alert(`Cupom ${codigo} gerado com sucesso para ${cliente.nome} (${tipo})!`);
      setGerando(null);
    } catch (err) {
      console.error("Erro ao gerar cupom:", err);
      alert("Erro ao gerar cupom. Verifique o console.");
      setGerando(null);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando dados...</div>;
  if (error) return <div className="p-6 text-center text-red-600">Erro: {error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 h-[calc(100vh-100px)] overflow-hidden">
      
      {/* Lista de Clientes */}
      <div className="col-span-1 flex flex-col h-[80vh]">
        <h2 className="text-lg font-bold mb-3">Clientes</h2>
        <div className="flex-1 overflow-y-auto pr-2 border rounded-lg bg-white shadow-sm">
          <ul className="space-y-2 p-2">
            {listaClientes.map((c) => (
              <li
                key={c.id}
                onClick={() => {
                  setClienteSelecionado(c);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 border flex justify-between items-center transition ${
                  clienteSelecionado?.id === c.id ? "bg-blue-50 border-blue-400" : "bg-white"
                }`}
              >
                <div>
                  <p className="font-semibold">{c.nome}</p>
                  <p className="text-sm text-gray-500">
                    {c.telefone} {c.dataNascimento ? `- ${new Date(c.dataNascimento).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="text-sm text-blue-600 whitespace-nowrap ml-2">
                  {Object.values(c.cartoes || {}).some((ct: any) => ct.saldoCupom > 0) ? "🎟️ Cupons" : "⭐ Pontos"}
                </div>
              </li>
            ))}
            {listaClientes.length === 0 && (
              <p className="text-center text-gray-500 bg-gray-50 p-4 rounded-lg border">
                Nenhum cliente encontrado.
              </p>
            )}
          </ul>
        </div>
      </div>

      {/* Detalhes do Cliente */}
      <div className="col-span-2 h-[80vh] overflow-y-auto p-4 bg-gray-50 rounded-lg">
        {clienteSelecionado ? (
          <div>
            <button
              onClick={() => setClienteSelecionado(null)}
              className="text-blue-600 mb-4 hover:underline"
            >
              ← Voltar
            </button>

            {/* Cabeçalho */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> {clienteSelecionado.nome}
              </h2>
              <p className="text-gray-500">
                Telefone: {clienteSelecionado.telefone} <br />
                {clienteSelecionado.dataNascimento && (
                  <>Nascimento: {new Date(clienteSelecionado.dataNascimento).toLocaleDateString()}</>
                )}
              </p>
            </div>

            {/* Cartões de Fidelidade */}
            <div className="mb-6">
              <h3 className="font-bold text-blue-600 mb-2 flex items-center gap-1">
                <CreditCard className="w-4 h-4" /> Cartões de Fidelidade
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.values(clienteSelecionado.cartoes || {}).map((cartao: any) => {
                  const regra = regrasFidelidade[cartao.tipo];
                  const limite = regra?.limite ?? 1;
                  const pontosAtuais = cartao.quantidade % limite;
                  const saldoCupom = (cartao.cupomGanho.length - cartao.cupomResgatado.length) + cartao.cupomResgatado.length

                  return (
                    <div key={cartao.tipo} className="p-3 border rounded-lg shadow-sm bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-semibold text-blue-600">{cartao.tipo}</h4>
                        <button
                          onClick={() => gerarCupomManual(clienteSelecionado, cartao.tipo)}
                          disabled={gerando === cartao.tipo}
                          className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
                        >
                          <PlusCircle className="w-4 h-4" />
                          {gerando === cartao.tipo ? "Gerando..." : "Gerar Cupom"}
                        </button>
                      </div>
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
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    subAba === "disponiveis" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Disponíveis
                </button>
                <button
                  onClick={() => setSubAba("resgatados")}
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    subAba === "resgatados" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  Resgatados
                </button>
              </div>

              {Object.values(clienteSelecionado.cartoes || {}).map((cartao: any) => {
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
                          <li
                            key={cupom.codigo}
                            className={`p-2 border rounded text-sm flex justify-between ${
                              subAba === "disponiveis" ? "bg-green-50" : "bg-gray-100"
                            }`}
                          >
                            <span>{cupom.codigo}</span>
                            {cupom.dataResgate && (
                              <span className="text-green-600">
                                {new Date(cupom.dataResgate).toLocaleDateString()}
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
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 italic">
            Selecione um cliente à esquerda
          </div>
        )}
      </div>
    </div>
  );
}
