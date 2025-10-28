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
  estudante: { tipo: "classe", limite: 12, periodo: 1 },
  acai: { tipo: "classe", limite: 12, periodo: 1 },
  massa: { tipo: "classe", limite: 10, periodo: 3 },
  prato: { tipo: "classe", limite: 10, periodo: 3 },
};

const norm = (v?: string) => (v ? String(v).toLowerCase().trim() : "");
const gerarCodigoCupom = (tipo: string) =>
  tipo.toUpperCase() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();

/**
 * Calcula os cartões de fidelidade com base nos pedidos entregues e regras locais.
 */
function calcularCartoesFidelidade(pedidosEntregues: Pedido[], cartoesExistentes: CartaoFidelidade[]): CartaoFidelidade[] {
  const agora = new Date();
  const cartoesTemp: Record<string, CartaoFidelidade> = {};

  // Preenche cartões existentes sem puxar limite/periodo do Firestore
  cartoesExistentes.forEach(c => {
    const regra = regrasFidelidade[c.tipo] || { limite: c.limite, periodo: c.periodo, tipo: "classe" as const };
    cartoesTemp[c.tipo] = {
      tipo: c.tipo,
      quantidade: 0,
      limite: regra.limite,
      periodo: regra.periodo,
      cupomGanho: c.cupomGanho || [],
      cupomResgatado: c.cupomResgatado || [],
      saldoCupom: c.saldoCupom || 0,
    };
  });

  // Aplica as regras locais a todos os pedidos entregues
  pedidosEntregues.forEach(pedido => {
    pedido.produtos?.forEach(p => {
      const classeProduto = norm(p.classe);
      const categoriaProduto = norm((p as any).categoria || "");

      Object.entries(regrasFidelidade).forEach(([nomeCartaoRaw, regra]) => {
        const nomeCartao = norm(nomeCartaoRaw);
        let pertence = false;

        if (regra.tipo === "classe") {
          pertence =
            classeProduto === nomeCartao ||
            regra.categorias?.some(c => norm(c) === classeProduto) ||
            categoriaProduto === nomeCartao;
        } else if (regra.tipo === "categoria") {
          pertence =
            regra.categorias?.some(c => norm(c) === categoriaProduto) ||
            regra.categorias?.some(c => norm(c) === classeProduto) ||
            classeProduto === nomeCartao ||
            categoriaProduto === nomeCartao;
        }

        if (!pertence) return;

        const dataPedido = pedido.criadoEm?.toDate ? pedido.criadoEm.toDate() : new Date(pedido.data ?? "");
        let valido = false;

        if (regra.periodo === 1) {
          valido = dataPedido.getMonth() === agora.getMonth() && dataPedido.getFullYear() === agora.getFullYear();
        } else {
          const diffMeses = (agora.getFullYear() - dataPedido.getFullYear()) * 12 + (agora.getMonth() - dataPedido.getMonth());
          valido = diffMeses < regra.periodo;
        }

        if (!valido) return;

        if (!cartoesTemp[nomeCartaoRaw]) {
          cartoesTemp[nomeCartaoRaw] = {
            tipo: nomeCartaoRaw,
            quantidade: 0,
            limite: regra.limite,
            periodo: regra.periodo,
            cupomGanho: [],
            cupomResgatado: [],
            saldoCupom: 0,
          };
        }

        cartoesTemp[nomeCartaoRaw].quantidade += Number(p.quantidade || 1);
      });
    });
  });

  // Gera cupons e calcula saldo
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

    cartao.quantidade = cartao.quantidade % cartao.limite;
    cartao.saldoCupom = (cartao.cupomGanho?.length || 0) - (cartao.cupomResgatado?.length || 0);
  });

  return Object.values(cartoesTemp);
}

/**
 * Hook React: busca dados do Firebase e calcula fidelidade localmente
 */
export function useCartaoFidelidade(codigoCliente?: string) {
  const [cartoes, setCartoes] = useState<CartaoFidelidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!codigoCliente) return;

    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, where("codigoCliente", "==", codigoCliente));

    const unsubscribe = onSnapshot(q, async (snap) => {
      try {
        if (snap.empty) {
          setCartoes([]);
          setLoading(false);
          return;
        }

        const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
        const pedidosEntregues = pedidos.filter(p => p.status === "Entregue");

        // Busca cliente e cartões existentes
        const clienteSnap = await getDocs(query(collection(db, "clientes"), where("codigoCliente", "==", codigoCliente)));
        if (clienteSnap.empty) {
          setCartoes([]);
          setLoading(false);
          return;
        }

        const clienteDoc = clienteSnap.docs[0];
        const clienteData: any = clienteDoc.data();
        const cartoesExistentes: CartaoFidelidade[] = clienteData.cartaoFidelidade || [];

        // 🧮 Calcula localmente (sem depender do Firestore)
        const cartoesAtualizados = calcularCartoesFidelidade(pedidosEntregues, cartoesExistentes);

        setCartoes(cartoesAtualizados);
        setLoading(false);

        // Atualiza o Firestore apenas se houver mudanças
        const mudou = JSON.stringify(cartoesExistentes) !== JSON.stringify(cartoesAtualizados);
        if (mudou) {
          await updateDoc(doc(db, "clientes", clienteDoc.id), { cartaoFidelidade: cartoesAtualizados });
        }
      } catch (err) {
        console.error("Erro em useCartaoFidelidade:", err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [codigoCliente]);

  const temCupomDisponivel = cartoes.some(c => c.saldoCupom > 0);

  return { cartoes, loading, temCupomDisponivel };
}
