import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pedido } from "@/types";

export interface Cupom {
  codigo: string;
  dataGanho: string;
  dataResgate?: string;
  quantidade: number;
}

export interface CartaoFidelidade {
  tipo: string;
  quantidade: number;
  limite: number;
  periodo: number;
  cupomGanho: Cupom[];
  cupomResgatado: Cupom[];
  saldoCupom: number;
}

const regrasFidelidade: Record<
  string,
  { tipo: "classe" | "categoria"; limite: number; periodo: number; categorias?: string[] }
> = {
  Pizza: { tipo: "categoria", limite: 10, periodo: 3, categorias: ["pizza-individual", "pizza-tradicional"] },
  estudante: { tipo: "classe", limite: 15, periodo: 1 },
  acai: { tipo: "classe", limite: 15, periodo: 1 },
  massa: { tipo: "classe", limite: 10, periodo: 3 },
  prato: { tipo: "classe", limite: 10, periodo: 3 },
  pizza: { tipo: "classe", limite: 10, periodo: 3 },
};

function gerarCodigoCupom(tipo: string) {
  return tipo.toUpperCase() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();
}

export function useCartaoFidelidade(codigoCliente?: string) {
  const [cartoes, setCartoes] = useState<CartaoFidelidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!codigoCliente) return;

    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, where("codigoCliente", "==", codigoCliente));

    const unsubscribe = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        setCartoes([]);
        setLoading(false);
        return;
      }

      const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
      const pedidosEntregues = pedidos.filter(p => p.status === "Entregue");

      // 🔹 Recupera cartões já existentes do cliente
      const clientesRef = collection(db, "clientes");
      const clienteQuery = query(clientesRef, where("codigoCliente", "==", codigoCliente));
      const clienteSnap = await getDocs(clienteQuery);

      if (clienteSnap.empty) {
        setCartoes([]);
        setLoading(false);
        return;
      }

      const clienteDoc = clienteSnap.docs[0];
      const clienteData: any = clienteDoc.data();
      const cartoesExistentes: CartaoFidelidade[] = clienteData.cartaoFidelidade || [];

      const cartoesTemp: Record<string, CartaoFidelidade> = {};

      pedidosEntregues.forEach(pedido => {
        pedido.produtos?.forEach(p => {
          Object.entries(regrasFidelidade).forEach(([nomeCartao, regra]) => {
            let pertence = false;
            if (regra.tipo === "classe" && p.classe === nomeCartao) pertence = true;
            if (regra.tipo === "categoria" && regra.categorias?.includes(p.classe || "")) pertence = true;

            if (pertence) {
              if (!cartoesTemp[nomeCartao]) {
                // 🔹 Tenta reaproveitar cartão existente
                const existente = cartoesExistentes.find(c => c.tipo === nomeCartao);

                cartoesTemp[nomeCartao] = {
                  tipo: nomeCartao,
                  quantidade: 0,
                  limite: regra.limite,
                  periodo: regra.periodo,
                  cupomGanho: existente?.cupomGanho || [],
                  cupomResgatado: existente?.cupomResgatado || [],
                  saldoCupom: existente?.saldoCupom || 0,
                };
              }

              cartoesTemp[nomeCartao].quantidade += p.quantidade;
            }
          });
        });
      });

      // 🔹 Agora gera só cupons adicionais
      Object.values(cartoesTemp).forEach(cartao => {
        const totalCuponsEsperados = Math.floor(cartao.quantidade / cartao.limite);
        const totalCuponsAtuais = cartao.cupomGanho.length;

        if (totalCuponsEsperados > totalCuponsAtuais) {
          const novos = totalCuponsEsperados - totalCuponsAtuais;
          for (let i = 0; i < novos; i++) {
            cartao.cupomGanho.push({
              codigo: gerarCodigoCupom(cartao.tipo),
              dataGanho: new Date().toISOString(),
              quantidade: 1,
            });
          }
        }

        cartao.quantidade %= cartao.limite;
        cartao.saldoCupom = cartao.cupomGanho.length - cartao.cupomResgatado.length;
      });

      const cartoesAtualizados = Object.values(cartoesTemp);
      setCartoes(cartoesAtualizados);
      setLoading(false);

      // 🔹 Atualiza Firestore com a versão recalculada/preservada
      const clienteRef = doc(db, "clientes", clienteDoc.id);
      await updateDoc(clienteRef, { cartaoFidelidade: cartoesAtualizados });
    });

    return () => unsubscribe();
  }, [codigoCliente]);

  const temCupomDisponivel = cartoes.some(c => c.saldoCupom > 0);

  return { cartoes, loading, temCupomDisponivel };
}
