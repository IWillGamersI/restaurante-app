'use client'

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCartaoFidelidadeDoCliente } from "@/lib/getCartaoFidelidadeDoCliente";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  codigoCliente: string;
}

interface Cartao {
  tipo: string;
  quantidade: number;
  limite: number;
  periodo: number;
  cupomGanho: any[];
  cupomResgatado: any[];
  saldoCupom: number;
}

interface ClienteComCartoes extends Cliente {
  cartoes: Cartao[];
}

export default function useClientesParaResgate() {
  const [clientesComCupons, setClientesComCupons] = useState<ClienteComCartoes[]>([]);
  const [clientesComPontosSuficientes, setClientesComPontosSuficientes] = useState<ClienteComCartoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 🔹 Escuta mudanças em tempo real nos clientes
    const unsubscribe = onSnapshot(
      collection(db, "clientes"),
      async (snap) => {
        try {
          const clientes = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Cliente[];

          const resultados = await Promise.all(
            clientes.map(async (cliente) => {
              try {
                // 🔹 Usa a mesma função do dashboard do cliente
                const cartoes = await getCartaoFidelidadeDoCliente(cliente.codigoCliente);
                const cartoesProcessados = cartoes.map((c: any) => {
                  const ganhos = c.cupomGanho?.length || 0;
                  const resgatados = c.cupomResgatado?.length || 0;
                  const saldo = ganhos - resgatados;
                  return {
                    ...c,
                    saldoCupom: saldo >= 0 ? saldo : 0,
                  };
                });
                return { ...cliente, cartoes: cartoesProcessados };
              } catch (err) {
                console.error("Erro ao obter cartões de", cliente.codigoCliente, err);
                return { ...cliente, cartoes: [] };
              }
            })
          );

          const comCupom = resultados.filter(c =>
            c.cartoes.some(cartao => cartao.saldoCupom > 0)
          );

          const comPontos = resultados.filter(c =>
            c.cartoes.some(cartao => cartao.quantidade >= (cartao.limite ?? 12))
          );

          setClientesComCupons(comCupom);
          setClientesComPontosSuficientes(comPontos);
          setLoading(false);
        } catch (err: any) {
          console.error("Erro ao carregar clientes:", err);
          setError(err.message || "Erro desconhecido");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Erro no snapshot:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { clientesComCupons, clientesComPontosSuficientes, loading, error };
}
