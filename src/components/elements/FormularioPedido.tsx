import React from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PedidoInfoFormProps } from "@/types";
import { useCodigos } from "@/hook/useCodigos";



export const PedidoInfoForm: React.FC<PedidoInfoFormProps> = ({
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
                                                                    querImprimir,
                                                                    setQuerImprimir,
                                                                }) => {

  const {gerarCodigoCliente, gerarCodigoPedido} = useCodigos()

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

        // Aqui você pode gerar o código agora que tem o nome
        setCodigoCliente(gerarCodigoCliente(data.nome, data.telefone));
        setCodigoPedido(gerarCodigoPedido(data.nome));
      } else {
        console.log("Cliente não encontrado. Será criado apenas ao salvar pedido.");
      }

  };


  return (
    <div className="flex flex-col justify-between gap-1 flex-wrap sm:flex-row">
     

      {/* Código Pedido */}
      <input
        type="text"
        className="border p-3 rounded lg:max-w-[130px]"
        placeholder="Código Pedido"
        value={codigoPedido}
        readOnly
        disabled
      />

      {/* Código Cliente */}
      <input
        type="text"
        className="border p-3 rounded lg:max-w-[130px]"
        placeholder="Código do Cliente"
        value={codigoCliente}
        readOnly
        disabled
      />

      {/* Fatura */}
      <div className="flex flex-col justify-around bg-blue-600 px-4 rounded text-white">
        <label className="flex gap-1 cursor-pointer">
          <input
            type="radio"
            name="fatura"
            value="CF"
            checked={tipoFatura === 'cf'}
            onChange={() => setTipoFatura('cf')}
            className="cursor-pointer"
            required
          />
          CF
        </label>
        <label className="flex gap-1 cursor-pointer">
          <input
            type="radio"
            name="fatura"
            value="SF"
            checked={tipoFatura === 'sf'}
            onChange={() => setTipoFatura('sf')}
            className="cursor-pointer"
            required
          />
          SF
        </label>
      </div>

      {/* Tipo de Venda */}
      <select
        className="border p-3 rounded"
        value={tipoVenda}
        onChange={e => setTipoVenda(e.target.value)}
        required
      >
        <option value="">Tipo de Venda</option>
        <option value="balcao">Balcao</option>
        <option value="mesa">Mesa</option>
        <option value="glovo">Glovo</option>
        <option value="uber">Uber</option>
        <option value="bolt">Bolt</option>
        <option value="app">App Top pizzas</option>
      </select>

      {/* Número da mesa (só se for mesa) */}
          {tipoVenda === 'mesa' && (
            <input
              type="tel"
              pattern="[1-9]"
              inputMode="numeric"
              maxLength={1}
              className="border p-3 rounded"
              placeholder="Número da Mesa"
              onInput={(e) => {e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "")}}
              value={numeroMesa}
              onChange={(e) => setNumeroMesa(e.target.value)}
            />
          )}

      {/* Telefone Cliente */}
      <input
        type="tel"
        pattern="[0-9]"
        inputMode="numeric"
        maxLength={9}
        onInput={(e) => {e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "")}}
        className="border p-3 rounded"
        placeholder="Telefone Cliente..."
        value={clienteTelefone}
        disabled={tipoVenda === 'glovo' || tipoVenda === 'uber' || tipoVenda === 'bolt'}
        onChange={e => {
          const telefone = e.target.value;
          setClienteTelefone(telefone);
          if (!telefone) {
            setClienteNome("");
            setCodigoCliente('');
            setIdCliente(null);
            setCodigoPedido("");
          }
        }}
        onBlur={handleBlurTelefone}
      />

      {/* Nome Cliente */}
      <input
        type="text"
        className="border p-3 rounded"
        placeholder="Nome Cliente..."
        value={clienteNome}
        onChange={e => {
          const nome = e.target.value;
          setClienteNome(nome);

          // Gera código só se houver telefone
          if (clienteTelefone) {
            setCodigoCliente(gerarCodigoCliente(nome, clienteTelefone));
            setCodigoPedido(gerarCodigoPedido(nome));
          }
        }}
        disabled={!!idCliente}
      />

    </div>
  );
};
