import { db } from "@/lib/firebase";
import { collection, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useState, useEffect } from "react";

export interface Cupom {
  codigo: string;
  tipo: string;
  dataGanho: string;
  dataResgate?: string;
  quantidade: number;
}

export function useResgateCupom(codigoCliente?: string) {
  const [cuponsDisponiveis, setCuponsDisponiveis] = useState<Cupom[]>([]);
  const [cuponsSelecionados, setCuponsSelecionados] = useState<Cupom[]>([]);

  const limparCuponsSelecionados = () => setCuponsSelecionados([]);

  // 🔹 Carrega todos os cupons disponíveis do client
  const carregarCupons = async () => {
    if (!codigoCliente) return;

    const q = query(collection(db, "clientes"), where("codigoCliente", "==", codigoCliente));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const clienteData: any = snap.docs[0].data();
    const cartoes = clienteData.cartaoFidelidade || [];

    const ganhos = cartoes.flatMap((cartao: any) =>
      (cartao.cupomGanho || []).map((c: any) => ({ ...c, tipo: cartao.tipo }))
    );

    setCuponsDisponiveis(ganhos);
  };

  useEffect(() => {
    if (codigoCliente) carregarCupons();
  }, [codigoCliente]);

  // 🔹 Selecionar ou desselecionar cupom
  const toggleCupom = (cupom: Cupom) => {
    setCuponsSelecionados((prev) => {
      if (prev.some((c) => c.codigo === cupom.codigo)) {
        return prev.filter((c) => c.codigo !== cupom.codigo);
      }
      return [cupom]; // permite apenas 1 cupom por vez
    });
  };

  // 🔹 Resgata o cupom selecionado imediatamente
  const resgatarCupomSelecionado = async () => {
    if (!codigoCliente || cuponsSelecionados.length === 0) return;

    const cupom = cuponsSelecionados[0]; // pegamos apenas o primeiro cupom selecionado
    const q = query(collection(db, "clientes"), where("codigoCliente", "==", codigoCliente));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const clienteDoc = snap.docs[0];
    const clienteRef = clienteDoc.ref;
    const clienteData = clienteDoc.data();

    const cartoesAtualizados = (clienteData.cartaoFidelidade || []).map((cartao: any) => {
      if (cartao.tipo !== cupom.tipo) return cartao;

      const ganhos = cartao.cupomGanho || [];
      const cupomUsado = ganhos.find((g: any) => g.codigo === cupom.codigo);
      if (!cupomUsado) return cartao;

      return {
        ...cartao,
        saldoCupom: Math.max((cartao.saldoCupom || 0) - 1, 0),
        cupomGanho: ganhos.filter((g: any) => g.codigo !== cupom.codigo),
        cupomResgatado: [
          ...(cartao.cupomResgatado || []),
          { ...cupomUsado, dataResgate: new Date().toISOString() },
        ],
      };
    });

    await updateDoc(clienteRef, { cartaoFidelidade: cartoesAtualizados });

    // Atualiza estado local
    const novosGanhos = cartoesAtualizados.flatMap((cartao: any) =>
      (cartao.cupomGanho || []).map((c: any) => ({ ...c, tipo: cartao.tipo }))
    );
    setCuponsDisponiveis(novosGanhos);
    setCuponsSelecionados([]);
  };

  return {
    cuponsDisponiveis,
    cuponsSelecionados,
    toggleCupom,
    resgatarCupomSelecionado,
    carregarCupons,
    limparCuponsSelecionados,
  };
}
