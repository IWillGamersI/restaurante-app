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

// Regras de fidelidade
const regrasFidelidade: Record<string, { tipo: "classe" | "categoria"; limite: number; periodo: number; categorias?: string[] }> = {
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
      const cartoesTemp: Record<string, CartaoFidelidade> = {};

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
                  limite: regra.limite,
                  periodo: regra.periodo,
                  cupomGanho: [],
                  cupomResgatado: [],
                  saldoCupom: 0,
                };
              }

              // Soma quantidade de compras
              cartoesTemp[nomeCartao].quantidade += p.quantidade;

              // Gerar cupons automaticamente
              const premiosNovos = Math.floor(cartoesTemp[nomeCartao].quantidade / cartoesTemp[nomeCartao].limite);
              if (premiosNovos > 0) {
                const hoje = new Date();
                for (let i = 0; i < premiosNovos; i++) {
                  cartoesTemp[nomeCartao].cupomGanho.push({
                    codigo: gerarCodigoCupom(nomeCartao),
                    dataGanho: hoje.toISOString(),
                    quantidade: 1,
                  });
                }
                cartoesTemp[nomeCartao].quantidade %= cartoesTemp[nomeCartao].limite;
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
      const clientesRef = collection(db, "clientes");
      const clienteQuery = query(clientesRef, where("codigoCliente", "==", codigoCliente));
      const clienteSnap = await getDocs(clienteQuery);

      if (!clienteSnap.empty) {
        const clienteDoc = clienteSnap.docs[0];
        const clienteRef = doc(db, "clientes", clienteDoc.id);
        await updateDoc(clienteRef, {
          cartaoFidelidade: cartoesAtualizados,
        });
      }
    });

    return () => unsubscribe();
  }, [codigoCliente]);

  // Flag: existe pelo menos um cupom disponível
  const temCupomDisponivel = cartoes.some(c => c.saldoCupom > 0);

  // Função para resgatar cupom pelo código
  const resgatarCupom = async (codigoCupom: string) => {
    if (!codigoCliente || !codigoCupom) return false;

    const clientesRef = collection(db, "clientes");
    const clienteQuery = query(clientesRef, where("codigoCliente", "==", codigoCliente));
    const clienteSnap = await getDocs(clienteQuery);
    if (clienteSnap.empty) return false;

    const clienteDoc = clienteSnap.docs[0];
    const clienteData: any = clienteDoc.data();
    const cartoesCliente: CartaoFidelidade[] = clienteData.cartaoFidelidade || [];

    let cupomEncontrado = false;
    for (let cartao of cartoesCliente) {
      const idx = cartao.cupomGanho.findIndex(c => c.codigo === codigoCupom.toUpperCase());
      if (idx !== -1) {
        const premio = cartao.cupomGanho.splice(idx, 1)[0];
        cartao.cupomResgatado.push({
          codigo: premio.codigo,
          dataGanho: premio.dataGanho,
          dataResgate: new Date().toISOString(),
          quantidade: premio.quantidade,
        });
        cartao.saldoCupom = cartao.cupomGanho.length - cartao.cupomResgatado.length;
        cupomEncontrado = true;
        break;
      }
    }

    if (!cupomEncontrado) return false;

    const clienteRef = doc(db, "clientes", clienteDoc.id);
    await updateDoc(clienteRef, { cartaoFidelidade: cartoesCliente });
    setCartoes(cartoesCliente);

    return true;
  };

  return { cartoes, loading, temCupomDisponivel, resgatarCupom };
}
