
import { useEffect, useState } from "react";
import { CartaoFidelidade as CartaoFidelidadeType } from "@/hook/useCartaoFidelidade";

interface Props {
  cartao: CartaoFidelidadeType;
}

export function CartaoFidelidade({ cartao }: Props) {
  const meta = ["estudante", "acai"].includes(cartao.tipo) ? 15 : 10;
  const [progressAnim, setProgressAnim] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = cartao.quantidade / meta / 50;
    const interval = setInterval(() => {
      start += step;
      if (start >= cartao.quantidade / meta) {
        start = cartao.quantidade / meta;
        clearInterval(interval);
      }
      setProgressAnim(start);
    }, 20);
    return () => clearInterval(interval);
  }, [cartao.quantidade, meta]);

  const strokeDasharray = 2 * Math.PI * 45;
  const strokeDashoffset = strokeDasharray * (1 - progressAnim);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center transform transition-transform duration-500 hover:scale-105 hover:shadow-2xl">
      <h3 className="font-bold text-xl mb-4">{cartao.tipo}</h3>

      <div className="relative w-28 h-28">
        <svg className="rotate-[-90deg]" width="100%" height="100%" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" stroke="#e5e7eb" strokeWidth="10" fill="transparent" />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={cartao.premiosDisponiveis > 0 ? "#22c55e" : "#3b82f6"}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.3s ease-out, stroke 0.3s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{Math.round(progressAnim * meta)}/{meta}</span>
          <span className="text-xs text-gray-500">compras</span>
        </div>
      </div>

      {cartao.premiosDisponiveis > 0 && (
        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium mt-3 animate-pulse">
          {cartao.premiosDisponiveis} prêmio(s)
        </span>
      )}

      {cartao.compras.length > 0 && (
        <div className="text-gray-500 mt-4 text-xs text-center">
          Últimas compras:
          <ul className="ml-0 list-disc space-y-1 mt-1">
            {cartao.compras.slice(-3).map((compra, i) => (
              <li key={i}>
                <div>
                  {new Date(compra.data).toLocaleDateString()} {compra.quantidade}x {compra.produto} {cartao.tipo !== 'estudante' ? `- ${compra.categoria}`:''}
                  

                </div>
                <div>
                  

                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex justify-between w-full text-sm text-gray-600">
        <span>Ganhou: {cartao.premiosGanho}</span>
        <span>Resgatados: {cartao.premiosResgatados}</span>
        <span>Saldo: {cartao.premiosDisponiveis}</span>
      </div>
    </div>
  );
}
