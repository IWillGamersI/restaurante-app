import { useEffect, useState } from "react";
import { CartaoFidelidade as CartaoFidelidadeType } from "@/hook/useCartaoFidelidade";
import { obterRegraFidelidade } from "@/lib/regrasFidelidade";

interface Props {
  cartao: CartaoFidelidadeType;
}

export function CartaoFidelidade({ cartao }: Props) {
  // 🔹 Condição para exibir o cartão
  const temCompra = (cartao.quantidade ?? 0) > 0;
  const temCupom =
    (cartao.cupomGanho?.length ?? 0) > 0 ||
    (cartao.cupomResgatado?.length ?? 0) > 0;

  if (!temCompra && !temCupom) {
    return null; // 🔸 não renderiza nada se o cartão estiver "vazio"
  }

  // 🔹 Buscar regra correspondente ao tipo do cartão
  const regra = obterRegraFidelidade(cartao.tipo);
  const meta = regra?.limite ?? 10; // fallback para 10 se não encontrar regra

  const [progressAnim, setProgressAnim] = useState(0);
  const quantidadeParaFidelidade = cartao.quantidade;

  // 🔹 Animação de progresso
  useEffect(() => {
    let start = 0;
    const step = quantidadeParaFidelidade / meta / 50;
    const interval = setInterval(() => {
      start += step;
      if (start >= quantidadeParaFidelidade / meta) {
        start = quantidadeParaFidelidade / meta;
        clearInterval(interval);
      }
      setProgressAnim(start);
    }, 20);
    return () => clearInterval(interval);
  }, [quantidadeParaFidelidade, meta]);

  const strokeDasharray = 2 * Math.PI * 45;
  const strokeDashoffset = strokeDasharray * (1 - progressAnim);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center transform transition-transform duration-500 hover:scale-105 hover:shadow-2xl">
      
      {/* 🔹 Estatísticas de cupons */}
      <div className="mt-4 flex justify-between w-full text-sm text-gray-600">
        <div className="flex flex-col bg-green-200 text-green-700 rounded px-2 py-1 text-center">
          <div className="font-bold">Já Ganhou</div>
          <div className="text-md">
            {cartao.cupomGanho.length}
          </div>
        </div>

        <div className="flex flex-col bg-blue-200 text-blue-700 rounded px-2 py-1 text-center">
          <div className="font-bold">Já Resgatou</div>
          <div className="text-md">{cartao.cupomResgatado.length}</div>
        </div>
      </div>

      {/* 🔹 Nome do cartão */}
      <h3 className="font-bold text-xl mb-4 capitalize">{cartao.tipo}</h3>

      {/* 🔹 Círculo de progresso */}
      <div className="relative w-28 h-28">
        <svg className="rotate-[-90deg]" width="100%" height="100%" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" stroke="#e5e7eb" strokeWidth="10" fill="transparent" />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={cartao.saldoCupom > 0 ? "#22c55e" : "#3b82f6"}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.3s ease-out, stroke 0.3s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">
            {Math.min(Math.round(progressAnim * meta), meta)}/{meta}
          </span>
          <span className="text-xs text-gray-500">compras</span>
        </div>
      </div>

      {/* 🔹 Cupons disponíveis */}
      {cartao.saldoCupom > 0 && (
        <div className="mt-3 text-center">
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
            {cartao.saldoCupom} prêmio(s) disponível(is)
          </span>
          <ul className="text-xs text-gray-700 mt-2">
            {cartao.cupomGanho.map((c) => (
              <li key={c.codigo}>{c.codigo}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 🔹 Resumo para resgate */}
      <div className="mt-4 flex justify-between w-full text-sm text-gray-600">
        <div className="w-full flex justify-between items-center">
          <div>Para Resgate</div>
          <div className="bg-green-600 text-md text-white py-1 px-3 rounded-full font-bold">
            {cartao.cupomGanho.length}
          </div>
        </div>
      </div>
    </div>
  );
}
