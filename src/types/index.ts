export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  codigoCliente: string;
}

export interface Produto {
  id: string;
  img: string
  nome: string;
  preco: number;
  classe: string;
  categoria: string;
}

export interface Extra {
  id: string;
  nome: string;
  tipo: string;
  valor?: number;
}

export type ProdutoPedido = Omit<Produto, 'img' | 'classe'> & {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  extras: Extra[];
  categoria: string;
}

export interface Pedido {
  id: string;
  codigoPedido: string;
  nomeCliente: string;
  data: string;
  status: string;
  valor: number;
  produtos: ProdutoPedido[];
  extras?: Extra[];
  tipoVenda: string;
  tipoFatura: string;
  tipoPagamento: string;
  numeroMesa?: string | null;
  pago?: boolean;
  criadoEm?: any;
  idCliente: string;
  codigoCliente: string;
}
