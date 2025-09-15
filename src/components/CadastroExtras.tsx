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
import { Trash2 } from 'lucide-react';
import { TipoExtra } from '@/types';



export default function CadastroExtras() {
  const [tipo, setTipo] = useState<TipoExtra | ''>();
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState<{ id: string; nome: string; tipo: TipoExtra; valor: number }[]>([]);
  const [valor,setValor] = useState< number | ''>('')

  useEffect(() => {
    // Busca TODOS os extras
    const unsubscribe = onSnapshot(collection(db, 'extras'), (snap) => {
      const dados = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as {
        id: string;
        nome: string;
        tipo: TipoExtra;
        valor: number
      }[];
      setItens(dados);
    });

    return () => unsubscribe();
  }, []);

  const adicionarItem = async () => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    // Evita duplicados no mesmo tipo
    const duplicado = itens.some(item => item.tipo === tipo && item.nome.toLowerCase() === nomeLimpo.toLowerCase() && item.valor === valor);
    if (duplicado) return alert('Item já cadastrado.');

    await addDoc(collection(db, 'extras'), {
      nome: nomeLimpo,
      tipo,
      valor: valor || 0
    });
    setNome('');
    setTipo('');
    setValor('')

  };

  const removerItem = async (id: string) => {
    await deleteDoc(doc(db, 'extras', id));
  };

  function orderLista(lista, qualtipo){
      return lista
              .filter(item => item.tipo === qualtipo)
              .slice()
              .sort((a,b) => {
                if(a.nome === 'Não Obrigado!!!' && b.nome !== 'Não Obrigado!!!') return -1
                if(a.nome !== 'Não Obrigado!!!' && b.nome === 'Não Obrigado!!!') return 1

                return a.nome.localeCompare(b.nome, 'pt-BR', {sensitivity: 'base'})
              })
  }

  // Separar por tipo
  const molhos = orderLista(itens,'molho')
  const ingredientes = orderLista(itens,'ingrediente')
  const ingredientesplus = orderLista(itens,'ingredienteplus')
  const acompanhamentos = orderLista(itens,'acompanhamento')
  const ingredienteacai = orderLista(itens,'acai')  
  const ingredienteacaiplus = orderLista(itens,'acaiplus')
  const bebidaestudante = orderLista(itens,'bebida-estudante')

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">Cadastro de Itens Extras</h2>

      {/* Formulário para adicionar */}
      <div className="flex justify-between items-center gap-3 mb-5">
        <div className='w-full'>
          <label className="block font-semibold text-sm">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoExtra)}
            className="border p-3 rounded w-full "
          >
            <option value="">Escolha o tipo...</option>
            <option value="molho">Molho</option>
            <option value="ingrediente">Ingrediente</option>
            <option value="ingredienteplus">Ingrediente Plus</option>
            <option value="acompanhamento">Acompanhamento</option>
            <option value="acai">Açai</option>
            <option value="acaiplus">Açai Plus</option>
            <option value="bebida-estudante">Bebida Estudante</option>
          </select>
        </div>

        <div className='w-full'>
          <label className="block font-semibold text-sm">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border p-2 rounded w-full"
            placeholder="Ex: Barbecue, Bacon..."
          />
        </div>

        <div className='w-full'>
          <label className="block font-semibold text-sm">Valor</label>
          <input 
            type="number"
            className="border p-2 rounded w-full"
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
          />
        </div>


        <div className='w-full flex items-end'>
          <button
            onClick={adicionarItem}
            className="w-full p-3 bg-blue-600 text-white cursor-pointer rounded hover:bg-blue-700 "
          >
            Adicionar
          </button>
        </div>

      </div>

      {/* Cards lado a lado */}
      <div className="grid grid-cols-3 md:flex-row gap-6">
        {/* Card Molhos */}
        <div className="flex-1 bg-white rounded shadow p-4 h-85 overflow-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">Molhos</h3>
          {molhos.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum molho cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {molhos.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded gap-2">
                  <span className='flex-1'>{item.nome}</span>
                  <span>€ {(item.valor.toFixed(2))}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 p-1 rounded-full hover:bg-red-600 hover:text-white text-sm cursor-pointer"
                  >
                    <Trash2 size={20}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card Ingredientes */}
        <div className="flex-1 bg-white rounded shadow p-4 h-85 overflow-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">Ingredientes</h3>
          {ingredientes.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum ingrediente cadastrado.</p>
          ) : (
            <ul className="space-y-2 ">
              {ingredientes.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded gap-2">
                  <span className='flex-1'>{item.nome}</span>
                  <span>€ {(item.valor.toFixed(2))}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 p-1 rounded-full hover:bg-red-600 hover:text-white text-sm cursor-pointer"
                  >
                    <Trash2 size={20}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card Ingredientes */}
        <div className="flex-1 bg-white rounded shadow p-4 h-85 overflow-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">Ingredientes Plus</h3>
          {ingredientesplus.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum ingrediente cadastrado.</p>
          ) : (
            <ul className="space-y-2 ">
              {ingredientesplus.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded gap-2">
                  <span className='flex-1'>{item.nome}</span>
                  <span>€ {(item.valor.toFixed(2))}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 p-1 rounded-full hover:bg-red-600 hover:text-white text-sm cursor-pointer"
                  >
                    <Trash2 size={20}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card Acompanhamentos */}
        <div className="flex-1 bg-white rounded shadow p-4 h-85 overflow-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">Acompanhamentos</h3>
          {acompanhamentos.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum acompanhamento cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {acompanhamentos.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded gap-2">
                  <span className='flex-1'>{item.nome}</span>
                  <span>€ {(item.valor.toFixed(2))}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 p-1 rounded-full hover:bg-red-600 hover:text-white text-sm cursor-pointer"
                  >
                    <Trash2 size={20}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card Ingrediente Açai */}
        <div className="flex-1 bg-white rounded shadow p-4 h-85 overflow-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">Ingredientes Açai</h3>
          {ingredienteacai.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum ingrediente cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {ingredienteacai.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded gap-2">
                  <span className='flex-1'>{item.nome}</span>
                  <span>€ {(item.valor.toFixed(2))}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 p-1 rounded-full hover:bg-red-600 hover:text-white text-sm cursor-pointer"
                  >
                    <Trash2 size={20}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card Ingrediente Açai */}
        <div className="flex-1 bg-white rounded shadow p-4 h-85 overflow-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">Ingredientes Açai Plus</h3>
          {ingredienteacaiplus.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum ingrediente cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {ingredienteacaiplus.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded gap-2">
                  <span className='flex-1'>{item.nome}</span>
                  <span>€ {(item.valor.toFixed(2))}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 p-1 rounded-full hover:bg-red-600 hover:text-white text-sm cursor-pointer"
                  >
                    <Trash2 size={20}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Card Bebida Estudante */}
        <div className="flex-1 bg-white rounded shadow p-4 h-85 overflow-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">Bebidas Estudante</h3>
          {bebidaestudante.length === 0 ? (
            <p className="text-gray-500 text-center">Nenhum ingrediente cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {bebidaestudante.map(item => (
                <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded gap-2">
                  <span className='flex-1'>{item.nome}</span>
                  <span>€ {(item.valor.toFixed(2))}</span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="text-red-600 p-1 rounded-full hover:bg-red-600 hover:text-white text-sm cursor-pointer"
                  >
                    <Trash2 size={20}/>
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
