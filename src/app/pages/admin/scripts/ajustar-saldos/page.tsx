'use client';

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import RecalcularCartoesPage from "../recalcularFidelidade/page";


/**
 * Remove recursivamente propriedades com value === undefined
 */
function sanitize(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    const arr = value
      .map((v) => sanitize(v))
      .filter((v) => v !== undefined); // remove entradas undefined
    return arr;
  }

  if (typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      const sv = sanitize(v);
      if (sv !== undefined) out[k] = sv; // só copia se não for undefined
    }
    return out;
  }

  // primitivos (string, number, boolean)
  return value;
}

export default function AjustarSaldos() {
  const [status, setStatus] = useState("Aguardando...");
  const [corrigidos, setCorrigidos] = useState(0);
  const [total, setTotal] = useState(0);

  const ajustarSaldos = async () => {
    setStatus("🔄 Corrigindo saldos...");

    try {
      const clientesSnap = await getDocs(collection(db, "clientes"));
      const totalDocs = clientesSnap.size;
      setTotal(totalDocs);

      console.log(`🔍 Clientes encontrados: ${totalDocs}`);

      let atualizados = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const cliente of clientesSnap.docs) {
        const data = cliente.data();
        const { cartaoFidelidade = [] } = data;

        if (!Array.isArray(cartaoFidelidade) || cartaoFidelidade.length === 0) {
          console.log(`⚠️ Cliente ${cliente.id} sem cartões, pulando...`);
          continue;
        }

        // recalcula e cria novos objetos de cartão
        const novosCartoes = cartaoFidelidade.map((cartao: any, index: number) => {
          const ganho = Array.isArray(cartao?.cupomGanho) ? cartao.cupomGanho.length : 0;
          const resgatado = Array.isArray(cartao?.cupomResgatado) ? cartao.cupomResgatado.length : 0;
          const saldoCorrigido = ganho - resgatado;
          let limiteNovo = cartao?.limite;

          if (["acai", "estudante"].includes(cartao?.tipo)) {
            limiteNovo = 12;
          }

          // cria um novo objeto explicitamente (evita referências com undefined)
          const novo = {
            tipo: cartao?.tipo ?? null,
            limite: limiteNovo ?? null,
            periodo: cartao?.periodo ?? null,
            quantidade: cartao?.quantidade ?? null,
            saldoCupom: saldoCorrigido >= 0 ? saldoCorrigido : 0,
            cupomGanho: Array.isArray(cartao?.cupomGanho) ? cartao.cupomGanho : [],
            cupomResgatado: Array.isArray(cartao?.cupomResgatado) ? cartao.cupomResgatado : [],
            // copia outros campos relevantes se precisar:
            // exemplo: criadaEm: cartao?.criadaEm ?? null,
          };

          // sanitize para remover qualquer undefined residual
          return sanitize(novo);
        });

        // sanitize do array completo (remove itens undefined)
        const novosCartoesSanitizados = sanitize(novosCartoes) as any[];

        // proteção extra: se por algum motivo ficou vazio ou continha undefined
        if (!Array.isArray(novosCartoesSanitizados)) {
          console.warn(`⚠️ cliente ${cliente.id}: novosCartoesSanitizados inválido, pulando.`);
          continue;
        }

        try {
          batch.update(doc(db, "clientes", cliente.id), {
            cartaoFidelidade: novosCartoesSanitizados,
          });
          batchCount++;
          atualizados++;
        } catch (err) {
          // log local — geralmente não acontece aqui, o erro vem no commit
          console.error(`Erro adicionando update ao batch para ${cliente.id}:`, err);
        }

        // commit a cada 500 updates
        if (batchCount === 500) {
          await batch.commit();
          console.log(`✅ Batch commit — ${atualizados} clientes processados até agora`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      }

      // commit final se houver operações pendentes
      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Batch final commit — total ${atualizados}`);
      }

      setCorrigidos(atualizados);
      setStatus("✅ Concluído com sucesso!");
      console.log("✅ Atualização finalizada!");
    } catch (err: any) {
      console.error("❌ Erro ao ajustar saldos:", err);

      // Se for erro relacionado a dados inválidos, tenta identificar cliente problemático:
      if (err?.message && err.message.includes("Unsupported field value: undefined")) {
        console.error("Erro: detectado valor undefined em algum documento. Verifique objetos aninhados e arrays.");
      }

      setStatus("❌ Erro — veja o console para detalhes.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h1 className="text-xl font-bold mb-4">🧮 Ajustar Saldos de Cupons</h1>
        <p className="text-gray-600 mb-4">
          Este script recalcula o campo <b>saldoCupom</b> de todos os clientes,
          e ajusta limites de <b>acai</b> e <b>estudante</b> para 12 unidades.
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

      <div>
        <h1>Recalcular os Cartões firebase</h1>
        <RecalcularCartoesPage/>
      </div>
    </div>
  );
}
