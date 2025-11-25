import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCartaoFidelidadeDoCliente } from "@/lib/getCartaoFidelidadeDoCliente";

interface Cliente {
  id: string;
  nome?: string;
  telefone?: string;
  codigoCliente?: string;
  cartaoFidelidade?: any[];
}

interface CartaoProcessado {
  tipo: string;
  quantidade: number;
  limite: number | null;
  periodo?: number | null;
  cupomGanho: any[];
  cupomResgatado: any[];
  saldoCupom: number;
}

interface ClienteComCartoes extends Cliente {
  cartoes: CartaoProcessado[];
}

const DEFAULT_PONTOS_THRESHOLD = 7; // você pode ajustar para 6, 7, etc.

function toNumberSafe(v: any, fallback = 0) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "number") return isNaN(v) ? fallback : v;
  const parsed = Number(v);
  return isNaN(parsed) ? fallback : parsed;
}

export function useClientesParaResgate({ pontosThreshold = DEFAULT_PONTOS_THRESHOLD } = {}) {
  const [clientesComCupons, setClientesComCupons] = useState<ClienteComCartoes[]>([]);
  const [clientesComPontosSuficientes, setClientesComPontosSuficientes] = useState<ClienteComCartoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "clientes"),
      async (snap) => {
        try {
          if (snap.empty) {
            setClientesComCupons([]);
            setClientesComPontosSuficientes([]);
            setLoading(false);
            return;
          }

          const clientesDocs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Cliente[];

          const resultados = await Promise.all(
            clientesDocs.map(async (cliente) => {
              // tenta obter via helper (o mesmo usado pelo dashboard do cliente)
              let cartoesRaw: any[] = [];
              try {
                if (cliente.codigoCliente) {
                  const fromHelper = await getCartaoFidelidadeDoCliente(cliente.codigoCliente);
                  if (Array.isArray(fromHelper) && fromHelper.length > 0) {
                    cartoesRaw = fromHelper;
                  }
                }
              } catch (err) {
                console.warn("getCartaoFidelidadeDoCliente falhou para", cliente.codigoCliente, err);
              }

              // fallback: se helper não retornou nada, usa o que já está no documento do cliente
              if ((!cartoesRaw || cartoesRaw.length === 0) && Array.isArray(cliente.cartaoFidelidade)) {
                cartoesRaw = cliente.cartaoFidelidade;
              }

              // se ainda vazio, retorna cliente sem cartões
              if (!Array.isArray(cartoesRaw) || cartoesRaw.length === 0) {
                // log útil para depuração
                console.debug("Cliente sem cartoes (ou inválido):", { id: cliente.id, codigoCliente: cliente.codigoCliente });
                return { ...cliente, cartoes: [] as CartaoProcessado[] };
              }

              // processa e normaliza cada cartão
              const cartoesProcessados: CartaoProcessado[] = cartoesRaw.map((c: any) => {
                const ganhos = Array.isArray(c.cupomGanho) ? c.cupomGanho.length : 0;
                const resgatados = Array.isArray(c.cupomResgatado) ? c.cupomResgatado.length : 0;
                const saldo = Math.max(0, ganhos - resgatados);

                const quantidade = toNumberSafe(c.quantidade, 0);
                const limite = c.limite !== undefined && c.limite !== null ? toNumberSafe(c.limite, undefined) : null;

                return {
                  tipo: c.tipo ?? c.tipoCartao ?? "desconhecido",
                  quantidade,
                  limite,
                  periodo: c.periodo ?? null,
                  cupomGanho: Array.isArray(c.cupomGanho) ? c.cupomGanho : [],
                  cupomResgatado: Array.isArray(c.cupomResgatado) ? c.cupomResgatado : [],
                  saldoCupom: saldo,
                } as CartaoProcessado;
              });

              return { ...cliente, cartoes: cartoesProcessados } as ClienteComCartoes;
            })
          );

          // agora filtra:
          const comCupom = resultados.filter(cliente =>
            cliente.cartoes.some(cartao => (cartao.saldoCupom || 0) > 0)
          );

          // ponto-suficiente: se o cartão tiver limite, usa 60% do limite como threshold (ou o pontosThreshold)
          const comPontos = resultados.filter(cliente =>
            cliente.cartoes.some(cartao => {
              const lim = cartao.limite;
              if (lim && typeof lim === "number" && lim > 0) {
                return cartao.quantidade >= Math.ceil(lim * 0.6) || cartao.quantidade >= pontosThreshold;
              }
              return cartao.quantidade >= pontosThreshold;
            })
          );

          // Remove duplicados caso algum cliente apareça nos dois arrays (só por segurança)
          const comCupomIds = new Set(comCupom.map(c => c.id));
          const comPontosFiltrado = comPontos.filter(c => !comCupomIds.has(c.id));

          setClientesComCupons(comCupom);
          setClientesComPontosSuficientes(comPontosFiltrado);
          setLoading(false);
        } catch (err: any) {
          console.error("Erro ao processar clientes:", err);
          setError(err.message || "Erro desconhecido");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Erro no snapshot clientes:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pontosThreshold]);

  return { clientesComCupons, clientesComPontosSuficientes, loading, error };
}
