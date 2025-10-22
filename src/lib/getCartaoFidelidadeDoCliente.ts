import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
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
  quantidade: number;
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
  estudante: { tipo: "classe", limite: 15, periodo: 1 },
  acai: { tipo: "classe", limite: 15, periodo: 1 },
  massa: { tipo: "classe", limite: 10, periodo: 3 },
  prato: { tipo: "classe", limite: 10, periodo: 3 },
  pizza: { tipo: "classe", limite: 10, periodo: 3 },
};

function gerarCodigoCupom(tipo: string) {
  return tipo.toUpperCase() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase();
}

/**
 * Calcula os cartões de fidelidade (mesma lógica do hook),
 * mas retorna sempre os cartões que já estão no cliente quando não há pedidos.
 */
export async function getCartaoFidelidadeDoCliente(codigoCliente: string) {

  

  // 1) Buscar cliente e cartões existentes (sempre)
  const clientesRef = collection(db, "clientes");
  const clienteQuery = query(clientesRef, where("codigoCliente", "==", codigoCliente));
  const clienteSnap = await getDocs(clienteQuery);

  if (clienteSnap.empty) {
    return []; // cliente não existe
  }

  const clienteDoc = clienteSnap.docs[0];
  const clienteData: any = clienteDoc.data();
  const cartoesExistentes: CartaoFidelidade[] = clienteData.cartaoFidelidade || [];

  // 2) Buscar pedidos do cliente
  const pedidosRef = collection(db, "pedidos");
  const qPedidos = query(pedidosRef, where("codigoCliente", "==", codigoCliente));
  const pedidosSnap = await getDocs(qPedidos);

  // Se não houver pedidos, retornamos apenas os cartões existentes (sem recalcular)
  if (pedidosSnap.empty) {
    // garantir que saldoCupom está consistente
    const exist = cartoesExistentes.map(c => ({
      ...c,
      quantidade: c.quantidade ?? 0,
      limite: c.limite ?? 0,
      periodo: c.periodo ?? 0,
      cupomGanho: c.cupomGanho || [],
      cupomResgatado: c.cupomResgatado || [],
      saldoCupom: (c.cupomGanho?.length || 0) - (c.cupomResgatado?.length || 0),
    }));
    return exist;
  }

  // 3) Montar pedidos entregues
  const pedidos = pedidosSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Pedido[];
  const pedidosEntregues = pedidos.filter(p => p.status === "Entregue");

  const cartoesTemp: Record<string, CartaoFidelidade> = {};
  const agora = new Date();

  pedidosEntregues.forEach(pedido => {
    pedido.produtos?.forEach(p => {
      Object.entries(regrasFidelidade).forEach(([nomeCartao, regra]) => {
        let pertence = false;
        if (regra.tipo === "classe" && p.classe === nomeCartao) pertence = true;
        if (regra.tipo === "categoria" && regra.categorias?.includes(p.classe || "")) pertence = true;

        if (!pertence) return;

        // tratar data de pedido com segurança
        let dataPedido: Date | null = null;
        try {
          if (pedido.criadoEm && typeof pedido.criadoEm.toDate === "function") {
            dataPedido = pedido.criadoEm.toDate();
          } else if (pedido.data) {
            const d = new Date(pedido.data);
            if (!isNaN(d.getTime())) dataPedido = d;
          } else if (pedido.criadoEm instanceof Date) {
            dataPedido = pedido.criadoEm;
          }
        } catch (err) {
          // se falhar, ignoramos esse pedido
          dataPedido = null;
        }

        if (!dataPedido) return;

        let valido = false;
        if (regra.periodo === 1) {
          valido = dataPedido.getMonth() === agora.getMonth() && dataPedido.getFullYear() === agora.getFullYear();
        } else {
          const dataLimite = new Date(agora);
          dataLimite.setMonth(dataLimite.getMonth() - regra.periodo);
          valido = dataPedido >= dataLimite;
        }

        if (!valido) return;

        if (!cartoesTemp[nomeCartao]) {
          const existente = cartoesExistentes.find(c => c.tipo === nomeCartao);
          cartoesTemp[nomeCartao] = {
            tipo: nomeCartao,
            quantidade: 0,
            limite: regra.limite,
            periodo: regra.periodo,
            cupomGanho: existente?.cupomGanho ? [...existente.cupomGanho] : [],
            cupomResgatado: existente?.cupomResgatado ? [...existente.cupomResgatado] : [],
            saldoCupom: existente?.saldoCupom ?? 0,
          };
        }

        cartoesTemp[nomeCartao].quantidade += (p.quantidade || 0);
      });
    });
  });

  // 4) Gerar novos cupons se necessário
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

    cartao.quantidade = cartao.limite ? cartao.quantidade % cartao.limite : cartao.quantidade;
    cartao.saldoCupom = (cartao.cupomGanho?.length || 0) - (cartao.cupomResgatado?.length || 0);
  });

  const cartoesAtualizados = Object.values(cartoesTemp);

  // 5) Atualizar Firestore com cuidado: apenas se houver algo novo (evitar writes desnecessários)
  try {
    // se não houver cartões calculados (vazio), não sobrescreve — retorna os existentes
    if (cartoesAtualizados.length > 0) {
      const clienteRef = doc(db, "clientes", clienteDoc.id);
      await updateDoc(clienteRef, { cartaoFidelidade: cartoesAtualizados });
      return cartoesAtualizados;
    } else {
      // retorna cartões existentes (consistentes)
      return cartoesExistentes.map(c => ({
        ...c,
        quantidade: c.quantidade ?? 0,
        saldoCupom: (c.cupomGanho?.length || 0) - (c.cupomResgatado?.length || 0),
      }));
    }
  } catch (err) {
    // log e retornar dados existentes para não quebrar o fluxo
    console.error("Erro ao atualizar cartaoFidelidade do cliente:", codigoCliente, err);
    return cartoesExistentes.map(c => ({
      ...c,
      quantidade: c.quantidade ?? 0,
      saldoCupom: (c.cupomGanho?.length || 0) - (c.cupomResgatado?.length || 0),
    }));
  }
}
