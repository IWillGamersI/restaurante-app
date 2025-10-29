'use client';

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { regrasFidelidade } from "@/lib/regrasFidelidade";

function gerarCodigoCupom(tipo: string) {
  return tipo.toUpperCase() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Função para sanitizar objetos e remover undefined
function sanitize(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value.map(v => sanitize(v)).filter(v => v !== undefined);
  }

  if (typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      const sv = sanitize(v);
      if (sv !== undefined) out[k] = sv;
    }
    return out;
  }

  return value;
}

export default function RecalcularCartoes() {
  const [status, setStatus] = useState("Aguardando...");
  const [corrigidos, setCorrigidos] = useState(0);
  const [total, setTotal] = useState(0);
  const [detalhes, setDetalhes] = useState<string[]>([]);

  const recalcularCartoes = async () => {
    setStatus("🔄 Iniciando recalculo...");
    setDetalhes([]);
    setCorrigidos(0);

    try {
      const clientesSnap = await getDocs(collection(db, "clientes"));
      const totalDocs = clientesSnap.size;
      setTotal(totalDocs);

      let batch = writeBatch(db);
      let batchCount = 0;
      let atualizados = 0;

      for (const cliente of clientesSnap.docs) {
        const clienteData: any = cliente.data();
        const cartaoFidelidade: any[] = clienteData.cartaoFidelidade || [];

        // Recalcula cartões
        const novosCartoes = cartaoFidelidade.map((cartao: any) => {
          const regra = regrasFidelidade[cartao.tipo] || { limite: cartao.limite, periodo: cartao.periodo };

          // Quantidade total de produtos (mes atual opcional se necessário)
          const quantidadeTotal = cartao.quantidade || 0;

          // Cria cupons novos se necessário
          const cupomGanho: any[] = [];
          const cupomResgatado: any[] = cartao.cupomResgatado || [];
          const totalCupons = Math.floor(quantidadeTotal / regra.limite);

          for (let i = 0; i < totalCupons; i++) {
            cupomGanho.push({
              codigo: gerarCodigoCupom(cartao.tipo),
              dataGanho: new Date().toISOString(),
              quantidade: 1,
            });
          }

          const saldoCorrigido = cupomGanho.length - cupomResgatado.length;

          setDetalhes(prev => [
            ...prev,
            `Cliente: ${clienteData.codigoCliente}, Cartão: ${cartao.tipo}, Cupons Gerados: ${totalCupons}`,
          ]);

          return sanitize({
            tipo: cartao.tipo,
            limite: regra.limite,
            periodo: regra.periodo,
            quantidade: quantidadeTotal % regra.limite,
            saldoCupom: saldoCorrigido >= 0 ? saldoCorrigido : 0,
            cupomGanho,
            cupomResgatado,
          });
        });

        batch.update(doc(db, "clientes", cliente.id), { cartaoFidelidade: novosCartoes });
        batchCount++;
        atualizados++;
        setCorrigidos(atualizados);

        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      setStatus("✅ Recalculo finalizado!");
    } catch (err: any) {
      console.error("❌ Erro no recalculo:", err);
      setStatus("❌ Erro — veja o console para detalhes.");
    }
  };

  const progresso = total > 0 ? (corrigidos / total) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-3xl text-center">
        <h1 className="text-xl font-bold mb-4">🧮 Recalcular Cartões de Fidelidade</h1>
        <p className="text-gray-600 mb-4">
          Atualiza todos os cartões de fidelidade do mês atual, gerando cupons se necessário e ajustando saldo.
        </p>

        <button
          onClick={recalcularCartoes}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition mb-4"
        >
          Recalcular Cartões do Mês Atual
        </button>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 rounded-full h-6 mb-4 overflow-hidden">
          <div
            className="bg-blue-600 h-6 transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="text-gray-700 mb-2">Progresso: {corrigidos} / {total} clientes ({progresso.toFixed(1)}%)</p>

        {/* Lista de detalhes */}
        <div className="mt-2 text-gray-700 text-left max-h-80 overflow-auto">
          <ul className="list-disc list-inside space-y-1">
            {detalhes.map((d, i) => (
              <li key={i} className="text-sm">{d}</li>
            ))}
          </ul>
        </div>

        <p className="mt-2 text-gray-500">{status}</p>
      </div>
    </div>
  );
}
