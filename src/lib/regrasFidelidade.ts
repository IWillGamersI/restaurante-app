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
  // 🍕 Pizza — controlada por categoria
  Pizza: { 
    tipo: "categoria",
    limite: 10,
    periodo: 3,
    categorias: ["pizza-tradicional", "pizza-individual"]
  },

  // 🎓 Estudante — controlado por classe
  estudante: { 
    tipo: "classe",
    limite: 12,
    periodo: 1
  },

  // 🍧 Açaí — controlado por classe
  acai: { 
    tipo: "classe",
    limite: 12,
    periodo: 1
  },

  // 🍝 Massas — controladas por classe
  massa: { 
    tipo: "classe",
    limite: 10,
    periodo: 3
  },

  // 🍛 Pratos — controlados por classe
  prato: { 
    tipo: "classe",
    limite: 10,
    periodo: 3
  },
};

// 🔹 Função utilitária para obter uma regra por nome (insensível a maiúsculas/minúsculas)
export function obterRegraFidelidade(nome: string): RegraFidelidade | null {
  const chave = Object.keys(regrasFidelidade).find(
    key => key.toLowerCase() === nome.toLowerCase()
  );
  return chave ? regrasFidelidade[chave] : null;
}
