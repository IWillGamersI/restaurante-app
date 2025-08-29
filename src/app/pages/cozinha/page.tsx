import LogoutButton from "@/components/LogoutButton";
import TelaCozinha from "@/components/TelaCozinha";

import { ClipboardList } from "lucide-react";
export default function PainelCozinha1() {  
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-0 ml-6 flex items-center gap-2 justify-between">
        <div className="flex gap-2 items-center">
            <ClipboardList className="text-blue-600" /> Cozinha
        </div>
         <LogoutButton/>
      </h2>
      <TelaCozinha/>
    </div>
  );
}
