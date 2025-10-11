import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useState, useEffect } from "react";

export interface Cupom {
  codigo: string;
  dataGanho: string;
  dataResgate?: string;
  quantidade: number;
  tipo: string;
}

export function useResgateCupom(codigoCliente?: string) {
  const [cuponsDisponiveis, setCuponsDisponiveis] = useState<Cupom[]>([]);
  const [cuponsSelecionados, setCuponsSelecionados] = useState<Cupom[]>([]);

  const limparCuponsSelecionados = () => setCuponsSelecionados([]);



  const carregarCupons = async () => {
    if (!codigoCliente) return;

    console.log("🔍 Buscando cupons para:", codigoCliente);

    // Buscar cliente pelo campo codigoCliente
    const q = query(
      collection(db, "clientes"),
      where("codigoCliente", "==", codigoCliente)
    );

    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      console.log("❌ Nenhum cliente encontrado com esse codigoCliente:", codigoCliente);
      return;
    }

    // Pega o primeiro resultado (se só existe 1 cliente por código)
    const clienteData: any = querySnap.docs[0].data();
    
    const cartoes = clienteData.cartaoFidelidade || [];
    
    // Extrai cupons
    const ganhos = cartoes.flatMap((cartao: any) =>
      (cartao.cupomGanho || []).map((c: any) => ({
        ...c,
        tipo: cartao.tipo,
      }))
    );

    setCuponsDisponiveis(ganhos);
  };



  // 🔹 Sempre que muda codigoCliente, recarrega cupons
  useEffect(() => {
    console.log('Código do cliente mudou:', codigoCliente);
    if (codigoCliente) {
      carregarCupons();
    }
  }, [codigoCliente]);

  useEffect(() => {
    console.log('Cupons disponíveis:', cuponsDisponiveis);
  }, [cuponsDisponiveis]);


  const toggleCupom = (cupom: Cupom) => {
    setCuponsSelecionados((prev) => {
      const existeMesmoTipo = prev.find((c) => c.tipo === cupom.tipo);

      if (existeMesmoTipo) {
        if (existeMesmoTipo.codigo === cupom.codigo) {
          return prev.filter((c) => c.codigo !== cupom.codigo);
        }
        return prev.map((c) => (c.tipo === cupom.tipo ? cupom : c));
      }

      return [...prev, cupom];
    });
  };

  const resgatarCupons = async () => {
    if (!codigoCliente || cuponsSelecionados.length === 0) return;

    // Buscar cliente pelo campo codigoCliente
    const q = query(
      collection(db, "clientes"),
      where("codigoCliente", "==", codigoCliente)
    );
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      console.error("❌ Cliente não encontrado para resgatar cupons:", codigoCliente);
      return;
    }

    const clienteDoc = querySnap.docs[0]; // pega o primeiro cliente
    const clienteRef = clienteDoc.ref;
    const cartoes: any[] = clienteDoc.data().cartaoFidelidade || [];

    const cartoesAtualizados = cartoes.map((cartao) => {
      const ganhos = cartao.cupomGanho || [];
      const usados = ganhos.filter((g: any) =>
        cuponsSelecionados.some((sel) => sel.codigo === g.codigo && sel.tipo === cartao.tipo)
      );
      const naoUsados = ganhos.filter(
        (g: any) => !cuponsSelecionados.some((sel) => sel.codigo === g.codigo && sel.tipo === cartao.tipo)
      );

      return {
        ...cartao,
        saldoCupom: (cartao.saldoCupom || 0) - usados.length,
        cupomGanho: naoUsados,
        cupomResgatado: [
          ...(cartao.cupomResgatado || []),
          ...usados.map((u: any) => ({
            codigo: u.codigo,
            dataResgate: new Date().toISOString(),
          })),
        ],
      };
    });

    await updateDoc(clienteRef, { cartaoFidelidade: cartoesAtualizados });

    setCuponsSelecionados([]);
    const novosGanhos = cartoesAtualizados.flatMap((cartao: any) =>
      (cartao.cupomGanho || []).map((c: any) => ({ ...c, tipo: cartao.tipo }))
    );
    setCuponsDisponiveis(novosGanhos);
  };


  return {
    cuponsDisponiveis,
    cuponsSelecionados,
    toggleCupom,
    resgatarCupons,
    carregarCupons,
    limparCuponsSelecionados,
  };
}
