'use client';

import { useState, useEffect } from "react";
import { CreditCard, ShoppingBag, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pedido } from "@/types";
import { useCartaoFidelidade } from "@/hook/useCartaoFidelidade";
import { CartaoFidelidade } from "@/components/CartaoFidelidade";
import { AbasCompras } from "@/components/AbasCompras";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  codigoCliente: string;
  dataNascimento?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [aba, setAba] = useState<"fidelidade" | "compras" | "dados">("fidelidade");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  // 🔹 Hook Cartão Fidelidade
  const { cartoes, loading: loadingCartoes } = useCartaoFidelidade(cliente?.id, cliente?.codigoCliente);

  // 🔹 Buscar cliente
  useEffect(() => {
    const fetchCliente = async () => {
      const codigoCliente = localStorage.getItem("clienteCodigo");
      if (!codigoCliente) return router.push("/pages/cliente/login");

      setLoadingCliente(true);
      try {
        const q = query(collection(db, "clientes"), where("codigoCliente", "==", codigoCliente));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setCliente({ id: snap.docs[0].id, ...snap.docs[0].data() } as Cliente);
        } else {
          setCliente(null);
        }
      } catch (err) {
        console.error("Erro ao buscar cliente:", err);
      } finally {
        setLoadingCliente(false);
      }
    };
    fetchCliente();
  }, [router]);

  // 🔹 Listener de pedidos
  useEffect(() => {
    if (!cliente) return;
    setLoadingPedidos(true);

    const q = query(collection(db, "pedidos"), where("codigoCliente", "==", cliente.codigoCliente));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Pedido[];
        lista.sort((a, b) => new Date(b.data!).getTime() - new Date(a.data!).getTime());
        setPedidos(lista);
        setLoadingPedidos(false);
      },
      (err) => {
        console.error("Erro ao escutar pedidos:", err);
        setLoadingPedidos(false);
      }
    );

    return () => unsubscribe();
  }, [cliente]);

  const logOut = () => {
    localStorage.removeItem("clienteCodigo");
    router.push("/pages/cliente/login");
  };

  // 🔹 Aba Dados
  const Dados = () => (
    <div className="p-4 space-y-4">
      <div className="text-lg font-semibold">👤 {cliente?.nome || "Cliente"}</div>
      <p className="text-gray-500">📱 {cliente?.telefone}</p>
      <p className="text-gray-500">🎂 {cliente?.dataNascimento}</p>
      <p className="text-gray-500">🆔 {cliente?.codigoCliente}</p>
      <button
        onClick={logOut}
        className="bg-red-500 text-white py-2 px-4 rounded flex items-center gap-2 hover:bg-red-600"
      >
        Sair
      </button>
    </div>
  );

  // 🔹 Aba Fidelidade
  const Fidelidade = () => {
    if (loadingCartoes) return <div className="p-4">Carregando cartões...</div>;
    if (!cartoes || cartoes.length === 0)
      return <div className="p-4 text-center text-gray-500">Nenhum cartão de fidelidade ainda.</div>;

    return (
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {cartoes.map((c) => (
          <CartaoFidelidade key={c.tipo} cartao={c} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 🔹 Topo */}
      <div className="h-16 bg-white flex items-center justify-center shadow-md fixed top-0 w-full z-10">
        {loadingCliente ? (
          <span className="font-semibold text-lg">Carregando...</span>
        ) : (
          <span className="font-semibold text-lg">Olá, {cliente?.nome || "Cliente"}</span>
        )}
      </div>

      {/* 🔹 Conteúdo */}
      <div className="flex-1 overflow-y-auto pt-16 pb-20">
        {!loadingCliente && aba === "fidelidade" && cliente && <Fidelidade />}
        {!loadingCliente && aba === "compras" && <AbasCompras pedidos={pedidos} loading={loadingPedidos} />}
        {!loadingCliente && aba === "dados" && <Dados />}
      </div>

      {/* 🔹 Barra inferior */}
      <div className="h-16 bg-white border-t flex justify-around items-center fixed bottom-0 w-full">
        <button
          onClick={() => setAba("fidelidade")}
          className={`flex flex-col items-center ${aba === "fidelidade" ? "text-blue-600" : "text-gray-500"}`}
        >
          <CreditCard />
          <span className="text-xs">Fidelidade</span>
        </button>

        <button
          onClick={() => setAba("compras")}
          className={`flex flex-col items-center ${aba === "compras" ? "text-blue-600" : "text-gray-500"}`}
        >
          <ShoppingBag className="w-6 h-6" />
          <span className="text-xs">Compras</span>
        </button>

        <button
          onClick={() => setAba("dados")}
          className={`flex flex-col items-center ${aba === "dados" ? "text-blue-600" : "text-gray-500"}`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs">Perfil</span>
        </button>
      </div>
    </div>
  );
}
