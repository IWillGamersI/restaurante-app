// 🔹 Tipagem das regras de fidelidade
export type TipoRegraFidelidade = "pizza" | "acai" | "prato" | "massa" | "estudante" ;

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
    tipo: "pizza",
    limite: 10,
    periodo: 3,
  },

  // 🎓 Estudante — controlado por classe
  Estudante: { 
    tipo: "estudante",
    limite: 12,
    periodo: 1
  },

  // 🍧 Açaí — controlado por classe
  Acai: { 
    tipo: "acai",
    limite: 12,
    periodo: 1
  },

  // 🍝 Massas — controladas por classe
  Massa: { 
    tipo: "massa",
    limite: 10,
    periodo: 3
  },

  // 🍛 Pratos — controlados por classe
  Prato: { 
    tipo: "prato",
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
