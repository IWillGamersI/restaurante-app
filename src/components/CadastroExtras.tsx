'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';

type TipoExtra = 'molho' | 'ingrediente' | 'acompanhamento';

export default function CadastroExtras() {
  const [tipo, setTipo] = useState<TipoExtra>('molho');
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState<{ id: string; nome: string; tipo: TipoExtra }[]>([]);

  useEffect(() => {
    // Busca TODOS os extras
    const unsubscribe = onSnapshot(collection(db, 'extras'), (snap) => {
      const dados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as {
        id: string;
        nome: string;
        tipo: TipoExtra;
      }[];
      setItens(dados);
    });

    return () => unsubscribe();
  }, []);

  const adicionarItem = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    // Evita duplicados no mesmo tipo
    const duplicado = itens.some(item => item.tipo === tipo && item.nome.toLowerCase() === nomeLimpo.toLowerCase());
    if (duplicado) return alert('Item já cadastrado.');

    await addDoc(collection(db, 'extras'), {
      nome: nomeLimpo,
      tipo,
    });
    setNome('');
  };

  const removerItem = async (id: string) => {
    await deleteDoc(doc(db, 'extras', id));
  };

  // Separar por tipo
  const molhos = itens.filter(item => item.tipo === 'molho');
  const ingredientes = itens.filter(item => item.tipo === 'ingrediente');
  const acompanhamentos = itens.filter(item => item.tipo === 'acompanhamento');

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">Cadastro de Itens Extras</h2>

      {/* Formulário para adicionar */}
      <div className="max-w-md mx-auto mb-10">
        <label className="block font-semibold mb-2">Tipo:</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoExtra)}
          className="border p-2 rounded w-full mb-4"
        >
          <option value="molho">Molho</option>
          <option value="ingrediente">Ingrediente</option>
          <option value="acompanhamento">Acompanhamento</option>
        </select>

        <label className="block font-semibold mb-2">Nome:</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="border p-2 rounded w-full mb-4"
          placeholder="Ex: Barbecue, Bacon..."
        />

        <button
          onClick={adicionarItem}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full"
        >
          Adicionar
        </button>
      </div>

      {/* Cards lado a lado */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Card Molhos */}
        <div className="flex-1 bg-white rounded shadow p-4">
          <h3 className="text-xl font-semibold mb-4 text-center">Molhos</h3>
          {molhos.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum molho cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {molhos.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                  <span>{item.nome}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card Ingredientes */}
        <div className="flex-1 bg-white rounded shadow p-4">
          <h3 className="text-xl font-semibold mb-4 text-center">Ingredientes</h3>
          {ingredientes.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum ingrediente cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {ingredientes.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                  <span>{item.nome}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card Acompanhamentos */}
        <div className="flex-1 bg-white rounded shadow p-4">
          <h3 className="text-xl font-semibold mb-4 text-center">Acompanhamentos</h3>
          {acompanhamentos.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum acompanhamento cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {acompanhamentos.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                  <span>{item.nome}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
