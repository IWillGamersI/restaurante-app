import GerenciarPedidos from "@/components/GerenciarPedidos";
import LogoutButton from "@/components/LogoutButton";
import { Store } from "lucide-react";

export default function Loja() {
  return (
    <div className="bg-gray-200 w-full text-gray-800 max-w-6xl mx-auto p-3 space-y-8">
      <h2 className="text-2xl font-bold mb-0 ml-6 flex items-center justify-between">
        <div className="flex gap-2 items-center">
            <Store className="text-blue-600" /> Loja
        </div>
         <LogoutButton/>
      </h2>
      <GerenciarPedidos/>
    </div>
  );
}
