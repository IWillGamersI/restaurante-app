'use client';

import Link from 'next/link';
import { LayoutDashboard, Users, Utensils, ClipboardList, CreditCard } from 'lucide-react';
import LogoutButton from './LogoutButton';

export function Sidebar() {
  return (
    <aside className="w-64 bg-white shadow-lg">
      <div className="p-6 font-bold text-xl border-b">Painel Admin</div>
      <nav className="p-4 space-y-2">
        <Link href="/pages/admin/dashboard" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
          <LayoutDashboard size={20} /> Dashboard
        </Link>
        <Link href="/pages/admin/usuarios" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
          <Users size={20} /> Usuários
        </Link>
        <Link href="/pages/admin/loja" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
          <ClipboardList size={20} /> Loja
        </Link>
        <Link href="/pages/admin/pedidos" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
          <ClipboardList size={20} /> Pedidos
        </Link>
        <Link href="/pages/admin/cardapio" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
          <Utensils size={20} /> Cadastro de Produtos
        </Link>
        <Link href="/pages/admin/cadastros" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
          <Utensils size={20} /> Cadastro Extras
        </Link>
        <Link href="/pages/admin/despesas" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
          <CreditCard size={20} /> Despesas Fixas
        </Link>
      </nav>
      <LogoutButton/>
    </aside>
  );
}
