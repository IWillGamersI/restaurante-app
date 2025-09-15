'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Pedido, Produto } from '@/types';


export default function SalaoCliente() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrosselIndex, setCarrosselIndex] = useState(0);
  const [produtosCarregados, setProdutosCarregados] = useState(false);

  useEffect(() => {
    const unsubscribePedidos = onSnapshot(collection(db, 'pedidos'), (snap) => {
      const lista = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pedido));
      setPedidos(lista);
    });

    const unsubscribeProdutos = onSnapshot(collection(db, 'produtos'), (snap) => {
      const lista = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome || '',
          descricao: data.descricao || '',
          categoria: data.categoria || '',
          classe: data.classe || '',
          precoVenda: data.precoVenda || 0,
          preco: data.precoVenda || 0, // se quiser manter o antigo "preco"
          custo: data.custo || 0,
          imagemUrl: data.imagemUrl || '',
        } as Produto;
      });
      setProdutos(lista);
      setProdutosCarregados(true); // <- SOMENTE após carregar
    });

    return () => {
      unsubscribePedidos();
      unsubscribeProdutos();
    };
  }, []);

  useEffect(() => {
    if (!produtosCarregados || produtos.length === 0) return;

    const timer = setInterval(() => {
      setCarrosselIndex(prev => (prev + 1) % produtos.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [produtosCarregados, produtos]);

  const pedidosPorStatus = (status: string) =>
    pedidos.filter(p => p.status.toLowerCase() === status.toLowerCase());

  return (
    <div className="flex flex-col md:flex-row min-h-screen text-gray-800">
      <div className="w-full flex">
        {/* Área de Divulgação */}
        <div className="bg-white text-black p-4 relative overflow-hidden flex flex-col items-center justify-center w-1/3 min-w-[300px]">
          <h2 className="text-9xl font-bold mb-4">Promoções</h2>
          {produtosCarregados && produtos.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={produtos[carrosselIndex].id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 1 }}
                className="text-center w-full"
              >
                <img
                  src={produtos[carrosselIndex].imagemUrl || ''}
                  alt={produtos[carrosselIndex].nome || 'Promoção'}
                  className="object-contain rounded-2xl mb-3 max-h-300 mx-auto transition-all duration-300"
                />
                <h3 className="text-7xl font-semibold">{produtos[carrosselIndex].nome}</h3>
                <p className="text-green-400 text-9xl">
                  € {produtos[carrosselIndex].precoVenda.toFixed(2)}
                </p>
              </motion.div>
            </AnimatePresence>

          ) : (
            <p className="text-sm text-gray-400">Carregando promoções...</p>
          )}
        </div>

        {/* Painel de Pedidos */}
        <div className="w-full flex-1 bg-gray-100 p-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Fila', 'Preparando', 'Pronto'].map((status) => (
            <div key={status} className="bg-white rounded-lg shadow p-4">
              <h2 className=" text-6xl font-bold mb-2 text-center">{status}</h2>
              <hr className='mb-6'/>
              {pedidosPorStatus(status).length === 0 ? (
                <p className="text-gray-500 text-6xl text-center">Nenhum pedido</p>
              ) : (
                pedidosPorStatus(status).map(p => (
                  <div key={p.id} className="border rounded p-2 mb-2 bg-blue-200 text-center border-gray-400 ">
                    <p className='bg-blue-600 text-center text-white rounded font-bold text-7xl'>{p.codigoPedido}</p>
                    <p className="font-semibold text-center text-7xl">{p.nomeCliente}</p>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
