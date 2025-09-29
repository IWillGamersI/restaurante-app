'use client';

import { useState, useEffect } from 'react';
import { CreditCard, ShoppingBag, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Pedido } from '@/types';
import { useCartaoFidelidade, CartaoFidelidade } from '@/hook/useCartaoFidelidade';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  codigoCliente: string;
  dataNascimento?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [aba, setAba] = useState<'fidelidade' | 'compras' | 'dados'>('fidelidade');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  // 🔹 Hook do Cartão Fidelidade
  const { cartoes, loading: loadingCartoes } = useCartaoFidelidade(cliente?.id, cliente?.codigoCliente);

  // 🔹 Buscar cliente
  useEffect(() => {
    const fetchCliente = async () => {
      const codigoCliente = localStorage.getItem('clienteCodigo');
      if (!codigoCliente) return router.push('/pages/cliente/login');

      setLoadingCliente(true);
      try {
        const q = query(collection(db, 'clientes'), where('codigoCliente', '==', codigoCliente));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setCliente({ id: snap.docs[0].id, ...snap.docs[0].data() } as Cliente);
        } else {
          setCliente(null);
        }
      } catch (err) {
        console.error('Erro ao buscar cliente:', err);
      } finally {
        setLoadingCliente(false);
      }
    };
    fetchCliente();
  }, [router]);

  // 🔹 Listener de pedidos em tempo real
  useEffect(() => {
    if (!cliente) return;
    setLoadingPedidos(true);

    const q = query(collection(db, 'pedidos'), where('codigoCliente', '==', cliente.codigoCliente));
    const unsubscribe = onSnapshot(q, snap => {
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Pedido[];
      lista.sort((a, b) => new Date(b.data!).getTime() - new Date(a.data!).getTime());
      setPedidos(lista);
      setLoadingPedidos(false);
    }, err => {
      console.error('Erro ao escutar pedidos:', err);
      setLoadingPedidos(false);
    });

    return () => unsubscribe();
  }, [cliente]);

  const logOut = () => {
    localStorage.removeItem('clienteCodigo');
    router.push('/pages/cliente/login');
  };

  // 🔹 Aba Compras
  const Compras = () => {
    const [subAba, setSubAba] = useState<'atual' | 'anteriores'>('atual');
    if (loadingPedidos) return <div className="p-4">Carregando pedidos...</div>;
    if (pedidos.length === 0) return <div className="p-4 text-gray-500">Nenhum pedido encontrado</div>;

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const pedidosMesAtual = pedidos.filter(p => new Date(p.data!) >= inicioMes);
    const pedidosAnteriores = pedidos.filter(p => new Date(p.data!) < inicioMes);
    const listaPedidos = subAba === 'atual' ? pedidosMesAtual : pedidosAnteriores;

    return (
      <div className="p-4">
        <div className="flex justify-around mb-4">
          <button
            onClick={() => setSubAba('atual')}
            className={`px-4 py-2 rounded-full ${subAba === 'atual' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Mês Atual
          </button>
          <button
            onClick={() => setSubAba('anteriores')}
            className={`px-4 py-2 rounded-full ${subAba === 'anteriores' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Anteriores
          </button>
        </div>

        {listaPedidos.length === 0 ? (
          <div className="text-gray-500 text-center">Nenhum pedido {subAba === 'atual' ? 'neste mês' : 'anterior'}.</div>
        ) : (
          <div className="space-y-4">
            {listaPedidos.map(pedido => (
              <div key={pedido.id} className="bg-white p-4 rounded-xl shadow space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">📦 Compra</span>
                  <span className="text-blue-600 text-sm">{new Date(pedido.data!).toLocaleDateString()}</span>
                </div>
                <ul className="text-sm space-y-1">
                  {pedido.produtos?.map((item, i) => (
                    <div className="flex justify-between border-b border-gray-200 py-1" key={i}>
                      <div>{item.quantidade}</div>
                      <div className="flex-1">x {item.nome}</div>
                      <div>€{item.preco.toFixed(2)}</div>
                    </div>
                  ))}
                </ul>
                <div className="font-bold flex justify-between text-blue-600">
                  <div>Total</div>
                  <div>€{pedido.valor.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 🔹 Aba Dados do Cliente
  const Dados = () => (
    <div className="p-4 space-y-4">
      <div className="text-lg font-semibold">👤 {cliente?.nome || 'Cliente'}</div>
      <p className="text-gray-500">📱 {cliente?.telefone}</p>
      <p className="text-gray-500">🎂 {cliente?.dataNascimento}</p>
      <p className="text-gray-500">🆔 {cliente?.codigoCliente}</p>
      <button
        onClick={logOut}
        className="bg-red-500 text-white py-2 px-4 rounded flex items-center gap-2 hover:bg-red-600"
      >
        Sair
      </button>
    </div>
  );

  // 🔹 Aba Fidelidade
  const Fidelidade = () => {
    if (loadingCartoes) return <div className="p-4">Carregando cartões...</div>;
    if (cartoes.length === 0) return <div className="p-4 text-center text-gray-500">Nenhum cartão de fidelidade ainda.</div>;

    return (
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {cartoes.map(c => {
          const meta = ["estudante", "acai"].includes(c.tipo) ? 15 : 10;
          const [progressAnim, setProgressAnim] = useState(0);

          useEffect(() => {
            let start = 0;
            const step = c.quantidade / meta / 50;
            const interval = setInterval(() => {
              start += step;
              if (start >= c.quantidade / meta) {
                start = c.quantidade / meta;
                clearInterval(interval);
              }
              setProgressAnim(start);
            }, 20);
            return () => clearInterval(interval);
          }, [c.quantidade, meta]);

          const strokeDasharray = 2 * Math.PI * 45;
          const strokeDashoffset = strokeDasharray * (1 - progressAnim);

          return (
            <div
              key={c.tipo}
              className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center transform transition-transform duration-300 hover:scale-105"
            >
              <h3 className="font-bold text-xl mb-4">{c.tipo}</h3>

              <div className="relative w-24 h-24">
                <svg className="rotate-[-90deg]" width="100%" height="100%" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="#e5e7eb" strokeWidth="10" fill="transparent"/>
                  <circle
                    cx="50" cy="50"
                    r="45"
                    stroke={c.premiosDisponiveis > 0 ? "#22c55e" : "#3b82f6"}
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.2s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{Math.round(progressAnim * meta)}/{meta}</span>
                  <span className="text-xs text-gray-500">compras</span>
                </div>
              </div>

              <div className="mt-3 flex flex-col items-center space-y-1">
                <span className="text-sm text-gray-700">🎁 Ganhos: {c.premiosGanho}</span>
                <span className="text-sm text-gray-700">💚 Disponíveis: {c.premiosDisponiveis}</span>
                <span className="text-sm text-gray-700">✅ Resgatados: {c.premiosResgatados}</span>
              </div>

              {c.compras.length > 0 && (
                <div className="text-gray-500 mt-4 text-xs text-center">
                  Últimas compras:
                  <ul className="ml-0 list-disc space-y-1 mt-1">
                    {c.compras.slice(-3).map((compra, i) => (
                      <li key={i}>
                        {compra.produto} - {compra.quantidade} unidade(s) em {new Date(compra.data).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="h-16 bg-white flex items-center justify-center shadow-md fixed top-0 w-full z-10">
        {loadingCliente ? <span className="font-semibold text-lg">Carregando...</span> : <span className="font-semibold text-lg">Olá, {cliente?.nome || 'Cliente'}</span>}
      </div>

      <div className="flex-1 overflow-y-auto pt-16 pb-20">
        {!loadingCliente && aba === 'fidelidade' && cliente && <Fidelidade />}
        {!loadingCliente && aba === 'compras' && <Compras />}
        {!loadingCliente && aba === 'dados' && <Dados />}
      </div>

      <div className="h-16 bg-white border-t flex justify-around items-center fixed bottom-0 w-full">
        <button onClick={() => setAba('fidelidade')} className={`flex flex-col items-center ${aba === 'fidelidade' ? 'text-blue-600' : 'text-gray-500'}`}>
          <CreditCard />
          <span className="text-xs">Fidelidade</span>
        </button>

        <button onClick={() => setAba('compras')} className={`flex flex-col items-center ${aba === 'compras' ? 'text-blue-600' : 'text-gray-500'}`}>
          <ShoppingBag className="w-6 h-6" />
          <span className="text-xs">Compras</span>
        </button>

        <button onClick={() => setAba('dados')} className={`flex flex-col items-center ${aba === 'dados' ? 'text-blue-600' : 'text-gray-500'}`}>
          <User className="w-6 h-6" />
          <span className="text-xs">Perfil</span>
        </button>
      </div>
    </div>
  );
}
