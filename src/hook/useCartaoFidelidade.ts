import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pedido } from "@/types";

export interface Compra {
  data: string;
  produto: string;
  quantidade: number;
}

export interface CartaoFidelidade {
  tipo: string;
  quantidade: number; // compras não completaram a meta
  premiosDisponiveis: number; // saldo disponível
  premiosGanho: number;       // total conquistado
  premiosResgatados: number;  // total resgatado
  compras: Compra[];
}

export function useCartaoFidelidade(clienteId?: string, codigoCliente?: string) {
  const [cartoes, setCartoes] = useState<CartaoFidelidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clienteId || !codigoCliente) return;

    const q = query(collection(db, "pedidos"), where("codigoCliente", "==", codigoCliente));
    const unsubscribe = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        setCartoes([]);
        setLoading(false);
        return;
      }

      const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
      const hoje = new Date();
      const cartoesTemp: Record<string, CartaoFidelidade> = {};

      pedidos.forEach((pedido) => {
        // Ignorar pedidos cancelados
        if (pedido.status !== "Entregue") return;

        pedido.produtos?.forEach((p) => {
          const tipo = p.classe || p.nome;
          if (!cartoesTemp[tipo]) {
            cartoesTemp[tipo] = {
              tipo,
              quantidade: 0,
              premiosDisponiveis: 0,
              premiosGanho: 0,
              premiosResgatados: 0,
              compras: [],
            };
          }

          // Validade por tipo
          const validadeMeses = ["estudante", "acai"].includes(tipo) ? 1 : 3;
          const dataCompra = new Date(pedido.data!);
          const limiteData = new Date(dataCompra);
          limiteData.setMonth(limiteData.getMonth() + validadeMeses);

          if (limiteData >= hoje) {
            // Adicionar compra válida
            cartoesTemp[tipo].quantidade += p.quantidade;
            cartoesTemp[tipo].compras.push({
              data: pedido.data!,
              produto: p.nome,
              quantidade: p.quantidade,
            });
          }
        });
      });

      // 🔹 Calcular prêmios por tipo
      const cartoesAtualizados = Object.values(cartoesTemp).map(c => {
        const limite = ["estudante", "acai"].includes(c.tipo) ? 15 : 10;

        const ganhos = Math.floor(c.quantidade / limite); // total de prêmios conquistados
        const restante = c.quantidade % limite;

        return {
          ...c,
          quantidade: restante,
          premiosDisponiveis: ganhos,
          premiosGanho: ganhos,
          premiosResgatados: 0,
        };
      });

      setCartoes(cartoesAtualizados);
      setLoading(false);

      // 🔹 Atualizar documento do cliente
      const clienteRef = doc(db, "clientes", clienteId);
      const clienteSnap = await getDoc(clienteRef);
      if (clienteSnap.exists()) {
        await updateDoc(clienteRef, { cartaoFidelidade: cartoesAtualizados });
      }
    });

    return () => unsubscribe();
  }, [clienteId, codigoCliente]);

  return { cartoes, loading };
}
