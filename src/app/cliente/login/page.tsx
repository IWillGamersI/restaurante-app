'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { FiPhone, FiLock, FiCalendar, FiUser } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useCodigos } from '@/hook/useCodigos';
import Head from 'next/head';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

const countryDialCodes: Record<string, string> = { pt: '351', br: '55', us: '1' };
type Modo = 'telefone' | 'novo' | 'login' | 'recuperar' | 'definirSenha';

export default function LoginCliente() {
  const { gerarCodigoCliente } = useCodigos();
  const router = useRouter();

  // -------- Campos do login --------
  const [telefone, setTelefone] = useState('');
  const [codigoPais, setCodigoPais] = useState('pt');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cliente, setCliente] = useState<any | null>(null);
  const [modo, setModo] = useState<Modo>('telefone');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // -------- Detecta se está rodando dentro do PWA --------
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(standalone);
  }, []);

  // -------- Funções de login/cadastro --------
  const verificarTelefone = async () => {
    setErro('');
    if (!telefone) return setErro('Digite seu número de telefone');
    const codigoPaisValue = countryDialCodes[codigoPais] || '351';
    setLoading(true);

    try {
      const q = query(
        collection(db, 'clientes'),
        where('codigoPais', '==', codigoPaisValue),
        where('telefone', '==', telefone)
      );
      const snap = await getDocs(q);
      if (snap.empty) setModo('novo');
      else {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        if (!data.codigoPais) await updateDoc(docSnap.ref, { codigoPais: codigoPaisValue });
        setCliente({ ref: docSnap.ref, codigoCliente: data.codigoCliente });
        if (!data.senha || !data.dataNascimento) setModo('definirSenha');
        else setModo('login');
      }
    } catch (err) {
      console.error(err);
      setErro('Erro ao verificar telefone');
    } finally {
      setLoading(false);
    }
  };

  const criarCliente = async () => {
    setErro('');
    if (!nome || !senha || !dataNascimento) return setErro('Preencha todos os campos');
    setLoading(true);

    try {
      const codigoCliente = gerarCodigoCliente(nome, telefone);
      const clienteRef = doc(collection(db, 'clientes'));
      await setDoc(clienteRef, {
        telefone,
        codigoPais: countryDialCodes[codigoPais] || '351',
        nome,
        criadoEm: new Date(),
        codigoCliente,
        senha,
        dataNascimento,
        cartaoFidelidade: [],
      });
      setCliente({ ref: clienteRef, codigoCliente });
      localStorage.setItem('clienteCodigo', codigoCliente);
      router.push('/cliente/dashboard');
    } catch (err) {
      console.error(err);
      setErro('Erro ao criar cliente');
    } finally {
      setLoading(false);
    }
  };

  const cadastrarOuAtualizarSenha = async () => {
    setErro('');
    if (!senha || !dataNascimento) return setErro('Preencha todos os campos');
    setLoading(true);

    try {
      if (!cliente) return setErro('Cliente não encontrado');
      await updateDoc(cliente.ref, { senha, dataNascimento });
      localStorage.setItem('clienteCodigo', cliente.codigoCliente);
      router.push('/cliente/dashboard');
    } catch (err) {
      console.error(err);
      setErro('Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  const logarCliente = async () => {
    setErro('');
    if (!senha) return setErro('Digite a senha');
    setLoading(true);

    try {
      if (!cliente) return setErro('Cliente não encontrado');
      const clienteSnap = await getDocs(
        query(collection(db, 'clientes'), where('codigoCliente', '==', cliente.codigoCliente))
      );
      if (clienteSnap.empty) return setErro('Cliente não encontrado');

      const data = clienteSnap.docs[0].data();
      if (senha === data.senha) {
        localStorage.setItem('clienteCodigo', cliente.codigoCliente);
        router.push('/cliente/dashboard');
      } else setErro('Senha incorreta');
    } catch (err) {
      console.error(err);
      setErro('Erro ao logar');
    } finally {
      setLoading(false);
    }
  };

  const iniciarRecuperacao = () => {
    setModo('recuperar');
    setSenha('');
    setDataNascimento('');
    setErro('');
  };

  const cardVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -50 } };

  return (
    <>
      <Head>
        <title>Área do Cliente - Top Pizzas</title>
      </Head>

      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-blue-50 to-white px-4">
        {/* ------------------------- */}
        {/* PWA Install Prompt */}
        {/* ------------------------- */}
        {!isStandalone && <PWAInstallPrompt />}

        {/* ------------------------- */}
        {/* Tela de login só dentro do PWA */}
        {/* ------------------------- */}
        {isStandalone && (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${cliente?.codigoCliente ?? ''}-${modo}`}
              className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl space-y-6"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={cardVariants}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-3xl font-bold text-center text-blue-700">Área do Cliente</h1>

              {/* 1️⃣ Apenas telefone */}
              {modo === 'telefone' && (
                <div className="space-y-4">
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-3 text-gray-400 text-xl" />
                    <PhoneInput
                      country={codigoPais}
                      value={telefone}
                      onChange={(value: string, data: any) => {
                        const numbersOnly = value.replace(/\D/g, '');
                        const dial = (data && data.dialCode) || countryDialCodes[codigoPais] || '';
                        const localNumber = dial && numbersOnly.startsWith(dial) ? numbersOnly.slice(dial.length) : numbersOnly;
                        setTelefone(localNumber);
                        if (data && data.countryCode) setCodigoPais(data.countryCode);
                      }}
                      inputClass="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      buttonClass="rounded-l-lg"
                      enableSearch
                      disableCountryCode={true}
                      placeholder="Telefone"
                      disableCountryGuess={true}
                    />
                  </div>

                  <button
                    onClick={verificarTelefone}
                    disabled={loading}
                    className={`w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-blue-700 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                    Continuar
                  </button>
                </div>
              )}

              {/* ------------------------- */}
              {/* Outras telas (novo, login, definirSenha, recuperar) */}
              {/* Mesmas da versão anterior */}
              {/* ------------------------- */}
              {modo === 'novo' && (
                <div className="space-y-4">
                  <div className="relative">
                    <FiUser className="absolute left-3 top-3 text-gray-400 text-xl" />
                    <input
                      type="text"
                      placeholder="Digite seu nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div className="relative">
                    <FiLock className="absolute left-3 top-3 text-gray-400 text-xl" />
                    <input
                      type="password"
                      placeholder="Senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>

                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-3 text-gray-400 text-xl" />
                    <input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>

                  <button
                    onClick={criarCliente}
                    disabled={loading}
                    className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                    Criar Cliente
                  </button>
                </div>
              )}

              {/* Login, definirSenha, recuperar... mesmas funções */}
              {modo === 'login' && cliente && (
                <div className="space-y-4">
                  <div className="relative">
                    <FiLock className="absolute left-3 top-3 text-gray-400 text-xl" />
                    <input
                      type="password"
                      placeholder="Senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>

                  <button
                    onClick={logarCliente}
                    disabled={loading}
                    className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                    Entrar
                  </button>

                  <button
                    onClick={iniciarRecuperacao}
                    className="w-full text-blue-600 font-semibold hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {modo === 'definirSenha' && cliente && (
                <div className="space-y-4">
                  <div className="relative">
                    <FiLock className="absolute left-3 top-3 text-gray-400 text-xl" />
                    <input
                      type="password"
                      placeholder="Defina sua senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>

                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-3 text-gray-400 text-xl" />
                    <input
                      type="date"
                      placeholder="Data de nascimento"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>

                  <button
                    onClick={cadastrarOuAtualizarSenha}
                    disabled={loading}
                    className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                    Salvar
                  </button>
                </div>
              )}

              {modo === 'recuperar' && cliente && (
                <div className="space-y-4">
                  <div className="relative">
                    <FiLock className="absolute left-3 top-3 text-gray-400 text-xl" />
                    <input
                      type="password"
                      placeholder="Nova senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>

                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-3 text-gray-400 text-xl" />
                    <input
                      type="date"
                      placeholder="Data de nascimento"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    />
                  </div>

                  <button
                    onClick={cadastrarOuAtualizarSenha}
                    disabled={loading}
                    className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                    Redefinir Senha
                  </button>
                </div>
              )}

              {erro && <p className="text-red-500 mt-4 text-center">{erro}</p>}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </>
  );
}
