'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const router = useRouter();

  const login = async () => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const uid = cred.user.uid;

      const docRef = doc(db, 'usuarios', uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setErro('Usuário não encontrado no Firestore');
        return;
      }

      const data = docSnap.data();

      // Redirecionamento por papel
      switch (data.role) {
        case 'admin':
          router.push('/pages/admin/dashboard');
          break;
        case 'loja':
          router.push('/pages/loja');
          break;
        case 'cozinha':
          router.push('/pages/cozinha');
          break;
        case 'painel':
          router.push('/pages/salao/painel');
          break;
        case 'divulgacao':
          router.push('/pages/salao/divulgacao');
          break;
        default:
          setErro('Função desconhecida');
      }
    } catch (err) {
      console.error(err);
      setErro('Erro ao fazer login');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 justify-center min-h-screen bg-gray-100 text-gray-500">
      {/* Logo da pizzaria */}
      <img src="/logo.png" alt="Logo Top Pizzas" width={250} height={250} className='rounded-full border-6 text-orange-500' />
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h1 className="text-xl mb-4 font-bold text-center">Login</h1>

        <input
          type="email"
          className="w-full mb-2 p-2 border rounded"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full mb-2 p-2 border rounded"
          placeholder="Senha"
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && <p className="text-red-500 text-sm mb-2">{erro}</p>}

        <button
          onClick={login}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
