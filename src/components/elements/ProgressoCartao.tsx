// 🔹 Componente para mostrar progresso do cartão
const ProgressoCartao = ({ cartao }: { cartao: any }) => {
  const { pontosAtuais, pontosParaPremio, premioDisponivel } = cartao;

  const pontosFaltando = Math.max(pontosParaPremio - pontosAtuais, 0);
  const porcentagem = Math.min((pontosAtuais / pontosParaPremio) * 100, 100);

  return (
    <div className="bg-white shadow-md rounded-xl p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="font-semibold text-lg">{cartao.tipo}</h3>
        {premioDisponivel ? (
          <p className="text-green-600 font-medium">🎁 Prêmio disponível para resgate!</p>
        ) : (
          <p className="text-gray-500">Faltam {pontosFaltando} pontos para o próximo prêmio</p>
        )}
      </div>
      <div className="w-full md:w-1/3 bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-purple-600 h-4"
          style={{ width: `${porcentagem}%` }}
        />
      </div>
      <p className="text-sm text-gray-600">{pontosAtuais}/{pontosParaPremio} pontos</p>
    </div>
  );
};
