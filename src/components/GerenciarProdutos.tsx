'use client'
import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Plus, Trash2, Edit, ImageIcon, DollarSign, Package } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  imagemUrl: string;
  preco: number;
  precoCusto: number;
}

export default function GerenciarProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [preco, setPreco] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    const snap = await getDocs(collection(db, 'produtos'));
    const lista = snap.docs.map((docu) => ({ id: docu.id, ...docu.data() })) as Produto[];
    setProdutos(lista);
  };

  const limparCampos = () => {
    setNome('');
    setDescricao('');
    setImagemUrl('');
    setPreco('');
    setPrecoCusto('');
    setEditandoId(null);
    setErro('');
    setSucesso('');
  };

  const salvarProduto = async () => {
    if (!nome || !preco || !precoCusto) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    const dados = {
      nome,
      descricao,
      imagemUrl,
      preco: Number(preco),
      precoCusto: Number(precoCusto),
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, 'produtos', editandoId), dados);
        setSucesso('Produto atualizado com sucesso.');
      } else {
        await addDoc(collection(db, 'produtos'), dados);
        setSucesso('Produto cadastrado com sucesso.');
      }
      limparCampos();
      carregarProdutos();
    } catch (err) {
      console.error(err);
      setErro('Erro ao salvar produto.');
    }
  };

  const editar = (p: Produto) => {
    setNome(p.nome);
    setDescricao(p.descricao);
    setImagemUrl(p.imagemUrl);
    setPreco(p.preco.toString());
    setPrecoCusto(p.precoCusto.toString());
    setEditandoId(p.id);
  };

  const remover = async (id: string) => {
    if (!confirm('Remover este produto?')) return;
    await deleteDoc(doc(db, 'produtos', id));
    carregarProdutos();
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Package className="text-blue-500" /> {editandoId ? 'Editar Produto' : 'Novo Produto'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            className="border p-3 rounded-lg"
            placeholder="Nome do produto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            type="text"
            className="border p-3 rounded-lg"
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          <input
            type="url"
            className="border p-3 rounded-lg"
            placeholder="URL da imagem"
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
          />

          <input
            type="number"
            className="border p-3 rounded-lg"
            placeholder="Preço de Venda"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />

          <input
            type="number"
            className="border p-3 rounded-lg"
            placeholder="Preço de Custo"
            value={precoCusto}
            onChange={(e) => setPrecoCusto(e.target.value)}
          />
        </div>

        {erro && <p className="text-red-500 mt-2">{erro}</p>}
        {sucesso && <p className="text-green-600 mt-2">{sucesso}</p>}

        <div className="flex gap-3 mt-4">
          <button
            onClick={salvarProduto}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-blue-700"
          >
            <Plus size={18} /> {editandoId ? 'Salvar' : 'Cadastrar'}
          </button>

          {editandoId && (
            <button
              onClick={limparCampos}
              className="bg-gray-400 text-white px-5 py-2 rounded-lg cursor-pointer hover:bg-gray-500"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="text-green-500" /> Produtos Cadastrados
        </h2>

        {produtos.length === 0 ? (
          <p className="text-gray-500">Nenhum produto cadastrado.</p>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {produtos.map((p) => (
              <div key={p.id} className="border rounded-xl p-4 shadow-sm">
                {p.imagemUrl && (
                  <img
                    src={p.imagemUrl}
                    alt={p.nome}
                    className="w-full h-40 object-contain rounded mb-3"
                  />
                )}
                <h3 className="font-semibold text-lg">{p.nome}</h3>
                <p className="text-gray-600 text-sm mb-2">{p.descricao}</p>
                <p className="text-blue-600 font-medium">
                  Venda: € {Number(p.preco).toFixed(2)}
                </p>
                <p className="text-red-500 text-sm">
                  Custo: € {Number(p.precoCusto).toFixed(2)}
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => editar(p)}
                    className="text-blue-500 p-2 rounded cursor-pointer hover:bg-blue-600 flex items-center gap-1 hover:text-white"
                  >
                    <Edit size={16} /> Editar
                  </button>
                  <button
                    onClick={() => remover(p.id)}
                    className="text-red-500 p-2 cursor-pointer rounded hover:bg-red-600 flex items-center gap-1 hover:text-white"
                  >
                    <Trash2 size={16} /> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
