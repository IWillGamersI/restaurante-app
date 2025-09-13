export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  codigoCliente: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  imagemUrl: string;
  categoria: string;
  classe: string;
  precoVenda: number;
  custo: number;
}

export interface Extra {
  id: string;
  nome: string;
  tipo: string;
  valor?: number;
}

export interface Pedido {
  id: string;
  codigoPedido: string;
  nomeCliente: string;
  data: string;
  status: StatusPedido
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

export type ProdutoPedido = Produto & {
  quantidade: number;
  extras: Extra[];
  preco: number; // preço do pedido (pode ser igual a precoVenda)
};


export type PedidoFormState = Omit<Pedido, 'id' | 'criadoEm'> & {
  querImprimi?: boolean
  telefoneCliente?: string | null
}

export type StatusPedido = 'Fila' | 'Preparando' | 'Pronto' | 'Entregue' | 'Cancelado'


export interface ClasseButtonsProps {
  classes: string[];
  classeSelecionada: string;
  setClasseSelecionada: (classe: string) => void;  
  classeTodos: boolean
}

export interface PedidoInfoFormProps {
  tipoFatura: string;
  setTipoFatura: (value: string) => void;
  tipoVenda: string;
  setTipoVenda: (value: string) => void;
  clienteTelefone: string;
  setClienteTelefone: (value: string) => void;
  clienteNome: string;
  setClienteNome: (value: string) => void;
  codigoCliente: string;
  setCodigoCliente: (value: string) => void;
  idCliente: string | null;
  setIdCliente: (value: string | null) => void;
  codigoPedido: string;
  setCodigoPedido: (value: string) => void;
  querImprimir: boolean;
  setQuerImprimir: (value: boolean) => void;
  gerarCodigoPedido: (nome: string) => string;
}