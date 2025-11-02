import React, { useState, useEffect, forwardRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PedidoInfoFormProps } from "@/types";
import { useCodigos } from "@/hook/useCodigos";
import { useCartaoFidelidade } from "@/hook/useCartaoFidelidade";
import { Ticket } from "lucide-react";

export const PedidoInfoForm = forwardRef<any, PedidoInfoFormProps>(({
  tipoFatura,
  setTipoFatura,
  tipoVenda,
  setTipoVenda,
  clienteTelefone,
  setClienteTelefone,
  clienteNome,
  setClienteNome,
  codigoCliente,
  setCodigoCliente,
  idCliente,
  setIdCliente,
  codigoPedido,
  setCodigoPedido,
  numeroMesa,
  setNumeroMesa,
}, ref) => {

  const { gerarCodigoCliente, gerarCodigoPedido } = useCodigos();
  const { cartoes } = useCartaoFidelidade(codigoCliente);
  const [temCupom, setTemCupom] = useState(false);
  const [cuponsSelecionados, setCuponsSelecionados] = useState<string[]>([]);


  const handleBlurTelefone = async () => {
    if (!clienteTelefone) return;
    const clientesRef = collection(db, "clientes");
    const q = query(clientesRef, where("telefone", "==", clienteTelefone));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const clienteDoc = snapshot.docs[0];
      const data = clienteDoc.data();
      setClienteNome(data.nome);
      setClienteTelefone(data.telefone);
      setIdCliente(clienteDoc.id);
      setCodigoCliente(gerarCodigoCliente(data.nome, data.telefone));
      setCodigoPedido(gerarCodigoPedido(data.nome));
    } else {
      console.log("Cliente não encontrado. Será criado apenas ao salvar pedido.");
    }
  };

  return (
    <div className="flex flex-col justify-between flex-wrap sm:flex-row">

      <input type="text" className="border p-2 rounded lg:max-w-[100px] text-center" placeholder="Código Pedido" value={codigoPedido} readOnly disabled />
      <input type="text" className="border p-2 rounded lg:max-w-[100px] text-center" placeholder="Código do Cliente" value={codigoCliente} readOnly disabled />

      <div className="flex items-center gap-2 justify-around bg-blue-600 px-2 rounded text-white">
        <label className="flex gap-1 cursor-pointer">
          <input type="radio" name="fatura" value="CF" checked={tipoFatura === 'cf'} onChange={() => setTipoFatura('cf')} className="cursor-pointer" required /> CF
        </label>
        <label className="flex gap-1 cursor-pointer">
          <input type="radio" name="fatura" value="SF" checked={tipoFatura === 'sf'} onChange={() => setTipoFatura('sf')} className="cursor-pointer" required /> SF
        </label>
      </div>

      <select className="border p-2 rounded" value={tipoVenda} onChange={e => setTipoVenda(e.target.value)} required>
        <option value="">Tipo de Venda</option>
        <option value="balcao">Balcao</option>
        <option value="mesa">Mesa</option>
        <option value="glovo">Glovo</option>
        <option value="uber">Uber</option>
        <option value="bolt">Bolt</option>
        <option value="app">App Top pizzas</option>
      </select>

      {tipoVenda === 'mesa' && (
        <input type="tel" pattern="[1-9]" inputMode="numeric" maxLength={1} className="border p-2 rounded lg:max-w-[120px] text-center" placeholder="N. Mesa"
          onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "") }}
          value={numeroMesa} onChange={(e) => setNumeroMesa(e.target.value)} />
      )}

      <input type="tel" pattern="[0-9]" inputMode="numeric" maxLength={9} className="border p-2 rounded text-center" placeholder="Telefone Cliente..."
        value={clienteTelefone} disabled={tipoVenda === 'glovo' || tipoVenda === 'uber' || tipoVenda === 'bolt'}
        onChange={e => {
          const telefone = e.target.value;
          setClienteTelefone(telefone);
          if (!telefone) { 
            setClienteNome(""); 
            setCodigoCliente(''); 
            setIdCliente(null); 
            setCodigoPedido(""); 
            setCuponsSelecionados([]); 
            setTemCupom(false);
          }
        }}
        onBlur={handleBlurTelefone}
      />

      <input type="text" className="border p-2 rounded text-center" placeholder="Nome Cliente..." value={clienteNome}
        onChange={e => {
          const nome = e.target.value;
          setClienteNome(nome);
          if (clienteTelefone) { 
            setCodigoCliente(gerarCodigoCliente(nome, clienteTelefone)); 
            setCodigoPedido(gerarCodigoPedido(nome)); 
          }
        }}
        disabled={!!idCliente && !!clienteTelefone}
      />
    </div>
  );
});
