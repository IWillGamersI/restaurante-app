import { ProdutoPedido} from '@/types'



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





