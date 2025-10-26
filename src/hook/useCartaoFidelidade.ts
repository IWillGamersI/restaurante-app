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
  quantidade: number;       // pontos/itens acumulados no período
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

function gerarCodigoCupom(tipo: string) {
  return tipo.toUpperCase() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();
}

const norm = (v?: string) => (v ? String(v).toLowerCase().trim() : "");

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

        // Recupera cartões já existentes do cliente
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

        // PRE-POPULA cartoesTemp com os existentes
        const cartoesTemp: Record<string, CartaoFidelidade> = {};
        cartoesExistentes.forEach(c => {
          cartoesTemp[c.tipo] = {
            tipo: c.tipo,
            quantidade: 0,
            limite: c.limite,
            periodo: c.periodo,
            cupomGanho: c.cupomGanho || [],
            cupomResgatado: c.cupomResgatado || [],
            saldoCupom: c.saldoCupom || 0,
          };
        });

        const agora = new Date();

        // Processa pedidos entregues e incrementa contadores nos cartões apropriados
        pedidosEntregues.forEach(pedido => {
          pedido.produtos?.forEach(p => {
            const classeProduto = norm(p.classe);
            const categoriaProduto = norm((p as any).categoria || "");

            Object.entries(regrasFidelidade).forEach(([nomeCartaoRaw, regra]) => {
              const nomeCartao = norm(nomeCartaoRaw);
              let pertence = false;

              if (regra.tipo === "classe") {
                if (classeProduto && classeProduto === nomeCartao) pertence = true;
                if (!pertence && regra.categorias?.some(c => norm(c) === classeProduto)) pertence = true;
                if (!pertence && categoriaProduto && categoriaProduto === nomeCartao) pertence = true;
              } else if (regra.tipo === "categoria") {
                if (categoriaProduto && regra.categorias?.some(c => norm(c) === categoriaProduto)) pertence = true;
                if (!pertence && classeProduto && regra.categorias?.some(c => norm(c) === classeProduto)) pertence = true;
                if (!pertence && (classeProduto === nomeCartao || categoriaProduto === nomeCartao)) pertence = true;
              }

              if (pertence) {
                const dataPedido = pedido.criadoEm?.toDate
                  ? pedido.criadoEm.toDate()
                  : new Date(pedido.data ?? "");

                let valido = false;

                if (regra.periodo === 1) {
                  valido =
                    dataPedido.getMonth() === agora.getMonth() &&
                    dataPedido.getFullYear() === agora.getFullYear();
                } else {
                  // Comparação robusta baseada em diferença de meses
                  const diffMeses =
                    (agora.getFullYear() - dataPedido.getFullYear()) * 12 +
                    (agora.getMonth() - dataPedido.getMonth());
                  valido = diffMeses < regra.periodo;
                }

                if (valido) {
                  if (!cartoesTemp[nomeCartaoRaw]) {
                    const existente = cartoesExistentes.find(c => norm(c.tipo) === nomeCartao);
                    cartoesTemp[nomeCartaoRaw] = {
                      tipo: nomeCartaoRaw,
                      quantidade: 0,
                      limite: regra.limite,
                      periodo: regra.periodo,
                      cupomGanho: existente?.cupomGanho || [],
                      cupomResgatado: existente?.cupomResgatado || [],
                      saldoCupom: existente?.saldoCupom || 0,
                    };
                  }

                  cartoesTemp[nomeCartaoRaw].quantidade += Number(p.quantidade || 1);
                }
              }
            });
          });
        });

        // Gera cupons adicionais e calcula saldo
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

        const cartoesAtualizados = Object.values(cartoesTemp);
        setCartoes(cartoesAtualizados);
        setLoading(false);

        // Atualiza Firestore apenas se houver diferença simples
        const existenteString = JSON.stringify(
          (clienteData.cartaoFidelidade || []).map(c => ({ tipo: c.tipo, cupomGanhoLen: (c.cupomGanho||[]).length }))
        );
        const atualString = JSON.stringify(
          cartoesAtualizados.map(c => ({ tipo: c.tipo, cupomGanhoLen: (c.cupomGanho||[]).length }))
        );
        if (existenteString !== atualString) {
          const clienteRef = doc(db, "clientes", clienteDoc.id);
          await updateDoc(clienteRef, { cartaoFidelidade: cartoesAtualizados });
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
