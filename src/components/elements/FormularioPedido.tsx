import React, { useState, forwardRef, useEffect } from "react";
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

  // Hook depende do códigoCliente válido (ignora CLT-123)
  const codigoParaHook = codigoCliente && codigoCliente !== 'CLT-123' ? codigoCliente : '';
  const { cartoes } = useCartaoFidelidade(codigoParaHook);

  const [temCupom, setTemCupom] = useState(false);
  const [cuponsSelecionados, setCuponsSelecionados] = useState<string[]>([]);

  // 🔹 Atualiza `temCupom` sempre que os cartoes ou codigoCliente mudam
  useEffect(() => {
    if (codigoCliente && codigoCliente !== 'CLT-123') {
      setTemCupom(cartoes.some(cartao => (cartao.saldoCupom || 0) > 0));
    } else {
      setTemCupom(false);
    }
  }, [cartoes, codigoCliente]);

  // 🔹 Atualiza dados do cliente ao desfocar o telefone
  const handleBlurTelefone = async () => {
    if (!clienteTelefone) return;

    const clientesRef = collection(db, "clientes");
    const q = query(clientesRef, where("telefone", "==", clienteTelefone));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const clienteDoc = snapshot.docs[0];
      const data = clienteDoc.data();
      const codigo = gerarCodigoCliente(data.nome, data.telefone);

      setClienteNome(data.nome);
      setClienteTelefone(data.telefone);
      setIdCliente(clienteDoc.id);
      setCodigoCliente(codigo);
      setCodigoPedido(gerarCodigoPedido(data.nome));
    } else {
      console.log("Cliente não encontrado. Será criado apenas ao salvar pedido.");
      setClienteNome("");
      setCodigoCliente("");
      setIdCliente(null);
      setCodigoPedido("");
      setTemCupom(false);
      setCuponsSelecionados([]);
    }
  };

  // 🔹 Limpa cupons imediatamente quando o telefone muda
  const handleTelefoneChange = (telefone: string) => {
    setClienteTelefone(telefone);

    // Limpa dados e cupons ao digitar ou apagar telefone
    setClienteNome("");
    setCodigoCliente("");
    setIdCliente(null);
    setCodigoPedido("");
    setCuponsSelecionados([]);
    setTemCupom(false);
  };

  return (
    <div className="flex flex-col justify-between flex-wrap sm:flex-row gap-2">

      <input type="text" className="border p-2 rounded lg:max-w-[100px] text-center" placeholder="Código Pedido" value={codigoPedido} readOnly disabled />
      <input type="text" className="border p-2 rounded lg:max-w-[100px] text-center" placeholder="Código do Cliente" value={codigoCliente} readOnly disabled />

      <div className="flex items-center gap-2 justify-around bg-blue-600 px-2 rounded text-white">
        <label className="flex gap-1 cursor-pointer">
          <input type="radio" name="fatura" value="CF" checked={tipoFatura === 'cf'} onChange={() => setTipoFatura('cf')} required /> CF
        </label>
        <label className="flex gap-1 cursor-pointer">
          <input type="radio" name="fatura" value="SF" checked={tipoFatura === 'sf'} onChange={() => setTipoFatura('sf')} required /> SF
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
        value={clienteTelefone}
        disabled={tipoVenda === 'glovo' || tipoVenda === 'uber' || tipoVenda === 'bolt'}
        onChange={e => handleTelefoneChange(e.target.value)}
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

      {/* 🔹 Mostrar cupons disponíveis apenas quando existem */}
      {temCupom && cartoes.length > 0 && (
        <div className="flex flex-wrap gap-2 border border-green-400 bg-green-50 p-3 rounded mb-3">
          <h4 className="w-full font-semibold text-green-700 flex items-center gap-2">
            <Ticket size={18} /> Cupons disponíveis:
          </h4>
          {cartoes.map((cartao, i) => (
            <span
              key={cartao.tipo + i}
              className="px-3 py-1 bg-green-100 text-green-700 border border-green-400 rounded text-sm"
            >
              {cartao.tipo}: {cartao.saldoCupom || 0} cupons disponíveis
            </span>
          ))}
        </div>
      )}

    </div>
  );
});
