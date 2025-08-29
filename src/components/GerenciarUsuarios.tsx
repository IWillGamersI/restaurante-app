'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import {
  User,
  Mail,
  Lock,
  Shield,
  Pencil,
  Trash2,
  XCircle,
  CheckCircle,
} from 'lucide-react';

interface Usuario {
  id: string;
  usuario: string;
  role: string;
  email?: string;
  senha?: string;
}

export default function GerenciarUsuarios() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [acessoPermitido, setAcessoPermitido] = useState(false);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuario, setUsuario] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [idParaRemover, setIdParaRemover] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      const snap = await getDoc(doc(db, 'usuarios', user.uid));
      const data = snap.data();
      if (data?.role === 'admin') {
        setAcessoPermitido(true);
        carregarUsuarios();
      } else {
        router.push('/login');
      }

      setCarregando(false);
    });

    return () => unsubscribe();
  }, [router]);

  const carregarUsuarios = async () => {
    const snap = await getDocs(collection(db, 'usuarios'));
    const lista = snap.docs.map((docu) => ({
      id: docu.id,
      ...docu.data(),
    })) as Usuario[];
    setUsuarios(lista);
  };

  const limparCampos = () => {
    setUsuario('');
    setRole('');
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
    setEditandoId(null);
    setErro('');
    setSucesso('');
  };

  const salvarUsuario = async () => {
    setErro('');
    setSucesso('');

    if (!usuario || !role || !email || !senha || !confirmarSenha) {
      setErro('Preencha todos os campos.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.');
      return;
    }

    const dados: any = {
      usuario,
      role,
      email,
      senha,
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, 'usuarios', editandoId), dados);
        setSucesso('Usuário atualizado com sucesso.');
      } else {
        await addDoc(collection(db, 'usuarios'), dados);
        setSucesso('Usuário cadastrado com sucesso.');
      }

      limparCampos();
      carregarUsuarios();
    } catch (err) {
      console.error(err);
      setErro('Erro ao salvar usuário.');
    }
  };

  const editar = (u: Usuario) => {
    setUsuario(u.usuario);
    setRole(u.role);
    setEmail(u.email || '');
    setSenha(u.senha || '');
    setConfirmarSenha(u.senha || '');
    setEditandoId(u.id);
  };

  const confirmarRemocao = (id: string) => {
    setIdParaRemover(id);
  };

  const remover = async () => {
    if (!idParaRemover) return;
    await deleteDoc(doc(db, 'usuarios', idParaRemover));
    setIdParaRemover(null);
    carregarUsuarios();
  };

  if (carregando) return <p className="p-4">Verificando acesso...</p>;
  if (!acessoPermitido) return null;

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg space-y-6 text-gray-800">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="text-blue-600" /> {editandoId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
      </h2>

      <div className="grid gap-4">
        <Input
          icon={<User />}
          placeholder="Usuário"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <Input
          icon={<Mail />}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <Input
          icon={<Lock />}
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          type="password"
        />
        <Input
          icon={<Lock />}
          placeholder="Confirmar senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          type="password"
        />

        <select
          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-blue-500"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Selecione a role</option>
          <option value="admin">Admin</option>
          <option value="loja">Loja</option>
          <option value="cozinha">Cozinha</option>
          <option value="divulgacao">Divulgacao</option>
          <option value="painel">Painel</option>
        </select>

        {erro && <p className="text-red-500 flex items-center gap-2"><XCircle className="w-5 h-5" /> {erro}</p>}
        {sucesso && <p className="text-green-600 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> {sucesso}</p>}

        <div className="flex gap-3">
          <button
            onClick={salvarUsuario}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {editandoId ? 'Salvar Alterações' : 'Cadastrar'}
          </button>
          {editandoId && (
            <button
              onClick={limparCampos}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-6">Usuários Cadastrados</h2>

      {usuarios.length === 0 ? (
        <p className="text-gray-500">Nenhum usuário cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="flex justify-between items-center p-3 bg-gray-100 rounded-lg"
            >
              <div>
                <p className="font-medium">{u.usuario} — {u.role}</p>
                {u.email && <p className="text-sm text-gray-600">{u.email}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => editar(u)}
                  className="text-blue-600 cursor-pointer rounded-full p-3 hover:bg-blue-800 hover:text-white"
                  title="Editar"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={() => confirmarRemocao(u.id)}
                  className="text-red-600 cursor-pointer rounded-full p-3 hover:bg-red-800 hover:text-white"
                  title="Remover"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação */}
      {idParaRemover && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
            <p className="text-lg font-medium">Deseja realmente remover este usuário?</p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setIdParaRemover(null)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={remover}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable input component com ícone
function Input({
  icon,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div className="relative">
      <div className="absolute top-2.5 left-3 text-gray-400">{icon}</div>
      <input
        type={type}
        className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:outline-blue-500"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
