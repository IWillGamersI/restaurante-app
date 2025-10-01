'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { FiPhone, FiLock, FiCalendar, FiUser } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { motion, AnimatePresence } from 'framer-motion';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import bcrypt from 'bcryptjs';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useCodigos } from '@/hook/useCodigos';

const countryDialCodes: Record<string, string> = {
  pt: '351',
  br: '55',
  us: '1',
};

export default function LoginCliente() {
  const { gerarCodigoCliente } = useCodigos();
  const router = useRouter();

  const [telefone, setTelefone] = useState('');
  const [codigoPais, setCodigoPais] = useState('pt');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cliente, setCliente] = useState<any | null>(null);
  const [novoCadastro, setNovoCadastro] = useState(false);
  const [cadastrarSenha, setCadastrarSenha] = useState(false);
  const [redefinirSenha, setRedefinirSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // ------------------------------
  // VERIFICAR TELEFONE
  // ------------------------------
  const verificarTelefone = async () => {
    setErro('');
    if (!telefone) return setErro('Digite seu número de telefone');

    setLoading(true);
    try {
      const q = query(collection(db, 'clientes'), where('telefone', '==', telefone));
      const snap = await getDocs(q);

      if (snap.empty) {
        // Novo cliente
        setCliente(null);
        setNovoCadastro(true);
        setCadastrarSenha(false);
        setRedefinirSenha(false);
      } else {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        setCliente({ ref: docSnap.ref, ...data });

        setTelefone(String(data.telefone));
        setCodigoPais(
          data.codigoPais
            ? Object.keys(countryDialCodes).find(k => countryDialCodes[k] === String(data.codigoPais)) || 'pt'
            : 'pt'
        );

        if (!data.senha) {
          // Cliente existe mas ainda não tem senha
          setCadastrarSenha(true);
          setNovoCadastro(false);
          setRedefinirSenha(false);
        } else {
          // Cliente com senha existente → login ou redefinir
          setCadastrarSenha(false);
          setNovoCadastro(false);
          setRedefinirSenha(false);
        }
      }
    } catch (err) {
      console.error(err);
      setErro('Erro ao verificar telefone');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // CRIAR NOVO CLIENTE
  // ------------------------------
  const criarCliente = async () => {
    setErro('');
    if (!nome) return setErro('Digite seu nome');
    if (!senha) return setErro('Digite sua senha');
    if (!dataNascimento) return setErro('Digite sua data de nascimento');

    setLoading(true);
    try {
      const codigoCliente = gerarCodigoCliente(nome, telefone);
      const clienteRef = doc(collection(db, 'clientes'));

      await setDoc(clienteRef, {
        nome,
        telefone,
        codigoPais: countryDialCodes[codigoPais] || '351',
        criadoEm: new Date(),
        codigoCliente,
        senha,
        dataNascimento,
      });

      setCliente({ ref: clienteRef, nome, telefone, codigoPais, codigoCliente, senha, dataNascimento });
      localStorage.setItem('clienteCodigo', codigoCliente);
      setNovoCadastro(false);
      router.push('/pages/cliente/dashboard');
    } catch (err) {
      console.error(err);
      setErro('Erro ao criar cliente');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // CADASTRAR SENHA PARA CLIENTE EXISTENTE
  // ------------------------------
  const cadastrarSenhaCliente = async () => {
    setErro('');
    if (!senha) return setErro('Digite sua senha');
    if (!dataNascimento) return setErro('Digite sua data de nascimento');

    setLoading(true);
    try {
      if (!cliente) {
        setErro('Cliente não encontrado');
        setLoading(false);
        return;
      }

      await updateDoc(cliente.ref, { senha, dataNascimento });
      setCadastrarSenha(false);
      localStorage.setItem('clienteCodigo', cliente.codigoCliente);
      router.push('/pages/cliente/dashboard');
    } catch (err) {
      console.error(err);
      setErro('Erro ao cadastrar senha');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // LOGIN
  // ------------------------------
  const logarCliente = async () => {
    setErro('');
    if (!senha) return setErro('Digite a senha');

    setLoading(true);
    try {
      if (!cliente) {
        setErro('Telefone não cadastrado');
        setLoading(false);
        return;
      }

      if (senha === cliente.senha) {
        localStorage.setItem('clienteCodigo', cliente.codigoCliente);
        router.push('/pages/cliente/dashboard');
      } else {
        setErro('Senha incorreta');
      }
    } catch (err) {
      console.error(err);
      setErro('Erro ao logar');
    } finally {
      setLoading(false);
    }
  };

  const iniciarRedefinicao = () => {
    setRedefinirSenha(true);
    setNovoCadastro(false);
    setCadastrarSenha(false);
    setSenha('');
    setDataNascimento('');
    setErro('');
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-blue-50 to-white px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${cliente?.senha ?? ''}-${novoCadastro}-${cadastrarSenha}-${redefinirSenha}`}
          className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl space-y-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={cardVariants}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-center text-blue-700">Área do Cliente</h1>

          {/* ------------------------------ */}
          {/* INPUT TELEFONE */}
          {/* ------------------------------ */}
          {!cliente && !novoCadastro && !cadastrarSenha && !redefinirSenha && (
            <div className="space-y-4">
              <div className="relative">
                <FiPhone className="absolute left-3 top-3 text-gray-400 text-xl" />
                <PhoneInput
                  country={codigoPais}
                  value={telefone}
                  onChange={(value: string, data: any) => {
                    const numbersOnly = value.replace(/\D/g, '');
                    const dial = (data?.dialCode) || countryDialCodes[codigoPais] || '';
                    const localNumber = dial && numbersOnly.startsWith(dial) ? numbersOnly.slice(dial.length) : numbersOnly;
                    setTelefone(localNumber);
                    if (data?.countryCode) setCodigoPais(data.countryCode);
                  }}
                  inputClass="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  buttonClass="rounded-l-lg"
                  enableSearch
                  disableCountryCode
                  placeholder="Telefone"
                  disableCountryGuess
                />
              </div>

              <button
                onClick={verificarTelefone}
                disabled={loading}
                className={`w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-blue-700 transition ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                Continuar
              </button>
            </div>
          )}

          {/* ------------------------------ */}
          {/* NOVO CADASTRO */}
          {/* ------------------------------ */}
          {novoCadastro && (
            <div className="space-y-4">
              <div className="relative">
                <FiUser className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="text"
                  placeholder="Digite seu nome"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="password"
                  placeholder="Senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>

              <div className="relative">
                <FiCalendar className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={e => setDataNascimento(e.target.value)}
                  className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>

              <button
                onClick={criarCliente}
                disabled={loading}
                className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                Criar Conta
              </button>
            </div>
          )}

          {/* ------------------------------ */}
          {/* CADASTRAR SENHA */}
          {/* ------------------------------ */}
          {cadastrarSenha && (
            <div className="space-y-4">
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="password"
                  placeholder="Cadastrar senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>

              <div className="relative">
                <FiCalendar className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={e => setDataNascimento(e.target.value)}
                  className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>

              <button
                onClick={cadastrarSenhaCliente}
                disabled={loading}
                className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                Cadastrar Senha
              </button>
            </div>
          )}

          {/* ------------------------------ */}
          {/* LOGIN */}
          {/* ------------------------------ */}
          {!novoCadastro && !cadastrarSenha && (
            <div className="space-y-4">
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-gray-400 text-xl" />
                <input
                  type="password"
                  placeholder="Senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>

              <button
                onClick={logarCliente}
                disabled={loading}
                className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                Entrar
              </button>

              <button
                onClick={iniciarRedefinicao}
                className="w-full text-blue-600 font-semibold hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {erro && <p className="text-red-500 mt-4 text-center">{erro}</p>}
        </motion.div>
      </AnimatePresence>

      <PWAInstallPrompt />
    </div>
  );
}
