import { useCartaoAdmin } from "@/hook/useCartaoAdmin";
import { usePedido } from "@/hook/usePedido";
import { useStados } from "@/hook/useStados";
import { Gift, Phone, Calendar, User } from "lucide-react";
import { regrasFidelidade, obterRegraFidelidade } from "@/lib/regrasFidelidade";

export default function FidelidadeAdmin() {
  const stados = useStados();
  const { clientes, loading: loadingClientes } = useCartaoAdmin();
  const { pedidos } = usePedido(stados);

  if (loadingClientes) return <div className="p-6">Carregando clientes...</div>;

  const mesAtual = new Date().getMonth();
  const hoje = new Date();
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(hoje.getDate() - 7);

  const comprouSemana = new Set<string>();
  const comprouMes = new Set<string>();
  const ultimaCompraMap = new Map<string, Date>();

  // Normaliza pedidos
  pedidos.forEach(p => {
    if (p.status !== "Entregue") return;

    const data: Date | null = p.criadoEm instanceof Date
      ? p.criadoEm
      : p.data
        ? new Date(p.data)
        : null;

    if (!data) return;

    const codigo = p.codigoCliente || '';
    if (!codigo) return;

    const ultima = ultimaCompraMap.get(codigo);
    if (!ultima || data > ultima) ultimaCompraMap.set(codigo, data);

    if (data >= seteDiasAtras) comprouSemana.add(codigo);
    if (data.getMonth() === mesAtual) comprouMes.add(codigo);
  });

  const clientesSemCompraSemana = clientes.filter(c => !comprouSemana.has(c.codigoCliente)).length;
  const clientesSemCompraMes = clientes.filter(c => !comprouMes.has(c.codigoCliente)).length;

  // Último dia do mês para mensagens de cupons
  const ultimoDiaMes = new Date(new Date().getFullYear(), mesAtual + 1, 0);

  // Lista de aniversariantes do mês ordenada por dia
  const aniversariantesDoMesLista = clientes
    .filter(c => c.dataNascimento)
    .filter(c => new Date(c.dataNascimento!).getMonth() === mesAtual)
    .sort((a, b) => new Date(a.dataNascimento!).getDate() - new Date(b.dataNascimento!).getDate());

  // Função para calcular faltando para próximo cupom baseado no mês atual
  const faltandoParaCupom = (cartao: any, codigoCliente: string) => {
    const regra = obterRegraFidelidade(cartao.tipo);
    if (!regra) return 0;

    const ultima = ultimaCompraMap.get(codigoCliente);
    const pontosMesAtual = ultima && ultima.getMonth() === mesAtual ? cartao.quantidade : 0;
    const faltando = regra.limite - pontosMesAtual;
    return faltando > 0 ? faltando : 0;
  };

  // Lista clientes com >= 8 pontos (considerando pontos do mês atual)
  const clientesCom8Pontos = clientes.filter(c =>
    c.cartoes.some(cartao => {
      const ultima = ultimaCompraMap.get(c.codigoCliente);
      const pontosMesAtual = ultima && ultima.getMonth() === mesAtual ? cartao.quantidade : 0;
      return pontosMesAtual >= 8;
    })
  );

  // Lista completa ordenada por nome
  const clientesOrdenados = [...clientes].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt', { sensitivity: 'base' })
  );

  // Mensagem WhatsApp aniversariantes
  const gerarMensagemAniversario = (cliente: any) => {
    const texto = `
        Feliz aniversário, ${cliente.nome}!

A Top Pizzas deseja um dia incrível e cheio de sabor!

Aproveite seu dia!
    `;
    return encodeURIComponent(texto.trim());
  };

  // Mensagem WhatsApp cupons
  const gerarMensagemCupom = (cliente: any) => {
    const linhas = cliente.cartoes.map((cartao: any) => {
      const faltando = faltandoParaCupom(cartao, cliente.codigoCliente);
      return `• ${cartao.tipo}: ${faltando} compras faltando`;
    }).join('\n');

    const texto = `
        Olá ${cliente.nome}!

Você está quase conquistando seus cupons deste mês:
${linhas}

Aproveite até ${ultimoDiaMes.toLocaleDateString('pt-BR')} para ganhar todos os cupons!
    `;
    return encodeURIComponent(texto.trim());
  };

  return (
    <div className="p-6 space-y-8">
      {/* Estatísticas */}
      <div className="bg-white shadow-md rounded-xl p-6 border grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <h3 className="text-3xl font-bold">{clientes.length}</h3>
          <p className="text-gray-600 text-sm">Clientes cadastrados</p>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-purple-600">{aniversariantesDoMesLista.length}</h3>
          <p className="text-gray-600 text-sm">Aniversariantes do mês</p>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-red-600">{clientesSemCompraMes}</h3>
          <p className="text-gray-600 text-sm">Sem compras no mês</p>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-orange-600">{clientesSemCompraSemana}</h3>
          <p className="text-gray-600 text-sm">Sem compras na semana</p>
        </div>
      </div>

      {/* Lista de aniversariantes */}
      {aniversariantesDoMesLista.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-3">🎉 Aniversariantes do mês 🎉</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {aniversariantesDoMesLista.map(cliente => {
              const ultimaCompra = ultimaCompraMap.get(cliente.codigoCliente);
              return (
                <div key={cliente.codigoCliente} className="bg-yellow-50 p-4 rounded-xl shadow-sm border flex items-center justify-between hover:shadow-md transition">
                  <div>
                    <p className="font-semibold text-lg">{cliente.nome}</p>
                    <p className="text-gray-600 text-sm">
                      Aniversário: {new Date(cliente.dataNascimento!).getDate()}/{mesAtual + 1}
                    </p>
                    {ultimaCompra && (
                      <p className="text-gray-600 text-sm">
                        Última compra: {ultimaCompra.toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  {cliente.telefone && (
                    <a
                      href={`https://wa.me/351${cliente.telefone}?text=${gerarMensagemAniversario(cliente)}`}
                      target="_blank"
                      className="bg-green-500 text-white py-2 px-4 rounded-lg shadow hover:bg-green-600 transition"
                    >
                      WhatsApp 🎉
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista clientes com 8+ pontos */}
      {clientesCom8Pontos.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-3">Clientes com 8 ou mais pontos no mês</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {clientesCom8Pontos.map(cliente => {
              const ultimaCompra = ultimaCompraMap.get(cliente.codigoCliente);
              return (
                <div key={cliente.codigoCliente} className="bg-blue-50 p-4 rounded-xl shadow-sm border flex items-center justify-between hover:shadow-md transition">
                  <div>
                    <p className="font-semibold text-lg">{cliente.nome}</p>
                    {ultimaCompra && (
                      <p className="text-gray-600 text-sm">
                        Última compra: {ultimaCompra.toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  {cliente.telefone && (
                    <a
                      href={`https://wa.me/351${cliente.telefone}?text=${gerarMensagemCupom(cliente)}`}
                      target="_blank"
                      className="bg-green-500 text-white py-2 px-4 rounded-lg shadow hover:bg-green-600 transition"
                    >
                      WhatsApp 📲
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista completa de clientes */}
      <h1 className="text-2xl font-bold mt-8">Cartões de Fidelidade por Cliente</h1>
      {clientesOrdenados.length === 0 && <p className="text-gray-500">Nenhum cliente cadastrado.</p>}

      {clientesOrdenados.map(cliente => {
        const ultimaCompra = ultimaCompraMap.get(cliente.codigoCliente);
        return (
          <div key={cliente.id} className="bg-white shadow-md rounded-xl p-5 border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  {cliente.nome}
                </h2>
                <p className="text-gray-600 text-sm">Código: <b>{cliente.codigoCliente}</b></p>
                <p className="text-gray-600 text-sm flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {cliente.telefone}
                </p>
                {cliente.dataNascimento && (
                  <p className="text-gray-600 text-sm flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(cliente.dataNascimento).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {ultimaCompra && (
                  <p className="text-gray-600 text-sm flex items-center gap-1">
                    Última compra: {ultimaCompra.toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            {/* Cartões */}
            <div className="grid md:grid-cols-5 gap-4 pt-3 border-t">
              {cliente.cartoes.map(cartao => (
                <div key={cartao.tipo} className="bg-gray-50 p-4 rounded-xl shadow-sm border">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-600" />
                    {cartao.tipo}
                  </h3>
                  <p className="text-sm text-gray-700">Pontos: <b>{cartao.quantidade}</b></p>

                  <div className="bg-gray-200 p-2 rounded">
                    <p className="text-sm text-green-700">Cupons</p>
                    <div className="flex justify-between">
                      <p className="text-sm text-green-700">
                        Ganhos: <b>{(cartao.cupomGanho?.length || 0) + (cartao.cupomResgatado?.length || 0)}</b>
                      </p>
                      <p className="text-sm text-blue-700">
                        Resgatados: <b>{cartao.cupomResgatado?.length || 0}</b>
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">
                    Cupons disponíveis: <b>{cartao.cupomGanho?.length || 0}</b>
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
