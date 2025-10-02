// src/app/(admin)/layout.tsx
'use client';

import { Sidebar } from '@/components/Sidebar';
import Head from 'next/head';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>Login Cliente - Top Pizzas</title>
        <meta name="description" content="Área de login da Top Pizzas" />
        <link rel="manifest" href="/manifest-estabelecimento.json" />
        <meta name="theme-color" content="#1976d2" />
      </Head>

      <div className="flex h-screen bg-gray-100 text-gray-700">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </>
  );
}
