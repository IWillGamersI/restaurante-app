// src/admin/RecalcularCartoesButton.tsx
import React, { useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { regrasFidelidade } from "@/lib/regrasFidelidade";

function gerarCodigoCupom(tipo: string) {
  return tipo.toUpperCase() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();
}

export async function recalcularCartoes() {
  const clientesRef = collection(db, "clientes");
  const clientesSnap = await getDocs(clientesRef);

  for (const clienteDoc of clientesSnap.docs) {
    const clienteData: any = clienteDoc.data();
    const pedidos = clienteData.pedidos || [];
    const cartoesAtualizados: any[] = [];

    for (const [nomeCartao, regra] of Object.entries(regrasFidelidade)) {
      let quantidadeTotal = 0;
      const cupomGanho: any[] = [];
      const cupomResgatado: any[] = []; // sempre zerado
      const nomeCartaoNorm = nomeCartao.toLowerCase();

      for (const pedido of pedidos) {
        for (const produto of pedido.produtos || []) {
          const classe = (produto.classe || "").toLowerCase();

          if (classe === nomeCartaoNorm) {
            quantidadeTotal += Number(produto.quantidade || 1);
          }
        }
      }

      const totalCupons = Math.floor(quantidadeTotal / regra.limite);
      for (let i = 0; i < totalCupons; i++) {
        cupomGanho.push({
          codigo: gerarCodigoCupom(nomeCartao),
          dataGanho: new Date().toISOString(),
          quantidade: 1,
        });
      }

      cartoesAtualizados.push({
        tipo: nomeCartao,
        quantidade: quantidadeTotal % regra.limite,
        limite: regra.limite,
        periodo: regra.periodo,
        cupomGanho,
        cupomResgatado,
        saldoCupom: cupomGanho.length, // saldo = cupons ganhos
      });
    }

    const clienteRef = doc(db, "clientes", clienteDoc.id);
    await updateDoc(clienteRef, { cartaoFidelidade: cartoesAtualizados });
    console.log(`Cartões recalculados para cliente ${clienteDoc.id}`);
  }

  console.log("Recalculo de todos os cartões finalizado!");
}

// Botão React
export const RecalcularCartoesButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const confirmacao = window.confirm(
      "⚠️ Isso vai apagar todos os cupons ganhos e resgatados de todos os clientes. Tem certeza?"
    );
    if (!confirmacao) return;

    setLoading(true);
    try {
      await recalcularCartoes();
      alert("✅ Recalculo finalizado!");
    } catch (err) {
      console.error(err);
      alert("❌ Ocorreu um erro. Veja o console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Recalculando..." : "Recalcular Cartões de Fidelidade"}
    </button>
  );
};
