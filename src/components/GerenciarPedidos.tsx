'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Package, CheckCircle2, ClipboardList, Printer, PlusCircleIcon, Delete, PlusSquare, Ticket } from 'lucide-react';
import { calcularSubTotalProduto, calcularTotalExtras, calcularTotalPedido } from "@/utils/calculos";
import { useCodigos } from "@/hook/useCodigos";
import { useStatus } from "@/hook/useStatusColor";
import { useStados } from "@/hook/useStados";
import { imprimir } from '@/lib/impressao';
import { Button } from './ui/button';
import { usePedido } from "@/hook/usePedido";
import { useProdutos } from "@/hook/useProdutos";
import { getLimiteExtra, STATUS_ABERTO, STATUS_FECHADO, STATUS_PEDIDO_OPTIONS } from "@/utils/pedido";
import { useExtras } from "@/hook/useExtras";
import { ClasseButtons } from "./elements/ClassesButtons";
import { PedidoInfoForm } from "./elements/FormularioPedido";
import { HeaderData } from "./elements/HeaderData";
import { Pedido } from "@/types";
import { useResgateCupom } from "@/hook/useResgateCupom";
import { useEffect } from "react";

export default function GerenciarPedidos() {

  const normalize = (str = '') => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const stados = useStados();
  const { gerarCodigoPedido } = useCodigos();
  const { statusColor } = useStatus();

  // ✅ Hook de cupons (passa o código do cliente para buscar automaticamente)
  const {
    cuponsDisponiveis,
    cuponsSelecionados,
    toggleCupom,
    carregarCupons,
    resgatarCupomSelecionado,
  } = useResgateCupom(stados.codigoCliente);

  // ✅ Hook principal de pedido
  const pedido = usePedido(stados);

  const {
    atualizarStatus,
    confirmarProduto,
    removerProdutoPedido,
    abrirModalProduto,
    produtoModal,
    modalAberto,
    setModalAberto,
    extrasSelecionados,
    produtosPedido,
    quantidadeSelecionada,
    setExtrasSelecionados,
    setQuantidadeSelecionada,
    ajuste,
    aumentar,
    diminuir,
    salvarPedido,
    pedidosDoDia,
    produtoSelecionado,
    setProdutoSelecionado,    
    pedidos,
  } = pedido;

  // 🔁 Recarrega cupons sempre que o código do cliente mudar
  // 🔁 Recarrega cupons sempre que o cliente for alterado e tiver código válido
  // 🔁 Recarrega cupons automaticamente após identificar o cliente pelo telefone
  useEffect(() => {
    const telefone = stados.clienteTelefone?.trim();
    const codigo = stados.codigoCliente?.trim();

    // Se já temos código de cliente, carrega cupons
    if (codigo && codigo.length > 0) {
      carregarCupons();
    }
    // Se ainda não temos o código, mas o telefone foi digitado, aguarda a identificação do cliente
    else if (telefone && telefone.length >= 9) {
      const interval = setInterval(() => {
        if (stados.codigoCliente?.trim()) {
          carregarCupons();
          clearInterval(interval);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [stados.codigoCliente, stados.clienteTelefone]);

  const { classes, produtosFiltrados, setClasseSelecionada, classeSelecionada } = useProdutos();
  const { extras, extrasPorClasse } = useExtras();
  
  const {
    tipoFatura,
    setTipoFatura,
    clienteNome,
    clienteTelefone,
    codigoCliente,
    codigoPedido,
    idCliente,
    querImprimir,
    setClienteNome,
    setClienteTelefone,
    setCodigoCliente,
    setCodigoPedido,
    setIdCliente,
    setQuerImprimir,
    setTipoPagamento,
    setTipoVenda,
    tipoPagamento,
    tipoVenda,
    numeroMesa,
    setNumeroMesa,
    idPedidoSelecionado,
    setIdPedidoSelecionado,
    obs,
  } = stados;

  const valorTotal = calcularTotalPedido(produtosPedido) + ajuste;

  const handleSalvarPedido = async () => {
    setQuerImprimir(true);

    await salvarPedido({
      id: idPedidoSelecionado || undefined,
      tipoFatura,
      tipoPagamento,
      tipoVenda,
      clienteNome,
      clienteTelefone,
      codigoCliente,
      produtosPedido,
      extrasSelecionados,
      codigoPedido,
      valorTotal,
      numeroMesa,
      querImprimir,
      imprimir,
      obs: obs || ''
    });

    // 🔹 Só limpar se o pedido realmente foi lançado com sucesso
    // você pode adicionar uma flag de sucesso dentro do salvarPedido no futuro
    // mas por enquanto, ele apenas executa e depois limpa
    if (produtosPedido.length > 0 && tipoPagamento && tipoFatura && tipoVenda) {
      setIdPedidoSelecionado(null);
      setClienteTelefone('');
      setClienteNome('');
      setCodigoCliente('');
      setCodigoPedido('');
      setNumeroMesa('');
      
    }
  };

  const pedidosAbertos = pedidosDoDia.filter(p => STATUS_ABERTO.includes(p.status || 'Fila' ));
  const pedidosFechados = pedidosDoDia.filter(p => STATUS_FECHADO.includes(p.status || 'Entregue'));

  const preencherCamposPedido = (pedidoSelecionado: Pedido) => {
    setTipoFatura(pedidoSelecionado.tipoFatura);
    setTipoVenda(pedidoSelecionado.tipoVenda || '');
    setTipoPagamento(pedidoSelecionado.tipoPagamento || '');
    setClienteNome(pedidoSelecionado.nomeCliente || '');
    setCodigoCliente(pedidoSelecionado.codigoCliente || '');
    setCodigoPedido(pedidoSelecionado.codigoPedido || '');
    setNumeroMesa(pedidoSelecionado.numeroMesa || '');
  };

  
  
  return (    
    <div className="max-w-6xl mx-auto space-y-6 ">
      <div className="flex flex-col gap-3 bg-white p-6 rounded-lg shadow">
        <HeaderData
          icon={<Package size={36}/>}
          titulo="Novo Pedido"
        />

        {/* Formulário */}
        <PedidoInfoForm
          tipoFatura={tipoFatura}
          setTipoFatura={setTipoFatura}
          tipoVenda={tipoVenda}
          setTipoVenda={setTipoVenda}
          clienteTelefone={clienteTelefone}
          setClienteTelefone={setClienteTelefone}
          clienteNome={clienteNome}
          setClienteNome={setClienteNome}
          codigoCliente={codigoCliente}
          setCodigoCliente={setCodigoCliente}
          idCliente={idCliente}
          setIdCliente={setIdCliente}
          codigoPedido={codigoPedido}
          setCodigoPedido={setCodigoPedido}
          numeroMesa={numeroMesa}
          setNumeroMesa={setNumeroMesa}
          querImprimir={querImprimir}
          setQuerImprimir={setQuerImprimir}
          gerarCodigoPedido={gerarCodigoPedido}
        />

        <ClasseButtons
          classeTodos= {true}
          classeSelecionada={classeSelecionada}
          classes={classes.filter((c): c is string => !!c)}
          setClasseSelecionada={setClasseSelecionada}
        />

        


        <div className="w-full flex flex-col justify-between min-h-80 lg:flex-row ">

          {/* Lista de produtos do pedido */}
          <div className="flex flex-col w-full border-2 border-blue-600 rounded max-h-90 lg:w-1/2">
            <div className="hidden text-center border-b-2 p-2 text-blue-600 font-bold sm:grid sm:grid-cols-6">
              <div>Quant</div>
              <div className="col-span-3">Produtos</div>
              <div>Valor</div>
              <div>Excluir</div>
            </div>
            <ul className="flex-1 border-blue-600 rounded max-h-70 overflow-auto">
              {produtosPedido.map((p, i) => (
                <li key={p.id + i}>
                  <div className="grid grid-cols-6 text-center border-b">
                    <div>{p.quantidade}</div>
                    <div className="col-span-3">{p.nome}</div>
                    <div>€ {(p.precoVenda * p.quantidade).toFixed(2)}</div>
                    <div>
                      <button
                        onClick={() => removerProdutoPedido(p.id)}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col justify-between p-2 border-t-2 border-blue-600 sm:flex-row">
              <div className="flex justify-center items-center px-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={diminuir}
                    className="px-3 py-1 bg-red-500 text-white rounded cursor-pointer font-black"
                  >-</button>
                  <input
                    type="text"
                    value={`€ ${ajuste.toFixed(2)}`}
                    readOnly
                    className="text-center w-24 border rounded p-1"
                  />
                  <button
                    onClick={aumentar}
                    className="px-3 py-1 bg-green-500 text-white rounded cursor-pointer font-black"
                  >+</button>
                </div>
              </div> 

              <span className="flex gap-2 px-15 justify-between font-bold text-lg">
                <span>Total</span>
                <span>€ {(valorTotal.toFixed(2))}</span>
              </span>
            </div>
          </div>

          {/* Lista de Produtos */}
          <div className="w-full p-2 rounded mt-5 lg:p-0 lg:mt-0 lg:shadow-none lg:w-1/2 flex flex-col justify-between shadow shadow-blue-600">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-3 gap-1 p-2 max-h-74 overflow-auto ">
              {produtosFiltrados.map(p => (
                <div
                  key={p.id}
                  onClick={() => setProdutoSelecionado(p.id)}
                  className={`cursor-pointer p-2 rounded-lg shadow border flex
                    ${produtoSelecionado === p.id ? "bg-blue-500 text-white" : "bg-white hover:bg-gray-100"}`}
                >
                  <div className='w-full flex flex-col justify-center items-center'>
                    <img className='w-20 h-20 rounded-full' src={p.imagemUrl || '/public/logo.png'} />
                    <div className='flex flex-col'>
                      <p className="text-sm font-semibold">{p.nome}</p>
                    </div>
                    <div className='w-full flex justify-between items-center'>
                      <p className="text-2xl">€ {p.precoVenda.toFixed(2)}</p>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => abrirModalProduto(p)}
                        className="mt-2 flex items-center gap-1 bg-blue-600 rounded-full text-white font-black cursor-pointer"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Lançar pedido */}
            <div className="flex flex-col justify-between items-center mt-4 p-2 gap-2 sm:flex-row">
              <div className='flex gap-5 flex-1 justify-between bg-blue-600 text-white rounded p-2'>
                {['dinheiro', 'cartao', 'mbway', 'aplicativo'].map(pag => (
                  <label key={pag} className='flex gap-1 cursor-pointer'>
                    <input
                      type='radio'
                      name='pagamento'
                      value={pag}
                      checked={tipoPagamento === pag}
                      onChange={() => setTipoPagamento(pag)}
                      className='cursor-pointer'
                      required
                    />
                    {pag.charAt(0).toUpperCase() + pag.slice(1)}
                  </label>
                ))}
              </div>

              <button
                onClick={handleSalvarPedido}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
              >
                <Plus size={18} /> Lançar
              </button>
            </div>
            <input 
              className="border-1 border-blue-600 rounded p-3" 
              type="text" placeholder="observação..." 
              value={obs}     
              onChange={(e)=>stados.setObs(e.target.value)}         
            />
          </div>

          {/* Modal */}
          <Dialog open={modalAberto} onOpenChange={setModalAberto}>
            <DialogContent className="max-w-3xl bg-white">
              <DialogHeader>
                <DialogTitle>{produtoModal?.nome}</DialogTitle>
              </DialogHeader>

              {produtoModal && (
                <div className="space-y-4">
                  <p className="text-gray-700">Preço base: € {produtoModal.precoVenda.toFixed(2)}</p>

                  <div className="flex items-center gap-2">
                    <span>Quantidade:</span>
                    <input
                      type="number"
                      min={1}
                      value={quantidadeSelecionada}
                      onChange={e => setQuantidadeSelecionada(Number(e.target.value))}
                      className="w-20 border rounded p-1 text-center cursor-pointer"
                    />
                  </div>

                 <div className="flex flex-col gap-3">
                    {/* 🔹 Listagem de cupons aplicáveis ao produto */}
                    <div className="flex gap-2 flex-wrap">
                      {cuponsDisponiveis
                        .filter(c =>
                          normalize(produtoModal?.classe || '').includes(normalize(c.tipo))
                        )
                        .map((c, i) => {
                          const selecionado = cuponsSelecionados.some(
                            sel => sel.codigo === c.codigo && sel.tipo === c.tipo
                          );
                          return (
                            <button
                              key={c.codigo + i}
                              onClick={() => toggleCupom(c)}
                              className={`py-1 px-2 rounded border text-sm font-medium transition ${
                                selecionado
                                  ? "bg-green-600 text-white border-green-600"
                                  : "bg-green-100 text-green-700 border-green-400 hover:bg-green-200"
                              }`}
                            >
                              {c.codigo} - {c.tipo}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(() => {
                      if (!produtoModal) return null;

                      const tiposExtras = produtoModal.classe === "estudante"
                        ? (produtoModal.categoria === "massa" ? ["molho", "ingrediente", "ingredienteplus",'bebida-estudante'] : ["ingredienteplus",'bebida-estudante'])
                        : extrasPorClasse[(produtoModal.classe ?? '')] || [];

                      if (tiposExtras.length === 0) return <p>Sem extras disponíveis</p>;

                      const getQuantidadeInput = (extraId: string) => {
                        const input = document.getElementById(`extra-quantidade-${extraId}`) as HTMLInputElement;
                        return input?.value ? Number(input.value) : 1;
                      };

                      return tiposExtras.map(tipo => (
                        <div key={tipo} className="w-full border rounded p-2">
                          <h4 className="font-semibold capitalize text-blue-600 mb-2">{tipo}</h4>
                          <div className="flex flex-col text-sm gap-0.5">
                            {extras.filter(e => e.tipo === tipo).map(extra => {
                              const selecionado = extrasSelecionados.some(sel => sel.id === extra.id);
                              const limite = getLimiteExtra(produtoModal, tipo);

                              // soma das quantidades dos extras do mesmo tipo
                              const totalSelecionadosDoTipo = extrasSelecionados
                                .filter(sel => sel.tipo === tipo)
                                .reduce((sum, sel) => sum + getQuantidadeInput(sel.id), 0);

                              // desabilita se atingir o limite
                              const disabled = limite !== null && totalSelecionadosDoTipo >= limite && !selecionado;

                              return (
                                <label key={extra.id} className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={selecionado}
                                    disabled={disabled}
                                    onChange={() => {
                                      if (selecionado) {
                                        setExtrasSelecionados(prev => prev.filter(x => x.id !== extra.id));
                                      } else {
                                        setExtrasSelecionados(prev => [...prev, extra]);
                                      }
                                    }}
                                    className="cursor-pointer"
                                  />
                                  {tipo && tipo !== 'molho' && !extra.valor && tipo !== 'bebida-estudante' &&
                                    <div className="w-full flex gap-1 justify-between ">
                                      <span>{extra.nome}</span>
                                      <input
                                        id={`extra-quantidade-${extra.id}`}
                                        className="w-10 border rounded text-center"
                                        type="number"
                                        min={1}
                                      />
                                    </div>
                                  }
                                  {tipo === 'molho' &&
                                    <div><span>{extra.nome}</span></div>
                                  }
                                  {tipo === 'bebida-estudante' &&
                                    <div><span>{extra.nome}</span></div>
                                  }
                                  {tipo === 'ingredienteplus' &&
                                    <div className="w-full flex gap-1 justify-between ">
                                      <span className="flex-1">{extra.nome}</span>
                                      <span>€ {extra.valor?.toFixed(2)}</span>
                                    </div>
                                  }
                                  {tipo === 'acaiplus' &&
                                    <div className="w-full flex gap-1 justify-between ">
                                      <span className="flex-1">{extra.nome}</span>
                                      <span>€ {extra.valor?.toFixed(2)}</span>
                                    </div>
                                  }
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setModalAberto(false)} className="bg-red-600 text-white hover:bg-red-800 cursor-pointer">
                  Cancelar<Delete/>
                </Button>
                <Button
                  onClick={async () => {
                    confirmarProduto();
                    setModalAberto(false);
                  }}

                  className="bg-green-600 text-white hover:bg-green-800 cursor-pointer"
                >
                  <PlusCircleIcon /> Confirmar
                </Button>


              </div>
            </DialogContent>
          </Dialog>
        </div>

        
          {/* Listagem de Pedidos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[100vh] overflow-auto">
            {/* Pedidos Abertos */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-blue-600 gap-2">
                <ClipboardList /> Pedidos Abertos
              </h3>
              {pedidosAbertos.length === 0 ? (
                <p className="text-gray-500">Nenhum pedido aberto.</p>
              ) : (
                pedidosAbertos.map(p => (
                  <div key={p.id} className="flex w-full m-auto border p-3 rounded mb-3">
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between items-center">
                        <div>
                          <p>{new Date(p.criadoEm).toLocaleDateString('pt-BR')}</p>
                          <strong>{p.nomeCliente}</strong>
                          {p.numeroMesa ? <p className='text-xs'>Mesa: {p.numeroMesa}</p> : ''}
                        </div>
                        <div className="bg-blue-600 p-2 text-white rounded">{p.codigoPedido}</div>
                        <select
                          value={p.status}
                          onChange={async (e) => {
                            const novoStatus = e.target.value;

                            await atualizarStatus(p.id || '', novoStatus);

                           if (novoStatus.toLowerCase() === "entregue") {
                              const produtosComCupom = (p.produtos || []).filter(prod => prod.cupomAplicado);

                              if (produtosComCupom.length > 0) {
                                // Prepara os cupons para resgatar
                                produtosComCupom.forEach(produto => {
                                  const cupom = produto.cupomAplicado;
                                  if (cupom && cupom.codigo && cupom.tipo) {
                                    // Adiciona ao estado de cuponsSelecionados para resgatar
                                    toggleCupom({ 
                                      codigo: cupom.codigo, 
                                      tipo: cupom.tipo, 
                                      dataGanho: new Date().toISOString(), 
                                      quantidade: 1 
                                    });
                                  }
                                });

                                // Resgata todos os cupons selecionados de uma vez
                                await resgatarCupomSelecionado();

                                console.log("✅ Cupons resgatados com sucesso (pedido entregue)!");
                              }
                            }

                          }}

                          className={`w-[150px] text-center inline-block px-3 py-1 border rounded text-sm font-semibold mt-1 cursor-pointer ${statusColor(p.status || '')}`}
                        >
                          {STATUS_PEDIDO_OPTIONS.map((status)=>(
                            <option
                              key={status} value={status}
                            >
                              {status}
                            </option>
                          ))}
                          
                        </select>

                      </div>

                      <div className="flex flex-col gap-3 w-full text-sm mt-1 text-gray-700 list-disc list-inside">                    
                        {p.produtos?.map((item, i) => {
                          const totalExtrasProduto = calcularTotalExtras(item)
                          const subtotalProduto = calcularSubTotalProduto(item)

                          return (
                            <div
                                key={item.id + i + '-' + (item.extras?.map(e => e.id).join('_') || '') + '-'}
                                className="flex p-2 gap-5 justify-between bg-gray-200 rounded"
                              >
                              <div className="flex-1">
                                <div>{item.nome} - {item.categoria}</div>
                                {item.extras?.length > 0 && (
                                  <div className="mt-1 text-sm">
                                    <div className='font-semibold border-t-1'>
                                    - Extras
                                    </div>
                                    <div className="pl-5">
                                      {item.extras.map(extra => (
                                        <div className='flex justify-between' key={extra.id}>
                                          <div>
                                            {extra.nome} 
                                          </div>
                                          <div>
                                            {extra.valor && extra.valor > 0 ?`€ ${extra.valor?.toFixed(2)}`:''}                                        
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <hr />
                                    
                                    <div className='flex justify-between font-bold'>
                                      <div>Total Extras</div>
                                      <div>€ {totalExtrasProduto.toFixed(2)}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div>{item.quantidade}</div>
                              <div>€ {subtotalProduto.toFixed(2)}</div>
                            </div>
                          );
                        })}

                      </div>
                      
                      <div className="flex justify-between font-black pt-2 border-t-2 gap-6 items-center">
                        <div className="flex gap-2">
                          {/* Botão para selecionar pedido */}
                          <button
                            onClick={() => {
                              setIdPedidoSelecionado(p.id || '');
                              preencherCamposPedido(p); // preenche os campos do formulário
                            }}
                            className={`px-2 py-1 font-bold rounded-full text-white ${
                              idPedidoSelecionado === p.id ? 'bg-green-600' : ''
                            }`}
                          >
                            <PlusSquare size={30} className="bg-green-500 p-1 rounded-full"/>
                          </button>

                          <button className='text-blue-600 hover:bg-blue-600 p-2 rounded-full hover:text-white' onClick={() => imprimir(p)}>
                            <Printer className='cursor-pointer' size={24} />
                          </button>
                        </div>
                        <div>
                          Total  
                        </div>
                        <p className='flex-1 text-right text-xl'>€ {p.valor.toFixed(2)}</p>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pedidos Finalizados */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-green-600 gap-2">
                <CheckCircle2 /> Pedidos Finalizados
              </h3>
              {pedidosFechados.length === 0 ? (
                <p className="text-gray-500">Nenhum pedido finalizado.</p>
              ) : (
                pedidosFechados.map(p => (
                  <div key={p.id} className="flex w-full m-auto border p-3 rounded mb-3">
                    <div className="flex flex-col w-full">
                      <div className="flex justify-between items-center">
                        <div>
                          <p>{new Date(p.criadoEm).toLocaleDateString('pt-BR')}</p>
                          <strong>{p.nomeCliente}</strong>
                        </div>
                        <div className="bg-blue-600 p-2 text-white rounded">{p.codigoPedido}</div>
                      </div>

                      <div className="flex flex-col gap-3 w-full text-sm mt-1 text-gray-700 list-disc list-inside">                    
                        {p.produtos?.map(item => {
                          const totalExtrasProduto = item.extras?.reduce((sum, e) => sum + (e.valor || 0), 0) || 0;
                          const subtotalProduto = item.precoVenda * item.quantidade + totalExtrasProduto;

                          return (
                            <div
                                key={item.id + '-' + (item.extras?.map(e => e.id).join('_') || '') + '-'}
                                className="flex p-2 gap-5 justify-between bg-gray-200 rounded"
                              >
                              <div className="flex-1">
                                <div>{item.nome} - {item.categoria}</div>
                                {item.extras?.length > 0 && (
                                  <div className="mt-1 text-sm">
                                    <div className='font-semibold border-t-1'>
                                    - Extras
                                    </div>
                                    <div className="pl-5">
                                      {item.extras.map(extra => (
                                        <div className='flex justify-between' key={extra.id}>
                                          <div>
                                            {extra.nome} 
                                          </div>
                                          <div>
                                            {extra.valor && extra.valor > 0 ?`€ ${extra.valor?.toFixed(2)}`:''} 
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <hr />
                                    <div className='flex justify-between font-bold'>
                                      <div>Total Extras</div>
                                      <div>€ {totalExtrasProduto.toFixed(2)}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div>{item.quantidade}</div>
                              <div>€ {subtotalProduto.toFixed(2)}</div>
                            </div>
                          );
                        })}

                      </div>

                      <div className="flex justify-between font-black p-2 border-t-2 pt-2">
                        <div className="flex gap-2">
                          <button className='text-blue-600 hover:bg-blue-600 p-2 rounded-full hover:text-white' onClick={() => imprimir(p)}>
                            <Printer className='cursor-pointer' size={24} />
                          </button>
                        </div>
                        <p>Total</p>
                        <p>€ {p.valor.toFixed(2)}</p>
                      </div>
                      <hr className='border-1'/>
                      <div >
                        {p.status == 'Cancelado' ? 
                          <div className='font-semibold text-right' >
                            <span className='text-blue-600'>Status:</span> <span className='text-red-500'>{p.status}</span>
                          </div>

                        :<div className='font-semibold text-right' >
                            <span className='text-blue-600'>Status:</span> <span className='text-green-500'>{p.status}</span>
                          </div>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        
      </div>
    </div>
  );
}
