'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

interface Produto {
  id: string;
  nome: string;
  preco: number;
  imagemUrl?: string;
}

export default function SalaoCliente2() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [quadrantes, setQuadrantes] = useState<(Produto | null)[]>([null, null, null, null]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'produtos'), (snap) => {
      const lista = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome,
          preco: data.preco,
          imagemUrl: data.imagemUrl,
        } as Produto;
      });
      setProdutos(lista);

      // Inicializa quadrantes com 4 produtos aleatórios
      const iniciais = gerarProdutosAleatorios(lista, 4);
      setQuadrantes(iniciais);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (produtos.length < 4) return;

    const timers = quadrantes.map((_, index) =>
      setInterval(() => {
        setQuadrantes((prev) => {
          const novos = [...prev];
          novos[index] = gerarProdutoAleatorio(produtos);
          return novos;
        });
      }, 3000 + index * 2000) // delays diferentes por quadrante
    );

    return () => timers.forEach(clearInterval);
  }, [produtos]);

  function gerarProdutoAleatorio(lista: Produto[]): Produto {
    const index = Math.floor(Math.random() * lista.length);
    return lista[index];
  }

  function gerarProdutosAleatorios(lista: Produto[], total: number): Produto[] {
    const indices = new Set<number>();
    while (indices.size < total && indices.size < lista.length) {
      indices.add(Math.floor(Math.random() * lista.length));
    }
    return Array.from(indices).map((i) => lista[i]);
  }

  return (
    <div className="max-h-screen min-h-screen bg-black p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      {quadrantes.map((produto, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-lg flex flex-col items-center justify-center p-4"
        >
          <AnimatePresence mode="wait">
            {produto && (
              <motion.div
                key={produto.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <img
                  src={produto.imagemUrl || ''}
                  alt={produto.nome}
                  className="object-contain h-80 mx-auto mb-3 rounded"
                />
                <h3 className="text-2xl font-bold text-gray-800">{produto.nome}</h3>
                <p className="text-green-600 text-3xl">€ {produto.preco.toFixed(2)}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
