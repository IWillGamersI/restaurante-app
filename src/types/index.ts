import { Timestamp } from "firebase/firestore";

//configurações
export type StatusPedido = 'Fila' | 'Preparando' | 'Pronto' | 'Entregue' | 'Cancelado'

export type TipoExtra = 'molho' | 'ingrediente' | 'acompanhamento' | 'acai' | 'ingredienteplus' | 'acaiplus' | 'bebida-estudante';

export const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

export type FiltroPeriodo = 'hoje' | 'semana' | 'semana-passada' | 'quinzenal' | 'mes' | 'ano';

export const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);


export const moeda = '€'

export interface ClasseButtonsProps {
  classes: string[];
  classeSelecionada: string;
  setClasseSelecionada: (classe: string) => void;  
  classeTodos: boolean
}

export interface HeaderDataProps{
  icon: React.ReactNode
  titulo: string
}

export const imagensPorCanal: Record<string, string> = {
  Uber: '/uber.png',
  Glovo: '/glovo.png',
  Bolt: '/bolt.png',
  Restaurante: '/logo.png',
};

export const taxasPorCanal: Record<string, number> = {
  Uber: 0.33,   // 25% de taxa
  Glovo: 0.33,  // 20% de taxa
  Bolt: 0.33,   // 22% de taxa
  Restaurante: 0, // sem taxa
};

//area cliente
export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  codigoCliente: string;
  dataNascimento?: string
  cartaoFidelidade?: Cartao[]
  senha?: string
}

//area produto
export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  imagemUrl: string;
  categoria?: string;
  classe?: string;
  precoVenda: number;
  custo?: number;
  quantidade?: number
}

export interface Extra {
  id: string;
  nome: string;
  tipo: string;
  valor?: number;
}


//area Pedido
export interface Pedido {
  id?: string;
  idCliente?: string;
  codigoPedido?: string;
  nomeCliente?: string;
  data?: string ;
  status?: StatusPedido
  valor: number;
  produtos?: ProdutoPedido[];
  extras?: Extra[];
  tipoVenda?: string;
  tipoFatura: string;
  tipoPagamento?: string;
  numeroMesa?: string | null;
  pago?: boolean;
  criadoEm?: any;
  codigoCliente?: string;
  ordemDiaria?: number
  obs?: string
  canal?: string
  custo?: number
}

export type ProdutoPedido = Produto & {
  quantidade: number;
  extras: Extra[];
  preco: number; // preço do pedido (pode ser igual a precoVenda)
  concluido?: string
  cupomAplicado?: string
  ignorarParaFidelidade?: boolean
};


export type PedidoFormState = Omit<Pedido, 'id' | 'criadoEm'> & {
  querImprimi?: boolean
  telefoneCliente?: string | null
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
  numeroMesa: string
  setNumeroMesa: (value: string) => void
}


//Despesas
export interface Despesa {
  id: string
  nome: string
  valor: number
  vencimentoDia: number
  pago?: boolean
}

export interface DespesasPaga {
  id: string
  despesaId: string
  nome: string
  valorPago: number
  dataPagamento: Date | Timestamp
  formaPagamento: string
}


//Relatorios
export type DiaFaturamento = {
  dia: number | null;
  diaSemana: string;
  valorAlmoco: number;
  valorJantar: number;
  valor: number;
};

export interface FaturamentoDiario {
  total: number;
  produtos: { [produtoId: string]: number };
  categorias: {menuEstudante: number, acai: number, outros: number}
}

type CategoriaResumo = {
  valor: number
  quantidade: number
}

type CategoriaSemanal = {
  menuEstudante: CategoriaResumo
  acai: CategoriaResumo
  outros: CategoriaResumo
}

export interface FaturamentoSemanal {
  almoco: { [semana: number]: number };
  jantar: { [semana: number]: number };
  semanas: number[];
  categorias: { [semana:number]:CategoriaSemanal  };
}



export interface ResumoMensal {
  faturamentoTotal: number;
  totalProdutos: { [produtoId: string]: number };
  almocoTotal: number;
  jantarTotal: number;
  produtos: {}
}


export interface Compra {
  produtoId: string;
  quantidade: number;
  data: string; // ISO string
}

export interface Cartao {
  tipo: 'pizza-tradicional' | 'pizza-individual' | 'estudante' | 'acai' | 'massa' | 'prato';
  compras: Compra[];
  ultimaZeragem: string; // ISO string
}
