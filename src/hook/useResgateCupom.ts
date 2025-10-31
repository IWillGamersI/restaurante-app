import { db } from "@/lib/firebase";
import { collection, getDocs, query, updateDoc, where } from "firebase/firestore";
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

  // 🔹 Buscar cupons do cliente
  const carregarCupons = async () => {
    if (!codigoCliente) return;

    const q = query(collection(db, "clientes"), where("codigoCliente", "==", codigoCliente));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      console.log("❌ Nenhum cliente encontrado com esse codigoCliente:", codigoCliente);
      return;
    }

    const clienteData: any = querySnap.docs[0].data();
    const cartoes = clienteData.cartaoFidelidade || [];

    const ganhos = cartoes.flatMap((cartao: any) =>
      (cartao.cupomGanho || []).map((c: any) => ({
        ...c,
        tipo: cartao.tipo,
      }))
    );

    setCuponsDisponiveis(ganhos);
  };

  // 🔁 Recarrega sempre que mudar o cliente
  useEffect(() => {
    if (codigoCliente) carregarCupons();
  }, [codigoCliente]);

  // 🔹 Selecionar / desselecionar cupom
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

  // 🔹 Marca um cupom específico como usado (para quando aplicar em um produto)
  const marcarCupomComoUsado = async (cupomCodigo: string, tipo: string) => {
    if (!codigoCliente) return;

    try {
      const q = query(collection(db, "clientes"), where("codigoCliente", "==", codigoCliente));
      const snap = await getDocs(q);

      if (snap.empty) {
        console.error("❌ Cliente não encontrado:", codigoCliente);
        return;
      }

      const clienteDoc = snap.docs[0];
      const clienteRef = clienteDoc.ref;
      const clienteData = clienteDoc.data();

      const cartoesAtualizados = (clienteData.cartaoFidelidade || []).map((cartao: any) => {
        if (cartao.tipo !== tipo) return cartao;

        const ganhos = cartao.cupomGanho || [];
        const usados = ganhos.filter((g: any) => g.codigo === cupomCodigo);
        const naoUsados = ganhos.filter((g: any) => g.codigo !== cupomCodigo);

        return {
          ...cartao,
          saldoCupom: Math.max((cartao.saldoCupom || 0) - usados.length, 0),
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

      // Atualiza cupons no estado local
      const novosGanhos = cartoesAtualizados.flatMap((cartao: any) =>
        (cartao.cupomGanho || []).map((c: any) => ({ ...c, tipo: cartao.tipo }))
      );
      setCuponsDisponiveis(novosGanhos);

      console.log(`✅ Cupom ${cupomCodigo} (${tipo}) marcado como usado.`);
    } catch (error) {
      console.error("Erro ao marcar cupom como usado:", error);
    }
  };

  // 🔹 Resgatar múltiplos cupons (se quiser resgatar de uma vez)
  const resgatarCupons = async () => {
    if (!codigoCliente || cuponsSelecionados.length === 0) return;

    const q = query(collection(db, "clientes"), where("codigoCliente", "==", codigoCliente));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      console.error("❌ Cliente não encontrado para resgatar cupons:", codigoCliente);
      return;
    }

    const clienteDoc = querySnap.docs[0];
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
    marcarCupomComoUsado, // ✅ agora disponível no hook
    carregarCupons,
    limparCuponsSelecionados,
  };
}
