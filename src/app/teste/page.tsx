'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TesteFirebase() {
  const [mensagem, setMensagem] = useState('Conectando...');

  useEffect(() => {
    const testarConexao = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'usuarios'));
        if (!snapshot.empty) {
          setMensagem(`Conectado! ${snapshot.size} usuários encontrados.`);
        } else {
          setMensagem('Conectado! Nenhum usuário encontrado.');
        }
      } catch (error) {
        console.error('Erro de conexão:', error);
        setMensagem('Erro ao conectar ao Firebase Firestore.');
      }
    };

    testarConexao();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <div className="bg-white p-6 rounded shadow-md">
        <h1 className="text-xl font-bold mb-4">Teste de Conexão Firebase</h1>
        <p>{mensagem}</p>
      </div>
    </div>
  );
}
