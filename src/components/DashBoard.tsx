'use client';

import { JSX, useEffect, useState } from 'react';
import { DollarSign, CalendarCheck, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

interface Produto {
  nome: string;
  preco: number;
  custo?: number;
  quantidade: number;  
}

interface Pedido {
  valor: number;
  custo?: number;
  data: Date;
  produto?: Produto[];
  canal?: string;
  pagamento?: string;
  faturado?: string;  
}

type FiltroPeriodo = 'hoje' | 'semana' | 'mes' | 'ano';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];


const imagensPorCanal: Record<string, string> = {
  Uber: '/uber.png',
  Glovo: '/glovo.png',
  Bolt: '/bolt.png',
  Restaurante: '/logo.png',
};

const taxasPorCanal: Record<string, number> = {
  Uber: 0.3,   // 25% de taxa
  Glovo: 0.3,  // 20% de taxa
  Bolt: 0.3,   // 22% de taxa
  Restaurante: 0, // sem taxa
};

export default function DashBoard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('semana');
  const [moeda, setMoeda] = useState('€'); // pode trocar para 'R$' etc.

  useEffect(() => {
    async function carregarPedidos() {
      try {
        const pedidosRef = collection(db, 'pedidos');
        const snapshot = await getDocs(pedidosRef);
        const dados = snapshot.docs.map((doc) => {
          const d = doc.data();
          const produtos = Array.isArray(d.produtos)
            ? d.produtos.map((p: any) => ({
                nome: p.nome,
                preco: p.preco,
                custo: p.custo || 0,
                quantidade: p.quantidade || 1,
              }))
            : [];

          return {
            valor: d.valor,
            custo: d.custo || 0,
            data: d.data instanceof Timestamp ? d.data.toDate() : new Date(d.data),
            produto: produtos,
            canal: d.tipoVenda,
            pagamento: d.tipoPagamento,
            faturado: d.tipoFatura,
          } as Pedido;
        });
        setPedidos(dados);
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarPedidos();
  }, []);

  if (loading) return <p>Carregando...</p>;

  const filtrarPedidos = (periodo: FiltroPeriodo) => {
    const hoje = new Date();
    let inicio: Date;
    switch (periodo) {
      case 'hoje':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        break;
      case 'semana':
        inicio = new Date(hoje);
        const diaSemana = hoje.getDay() === 0 ? 7 : hoje.getDay();
        inicio.setDate(hoje.getDate() - diaSemana + 1);
        break;
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        break;
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        break;
      default:
        inicio = new Date(hoje);
    }
    return pedidos.filter((p) => p.data >= inicio);
  };

  const pedidosFiltrados = filtrarPedidos(filtroPeriodo);

  // Cards principais
  const faturamentoTotal = pedidosFiltrados.reduce((acc, p) => acc + p.valor, 0);
  const totalPedidos = pedidosFiltrados.length;
  const ticketMedio = totalPedidos > 0 ? (faturamentoTotal / totalPedidos).toFixed(2) : '0.00';

  const calcularCrescimentoDiario = () => {
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);
    const totalHoje = pedidosFiltrados
      .filter((p) => p.data.toDateString() === hoje.toDateString())
      .reduce((acc, p) => acc + p.valor, 0);
    const totalOntem = pedidosFiltrados
      .filter((p) => p.data.toDateString() === ontem.toDateString())
      .reduce((acc, p) => acc + p.valor, 0);
    if (totalOntem === 0) return 100;
    return ((totalHoje - totalOntem) / totalOntem) * 100;
  };
  const crescimentoDiario = calcularCrescimentoDiario();

  const calcularCrescimentoSemanal = () => {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    const diaSemana = hoje.getDay() === 0 ? 7 : hoje.getDay();
    inicioSemana.setDate(hoje.getDate() - diaSemana + 1);
    const inicioSemanaPassada = new Date(inicioSemana);
    inicioSemanaPassada.setDate(inicioSemana.getDate() - 7);
    const fimSemanaPassada = new Date(inicioSemana);
    fimSemanaPassada.setDate(inicioSemana.getDate() - 1);
    const totalSemanaAtual = pedidosFiltrados
      .filter((p) => p.data >= inicioSemana)
      .reduce((acc, p) => acc + p.valor, 0);
    const totalSemanaPassada = pedidosFiltrados
      .filter((p) => p.data >= inicioSemanaPassada && p.data <= fimSemanaPassada)
      .reduce((acc, p) => acc + p.valor, 0);
    if (totalSemanaPassada === 0) return 100;
    return ((totalSemanaAtual - totalSemanaPassada) / totalSemanaPassada) * 100;
  };
  const crescimentoSemanal = calcularCrescimentoSemanal();

  
  // Calcular métricas por canal
  const canais = [
    { nome: 'Uber', filtro: (p: Pedido) => p.canal?.toLowerCase() === 'uber' },
    { nome: 'Glovo', filtro: (p: Pedido) => p.canal?.toLowerCase() === 'glovo' },
    { nome: 'Bolt', filtro: (p: Pedido) => p.canal?.toLowerCase() === 'bolt' },
    { nome: 'Restaurante', filtro: (p: Pedido) => ['mesa','balcao','app'].includes(p.canal?.toLowerCase() || '') },
  ];

  const cardsPorCanal = canais.map(canal => {
  const pedidosCanal = pedidosFiltrados.filter(canal.filtro);
  const quantidade = pedidosCanal.length;
  const valorBruto = pedidosCanal.reduce((acc, p) => acc + p.valor, 0);
  const custo = 0.35
  

  const taxa = taxasPorCanal[canal.nome] || 0;

  const valorLiquido = pedidosCanal.reduce((acc, p) => {
    // aplica taxa se tiver
    const desconto = taxa > 0 ? (p.valor * taxa) + (p.valor * custo) : p.valor * custo || 0;
    return acc + (p.valor - desconto);
  }, 0);

  return {
    title: canal.nome,
    quantidade,
    valorBruto,
    valorLiquido,
  };
});

const lucroLiquido = cardsPorCanal.reduce((acc, card) => acc + card.valorLiquido, 0);

const cardsPrincipais = [
    { icon: <DollarSign size={28} className="text-green-600" />, title: 'Faturamento', value: `${moeda} ${faturamentoTotal.toFixed(2)}` },
    { icon: <CalendarCheck size={28} className="text-blue-600" />, title: 'Pedidos', value: totalPedidos.toString() },
    { icon: <TrendingUp size={28} className="text-purple-600" />, title: 'Ticket Médio', value: `${moeda} ${ticketMedio}` },
    { icon: <DollarSign size={28} className="text-yellow-600" />, title: 'Lucro Líquido', value: `${moeda} ${lucroLiquido.toFixed(2)}` },
  ];



  // Faturamento por dia da semana
  const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const pedidosPorDia = diasSemana.map((dia, i) => {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    const diaSemana = hoje.getDay() === 0 ? 7 : hoje.getDay();
    inicioSemana.setDate(hoje.getDate() - diaSemana + 1 + i);
    const faturamento = pedidosFiltrados
      .filter((p) => p.data.toDateString() === inicioSemana.toDateString())
      .reduce((acc, p) => acc + p.valor, 0);
    return { dia, faturamento };
  });

  // Produtos
  const produtosMap = pedidosFiltrados.reduce((acc: Record<string, { qtd: number; valor: number; lucro: number }>, p) => {
    if (Array.isArray(p.produto)) {
      p.produto.forEach(item => {
        const nome = item.nome;
        const quantidade = item.quantidade || 1;
        const valorTotal = item.quantidade * item.preco;
        const lucroTotal = ((item.preco) - (item.preco * .35 || 0)) * quantidade;

        if (!acc[nome]) acc[nome] = { qtd: 0, valor: 0, lucro: 0 };
        acc[nome].qtd += quantidade;
        acc[nome].valor += valorTotal;
        acc[nome].lucro += lucroTotal;
      });
    }
    return acc;
  }, {});

  const topProdutos = Object.entries(produtosMap)
    .map(([nome, dados]) => ({ nome, ...dados }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);

  const produtoMaisLucrativo = Object.entries(produtosMap)
    .map(([produto, dados]) => ({ produto, lucro: dados.lucro }))
    .sort((a, b) => b.lucro - a.lucro)[0];

  // Pedidos por canal
  const canaisMap = pedidosFiltrados.reduce((acc: Record<string, { qtd: number; valor: number }>, p) => {
    if (p.canal) {
      if (!acc[p.canal]) acc[p.canal] = { qtd: 0, valor: 0 };
      acc[p.canal].qtd += 1;
      acc[p.canal].valor += p.valor;
    }
    return acc;
  }, {});
  const pedidosPorCanal = Object.entries(canaisMap).map(([canal, dados]) => ({ canal, ...dados }));

  // Horários
  const refeicoes = [
    { nome: 'Café da manhã', inicio: 7, fim: 11 },
    { nome: 'Almoço', inicio: 11, fim: 15 },
    { nome: 'Tarde', inicio: 15, fim: 18 },
    { nome: 'Jantar', inicio: 18, fim: 23 },
  ];
  const faturamentoPorRefeicao = refeicoes.map((r) => {
    const total = pedidosFiltrados
      .filter((p) => p.data.getHours() >= r.inicio && p.data.getHours() < r.fim)
      .reduce((acc, p) => acc + p.valor, 0);
    return { refeicao: r.nome, total };
  });

  // Finanças
  const vendasComFatura = pedidosFiltrados.filter((p) => p.faturado === 'cf').reduce((acc, p) => acc + p.valor, 0);
  const vendasSemFatura = pedidosFiltrados.filter((p) => p.faturado === 'sf').reduce((acc, p) => acc + p.valor, 0);
  const pagamentosMap = pedidosFiltrados.reduce((acc: Record<string, number>, p) => {
    if (p.pagamento) acc[p.pagamento] = (acc[p.pagamento] || 0) + p.valor;
    return acc;
  }, {});
  const vendasPorPagamento = Object.entries(pagamentosMap).map(([pagamento, total]) => ({ pagamento, total }));

  return (
    <div className="text-gray-800 p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cardsPrincipais.map((card, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-6 rounded-2xl shadow-lg transition-transform transform hover:-translate-y-2 hover:shadow-2xl bg-gradient-to-r from-white/90 to-white/70"
          >
            <div className={`p-4 rounded-full flex items-center justify-center ${card.icon.props.className} bg-opacity-20`}>
              {card.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-sm font-medium">{card.title}</span>
              <span className="text-2xl font-extrabold text-gray-900 mt-1">{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cards por canal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cardsPorCanal.map((card, i) => {
          // Define a imagem dinamicamente
          let imgSrc = imagensPorCanal[card.title] || '/images/logo.png';
          
          return (
            <div
              key={i}
              className="flex flex-col p-6 rounded-2xl shadow-lg transition-transform transform hover:-translate-y-2 hover:shadow-2xl bg-gradient-to-r from-white/90 to-white/70"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full flex items-center justify-center bg-gray-100">
                  <img src={imgSrc} alt={card.title} className=" rounded-full w-10 h-10 object-cover" />
                </div>
                <span className="text-gray-700 text-lg font-semibold">{card.title}</span>
              </div>
              <div className="flex flex-col gap-1 mt-2">
                <span className="flex justify-between text-gray-500 text-sm border-b-1 border-gray-300">
                  <span className='text-blue-600 font-semibold'>Faturamento</span> <span className="font-bold">{moeda} {card.valorBruto.toFixed(2)}</span>
                </span>
                <span className="flex justify-between text-gray-500 text-sm border-b-1 border-gray-300">
                  <span className='text-blue-600 font-semibold'>Valor Líquido</span> <span className="font-bold">{moeda} {card.valorLiquido.toFixed(2)}</span>
                </span>
                <span className="flex justify-between text-gray-500 text-sm border-b-1 border-gray-300">
                  <span className='text-blue-600 font-semibold'>Quantidade de pedidos</span> <span className="font-bold">{card.quantidade}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtro */}
      <div className="mb-6 w-64">
        <Select onValueChange={(v) => setFiltroPeriodo(v as FiltroPeriodo)} defaultValue="semana">
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent className="bg-white cursor-pointer">
            <SelectItem className="cursor-pointer" value="hoje">Hoje</SelectItem>
            <SelectItem className="cursor-pointer" value="semana">Semana</SelectItem>
            <SelectItem className="cursor-pointer" value="mes">Mês</SelectItem>
            <SelectItem className="cursor-pointer" value="ano">Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="semana">
        <TabsList className="mb-4 flex flex-wrap gap-2">
          <TabsTrigger className="cursor-pointer" value="semana">📅 Semana</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="produtos">🍕 Produtos</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="canal">📡 Canais</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="horario">⏰ Horários</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="financas">💰 Finanças</TabsTrigger>
        </TabsList>

        {/* Semana */}
        <TabsContent value="semana">
          <Card>
            <CardHeader><CardTitle>Faturamento por dia da semana</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pedidosPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${moeda} ${value.toFixed(2)}`, 'Faturamento']} />
                  <Legend />
                  <Line type="monotone" dataKey="faturamento" name={`Faturamento (${moeda})`} stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Produtos */}
        <TabsContent value="produtos">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {topProdutos.map((produto, i) => (
              <Card key={i} className="p-4">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">{produto.nome}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Quantidade vendida: <span className="font-bold">{produto.qtd}</span></p>
                  <p>Valor total: <span className="font-bold">{moeda} {produto.valor.toFixed(2)}</span></p>
                  <p>Lucro: <span className="font-bold">{moeda} {produto.lucro.toFixed(2)}</span></p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Canais */}
        <TabsContent value="canal">
          <Card>
            <CardHeader><CardTitle>Pedidos por Canal</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pedidosPorCanal} dataKey="qtd" nameKey="canal" outerRadius={100} label>
                    {pedidosPorCanal.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} pedidos`, 'Quantidade']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Horários */}
        <TabsContent value="horario">
          <Card>
            <CardHeader><CardTitle>Faturamento por período do dia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={faturamentoPorRefeicao} dataKey="total" nameKey="refeicao" outerRadius={100} label>
                    {faturamentoPorRefeicao.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${moeda} ${value.toFixed(2)}`, 'Total']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finanças */}
        <TabsContent value="financas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Tipo de Vendas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Com Fatura', valor: vendasComFatura },
                        { name: 'Sem Fatura', valor: vendasSemFatura }
                      ]}
                      dataKey="valor"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {[vendasComFatura, vendasSemFatura].map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${moeda} ${value.toFixed(2)}`, 'Valor']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Vendas por tipo de pagamento</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={vendasPorPagamento} dataKey="total" nameKey="pagamento" outerRadius={100} label>
                      {vendasPorPagamento.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${moeda} ${value.toFixed(2)}`, 'Valor']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
