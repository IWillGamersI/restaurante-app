import { ProdutoPedido,DiaFaturamento} from '@/types'



export function calcularSubTotalProduto(produto: ProdutoPedido): number {
    const totalExtras = produto.extras?.reduce((sum,e)=>sum + (e.valor || 0),0) || 0
    return produto.preco * produto.quantidade + totalExtras
}

export function calcularTotalExtras(produto: ProdutoPedido): number {
    return produto.extras?.reduce((sum,e)=> sum + (e.valor || 0),0) || 0
}

export function calcularTotalPedido(produtosPedido: ProdutoPedido[]): number {
    return produtosPedido.reduce((acc,p)=> acc + calcularSubTotalProduto(p),0)
}

export function somarAcumulado(valores: number[] = []): number {
  return valores.reduce((sum, v) => sum + v, 0);
}

export function gerarFaturamentoDiario(mes: number, ano: number, pedidos: any[]): DiaFaturamento[] {
  const diasNoMes = new Date(ano, mes + 1, 0).getDate(); // número de dias do mês
  const resultado: DiaFaturamento[] = [];

  let acumuladoSemana = { valorAlmoco: 0, valorJantar: 0, valor: 0 };

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = new Date(ano, mes, dia);
    const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "long" }); // "segunda-feira", etc.

    // Filtra pedidos do dia
    const pedidosDoDia = pedidos.filter(p => {
      const pData = p.data.toDate ? p.data.toDate() : new Date(p.data);
      return pData.getDate() === dia && pData.getMonth() === mes && pData.getFullYear() === ano;
    });

    const valorAlmoco = pedidosDoDia
      .filter(p => p.refeicao === "Almoço")
      .reduce((acc, p) => acc + p.valor, 0);

    const valorJantar = pedidosDoDia
      .filter(p => p.refeicao === "Jantar")
      .reduce((acc, p) => acc + p.valor, 0);

    const totalDia = valorAlmoco + valorJantar;

    // Acumula para a semana
    acumuladoSemana.valorAlmoco += valorAlmoco;
    acumuladoSemana.valorJantar += valorJantar;
    acumuladoSemana.valor += totalDia;

    resultado.push({
      dia,
      diaSemana,
      valorAlmoco,
      valorJantar,
      valor: totalDia,
    });

    // Se for domingo → adiciona linha "Faturamento Semanal" e reseta acumulado
    if (diaSemana.toLowerCase() === "domingo") {
      resultado.push({
        dia: null,
        diaSemana: "Faturamento Semanal",
        valorAlmoco: acumuladoSemana.valorAlmoco,
        valorJantar: acumuladoSemana.valorJantar,
        valor: acumuladoSemana.valor,
      });

      acumuladoSemana = { valorAlmoco: 0, valorJantar: 0, valor: 0 };
    }
  }

  // Se o mês terminar e a última semana não fechou no domingo, adiciona acumulado final
  if (acumuladoSemana.valor > 0) {
    resultado.push({
      dia: null,
      diaSemana: "Faturamento Semanal",
      valorAlmoco: acumuladoSemana.valorAlmoco,
      valorJantar: acumuladoSemana.valorJantar,
      valor: acumuladoSemana.valor,
    });
  }

  return resultado;
}





