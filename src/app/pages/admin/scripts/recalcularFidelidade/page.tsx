'use client'
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
      const cupomGanho: string[] = [];
      const cupomResgatado: string[] = []; // sempre zerado
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
        cupomGanho.push(gerarCodigoCupom(nomeCartao));
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
