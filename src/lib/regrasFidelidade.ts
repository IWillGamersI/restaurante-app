// 🔹 Tipos principais
export type TipoRegraFidelidade =
  | "Pizza"
  | "Acai"
  | "Prato"
  | "Massa"
  | "Estudante";

export interface RegraFidelidade {
  /** Tipo base da regra (classe principal) */
  tipo: TipoRegraFidelidade;

  /** Quantidade necessária de compras/pedidos para gerar 1 cupom */
  limite: number;

  /** Período de validade em meses */
  periodo: number;

  /** Categorias associadas (opcional, usado em regras por categoria) */
  categorias?: string[];
}

// 🔸 Enum para facilitar reuso em outros módulos (se quiser)
export enum TipoCartaoFidelidade {
  PIZZA = "Pizza",
  ACAI = "Acai",
  MASSA = "Massa",
  PRATO = "Prato",
  ESTUDANTE = "Estudante",
}

// 🔸 Tabela principal de regras de fidelidade
export const regrasFidelidade: Record<string, RegraFidelidade> = {
  // 🍕 Pizza — controlada por categoria
  Pizza: {
    tipo: TipoCartaoFidelidade.PIZZA,
    limite: 10,
    periodo: 3,
    categorias: ["pizza-individual", "pizza-tradicional"],
  },

  // 🎓 Estudante — controlado por classe
  Estudante: {
    tipo: TipoCartaoFidelidade.ESTUDANTE,
    limite: 12,
    periodo: 1,
  },

  // 🍧 Açaí — controlado por classe
  Acai: {
    tipo: TipoCartaoFidelidade.ACAI,
    limite: 12,
    periodo: 1,
  },

  // 🍝 Massas — controladas por classe
  Massa: {
    tipo: TipoCartaoFidelidade.MASSA,
    limite: 10,
    periodo: 3,
  },

  // 🍛 Pratos — controlados por classe
  Prato: {
    tipo: TipoCartaoFidelidade.PRATO,
    limite: 10,
    periodo: 3,
  },
};

// 🔹 Função utilitária para obter uma regra por nome (case insensitive)
export function obterRegraFidelidade(nome: string): RegraFidelidade | null {
  const chave = Object.keys(regrasFidelidade).find(
    (key) => key.toLowerCase() === nome.toLowerCase()
  );
  return chave ? regrasFidelidade[chave] : null;
}

// ✅ Export default opcional — facilita importação simples
export default regrasFidelidade;
