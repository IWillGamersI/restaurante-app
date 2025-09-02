import GerenciarPedidosMesa from "@/components/GerenciarPedidosMesa";
import LogoutButton from "@/components/LogoutButton";
import { Store, TabletSmartphone } from "lucide-react";

export default function Mesa() {
  return (
    <div className="bg-gray-200 w-full text-gray-800 max-w-6xl mx-auto p-6 space-y-8">
      <h2 className="text-2xl font-bold mb-0 ml-6 flex items-center gap-2 justify-between">
        <div className="flex gap-2 items-center">
            <TabletSmartphone className="text-blue-600" /> Mesa
        </div>
         <LogoutButton/>
      </h2>
      <GerenciarPedidosMesa/>
    </div>
  );
}
