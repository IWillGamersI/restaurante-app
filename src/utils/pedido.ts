import { StatusPedido } from "@/types";
import {Produto, Extra} from '@/types'

export const STATUS_PEDIDO_OPTIONS: StatusPedido[]= [
    'Fila',
    'Preparando',
    'Pronto',
    'Entregue',
    'Cancelado'
]

export const STATUS_ABERTO: StatusPedido[] = ['Fila','Preparando','Pronto']

export const STATUS_FECHADO: StatusPedido[] = ['Entregue','Cancelado']

export const extrasPorClasse: Record<string, string[]> = {
    acai: ['acai', 'acaiplus'],
    entrada: [],
    prato: ['acompanhamento', 'ingredienteplus'],
    pizza: ['ingredienteplus'],
    "pizza-escolha": ['ingrediente', 'ingredienteplus'],
    massa: ['molho', 'ingrediente', 'ingredienteplus'],
    bebida: [],
    sobremesa: [],
    estudante: ['molho', 'ingrediente', 'ingredienteplus']
};

export function getLimiteExtra(produto: Produto, tipoExtra:string): number | null {
    
    if (produto.classe === "massa" || produto.classe === "pizza-escolha") {

      if (tipoExtra === "molho") return 1;
      if (tipoExtra === "ingrediente") return 3;
      if (tipoExtra === "ingredienteplus") return null; // sem limite
    }

    if (produto.classe === "estudante" && produto.categoria === "massa") {
      if (tipoExtra === "molho") return 1;
      if (tipoExtra === "ingrediente") return 2;
      if (tipoExtra === "ingredienteplus") return null;
    }


    return null
}

export function gerarCodigoCliente(nome: string, telefone: string): string {
  return `CL-${nome.slice(0,2).toUpperCase()}-${telefone.slice(-4)}`;
}



