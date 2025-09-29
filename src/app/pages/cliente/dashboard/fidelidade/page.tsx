import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const regras = {
  'Menu Estudante': { validade: 'mensal', meta: 15 },
  'Açai': { validade: 'mensal', meta: 15 },
  'Pizza Tradicional': { validade: 'trimestral', meta: 10 },
  'Pizza Individual': { validade: 'trimestral', meta: 10 },
  'Pratos': { validade: 'trimestral', meta: 10 },
  'Massas': { validade: 'trimestral', meta: 10 },
};

export async function CartaoFidelidade(clienteId: string, pedido: any) {
  const clienteRef = doc(db, 'clientes', clienteId);
  const snap = await getDoc(clienteRef);

  if (!snap.exists()) return;
  const cliente = snap.data();
  const cartoes = cliente.cartaoFidelidade || [];

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const mesAtual = hoje.getMonth();
  const mesZeragem = mesAtual - (mesAtual % 3);
  const inicioTrimestre = new Date(hoje.getFullYear(), mesZeragem, 1);

  pedido.produtos.forEach((item: any) => {
    const regra = regras[item.classe as keyof typeof regras];
    if (!regra) return;

    // achar cartão
    let cartao = cartoes.find((c: any) => c.classe === item.classe);

    // se não existir cria
    if (!cartao) {
      cartao = {
        classe: item.classe,
        compras: [],
        total: 0,
        meta: regra.meta,
        premioDisponivel: false,
        validade: regra.validade,
      };
      cartoes.push(cartao);
    }

    // verificar validade
    if (
      (cartao.validade === 'mensal' && new Date() < inicioMes) ||
      (cartao.validade === 'trimestral' && new Date() < inicioTrimestre)
    ) {
      // se expirou, resetar
      cartao.compras = [];
      cartao.total = 0;
      cartao.premioDisponivel = false;
    }

    // adicionar compra
    cartao.compras.push({
      data: pedido.data,
      produto: item.nome,
      quantidade: item.quantidade,
    });

    cartao.total += item.quantidade;

    // verificar prêmio
    if (cartao.total >= cartao.meta) {
      cartao.premioDisponivel = true;

      // 🔹 se quiser resetar automaticamente ao atingir
      cartao.total = 0;
      cartao.compras = [];
    }
  });

  await updateDoc(clienteRef, { cartaoFidelidade: cartoes });
}
