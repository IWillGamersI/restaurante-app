'use client';

import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/pages/login'); // ou a rota da sua página de login
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center cursor-pointer gap-2 text-red-600 hover:text-red-800 px-4 py-2"
    >
      <LogOut size={20} />
      Sair
    </button>
  );
}
