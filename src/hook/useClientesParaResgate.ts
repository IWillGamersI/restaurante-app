import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCartaoFidelidadeDoCliente } from "@/lib/getCartaoFidelidadeDoCliente";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  codigoCliente: string;
}

interface CartaoResumo {
  tipo: string;
  quantidade: number;
  saldoCupom?: number;
}

interface ClienteComCartoes extends Cliente {
  cartoes: CartaoResumo[];
}

export function useClientesParaResgate() {
  const [clientesComCupons, setClientesComCupons] = useState<ClienteComCartoes[]>([]);
  const [clientesComPontosSuficientes, setClientesComPontosSuficientes] = useState<ClienteComCartoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const carregar = async () => {
      setLoading(true);
      setError(null);

      try {
        const snap = await getDocs(collection(db, "clientes"));
        const clientes = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Cliente[];

        const resultados = await Promise.all(
          clientes.map(async (cliente) => {
            try {
              const cartoes = await getCartaoFidelidadeDoCliente(cliente.codigoCliente);
              const cartoesResumo: CartaoResumo[] = Array.isArray(cartoes)
                ? cartoes.map(c => ({
                    tipo: c.tipo,
                    quantidade: c.quantidade || 0,
                    saldoCupom: c.saldoCupom || 0
                  }))
                : [];
              return { cliente, cartoes: cartoesResumo };
            } catch (err) {
              console.error("Erro ao obter cartões para cliente", cliente.codigoCliente, err);
              return { cliente, cartoes: [] };
            }
          })
        );

        const comCupom: ClienteComCartoes[] = [];
        const comPontos: ClienteComCartoes[] = [];

        resultados.forEach(({ cliente, cartoes }) => {
          const temCupom = cartoes.some(c => (c.saldoCupom || 0) > 0);
          const temPontosSuficientes = cartoes.some(c => (c.quantidade || 0) >= 6);

          const clienteComCartoes: ClienteComCartoes = { ...cliente, cartoes };

          if (temCupom) comCupom.push(clienteComCartoes);
          else if (temPontosSuficientes) comPontos.push(clienteComCartoes);
        });

        if (mounted) {
          setClientesComCupons(comCupom);
          setClientesComPontosSuficientes(comPontos);
        }
      } catch (err: any) {
        console.error("Erro ao carregar clientes para resgate:", err);
        if (mounted) setError(err?.message || "Erro desconhecido");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    carregar();
    return () => { mounted = false; };
  }, []);

  return { clientesComCupons, clientesComPontosSuficientes, loading, error };
}
