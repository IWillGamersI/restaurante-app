// Função auxiliar para normalizar texto
export // normalizar só pra MAIÚSCULO e remover espaços extras
function normalizarClasse(txt: string) {
  return (txt ?? "").trim().toUpperCase();
}

export const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(valor);
