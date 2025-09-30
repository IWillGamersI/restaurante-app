'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { FiPhone, FiLock, FiKey, FiCalendar, FiUser } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { motion, AnimatePresence } from 'framer-motion';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import bcrypt from 'bcryptjs';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export default function LoginCliente() {
  const router = useRouter();
  const [telefone, setTelefone] = useState('');
  const [codigoPais, setCodigoPais] = useState('pt'); // Código do país separado
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');
  const [senha, setSenha] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [clienteTemSenha, setClienteTemSenha] = useState<boolean | null>(null);
  const [pinEnviado, setPinEnviado] = useState(false);
  const [precisaCriarSenha, setPrecisaCriarSenha] = useState(false);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [novoCadastro, setNovoCadastro] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const countryDialCodes: { [key: string]: string } = {
    pt: '351',
    br: '55',
    us: '1',
    // adicione outros países aqui
  };

  const verificarTelefone = async () => {
    if (!telefone) return setErro('Digite seu número de telefone');
    setLoading(true);
    try {
      const q = query(
        collection(db, 'clientes'),
        where('telefone', '==', telefone),
        where('codigoPais', '==', codigoPais)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setNovoCadastro(true);
        setClienteTemSenha(false);
        setErro('');
      } else {
        const cliente = snap.docs[0].data();
        setClienteTemSenha(!!cliente.senha);
        setNovoCadastro(false);
        setErro('');
      }
    } catch (err) {
      console.error(err);
      setErro('Erro ao verificar telefone');
    } finally {
      setLoading(false);
    }
  };

  const enviarPin = async () => {
    if (novoCadastro && !nome) return setErro('Digite seu nome para cadastro');
    setLoading(true);
    try {
      const q = query(
        collection(db, 'clientes'),
        where('telefone', '==', telefone),
        where('codigoPais', '==', codigoPais)
      );
      const snap = await getDocs(q);

      let clienteRef;
      if (snap.empty) {
        clienteRef = doc(collection(db, 'clientes'));
        await setDoc(clienteRef, {
          telefone,
          codigoPais,
          nome,
          criadoEm: new Date(),
          senha: '',
        });
      } else {
        clienteRef = snap.docs[0].ref;
      }

      const pinGerado = Math.floor(100000 + Math.random() * 900000).toString();
      const pinHash = await bcrypt.hash(pinGerado, 10);
      const expira = new Date(Date.now() + 10 * 60 * 1000);

      await updateDoc(clienteRef, { pinTempHash: pinHash, pinExpira: expira, tentativasPin: 0 });

      // Envia o PIN usando o código do país
      const telefoneCompleto = `+${countryDialCodes[codigoPais] || ''}${telefone}`;

      const response = await fetch('/api/enviarWhatsApp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefoneCompleto, pin: pinGerado }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Erro ao enviar PIN');

      setPinEnviado(true);
      setErro('');
    } catch (err: any) {
      console.error('Erro ao enviar PIN:', err);
      setErro(`Erro ao enviar PIN: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verificarPin = async () => {
    if (!pin) return setErro('Digite o PIN recebido');
    setLoading(true);
    try {
      const q = query(
        collection(db, 'clientes'),
        where('telefone', '==', telefone),
        where('codigoPais', '==', codigoPais)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setErro('Telefone inválido');
        setLoading(false);
        return;
      }

      const clienteRef = snap.docs[0].ref;
      const cliente = snap.docs[0].data();

      if (!cliente.pinTempHash || !cliente.pinExpira) {
        setErro('Nenhum PIN foi enviado');
        setLoading(false);
        return;
      }

      if (new Date() > cliente.pinExpira.toDate()) {
        setErro('PIN expirado');
        setLoading(false);
        return;
      }

      const valido = await bcrypt.compare(pin, cliente.pinTempHash);

      if (valido) {
        await updateDoc(clienteRef, { pinTempHash: '', tentativasPin: 0 });
        setPrecisaCriarSenha(true);
        setPinEnviado(false);
        setErro('');
      } else {
        const tentativas = (cliente.tentativasPin || 0) + 1;
        await updateDoc(clienteRef, { tentativasPin: tentativas });
        if (tentativas >= 5) {
          setErro('Número bloqueado por tentativas excessivas. Tente novamente mais tarde.');
        } else {
          setErro('PIN incorreto');
        }
      }
    } catch (err) {
      console.error(err);
      setErro('Erro ao verificar PIN');
    } finally {
      setLoading(false);
    }
  };

  const criarSenha = async () => {
    if (!senha) return setErro('Digite a senha');
    if (!dataNascimento) return setErro('Digite sua data de nascimento');

    setLoading(true);
    try {
      const q = query(
        collection(db, 'clientes'),
        where('telefone', '==', telefone),
        where('codigoPais', '==', codigoPais)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setErro('Telefone inválido');
        setLoading(false);
        return;
      }

      const clienteRef = snap.docs[0].ref;
      const senhaHash = await bcrypt.hash(senha, 10);

      await updateDoc(clienteRef, { senha: senhaHash, dataNascimento });

      localStorage.setItem('clienteCodigo', snap.docs[0].data().codigoCliente || '');
      router.push('/pages/cliente/dashboard');
    } catch (err) {
      console.error(err);
      setErro('Erro ao criar senha');
    } finally {
      setLoading(false);
    }
  };

  const logarCliente = async () => {
    if (!senha) return setErro('Digite a senha');
    setLoading(true);
    try {
      const q = query(
        collection(db, 'clientes'),
        where('telefone', '==', telefone),
        where('codigoPais', '==', codigoPais)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setErro('Telefone inválido');
        setLoading(false);
        return;
      }

      const cliente = snap.docs[0].data();
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
    setClienteTemSenha(false);
    setPinEnviado(false);
    setPrecisaCriarSenha(false);
    setSenha('');
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
          key={`${clienteTemSenha}-${pinEnviado}-${precisaCriarSenha}-${recuperandoSenha}-${novoCadastro}`}
          className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl space-y-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={cardVariants}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-center text-blue-700">Área do Cliente</h1>

          {/* Input telefone com bandeira */}
          {clienteTemSenha === null && (
            <div className="space-y-4">
              <div className="relative">
                <FiPhone className="absolute left-3 top-3 text-gray-400 text-xl" />
                <PhoneInput
                  country={codigoPais}
                  value={telefone}
                  onChange={(value, data: any) => {
                    setTelefone(value.replace(`+${data.dialCode}`, ''));
                    setCodigoPais(data.countryCode);
                  }}
                  inputClass="w-full px-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  buttonClass="rounded-l-lg"
                  enableSearch
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

          {/* Resto do JSX permanece igual: cadastro, PIN, login, criação de senha */}
          {/* ... */}
        </motion.div>
      </AnimatePresence>
      <PWAInstallPrompt />
    </div>
  );
}
