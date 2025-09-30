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
  // adicione outros se quiser
};

export default function LoginCliente() {
  const { gerarCodigoCliente } = useCodigos();
  const router = useRouter();

  // estados
  const [telefone, setTelefone] = useState(''); // somente número local (sem +351)
  const [codigoPais, setCodigoPais] = useState('pt'); // alpha2: 'pt', 'br', ...
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cliente, setCliente] = useState<any | null>(null); // objeto do cliente vindo do Firestore (inclui .ref)
  const [novoCadastro, setNovoCadastro] = useState(false);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // Verifica se telefone existe no Firestore
  const verificarTelefone = async () => {
    setErro('');
    if (!telefone) return setErro('Digite seu número de telefone');
    setLoading(true);
    try {
      const q = query(collection(db, 'clientes'), where('telefone', '==', telefone));
      const snap = await getDocs(q);

      if (snap.empty) {
        // novo cadastro
        setCliente(null);
        setNovoCadastro(true);
        setRecuperandoSenha(false);
      } else {
        // já existe cliente
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        // salvar ref + dados no estado
        setCliente({ ref: docSnap.ref, ...data });
        // ajusta country alpha2 a partir do codigo numérico salvo (se houver)
        setCodigoPais(
          data.codigoPais
            ? (Object.keys(countryDialCodes).find((k) => countryDialCodes[k] === data.codigoPais) || 'pt')
            : 'pt'
        );
        // se já tem senha cadastrada -> mostrar login; se não tem -> mostrar criar senha
        setNovoCadastro(!data.senha);
        setRecuperandoSenha(false);
      }
    } catch (err) {
      console.error(err);
      setErro('Erro ao verificar telefone');
    } finally {
      setLoading(false);
    }
  };

  // Criar novo cliente ou atualizar senha (criar/recuperar)
  const criarOuAtualizarSenha = async () => {
    setErro('');
    if (!senha) return setErro('Digite a senha');
    // se for criar nova senha (novo cadastro) ou recuperar -> dataNascimento obrigatória
    if (!dataNascimento) return setErro('Digite sua data de nascimento');

    setLoading(true);
    try {
      let clienteRef;
      let codigoCliente = '';

      if (!cliente) {
        // novo cliente real
        codigoCliente = gerarCodigoCliente(nome, telefone);
        clienteRef = doc(collection(db, 'clientes'));
        await setDoc(clienteRef, {
          telefone,
          codigoPais: countryDialCodes[codigoPais] || '351',
          nome,
          criadoEm: new Date(),
          codigoCliente,
          senha: '', // será atualizado abaixo
          dataNascimento,
        });

        // atualizar estado local com os dados do novo cliente
        setCliente({
          ref: clienteRef,
          telefone,
          codigoPais: countryDialCodes[codigoPais] || '351',
          nome,
          codigoCliente,
          senha: '',
          dataNascimento,
        });
      } else {
        // cliente já existe: se estiver em recuperação, validar dataNascimento
        clienteRef = cliente.ref;
        if (recuperandoSenha) {
          // cliente.dataNascimento pode ser string ou timestamp; normalizamos ambos
          const existente = cliente.dataNascimento;
          const existenteStr = existente
            ? (typeof existente === 'string' ? existente : existente.toDate ? existente.toDate().toISOString().slice(0, 10) : String(existente))
            : '';
          const informada = dataNascimento;
          if (existenteStr !== informada) {
            setErro('Data de nascimento não confere');
            setLoading(false);
            return;
          }
        }
        codigoCliente = cliente.codigoCliente || '';
      }

      // atualiza senha (hash) e dataNascimento (garante campo)
      const senhaHash = await bcrypt.hash(senha, 10);
      await updateDoc(clienteRef, { senha: senhaHash, dataNascimento });

      // atualiza localStorage com codigoCliente (se houver)
      const finalCodigo = codigoCliente || (cliente ? cliente.codigoCliente : '') || '';
      if (finalCodigo) localStorage.setItem('clienteCodigo', finalCodigo);

      // reset flags e redireciona
      setNovoCadastro(false);
      setRecuperandoSenha(false);
      router.push('/pages/cliente/dashboard');
    } catch (err) {
      console.error(err);
      setErro('Erro ao criar ou atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  // Login normal com senha
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

      const senhaValida = await bcrypt.compare(senha, cliente.senha);
      if (senhaValida) {
        if (cliente.codigoCliente) localStorage.setItem('clienteCodigo', cliente.codigoCliente);
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
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-blue-50 to-white px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${cliente?.senha ?? ''}-${novoCadastro}-${recuperandoSenha}`}
          className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl space-y-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={cardVariants}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-center text-blue-700">Área do Cliente</h1>

          {/* INPUT TELEFONE (aparece quando não temos cliente selecionado e não estamos no fluxo de novo cadastro/recuperacao) */}
          {!cliente && !novoCadastro && !recuperandoSenha && (
            <div className="space-y-4">
              <div className="relative">
                <FiPhone className="absolute left-3 top-3 text-gray-400 text-xl" />
                <PhoneInput
                  country={codigoPais}
                  value={telefone}
                  onChange={(value: string, data: any) => {
                    // mantemos só os números digitados (sem prefixo)
                    const numbersOnly = value.replace(/\D/g, '');
                    setTelefone(numbersOnly);
                    if (data && data.countryCode) setCodigoPais(data.countryCode);
                  }}
                  inputClass="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  buttonClass="rounded-l-lg"
                  enableSearch
                  disableCountryCode={true}       // impede edição do código do país
                  countryCodeEditable={false}     // impede alterar bandeira ao digitar
                  enableAreaCodes={false}         // evita confusão de DDDs
                  disableDropdown={false}         // dropdown continua disponível
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

          {/* CAMPOS: cadastro / recuperação / login (quando já temos cliente ou novoCadastro ou recuperandoSenha) */}
          {(novoCadastro || cliente || recuperandoSenha) && (
            <div className="space-y-4">
              {/* Nome só para novo cadastro real */}
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

              {/* Campo senha (login ou criar/atualizar) */}
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

              {/* Data de nascimento só quando criar/recuperar senha */}
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

              {/* Botão principal: login ou criar/atualizar senha */}
              <button
                onClick={cliente?.senha && !recuperandoSenha ? logarCliente : criarOuAtualizarSenha}
                disabled={loading}
                className={`w-full bg-purple-600 text-white py-3 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading && <AiOutlineLoading3Quarters className="animate-spin text-xl" />}
                {cliente?.senha && !recuperandoSenha ? 'Entrar' : recuperandoSenha ? 'Atualizar Senha' : 'Criar Senha'}
              </button>

              {/* Botão para iniciar recuperação apenas quando cliente existe e tem senha */}
              {cliente?.senha && !recuperandoSenha && (
                <button onClick={iniciarRecuperacao} className="w-full text-blue-600 font-semibold hover:underline">
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
  );
}
