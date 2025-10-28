import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pedido } from "@/types";
import { regrasFidelidade, obterRegraFidelidade } from "@/lib/regrasFidelidade";

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

        // 🔹 Busca cliente e seus cartões existentes
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

        // 🔹 Cria um dicionário local baseado nas regras LOCAIS (ignora Firestore)
        const cartoesTemp: Record<string, CartaoFidelidade> = {};
        cartoesExistentes.forEach((c) => {
          const regraLocal = obterRegraFidelidade(c.tipo);
          cartoesTemp[c.tipo] = {
            tipo: c.tipo,
            quantidade: 0,
            limite: regraLocal?.limite ?? 10,
            periodo: regraLocal?.periodo ?? 3,
            cupomGanho: c.cupomGanho || [],
            cupomResgatado: c.cupomResgatado || [],
            saldoCupom: c.saldoCupom || 0,
          };
        });

        const agora = new Date();

        // 🔸 Processa pedidos entregues
        pedidosEntregues.forEach((pedido) => {
          pedido.produtos?.forEach((p) => {
            const classeProduto = norm(p.classe);
            const categoriaProduto = norm((p as any).categoria || "");

            Object.entries(regrasFidelidade).forEach(([nomeCartaoRaw, regra]) => {
              const nomeCartao = norm(nomeCartaoRaw);
              let pertence = false;

              // 🔍 Lógica de correspondência: classe ou categoria
              if (regra.tipo === "classe") {
                if (classeProduto === nomeCartao) pertence = true;
                if (!pertence && regra.categorias?.some(c => norm(c) === classeProduto)) pertence = true;
                if (!pertence && categoriaProduto === nomeCartao) pertence = true;
              } else if (regra.tipo === "categoria") {
                if (regra.categorias?.some(c => norm(c) === categoriaProduto)) pertence = true;
                if (!pertence && regra.categorias?.some(c => norm(c) === classeProduto)) pertence = true;
                if (!pertence && (classeProduto === nomeCartao || categoriaProduto === nomeCartao)) pertence = true;
              }

              if (pertence) {
                const dataPedido = pedido.criadoEm?.toDate
                  ? pedido.criadoEm.toDate()
                  : new Date(pedido.data ?? "");

                let valido = false;

                // 🔸 Verifica se o pedido ainda está dentro do período de validade
                if (regra.periodo === 1) {
                  valido =
                    dataPedido.getMonth() === agora.getMonth() &&
                    dataPedido.getFullYear() === agora.getFullYear();
                } else {
                  const diffMeses =
                    (agora.getFullYear() - dataPedido.getFullYear()) * 12 +
                    (agora.getMonth() - dataPedido.getMonth());
                  valido = diffMeses < regra.periodo;
                }

                if (valido) {
                  // 🔹 Sempre usa a regra local
                  if (!cartoesTemp[nomeCartaoRaw]) {
                    const regraLocal = obterRegraFidelidade(nomeCartaoRaw);
                    cartoesTemp[nomeCartaoRaw] = {
                      tipo: nomeCartaoRaw,
                      quantidade: 0,
                      limite: regraLocal?.limite ?? 10,
                      periodo: regraLocal?.periodo ?? 3,
                      cupomGanho: [],
                      cupomResgatado: [],
                      saldoCupom: 0,
                    };
                  }

                  cartoesTemp[nomeCartaoRaw].quantidade += Number(p.quantidade || 1);
                }
              }
            });
          });
        });

        // 🔸 Gera cupons e calcula saldo
        Object.values(cartoesTemp).forEach((cartao) => {
          const existente = cartoesExistentes.find(c => c.tipo === cartao.tipo);
          const progressoAnterior = existente ? existente.quantidade || 0 : 0;
          const quantidadeTotal = progressoAnterior + cartao.quantidade;

          const totalCuponsEsperados = Math.floor(quantidadeTotal / cartao.limite);
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

          cartao.quantidade = quantidadeTotal % cartao.limite;
          cartao.saldoCupom =
            (cartao.cupomGanho?.length || 0) - (cartao.cupomResgatado?.length || 0);
        });

        const cartoesAtualizados = Object.values(cartoesTemp);
        setCartoes(cartoesAtualizados);
        setLoading(false);

        // 🔹 Atualiza o Firestore se houver mudanças de cupons
        const existenteString = JSON.stringify(
          (clienteData.cartaoFidelidade || []).map(c => ({
            tipo: c.tipo,
            cupomGanhoLen: (c.cupomGanho || []).length,
          }))
        );
        const atualString = JSON.stringify(
          cartoesAtualizados.map(c => ({
            tipo: c.tipo,
            cupomGanhoLen: (c.cupomGanho || []).length,
          }))
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
