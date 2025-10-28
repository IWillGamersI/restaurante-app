import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pedido } from "@/types";
import { regrasFidelidade, obterRegraFidelidade } from "@/lib/regrasFidelidade"; // 👈 Importa as regras externas

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

        // PRE-POPULA cartoesTemp com os existentes, mas usando regras LOCAIS
        const cartoesTemp: Record<string, CartaoFidelidade> = {};
        cartoesExistentes.forEach(c => {
          const regraLocal = obterRegraFidelidade(c.tipo) || { limite: c.limite, periodo: c.periodo };
          cartoesTemp[c.tipo] = {
            tipo: c.tipo,
            quantidade: 0,
            limite: regraLocal.limite,
            periodo: regraLocal.periodo,
            cupomGanho: c.cupomGanho || [],
            cupomResgatado: c.cupomResgatado || [],
            saldoCupom: c.saldoCupom || 0,
          };
        });

        const agora = new Date();

        // Processa pedidos entregues e incrementa contadores
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

        // Gera cupons e calcula saldo
        Object.values(cartoesTemp).forEach(cartao => {
          // 🧮 Soma progresso anterior com o atual
          const existente = cartoesExistentes.find(c => c.tipo === cartao.tipo);
          const progressoAnterior = existente ? existente.quantidade || 0 : 0;
          const quantidadeTotal = progressoAnterior + cartao.quantidade;

          // Calcula quantos cupons deveriam existir
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

          // Atualiza o progresso dentro do limite
          cartao.quantidade = quantidadeTotal % cartao.limite;
          cartao.saldoCupom = (cartao.cupomGanho?.length || 0) - (cartao.cupomResgatado?.length || 0);
        });


        const cartoesAtualizados = Object.values(cartoesTemp);
        setCartoes(cartoesAtualizados);
        setLoading(false);

        // Atualiza Firestore se houver diferença
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
