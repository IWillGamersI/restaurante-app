import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pedido } from "@/types";

export interface Compra {
  data: string;
  produto: string;
  quantidade: number;
  categoria?: string
}

export interface CartaoFidelidade {
  tipo: string; // Nome do cartão (ex.: Pizza, Menu Estudante, Açai)
  quantidade: number; // progresso atual
  premiosDisponiveis: number; // saldo disponível
  premiosGanho: number; // total conquistado
  premiosResgatados: number; // total resgatado
  compras: Compra[];
}

// 🔹 Regras de fidelidade (categoria OU classe)
const regrasFidelidade: {
  [key: string]: { tipo: "classe" | "categoria"; limite: number; categorias?: string[] };
} = {
  Pizza: { tipo: "categoria", limite: 10, categorias: ["pizza-individual", "pizza-tradicional"] },
  estudante: { tipo: "classe", limite: 15 },
  acai: { tipo: "classe", limite: 15 },
  massa: { tipo: "classe", limite: 10 },
  prato: { tipo: "classe", limite: 10 },
  pizza: { tipo: "classe", limite: 10 },
};

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

      const pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Pedido[];
      const cartoesTemp: Record<string, CartaoFidelidade> = {};

      pedidos.forEach((pedido) => {
        if (pedido.status === "Cancelado") return; // Ignora pedidos cancelados

        pedido.produtos?.forEach((p) => {
          // Verifica em qual cartão esse produto entra
          Object.entries(regrasFidelidade).forEach(([nomeCartao, regra]) => {
            let pertence = false;

            if (regra.tipo === "classe" && p.classe === nomeCartao) {
              pertence = true;
            }

            if (regra.tipo === "categoria" && regra.categorias?.includes(p.classe || "")) {
              pertence = true;
            }

            if (pertence) {
              if (!cartoesTemp[nomeCartao]) {
                cartoesTemp[nomeCartao] = {
                  tipo: nomeCartao,
                  quantidade: 0,
                  premiosDisponiveis: 0,
                  premiosGanho: 0,
                  premiosResgatados: 0,
                  compras: [],
                };
              }

              cartoesTemp[nomeCartao].quantidade += p.quantidade;
              cartoesTemp[nomeCartao].compras.push({
                data: pedido.data!,
                produto: p.nome,
                quantidade: p.quantidade,
                categoria: p.categoria,
              });
            }
          });
        });
      });

      // 🔹 Calcular prêmios com base no limite de cada regra
      const cartoesAtualizados = Object.entries(cartoesTemp).map(([nome, c]) => {
        const limite = regrasFidelidade[nome].limite;

        const ganhos = Math.floor(c.quantidade / limite);
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
        await updateDoc(clienteRef, {
          cartaoFidelidade: cartoesAtualizados,
        });
      }
    });

    return () => unsubscribe();
  }, [clienteId, codigoCliente]);

  return { cartoes, loading };
}
