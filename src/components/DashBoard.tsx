'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Users, ClipboardList, DollarSign, Utensils } from 'lucide-react';

const pedidosPorDia = [
  { dia: 'Seg', pedidos: 12 },
  { dia: 'Ter', pedidos: 18 },
  { dia: 'Qua', pedidos: 10 },
  { dia: 'Qui', pedidos: 22 },
  { dia: 'Sex', pedidos: 30 },
  { dia: 'Sáb', pedidos: 24 },
  { dia: 'Dom', pedidos: 15 },
];

const cards = [
  {
    icon: <ClipboardList size={28} />,
    title: 'Pedidos Hoje',
    value: '24',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    icon: <DollarSign size={28} />,
    title: 'Faturamento',
    value: 'R$ 1.240,00',
    color: 'bg-green-100 text-green-800',
  },
  {
    icon: <Users size={28} />,
    title: 'Usuários',
    value: '8',
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    icon: <Utensils size={28} />,
    title: 'Itens no Cardápio',
    value: '35',
    color: 'bg-purple-100 text-purple-800',
  },
];

export default function DashBoard() {
  return (
    <div className="text-gray-800">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`rounded-xl p-4 shadow-sm ${card.color} flex items-center gap-4`}
          >
            <div className="p-2 rounded-full bg-white">{card.icon}</div>
            <div>
              <div className="text-sm">{card.title}</div>
              <div className="text-lg font-bold">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-4">Pedidos por dia</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pedidosPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="pedidos" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
