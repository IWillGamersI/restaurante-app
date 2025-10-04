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
  quantidade: number;            // total de compras do período
  quantidadeAcumulada: number;   // total já contabilizado para cupons
  limite: number;
  periodo: number;
  cupomGanho: Cupom[];
  cupomResgatado: Cupom[];
  saldoCupom: number;
}

// Regras de fidelidade
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

// Função para gerar código único
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

      // Recupera cartaoFidelidade atual do cliente
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
      const cartoesAtuais: CartaoFidelidade[] = clienteData.cartaoFidelidade || [];

      const cartoesTemp: Record<string, CartaoFidelidade> = {};
      cartoesAtuais.forEach(c => {
        cartoesTemp[c.tipo] = { ...c };
      });

      // Calcula quantidade e cupons
      pedidos.forEach(pedido => {
        if (pedido.status === "Cancelado") return;

        pedido.produtos?.forEach(p => {
          Object.entries(regrasFidelidade).forEach(([nomeCartao, regra]) => {
            let pertence = false;
            if (regra.tipo === "classe" && p.classe === nomeCartao) pertence = true;
            if (regra.tipo === "categoria" && regra.categorias?.includes(p.classe || "")) pertence = true;

            if (pertence) {
              if (!cartoesTemp[nomeCartao]) {
                cartoesTemp[nomeCartao] = {
                  tipo: nomeCartao,
                  quantidade: 0,
                  quantidadeAcumulada: 0,
                  limite: regra.limite,
                  periodo: regra.periodo,
                  cupomGanho: [],
                  cupomResgatado: [],
                  saldoCupom: 0,
                };
              }

              // Soma quantidade de compras
              cartoesTemp[nomeCartao].quantidade += p.quantidade;

              // Calcula quantidade disponível para novos cupons
              const comprasParaContabilizar =
                cartoesTemp[nomeCartao].quantidade - (cartoesTemp[nomeCartao].quantidadeAcumulada || 0);
              const cuponsNovos = Math.floor(comprasParaContabilizar / cartoesTemp[nomeCartao].limite);

              if (cuponsNovos > 0) {
                const hoje = new Date().toISOString();
                for (let i = 0; i < cuponsNovos; i++) {
                  cartoesTemp[nomeCartao].cupomGanho.push({
                    codigo: gerarCodigoCupom(nomeCartao),
                    dataGanho: hoje,
                    quantidade: 1,
                  });
                }

                // Atualiza quantidade acumulada
                cartoesTemp[nomeCartao].quantidadeAcumulada =
                  (cartoesTemp[nomeCartao].quantidadeAcumulada || 0) + cuponsNovos * cartoesTemp[nomeCartao].limite;
              }

              // Atualiza saldo
              cartoesTemp[nomeCartao].saldoCupom =
                cartoesTemp[nomeCartao].cupomGanho.length - cartoesTemp[nomeCartao].cupomResgatado.length;
            }
          });
        });
      });

      const cartoesAtualizados = Object.values(cartoesTemp);
      setCartoes(cartoesAtualizados);
      setLoading(false);

      // Atualiza Firestore
      const clienteRef = doc(db, "clientes", clienteDoc.id);
      await updateDoc(clienteRef, { cartaoFidelidade: cartoesAtualizados });
    });

    return () => unsubscribe();
  }, [codigoCliente]);

  const temCupomDisponivel = cartoes.some(c => c.saldoCupom > 0);

  return { cartoes, loading, temCupomDisponivel };
}
