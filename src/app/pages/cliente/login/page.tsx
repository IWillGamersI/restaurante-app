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
import Head from 'next/head';

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
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // Verifica se telefone existe
  const verificarTelefone = async () => {
    if (!telefone) return setErro('Digite seu número de telefone');
    setLoading(true);
    try {
      const q = query(collection(db, 'clientes'), where('telefone', '==', telefone));
      const snap = await getDocs(q);

      if (snap.empty) {
        // Novo cadastro
        setCliente(null);
        setNovoCadastro(true);
        setErro('');
      } else {
        const data = snap.docs[0].data();
        setCliente({ ref: snap.docs[0].ref, ...data });
        setCodigoPais(
          data.codigoPais
            ? Object.keys(countryDialCodes).find(k => countryDialCodes[k] === data.codigoPais) || 'pt'
            : 'pt'
        );
        setNovoCadastro(!data.senha); // precisa criar senha se não tiver
        setErro('');
      }
    } catch (err) {
      console.error(err);
      setErro('Erro ao verificar telefone');
    } finally {
      setLoading(false);
    }
  };

  // Criar ou atualizar senha
  const criarOuAtualizarSenha = async () => {
    if (!senha) return setErro("Digite a senha");
    if (!dataNascimento) return setErro("Digite sua data de nascimento");

    setLoading(true);
    try {
      let clienteRef;
      let codigoCliente = "";

      if (!cliente) {
        // Novo cliente
        codigoCliente = gerarCodigoCliente(nome, telefone);
        clienteRef = doc(collection(db, "clientes"));
        await setDoc(clienteRef, {
          telefone,
          codigoPais: countryDialCodes[codigoPais] || "351",
          nome,
          criadoEm: new Date(),
          codigoCliente,
          senha: "",
          dataNascimento,
        });

        // Atualiza estado para cliente criado
        setCliente({
          ref: clienteRef,
          telefone,
          codigoPais: countryDialCodes[codigoPais] || "351",
          nome,
          codigoCliente,
          senha: "",
          dataNascimento,
        });
      } else {
        clienteRef = cliente.ref;

        // Recuperação de senha exige data de nascimento correta
        if (recuperandoSenha && cliente.dataNascimento !== dataNascimento) {
          setErro("Data de nascimento não confere");
          setLoading(false);
          return;
        }

        codigoCliente = cliente.codigoCliente || "";
      }

      // Atualiza senha
      const senhaHash = await bcrypt.hash(senha, 10);
      await updateDoc(clienteRef, { senha: senhaHash, dataNascimento });

      // Atualiza localStorage
      localStorage.setItem("clienteCodigo", codigoCliente);

      // Redireciona para dashboard
      router.push("/pages/cliente/dashboard");
    } catch (err) {
      console.error(err);
      setErro("Erro ao criar ou atualizar senha");
    } finally {
      setLoading(false);
    }
  };


  // Login
  const logarCliente = async () => {
    if (!senha) return setErro('Digite a senha');

    setLoading(true);
    try {
      if (!cliente) {
        setErro('Telefone não cadastrado');
        setLoading(false);
        return;
      }

      const senhaValida = await bcrypt.compare(senha, cliente.senha);

      if (senhaValida) {
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

  const iniciarRecuperacao = () => {
    setRecuperandoSenha(true);
    setNovoCadastro(false);
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
    <>
      <Head>
        <title>Login Cliente - Top Pizzas</title>
        <meta name="description" content="Área de login do cliente Top Pizzas" />
        <link rel="manifest" href="/manifest-cliente.json" />
        <meta name="theme-color" content="#1976d2" />
      </Head>
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-blue-50 to-white px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${cliente?.senha}-${novoCadastro}-${recuperandoSenha}`}
            className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl space-y-6"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={cardVariants}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold text-center text-blue-700">Área do Cliente</h1>

            {/* Input Telefone */}
            {!cliente && !novoCadastro && !recuperandoSenha && (
              <div className="space-y-4">
                <div className="relative">
                  <FiPhone className="absolute left-3 top-3 text-gray-400 text-xl" />
                  <PhoneInput
                    country={codigoPais}
                    value={`+${countryDialCodes[codigoPais] || '351'}${telefone}`}
                    onChange={(value: string, data: any) => {
                      const dialCode = data.dialCode || '';
                      const numbersOnly = value.replace(/\D/g, '');
                      const localNumber = numbersOnly.startsWith(dialCode)
                        ? numbersOnly.slice(dialCode.length)
                        : numbersOnly;
                      setTelefone(localNumber);
                      setCodigoPais(data.countryCode);
                    }}
                    inputClass="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    buttonClass="rounded-l-lg"
                    enableSearch
                    disableCountryCode={true}
                    placeholder="Telefone"
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

            {/* Campos de cadastro, recuperação ou login */}
            {(novoCadastro || cliente || recuperandoSenha) && (
              <div className="space-y-4">
                {/* Nome apenas para novo cadastro */}
                {novoCadastro && (
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
                )}

                {/* Senha */}
                <div className="relative">
                  <FiLock className="absolute left-3 top-3 text-gray-400 text-xl" />
                  <input
                    type="password"
                    placeholder={recuperandoSenha ? 'Nova senha' : 'Senha'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>

                {/* Data de nascimento apenas para criar ou recuperar senha */}
                {(!cliente?.senha || recuperandoSenha) && (
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
                )}

                {/* Botão criar/atualizar senha ou login */}
                <button
                  onClick={cliente?.senha && !recuperandoSenha ? logarCliente : criarOuAtualizarSenha}
                  disabled={loading}
                  className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                  {cliente?.senha && !recuperandoSenha
                    ? 'Entrar'
                    : recuperandoSenha
                    ? 'Atualizar Senha'
                    : 'Criar Senha'}
                </button>

                {/* Botão recuperar senha só para clientes existentes com senha */}
                {cliente?.senha && !recuperandoSenha && (
                  <button
                    onClick={iniciarRecuperacao}
                    className="w-full text-blue-600 font-semibold hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
            )}

            {erro && <p className="text-red-500 mt-4 text-center">{erro}</p>}
          </motion.div>
        </AnimatePresence>
        <PWAInstallPrompt />
      </div>
    </>
  );
}
