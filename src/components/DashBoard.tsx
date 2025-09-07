'use client';

import { useEffect, useState } from 'react';
import { DollarSign, CalendarCheck, TrendingUp, ArrowUp, ArrowDown, BarChart } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, Bar } from 'recharts';
import { div } from 'framer-motion/client';



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

interface Despesa {
  id: string
  nome: string
  valor: number
  vencimentoDia: number
  pago?: boolean
}

interface DespesasPaga {
  id: string
  despesaId: string
  nome: string
  valorPago: number
  dataPagamento: Date | Timestamp
  formaPagamento: string
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
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [despesasPagas,setDespesasPagas] = useState<DespesasPaga[]>([])
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());


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

  useEffect(()=>{    
    async function carregarDespesas(){
      try{
        const despesasRef = collection(db,'despesas')
        const snapshot = await getDocs(despesasRef)
        const dados = snapshot.docs.map(doc =>{
        const d = doc.data()
          return{
            id: doc.id,
            nome: d.nome,
            valor: d.valor,
            vencimentoDia: d.vencimentoDia,
          } as Despesa
        })
        setDespesas(dados)
      }catch(err){
        console.error('Erro ao carregar despesas: ',err)
      }
    }

    carregarDespesas()
    carregarDespesasPagas() // 👈 adicionado aqui
  }, [])

  async function carregarDespesasPagas(){
    try{
      const pagasRef = collection(db,'despesaspagas')
      const snapshot = await getDocs(pagasRef)
      const dados = snapshot.docs.map(doc =>{
        const d = doc.data()
        return{
          id: doc.id,
          despesaId: d.despesaId,
          nome: d.nome || '', // opcional, se já salvar no Firestore
          valorPago: d.valorPago || 0,
          dataPagamento: d.dataPagamento instanceof Timestamp ? d.dataPagamento.toDate() : new Date(d.dataPagamento),
          formaPagamento: d.formaPagamento || ''
        } as DespesasPaga
      })
      setDespesasPagas(dados)
    }catch(err){
      console.error('Erro ao carregar despesas pagas: ',err)
    }
  }
  if (loading) return <p>Carregando...</p>;

 const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Agrupa quanto já foi pago **no mês atual** por despesaId
    const pagamentosNoMes: Record<string, number> = despesasPagas.reduce((acc, dp) => {
      if (!dp.despesaId) return acc; // ignora registros sem despesaId
      const data = dp.dataPagamento instanceof Timestamp ? dp.dataPagamento.toDate() : dp.dataPagamento;
      if (data.getMonth() === mesAtual && data.getFullYear() === anoAtual) {
        acc[dp.despesaId] = (acc[dp.despesaId] || 0) + (dp.valorPago ?? 0);
      }
      return acc;
    }, {} as Record<string, number>);

    // Função para verificar se despesa foi **totalmente** paga no mês atual
    const foiPagaNoMesAtual = (d: Despesa) => {
      const pago = pagamentosNoMes[d.id] || 0;
      return pago >= d.valor;
    };

    // Total de despesas (soma dos valores cadastrados)
    const totalDasDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);

    // Saldo: para cada despesa subtrai o que já foi pago no mês (tratando parciais)
    const saldoDespesas = despesas.reduce((acc, d) => {
      const pago = pagamentosNoMes[d.id] || 0;
      const restante = Math.max(0, d.valor - pago); // se pagamento maior que valor, zero
      return acc + restante;
    }, 0);


   


    // Função para criar a data completa de vencimento da despesa
    const getDataVencimento = (d: Despesa) => {
    const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), d.vencimentoDia);
    if (vencimento < hoje && !foiPagaNoMesAtual(d)) {
      // se já passou no mês atual, avança para o próximo mês
      vencimento.setMonth(vencimento.getMonth() + 1);
    }
    return vencimento;
  };

  // Despesas atrasadas
  const despesasAtrasadas = despesas.filter(d => {
    const venc = getDataVencimento(d);
    return venc < hoje && !foiPagaNoMesAtual(d);
  });

  // Próximas 7 dias
  const despesasProximas = despesas.filter(d => {
    const venc = getDataVencimento(d);
    const diffDias = (venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
    return diffDias >= 0 && diffDias <= 7 && !foiPagaNoMesAtual(d);
  });

  // Próximo vencimento
  const proximoVencimento = despesas
    .filter(d => !foiPagaNoMesAtual(d))
    .sort((a, b) => getDataVencimento(a).getTime() - getDataVencimento(b).getTime())[0];


  const gerarFaturamentoDiario = (mes: number, ano: number) => {
    const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const primeiraData = new Date(ano, mes, 1);
    const primeiraSemanaDia = primeiraData.getDay() === 0 ? 7 : primeiraData.getDay(); // Domingo=0 -> 7

    const dias: { dia: number | null; valor: number; valorAlmoco: number; valorJantar: number }[] = [];

    // Preenche dias vazios antes do dia 1
    for (let i = 1; i < primeiraSemanaDia; i++) {
      dias.push({ dia: null, valor: 0, valorAlmoco: 0, valorJantar: 0 });
    }

    // Preenche os dias do mês
    for (let i = 1; i <= totalDias; i++) {
      const data = new Date(ano, mes, i);
      const pedidosDoDia = pedidos
        .filter(p => p.data.getFullYear() === ano && p.data.getMonth() === mes && p.data.getDate() === i);

      const valorAlmoco = pedidosDoDia
        .filter(p => p.data.getHours() >= 10 && p.data.getHours() < 16)
        .reduce((acc, p) => acc + p.valor, 0);

      const valorJantar = pedidosDoDia
        .filter(p => p.data.getHours() >= 16 && p.data.getHours() < 23)
        .reduce((acc, p) => acc + p.valor, 0);

      dias.push({ dia: i, valor: valorAlmoco + valorJantar, valorAlmoco, valorJantar });
    }

    // Quebra em semanas e adiciona a soma semanal
    const semanas: { dia: number | null; valor: number; valorAlmoco: number; valorJantar: number; diaSemana: string | 'Faturamento Semanal' }[] = [];
    let somaSemana = 0;
    let somaAlmocoSemana = 0;
    let somaJantarSemana = 0;

    for (let i = 0; i < dias.length; i++) {
      const diaIndexSemana = i % 7;
      somaSemana += dias[i].valor;
      somaAlmocoSemana += dias[i].valorAlmoco;
      somaJantarSemana += dias[i].valorJantar;

      semanas.push({
        dia: dias[i].dia,
        valor: dias[i].valor,
        valorAlmoco: dias[i].valorAlmoco,
        valorJantar: dias[i].valorJantar,
        diaSemana: diasSemana[diaIndexSemana],
      });

      // Se for domingo ou último dia, adiciona soma da semana
      if (diaIndexSemana === 6 || i === dias.length - 1) {
        semanas.push({
          dia: null,
          valor: somaSemana,
          valorAlmoco: somaAlmocoSemana,
          valorJantar: somaJantarSemana,
          diaSemana: 'Faturamento Semanal',
        });
        somaSemana = 0;
        somaAlmocoSemana = 0;
        somaJantarSemana = 0;
      }
    }

    return semanas;
  };

  

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
        inicio.setDate(hoje.getDate() - diaSemana );
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
  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
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
    { nome: 'Almoço', inicio: 10, fim: 16 },
    { nome: 'Jantar', inicio: 16, fim: 23 },
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

  // Dentro do componente DashBoard, antes do return:

  const faturamentoPorRefeicaoMesSelecionado = refeicoes.map((r) => {
    const total = pedidos
      .filter(p => 
        p.data.getMonth() === mesSelecionado && 
        p.data.getFullYear() === anoSelecionado && 
        p.data.getHours() >= r.inicio && 
        p.data.getHours() < r.fim
      )
      .reduce((acc, p) => acc + p.valor, 0);
    return { refeicao: r.nome, total };
  });


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

      <div className='grid grid-cols-4 gap-4 mb-8'>
          
            {/* Próximas */}
              <Card className="bg-yellow-100 border-yellow-300 text-yellow-800 flex flex-col gap-4 p-6 rounded-2xl shadow-lg bg-gradient-to-t  to-yellow-200">
                <CardTitle className="text-lg font-semibold mb-2">📅 Próximos 7 dias</CardTitle>
                <CardContent className="space-y-1 p-0">
                  {despesasProximas.length === 0 ? (
                    <div className="text-sm text-gray-600">Nenhum vencimento próximo</div>
                  ) : (
                    despesasProximas.map(d => (
                      <div key={d.id} className="text-sm flex justify-between border-b-1 gap-2">
                        <div>Dia: {d.vencimentoDia < 10 ? `0${d.vencimentoDia}`: d.vencimentoDia}</div>
                        <div className='flex-1'> - {d.nome}</div>
                        <div className='flex gap-1 justify-between'>
                          <div>{moeda}</div>
                          <div>{d.valor.toFixed(2)}</div>
                          
                        </div>
                          
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

            {/* Atrasadas */}
            <Card className="bg-red-100 border-red-300 text-red-800 flex flex-col gap-4 p-6 rounded-2xl shadow-lg bg-gradient-to-t to-red-200">
              <CardTitle className="text-lg font-semibold mb-2">⚠️ Atrasadas</CardTitle>
              <CardContent className=" p-0">
                {despesasAtrasadas.length === 0 ? (
                  <div className="text-sm text-gray-600">Nenhuma despesa atrasada 🎉</div>
                ) : (
                  despesasAtrasadas.map(d => (
                    <div key={d.id} className="text-sm">
                      {d.nome} - venc. dia {d.vencimentoDia} - {moeda} {d.valor.toFixed(2)}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Próximo vencimento */}
            <Card className="bg-blue-100 border-blue-300 text-blue-800 flex flex-col gap-4 p-6 rounded-2xl shadow-lg  bg-gradient-to-t to-blue-200">
              <CardTitle className="text-lg font-semibold mb-2">⏳ Próximo Vencimento</CardTitle>
              <CardContent className="p-0">
                {proximoVencimento ? (
                  <div className="text-sm">
                    {proximoVencimento.nome} - dia {proximoVencimento.vencimentoDia} - {moeda} {proximoVencimento.valor.toFixed(2)}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">Nenhuma despesa pendente</div>
                )}
              </CardContent>
            </Card>
        

            <div className='flex flex-col gap-2'>
              <Card className="bg-blue-100 border-blue-300 text-blue-800 p-4 rounded-2xl shadow">
                <CardTitle className="text-lg font-semibold mb-2">💳 Despesas do Mês</CardTitle>
                <CardContent className="space-y-1 p-0">
                  <div className='text-2xl flex justify-between font-bold'>
                    <div>{moeda}</div>
                    <div>{totalDasDespesas.toFixed(2)}</div>                     
                  </div>
                </CardContent>
              </Card>
            
              <Card className="bg-red-100 border-red-300 text-red-800 p-4 rounded-2xl shadow">
                <CardTitle className="text-lg font-semibold mb-2">💳 Despesas à Pagar</CardTitle>
                <CardContent className="space-y-1 p-0">
                  <div className='text-2xl flex justify-between font-bold'>
                    <div>{moeda}</div>
                    <div>{saldoDespesas.toFixed(2)}</div>                     
                  </div>
                </CardContent>
              </Card>
            </div>
      </div>

       {/* Cards por canal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cardsPorCanal.map((card, i) => {
          // Define a imagem dinamicamente
          let imgSrc = imagensPorCanal[card.title] || '/images/logo.png';
          
          return (
            <div
              key={i}
              className="flex flex-col p-6 rounded-2xl shadow-lg hover:shadow-2xl bg-gradient-to-r from-white/90 to-white/70"
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

      <div className='mb-6'>
      {/* Card Faturamento Diário */}

      <Card className=''>
        <CardHeader>
          <CardTitle>📅 Faturamento Diário</CardTitle>
          <div className="flex gap-2">
            <div className='w-full flex justify-between gap-3'>
              {/* Relatório do mês */}
              <div className="flex-1 flex flex-col border-2 border-gray-400 p-4 rounded-lg bg-gray-50">
                <div className="text-lg font-bold text-gray-800 mb-2">📊 Relatório do Mês</div>
                <div className="flex justify-between">
                  <span>Faturamento Almoço:</span>
                  <span>{moeda} {faturamentoPorRefeicaoMesSelecionado.find(r => r.refeicao === 'Almoço')?.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Faturamento Jantar:</span>
                  <span>{moeda} {faturamentoPorRefeicaoMesSelecionado.find(r => r.refeicao === 'Jantar')?.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold mt-2">
                  <span>Total do Mês:</span>
                  <span>{moeda} {faturamentoPorRefeicaoMesSelecionado.reduce((acc, r) => acc + r.total, 0).toFixed(2)}</span>
                </div>
              </div>
              <div className='w-80 flex flex-col gap-3 justify-center items-center'>
                <h2>Escolha Mês e Ano</h2>
                <div className='w-80 flex gap-3 items-center text-center '>
                  <Select onValueChange={(v) => setMesSelecionado(Number(v))} defaultValue={mesSelecionado.toString()}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent className='bg-white text-center'>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={(v) => setAnoSelecionado(Number(v))} defaultValue={anoSelecionado.toString()}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent className='bg-white text-center'>
                      {Array.from({ length:5 }, (_, i) => {
                        const ano = new Date().getFullYear() - i;
                        return <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </div>

            </div>
          </CardHeader>
          <CardContent className="w-full grid grid-cols-9 gap-2">
            {gerarFaturamentoDiario(mesSelecionado, anoSelecionado).map((f, idx) => {
              const isSemana = f.diaSemana === 'Faturamento Semanal';
              return (
                <div
                  key={idx}
                  className={`flex flex-col justify-between text-xs border-1 border-gray-300 p-2 ${isSemana ? 'col-span-2' : ''}`}
                >
                  <div className='flex justify-between font-bold text-blue-600'>
                    <div>{f.diaSemana}</div>
                    <div>{f.dia ?? ''}</div>
                  </div>

                  <div className={`${isSemana ? 'text-center text-purple-600 font-semibold' : 'text-center text-green-600 font-semibold'}`}>
                    <div className='flex justify-between'>
                      Almoço
                      <div>
                        {moeda} {f.valorAlmoco.toFixed(2)}

                      </div>
                    </div>
                    <div className='flex justify-between border-b-1'>
                      Jantar 
                      <div>
                        {moeda} {f.valorJantar.toFixed(2)}

                      </div>
                    </div>
                    <div className='flex justify-between text-blue-600 font-bold'>
                      Total 
                      <div>
                        {moeda} {f.valor.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            
          </CardContent>

        </Card>
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
