'use client'

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
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

        // 🔹 Converte pedidos do Firestore para o tipo Pedido e transforma criadoEm em Date
        const pedidos: Pedido[] = snap.docs.map(d => {
          const data = d.data() as Pedido;
          const criadoEm = data.criadoEm instanceof Timestamp ? data.criadoEm.toDate() : new Date(data.criadoEm || Date.now());
          return { ...data, id: d.id, criadoEm };
        });

        // 🔹 Filtra apenas pedidos entregues
        const pedidosEntregues = pedidos.filter(p => p.status === "Entregue");

        // 🔹 Busca cliente
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

        // 🔹 Inicializa cartões temporários usando apenas regras locais
        const cartoesTemp: Record<string, CartaoFidelidade> = {};
        Object.keys(regrasFidelidade).forEach(nomeCartao => {
          const regra = obterRegraFidelidade(nomeCartao)!;
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
        });

        const agora = new Date();

        // 🔸 Processa pedidos entregues
        pedidosEntregues.forEach(pedido => {
          pedido.produtos?.forEach(produto => {
            const classeProduto = norm(produto.classe);

            Object.entries(regrasFidelidade).forEach(([nomeCartao, regra]) => {
              const nomeCartaoNorm = nomeCartao.toLowerCase();
              if (classeProduto === nomeCartaoNorm) {
                const dataPedido = pedido.criadoEm;

                // 🔹 Verifica período de validade
                let valido = false;
                if (regra.periodo === 1) {
                  valido = dataPedido.getMonth() === agora.getMonth() && dataPedido.getFullYear() === agora.getFullYear();
                } else {
                  const diffMeses = (agora.getFullYear() - dataPedido.getFullYear()) * 12 + (agora.getMonth() - dataPedido.getMonth());
                  valido = diffMeses < regra.periodo;
                }

                if (valido) {
                  cartoesTemp[nomeCartao].quantidade += Number(produto.quantidade || 1);
                }
              }
            });
          });
        });

        // 🔸 Gera cupons e calcula saldo
        Object.values(cartoesTemp).forEach(cartao => {
          const quantidadeTotal = cartao.quantidade;
          const totalCuponsEsperados = Math.floor(quantidadeTotal / cartao.limite);

          // ❌ Não zerar os cupons antigos
          // cartao.cupomGanho = [];

          // Apenas adiciona cupons faltando
          const cuponsExistentes = cartao.cupomGanho || [];
          const faltando = totalCuponsEsperados - cuponsExistentes.length;

          for (let i = 0; i < faltando; i++) {
            cuponsExistentes.push({
              codigo: gerarCodigoCupom(cartao.tipo),
              dataGanho: new Date().toISOString(),
              quantidade: 1,
            });
          }

          cartao.cupomGanho = cuponsExistentes;
          cartao.quantidade = quantidadeTotal % cartao.limite;
          cartao.saldoCupom = cartao.cupomGanho.length - (cartao.cupomResgatado?.length || 0);
        });


        const cartoesAtualizados = Object.values(cartoesTemp);
        setCartoes(cartoesAtualizados);
        setLoading(false);

        // 🔹 Atualiza Firestore se houver mudanças
        const existenteString = JSON.stringify(
          (clienteData.cartaoFidelidade || []).map(c => ({ tipo: c.tipo, cupomGanhoLen: (c.cupomGanho || []).length }))
        );
        const atualString = JSON.stringify(
          cartoesAtualizados.map(c => ({ tipo: c.tipo, cupomGanhoLen: c.cupomGanho.length }))
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
