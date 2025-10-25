'use client';

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

export default function AjustarSaldos() {
  const [status, setStatus] = useState<string>("Aguardando...");
  const [corrigidos, setCorrigidos] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  const ajustarSaldos = async () => {
    setStatus("🔄 Corrigindo saldos...");

    try {
      const clientesSnap = await getDocs(collection(db, "clientes"));
      const totalDocs = clientesSnap.size;
      let atualizados = 0;

      for (const cliente of clientesSnap.docs) {
        const data = cliente.data();
        const { cartaoFidelidade = [] } = data;

        if (!Array.isArray(cartaoFidelidade) || cartaoFidelidade.length === 0) continue;

        const novosCartoes = cartaoFidelidade.map((cartao: any) => {
          const ganho = Array.isArray(cartao.cupomGanho) ? cartao.cupomGanho.length : 0;
          const resgatado = Array.isArray(cartao.cupomResgatado) ? cartao.cupomResgatado.length : 0;
          const saldoCorrigido = ganho - resgatado;

          // Ajusta limite específico para tipos desejados
          let limiteNovo = cartao.limite;
          if (cartao.tipo === "acai" || cartao.tipo === "estudante") {
            limiteNovo = 12;
          }

          // Retorna o cartão com saldo e limite corrigidos
          return {
            ...cartao,
            saldoCupom: saldoCorrigido >= 0 ? saldoCorrigido : 0,
            limite: limiteNovo,
          };
        });

        const houveAlteracao = novosCartoes.some(
          (c: any, i: number) =>
            c.saldoCupom !== cartaoFidelidade[i]?.saldoCupom ||
            c.limite !== cartaoFidelidade[i]?.limite
        );

        if (houveAlteracao) {
          await updateDoc(doc(db, "clientes", cliente.id), {
            cartaoFidelidade: novosCartoes,
          });
          atualizados++;
        }
      }

      setCorrigidos(atualizados);
      setTotal(totalDocs);
      setStatus("✅ Concluído com sucesso!");
    } catch (err) {
      console.error("Erro ao ajustar saldos:", err);
      setStatus("❌ Erro — veja o console para detalhes.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h1 className="text-xl font-bold mb-4">🧮 Ajustar Saldos de Cupons</h1>
        <p className="text-gray-600 mb-4">
          Este script recalcula o campo <b>saldoCupom</b> de todos os clientes,
          comparando <code>cupomGanho</code> e <code>cupomResgatado</code> e ajusta limites de acai e estudante para 12 unidades.
        </p>
        <button
          onClick={ajustarSaldos}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Corrigir Saldos
        </button>
        <div className="mt-4 text-gray-700">
          <p>Status: {status}</p>
          {total > 0 && (
            <p>
              Corrigidos: <b>{corrigidos}</b> de <b>{total}</b> clientes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
