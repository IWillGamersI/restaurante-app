// 🔹 Tipagem das regras de fidelidade
export type TipoRegraFidelidade = "classe" | "categoria";

export interface RegraFidelidade {
  tipo: TipoRegraFidelidade;
  limite: number;        // Quantidade de compras/pedidos para gerar um cupom
  periodo: number;       // Período de validade em meses
  categorias?: string[]; // Lista opcional de categorias associadas
}

// 🔸 Tabela principal de regras de fidelidade
export const regrasFidelidade: Record<string, RegraFidelidade> = {
  Pizza: { 
    tipo: "categoria", 
    limite: 10, 
    periodo: 3, 
    categorias: ["pizza-individual", "pizza-tradicional"] 
  },
  estudante: { 
    tipo: "classe", 
    limite: 12, 
    periodo: 1 
  },
  acai: { 
    tipo: "classe", 
    limite: 12, 
    periodo: 1 
  },
  massa: { 
    tipo: "classe", 
    limite: 10, 
    periodo: 3 
  },
  prato: { 
    tipo: "classe", 
    limite: 10, 
    periodo: 3 
  },
};

// 🔹 Função utilitária para obter uma regra por nome (opcional)
export function obterRegraFidelidade(nome: string): RegraFidelidade | null {
  const chave = Object.keys(regrasFidelidade).find(
    key => key.toLowerCase() === nome.toLowerCase()
  );
  return chave ? regrasFidelidade[chave] : null;
}
