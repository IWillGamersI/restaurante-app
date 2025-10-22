'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, CalendarCheck, TrendingUp, ArrowUp, ArrowDown, BarChart, DollarSignIcon, ShoppingCartIcon } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, Bar } from 'recharts';
import { somarAcumulado } from '@/utils/calculos';
import { COLORS, FiltroPeriodo, Despesa, DespesasPaga, Pedido, imagensPorCanal, taxasPorCanal } from '@/types';
import { useStados } from '@/hook/useStados';
import { formatarMoeda } from '@/utils/format';
import { Faturamento } from './elements/FaturamentoDiario';
import { MetricasSemana } from './elements/MetricasSemana';
import CuponsPage from '@/app/pages/admin/cupons/page';



export default function DashBoard() {
  
  const {
          pedidos,setPedidos,
          loading,setLoading,
          filtroPeriodo,setFiltroPeriodo,
          moeda, setMoeda,
          despesas, setDespesas,
          despesasPagas, setDespesasPagas,
          mesSelecionado, setMesSelecionado,
          anoSelecionado, setAnoSelecionado
        } = useStados()
  
  //carrega pedidos
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
                precoVenda: p.preco,
                custo: p.custo || 0,
                quantidade: p.quantidade || 1,
              }))
            : [];

          return {
            valor: d.valor,
            custo: d.custo || 0,
            criadoEm: d.data instanceof Timestamp ? d.data.toDate() : new Date(d.data),
            produtos: produtos,
            canal: d.tipoVenda,
            tipoPagamento: d.tipoPagamento,
            tipoFatura: d.tipoFatura,
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

  //carrega despesas
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

  //carrega despesas pagas
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
        .filter(p => p.criadoEm.getFullYear() === ano && p.criadoEm.getMonth() === mes && p.criadoEm.getDate() === i);

      const valorAlmoco = pedidosDoDia
        .filter(p => p.criadoEm.getHours() >= 10 && p.criadoEm.getHours() < 18)
        .reduce((acc, p) => acc + p.valor, 0);

      const valorJantar = pedidosDoDia
        .filter(p => p.criadoEm.getHours() >= 18 && p.criadoEm.getHours() < 23)
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

  // Função para filtrar pedidos de acordo com o período
  const filtrarPedidos = (periodo: FiltroPeriodo, pedidos: Pedido[]): Pedido[] => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diaSemanaHoje = hoje.getDay() || 7; // domingo = 7
    const inicioSemanaAtual = new Date(hoje);
    inicioSemanaAtual.setDate(hoje.getDate() - diaSemanaHoje + 1);
    inicioSemanaAtual.setHours(0, 0, 0, 0);

    const fimSemanaAtual = new Date(inicioSemanaAtual);
    fimSemanaAtual.setDate(inicioSemanaAtual.getDate() + 6);
    fimSemanaAtual.setHours(23, 59, 59, 999);

    const inicioSemanaPassada = new Date(inicioSemanaAtual);
    inicioSemanaPassada.setDate(inicioSemanaAtual.getDate() - 7);

    const fimSemanaPassada = new Date(fimSemanaAtual);
    fimSemanaPassada.setDate(fimSemanaAtual.getDate() - 7);

    const inicioQuinzenal = new Date();
    inicioQuinzenal.setDate(hoje.getDate() - 14);
    inicioQuinzenal.setHours(0, 0, 0, 0);

    return pedidos.filter(p => {
      const dataPedido = new Date(p.criadoEm);
      dataPedido.setHours(0, 0, 0, 0);

      switch (periodo) {
        case 'hoje':
          return dataPedido.getTime() === hoje.getTime();

        case 'semana':
          return dataPedido >= inicioSemanaAtual && dataPedido <= fimSemanaAtual;

        case 'semana-passada':
          return dataPedido >= inicioSemanaPassada && dataPedido <= fimSemanaPassada;

        case 'quinzenal':
          return dataPedido >= inicioQuinzenal && dataPedido < hoje;

        case 'mes':
          return (
            dataPedido.getMonth() === hoje.getMonth() &&
            dataPedido.getFullYear() === hoje.getFullYear()
          );

        case 'ano':
          return dataPedido.getFullYear() === hoje.getFullYear();

        default:
          return true;
      }
    });
  };

  // Função para gerar dados do gráfico por dia
  const gerarPedidosPorDia = (periodo: FiltroPeriodo, pedidos: Pedido[]) => {
    const pedidosFiltrados = filtrarPedidos(periodo, pedidos);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let inicio: Date;
    let diasCount = 7;

    switch (periodo) {
      case 'hoje':
        inicio = hoje;
        diasCount = 1;
        break;

      case 'semana':
        const diaSemana = hoje.getDay() || 7;
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - diaSemana + 1);
        break;

      case 'semana-passada':
        const diaSemana2 = hoje.getDay() || 7;
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - diaSemana2 - 6); // segunda da semana passada
        break;

      case 'quinzenal':
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 14);
        diasCount = 14;
        break;

      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        diasCount = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate(); // total de dias no mês
        break;

      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1);
        diasCount = 365; // para simplificação, pode ajustar para ano bissexto
        break;

      default:
        inicio = hoje;
        diasCount = 7;
    }

    const dias: { dia: string; faturamento: number }[] = [];

    for (let i = 0; i < diasCount; i++) {
      const diaAtual = new Date(inicio);
      diaAtual.setDate(inicio.getDate() + i);
      diaAtual.setHours(0, 0, 0, 0);

      // Somar valores do dia
      const faturamentoDia = pedidosFiltrados
        .filter(p => new Date(p.criadoEm).getTime() === diaAtual.getTime())
        .reduce((sum, p) => sum + p.valor, 0);

      dias.push({
        dia:
          periodo === 'ano'
            ? diaAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            : diaAtual.toLocaleDateString('pt-BR', { weekday: 'short' }),
        faturamento: faturamentoDia,
      });
    }

    return dias;
  };

  // Cards DashBoard
  const faturamento = pedidos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  const qtdPedidos = pedidos.length;
  const ticketMedioTotal = qtdPedidos > 0 ? (faturamento / qtdPedidos).toFixed(2) : '0.00';  
  const custoPedidos = (faturamento * 0.30)
  const lucroLiquidoPedidos = faturamento - custoPedidos

  const pedidosFiltrados =  filtrarPedidos(filtroPeriodo,pedidos);

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
    const custo = 0.3
    

    const taxa = taxasPorCanal[canal.nome] || 0;

    const valorTaxaCanal = pedidosCanal.reduce((acc, p) => {
      // aplica taxa se tiver
      const desconto = taxa > 0 ? (p.valor * taxa) : 0;
      return acc + (desconto);
    }, 0);

    const valorCusto = pedidosCanal.reduce((acc, p) => {
      // aplica taxa se tiver      
      const desconto = p.valor * custo;
      return acc + (desconto);
    }, 0);

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
      valorTaxaCanal,
      valorCusto
    };
});


const cardsPrincipais = [
    { icon: <DollarSign size={28} className="text-green-600" />, title: 'Faturamento', value: `${moeda} ${(Number(faturamento) || 0).toFixed(2)}` },
    { icon: <CalendarCheck size={28} className="text-blue-600" />, title: 'Pedidos', value: qtdPedidos.toString() ?? '0' },
    { icon: <TrendingUp size={28} className="text-purple-600" />, title: 'Ticket Médio', value: `${moeda} ${(Number(ticketMedioTotal) || 0).toFixed(2)}` },
    { icon: <DollarSign size={28} className="text-yellow-600" />, title: 'Lucro Líquido', value: `${moeda} ${(Number(lucroLiquidoPedidos) || 0).toFixed(2)}` },
  ];

  
  // Faturamento por dia da semana
  const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo', 'Faturamento Semanal'];
  const pedidosPorDia = diasSemana.map((dia, i) => {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    const diaSemana = hoje.getDay() === 0 ? 7 : hoje.getDay();
    inicioSemana.setDate(hoje.getDate() - diaSemana + 1 + i);
    const faturamento = pedidosFiltrados
      .filter((p) => p.criadoEm.toDateString() === inicioSemana.toDateString())
      .reduce((acc, p) => acc + p.valor, 0);
    return { dia, faturamento };
  });
  
  // Produtos
  const produtosMap = pedidos.reduce((acc: Record<string, { qtd: number; valor: number; lucro: number }>, p) => {
    if (Array.isArray(p.produtos)) {
      p.produtos.forEach(item => {
        const nome = item.nome?.trim().toLowerCase() || 'sem nome';
        const quantidade = item.quantidade ?? 1;
        const precoVenda = item.precoVenda ?? 0;

        const valorTotal = quantidade * precoVenda;

        // custo fixo de 35% do preço de venda
        const custo = precoVenda * 0.35;
        const lucroTotal = (precoVenda - custo) * quantidade;

        if (!acc[nome]) acc[nome] = { qtd: 0, valor: 0, lucro: 0 };

        acc[nome].qtd += quantidade;
        acc[nome].valor += valorTotal;
        acc[nome].lucro += lucroTotal;
      });
    }
    return acc;
  }, {});

  // Top 10 mais vendidos
  const topProdutos = Object.entries(produtosMap)
    .map(([nome, dados]) => ({ nome, ...dados }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 10);

  // Top 10 mais lucrativos
  const produtoMaisLucrativo = Object.entries(produtosMap)
    .map(([nome, dados]) => ({ nome, ...dados }))
    .sort((a, b) => b.lucro - a.lucro)
    .slice(0, 10);

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
    { nome: 'Almoço', inicio: 10, fim: 18 },
    { nome: 'Jantar', inicio: 18, fim: 23 },
  ];
  const faturamentoPorRefeicao = refeicoes.map((r) => {
    const total = pedidosFiltrados
      .filter((p) => p.criadoEm.getHours() >= r.inicio && p.criadoEm.getHours() < r.fim)
      .reduce((acc, p) => acc + p.valor, 0);
    return { refeicao: r.nome, total };
  });

  // Finanças
  const vendasComFatura = pedidosFiltrados.filter((p) => p.tipoFatura === 'cf').reduce((acc, p) => acc + p.valor, 0);
  const vendasSemFatura = pedidosFiltrados.filter((p) => p.tipoFatura === 'sf').reduce((acc, p) => acc + p.valor, 0);
  const pagamentosMap = pedidosFiltrados.reduce((acc: Record<string, number>, p) => {
    if (p.tipoPagamento) acc[p.tipoPagamento] = (acc[p.tipoPagamento] || 0) + p.valor;
    return acc;
  }, {});
  const vendasPorPagamento = Object.entries(pagamentosMap).map(([pagamento, total]) => ({ pagamento, total }));

  // Dentro do componente DashBoard, antes do return:

  const faturamentoPorRefeicaoMesSelecionado = refeicoes.map((r) => {
    const total = pedidos
      .filter(p => 
        p.criadoEm.getMonth() === mesSelecionado && 
        p.criadoEm.getFullYear() === anoSelecionado && 
        p.criadoEm.getHours() >= r.inicio && 
        p.criadoEm.getHours() < r.fim
      )
      .reduce((acc, p) => acc + p.valor, 0);
    return { refeicao: r.nome, total };
  });


  return (
    <div className="text-gray-800 p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {/* Tabs */}
      <Tabs defaultValue="inicio">
        <TabsList className="mb-4 flex flex-wrap gap-2">
          <TabsTrigger className='cursor-pointer' value="inicio">🏠 Início</TabsTrigger>
          <TabsTrigger className='cursor-pointer' value="faturamento">📅 Faturamento</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="semana">📊 Semana</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="produtos">🍕 Produtos</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="canal">📡 Canais</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="horario">⏰ Horários</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="financas">💰 Finanças</TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="cupons">🎟️ Cupons</TabsTrigger>
        </TabsList>

        {/*Inicio*/}
        <TabsContent value='inicio'>
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
          {/* Cards Despesas */}
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
                  <span className="flex justify-between text-gray-500 text-sm border-b-1 border-gray-300">
                      <span className='text-blue-600 font-semibold'>Pedidos</span> 
                      <span className="font-bold">{card.quantidade}</span>
                    </span>
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="flex justify-between text-gray-500 text-sm border-b-1 border-gray-300">
                      <span className='text-blue-600 font-semibold'>Faturamento</span> 
                      <span className="font-bold">{moeda} {card.valorBruto.toFixed(2)}</span>
                    </span>
                    <span className="flex justify-between text-gray-500 text-sm border-b-2 border-gray-600">
                      <span className='text-blue-600 font-semibold'>Taxa</span> 
                      <span className="font-bold">{moeda} {card.valorTaxaCanal.toFixed(2)}</span>
                    </span>
                    <span className="flex justify-between text-gray-500 text-sm border-b-1 border-gray-300">
                      <span className='text-blue-600 font-semibold'>Repasse</span> 
                      <span className="font-bold">{moeda} {(card.valorBruto - card.valorTaxaCanal).toFixed(2)}</span>
                    </span>
                    <span className="flex justify-between text-gray-500 text-sm border-b-1 border-gray-300">
                      <span className='text-blue-600 font-semibold'>Custo</span> <span className="font-bold">{moeda} {card.valorCusto.toFixed(2)}</span>
                    </span>
                    <span className="flex justify-between text-gray-500 text-sm border-b-1 border-gray-300">
                      <span className='text-blue-600 font-semibold'>Valor Líquido</span> <span className="font-bold">{moeda} {card.valorLiquido.toFixed(2)}</span>
                    </span>
                    
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Card Faturamento Diário */}
        <TabsContent value='faturamento'>
          <Faturamento/>
        </TabsContent>

        {/* Semana */}
        <TabsContent value="semana">
          {/* Filtro */}
          <div className="mb-6 w-64">
            <Select
              onValueChange={(v) => setFiltroPeriodo(v as FiltroPeriodo)}
              defaultValue="semana"
            >
              <SelectTrigger className="cursor-pointer">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent className="bg-white cursor-pointer">
                <SelectItem className="cursor-pointer" value="hoje">Hoje</SelectItem>
                <SelectItem className="cursor-pointer" value="semana">Semana</SelectItem>
                <SelectItem className="cursor-pointer" value="semana-passada">Semana Passada</SelectItem>
                <SelectItem className="cursor-pointer" value="quinzenal">15 Dias</SelectItem>
                <SelectItem className="cursor-pointer" value="mes">Mês</SelectItem>
                <SelectItem className="cursor-pointer" value="ano">Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

        
          <MetricasSemana 
            pedidos={pedidos} 
            moeda={moeda} 
            filtrarPedidos={(filtro, listaPedidos) => {
              const hoje = new Date();
              switch (filtro) {
                case "hoje":
                  return listaPedidos.filter(p => new Date(p.criadoEm).toDateString() === hoje.toDateString());
                case "semana":
                  const inicioSemana = new Date();
                  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                  return listaPedidos.filter(p => new Date(p.criadoEm) >= inicioSemana);
                case "semana-passada":
                  const inicioSemanaPassada = new Date();
                  inicioSemanaPassada.setDate(hoje.getDate() - hoje.getDay() - 7);
                  const fimSemanaPassada = new Date();
                  fimSemanaPassada.setDate(hoje.getDate() - hoje.getDay() - 1);
                  return listaPedidos.filter(p => {
                    const data = new Date(p.criadoEm);
                    return data >= inicioSemanaPassada && data <= fimSemanaPassada;
                  });
                case "quinzenal":
                  const quinzena = new Date();
                  quinzena.setDate(hoje.getDate() - 14);
                  return listaPedidos.filter(p => new Date(p.criadoEm) >= quinzena);
                case "mes":
                  return listaPedidos.filter(p => new Date(p.criadoEm).getMonth() === hoje.getMonth());
                case "ano":
                  return listaPedidos.filter(p => new Date(p.criadoEm).getFullYear() === hoje.getFullYear());
                default:
                  return listaPedidos;
              }
            }} 
          />

        </TabsContent>
       
        {/* Produtos */}
            <TabsContent value="produtos">
              <div className="flex flex-col gap-3">  

                {/* Produtos mais vendidos */}
                <div className="flex flex-col gap-2 bg-blue-100 p-4 rounded-2xl">
                  <h2 className="text-2xl text-blue-600 font-extrabold">Produtos mais vendidos</h2>           
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {topProdutos.map((produto, i) => (                
                      <div key={i} className="flex flex-col justify-between border border-blue-400 h-[140px] rounded p-2">                  
                        <p><span className="font-bold text-blue-600">{produto.nome}</span></p>
                        <div className="flex justify-between">
                          <span>Lucro</span>
                          <span className="font-bold">{formatarMoeda(produto.lucro)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Valor total</span>
                          <span className="font-bold">{formatarMoeda(produto.valor)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quantidade vendida</span>
                          <span className="font-bold">{produto.qtd}</span>
                        </div>
                      </div>
                    ))}
                  </div> 
                </div>

                {/* Produtos mais lucrativos */}
                <div className="bg-green-100 p-4 rounded-2xl">
                  <h2 className="text-2xl font-extrabold text-green-700">Produtos mais lucrativos</h2>  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {produtoMaisLucrativo.map((produto, i) => (                
                      <div key={i} className="flex flex-col justify-between border border-green-400 h-[140px] rounded p-2">                  
                        <p><span className="font-bold text-green-600">{produto.nome}</span></p>
                        <div className="flex justify-between">
                          <span>Lucro</span>
                          <span className="font-bold">{formatarMoeda(produto.lucro)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Valor total</span>
                          <span className="font-bold">{formatarMoeda(produto.valor)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quantidade vendida</span>
                          <span className="font-bold">{produto.qtd}</span>
                        </div>
                      </div>
                    ))}
                  </div> 
                </div>
              </div>
            </TabsContent>          

        {/* Canais */}
        <TabsContent value="canal">
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

        {/* Cupons */}
        <TabsContent value="cupons">
          <CuponsPage/>
        </TabsContent>


      </Tabs>
    </div>
  );
}
