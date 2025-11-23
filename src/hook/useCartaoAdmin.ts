// src/hook/useCartaoAdmin.ts
'use client'

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CartaoFidelidadeItem {
  tipo: string;
  quantidade: number;
  saldoCupom: number;
  cupomGanho: any[];
  cupomResgatado: any[];
}

interface ClienteAdmin {
  id: string;
  codigoCliente: string;
  nome: string;
  telefone: string;
  dataNascimento?: string;
  cartoes: CartaoFidelidadeItem[];
}

export function useCartaoAdmin() {
  const [clientes, setClientes] = useState<ClienteAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      try {
        const snap = await getDocs(collection(db, "clientes"));

        const lista: ClienteAdmin[] = snap.docs.map(doc => {
          const data = doc.data();

          return {
            id: doc.id,
            codigoCliente: data.codigoCliente,
            nome: data.nome,
            telefone: data.telefone,
            dataNascimento: data.dataNascimento,
            cartoes: data.cartaoFidelidade || []
          };
        });

        setClientes(lista);
      } catch (e) {
        console.error("Erro ao buscar clientes:", e);
      }

      setLoading(false);
    };

    fetch();
  }, []);

  return { clientes, loading };
}
