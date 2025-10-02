'use client';
import { useState, useEffect } from 'react';
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

const countryDialCodes: Record<string, string> = { pt: '351', br: '55', us: '1' };
type Modo = 'telefone' | 'novo' | 'login' | 'recuperar' | 'definirSenha';

interface PWAInstallPromptProps {
  onInstalled?: () => void;
}

function PWAInstallPrompt({ onInstalled }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState('');
  const [counter, setCounter] = useState(5);

  useEffect(() => {
    const getManifestHref = () => {
      if (window.location.pathname.startsWith('/cliente')) return '/manifest-cliente.json';
      else if (window.location.pathname.startsWith('/pages/estabelecimento')) return '/manifest-estabelecimento.json';
      return null;
    };

    const href = getManifestHref();
    if (href) {
      const oldManifest = document.querySelector('link[rel="manifest"]');
      if (oldManifest) oldManifest.remove();
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = href;
      document.head.appendChild(manifestLink);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setInstalled(true);
      if (onInstalled) onInstalled();
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (installing && counter > 0) {
      const timer = setTimeout(() => setCounter(counter - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [installing, counter]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    setMessage(`Aguarde, app em instalação... ${counter}s`);

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      const timer = setInterval(() => {
        setCounter((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setInstalling(false);
            setInstalled(true);
            setMessage('🎉 App instalado! Clique no botão abaixo para abrir o aplicativo.');
            if (onInstalled) onInstalled();
            return 0;
          } else {
            setMessage(`Aguarde, app em instalação... ${prev - 1}s`);
            return prev - 1;
          }
        });
      }, 1000);
    } else {
      setInstalling(false);
      setMessage('Instalação cancelada.');
    }

    setDeferredPrompt(null);
    setShowButton(false);
  };

  const openApp = () => {
    window.location.href = '/cliente/login';
  };

  const progressPercentage = ((5 - counter) / 5) * 100;

  if (installed) {
    return (
      <div className="fixed bottom-4 right-4 flex flex-col items-center gap-2 bg-white p-4 rounded-lg shadow-lg w-60">
        <img src="/logo.png" alt="Logo" className="w-16 h-16 mb-2" />
        <button
          onClick={openApp}
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 w-full"
        >
          Abrir App
        </button>
        {message && <p className="text-sm text-center text-gray-700">{message}</p>}
      </div>
    );
  }

  if (!showButton) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-center gap-2 bg-white p-4 rounded-lg shadow-lg w-60">
      <img src="/logo.png" alt="Logo" className="w-16 h-16 mb-2" />
      <button
        onClick={handleInstall}
        className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 w-full flex justify-center items-center gap-2"
        disabled={installing}
      >
        {installing && (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        )}
        {installing ? `Instalando... ${counter}s` : '📲 Instalar App'}
      </button>
      {installing && (
        <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      )}
      {message && <p className="text-sm text-center text-gray-700">{message}</p>}
    </div>
  );
}

export default function LoginCliente() {
  const { gerarCodigoCliente } = useCodigos();
  const router = useRouter();

  const [appReady, setAppReady] = useState(false);
  const handleAppInstalled = () => setAppReady(true);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (standalone) setAppReady(true);
  }, []);

  const [telefone, setTelefone] = useState('');
  const [codigoPais, setCodigoPais] = useState('pt');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cliente, setCliente] = useState<any | null>(null);
  const [modo, setModo] = useState<Modo>('telefone');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // ------------------------------
  // Funções de verificação, criação, login, atualização de senha
  // ------------------------------
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

      if (snap.empty) {
        setCliente(null);
        setModo('novo');
      } else {
        const docSnap = snap.docs[0];
        const data = docSnap.data();

        if (!data.codigoPais) {
          await updateDoc(docSnap.ref, { codigoPais: codigoPaisValue });
          data.codigoPais = codigoPaisValue;
        }

        setCliente({ ref: docSnap.ref, codigoCliente: data.codigoCliente });

        if (!data.senha || !data.dataNascimento) {
          setModo('definirSenha');
        } else {
          setModo('login');
        }
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
    if (!nome) return setErro('Digite seu nome');
    if (!senha) return setErro('Digite a senha');
    if (!dataNascimento) return setErro('Digite sua data de nascimento');

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
    if (!senha) return setErro('Digite a senha');
    if (!dataNascimento) return setErro('Digite sua data de nascimento');

    setLoading(true);
    try {
      if (!cliente) {
        setErro('Cliente não encontrado');
        setLoading(false);
        return;
      }

      const clienteSnap = await getDocs(
        query(collection(db, 'clientes'), where('codigoCliente', '==', cliente.codigoCliente))
      );

      if (clienteSnap.empty) {
        setErro('Cliente não encontrado');
        setLoading(false);
        return;
      }

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
      if (!cliente) {
        setErro('Cliente não encontrado');
        setLoading(false);
        return;
      }

      const clienteDataSnap = await getDocs(
        query(collection(db, 'clientes'), where('codigoCliente', '==', cliente.codigoCliente))
      );

      if (clienteDataSnap.empty) {
        setErro('Cliente não encontrado');
        setLoading(false);
        return;
      }

      const clienteData = clienteDataSnap.docs[0].data();

      if (senha === clienteData.senha) {
        localStorage.setItem('clienteCodigo', cliente.codigoCliente);
        router.push('/cliente/dashboard');
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

  const iniciarRecuperacao = () => {
    setModo('recuperar');
    setSenha('');
    setDataNascimento('');
    setErro('');
  };

  const cardVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -50 } };

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <>
      <Head>
        <title>Área do Cliente - Top Pizzas</title>
        <link rel="manifest" href="/manifest-cliente.json" />
      </Head>

      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-blue-50 to-white px-4">
        {!appReady && <PWAInstallPrompt onInstalled={handleAppInstalled} />}

        {appReady && (
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

              {/* ----------------------- */}
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
                    className={`w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-blue-700 transition ${
                      loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                    Continuar
                  </button>
                </div>
              )}

              {/* ----------------------- */}
              {/* 2️⃣ Cadastro completo */}
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
                    className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${
                      loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                    Criar Cliente
                  </button>
                </div>
              )}

              {/* ----------------------- */}
              {/* 3️⃣ Login */}
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
                    className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${
                      loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                    Entrar
                  </button>

                  <button onClick={iniciarRecuperacao} className="w-full text-blue-600 font-semibold hover:underline">
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {/* ----------------------- */}
              {/* 4️⃣ Definir senha */}
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
                    className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${
                      loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                    Salvar
                  </button>
                </div>
              )}

              {/* ----------------------- */}
              {/* 5️⃣ Recuperar senha */}
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
                    className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${
                      loading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
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
