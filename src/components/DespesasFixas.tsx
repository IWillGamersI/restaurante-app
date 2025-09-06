'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { p } from 'framer-motion/client';

interface Despesa {
  id?: string;
  nome: string;
  tipo: 'pontual' | 'recorrente' | 'parcelado';
  valor: number;
  vencimentoDia?: number;
  parcelas?: number;
  parcelaAtual?: number;
  dataCriacao: Date;
}

interface DespesaPaga {
  id?: string;
  despesaId: string;
  nome?: string; // <- Adicionado para preservar nome da despesa
  dataPagamento: Date;
  valorPago: number;
  formaPagamento: 'transferencia' | 'dinheiro' | 'debito-direto' | 'cartao';
  parcelas?: number;
  parcelaAtual?: number;
}

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [despesasPagas, setDespesasPagas] = useState<DespesaPaga[]>([]);
  const [novaDespesa, setNovaDespesa] = useState<Partial<Despesa>>({
    nome: '',
    tipo: 'pontual',
    valor: 0,
  });
  
  const [formasPagamento] = useState(['transferencia', 'dinheiro', 'debito-direto', 'cartao']);
  const meses = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
  ];
  
  // Seletores para histórico
  const [mesHistorico, setMesHistorico] = useState(new Date().getMonth());
  const [anoHistorico, setAnoHistorico] = useState(new Date().getFullYear());

  useEffect(() => {
    async function carregar() {
      // Despesas
      const snapshot = await getDocs(collection(db, 'despesas'));
      const lista = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          nome: d.nome,
          tipo: d.tipo,
          valor: d.valor,
          vencimentoDia: d.vencimentoDia,
          parcelas: d.parcelas,
          parcelaAtual: d.parcelaAtual ?? 0,
          dataCriacao: d.dataCriacao instanceof Timestamp ? d.dataCriacao.toDate() : new Date(d.dataCriacao),
        } as Despesa;
      });
      setDespesas(lista);

      // Pagamentos
      const snapshotPagas = await getDocs(collection(db, 'despesaspagas'));
      const listaPagas = snapshotPagas.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          despesaId: d.despesaId,
          nome: d.nome, // <- nome do pagamento
          dataPagamento: d.dataPagamento instanceof Timestamp ? d.dataPagamento.toDate() : new Date(d.dataPagamento),
          valorPago: d.valorPago,
          formaPagamento: d.formaPagamento,
          parcelas: d.parcelas,
          parcelaAtual: d.parcelaAtual
        } as DespesaPaga;
      });
      setDespesasPagas(listaPagas);
    }
    carregar();
  }, []);

  async function adicionarDespesa() {
    if (!novaDespesa.nome || !novaDespesa.valor) {
      return alert('Preencha o nome e valor da despesa');
    }
    const despesa: Despesa = {
      ...novaDespesa,
      dataCriacao: new Date(),
      ...(novaDespesa.tipo === 'parcelado' ? { parcelaAtual: 0 } : {}),
    } as Despesa;

    const docRef = await addDoc(collection(db, 'despesas'), despesa);
    setDespesas([...despesas, { ...despesa, id: docRef.id }]);
    setNovaDespesa({ nome: '', tipo: 'pontual', valor: 0 });
  }

  async function atualizarValor(id: string, novoValor: number) {
    const despesaRef = doc(db, 'despesas', id);
    await updateDoc(despesaRef, { valor: novoValor });
    setDespesas(despesas.map(d => d.id === id ? { ...d, valor: novoValor } : d));
  }

  async function registrarPagamento(despesa: Despesa) {
    const valorPago = parseFloat(prompt(`Valor pago para ${despesa.nome}?`, despesa.valor.toString()) || '0');
    if (valorPago <= 0) return;

    const formaPagamento = prompt(`Forma de pagamento: ${formasPagamento.join(', ')}`, 'debito-direto');
    if (!formasPagamento.includes(formaPagamento!)) {
      return alert('Forma de pagamento inválida');
    }

    // Guardar o nome da despesa no pagamento
    const novoPagamento: Partial<DespesaPaga> = {
      despesaId: despesa.id!,
      nome: despesa.nome,
      dataPagamento: new Date(),
      valorPago,
      formaPagamento: formaPagamento as DespesaPaga['formaPagamento'],
    };

    if (despesa.tipo === 'parcelado') {
      novoPagamento.parcelaAtual = despesa.parcelaAtual ?? 1;
      novoPagamento.parcelas = despesa.parcelas;
    }

    const docRef = await addDoc(collection(db, 'despesaspagas'), novoPagamento);
    setDespesasPagas([...despesasPagas, { ...novoPagamento, id: docRef.id } as DespesaPaga]);

    // Remove pontual da lista de despesas mensais
    if (despesa.tipo === 'pontual') {
      setDespesas(despesas.filter(d => d.id !== despesa.id));
      await deleteDoc(doc(db, 'despesas', despesa.id!));
    }
  }

  async function excluirDespesa(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    await deleteDoc(doc(db, 'despesas', id));
    setDespesas(despesas.filter(d => d.id !== id));
  }

  async function excluirPagamento(id: string) {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;
    await deleteDoc(doc(db, 'despesaspagas', id));
    setDespesasPagas(despesasPagas.filter(p => p.id !== id));
  }

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const despesasMensais = despesas; // Todas que ainda existem

  const estaPagaNoMesAtual = (d: Despesa) => {
    return despesasPagas.some(p => 
      p.despesaId === d.id &&
      p.dataPagamento.getMonth() === mesAtual &&
      p.dataPagamento.getFullYear() === anoAtual
    )
  }

  const despesasMensaisOrdenadas = despesasMensais
                                    .slice()
                                    .sort((a,b)=>{
                                      const diaA = a.vencimentoDia ?? 0
                                      const diaB = b.vencimentoDia ?? 0
                                      return diaA - diaB
                                    })
  const hojeDia = new Date().getDate()
  const corDespesa = (d: Despesa) => {
    if(!d.vencimentoDia) return''
    if(estaPagaNoMesAtual(d)) return ''
    return d.vencimentoDia - hojeDia <= 2 ? 'text-red-600' : ''
  }

  const corDespesaPaga = (d: Despesa) =>{
    if(!d.vencimentoDia) return ''
    return estaPagaNoMesAtual(d) ? 'text-green-600':''
  }
  
  const pagamentosMesAtual = despesasPagas.filter(p => {
    const data = new Date(p.dataPagamento);
    return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
  });
  const totalPagasMesAtual = pagamentosMesAtual.reduce((acc, p) => acc + p.valorPago, 0);
  const totalPagasHistorico = despesasPagas.reduce((acc, p) => acc + p.valorPago, 0);
  const saldoMensalAtual = despesasMensais.reduce((acc, d) => acc + d.valor, 0) - pagamentosMesAtual.reduce((acc,p)=> acc + p.valorPago,0)
  
  // Histórico com filtro
  const pagamentosHistorico = despesasPagas.filter(p => {
    const data = new Date(p.dataPagamento);
    const mesValido = mesHistorico === -1 || data.getMonth() === mesHistorico;
    const anoValido = anoHistorico === -1 || data.getFullYear() === anoHistorico;
    return mesValido && anoValido;
  });

  const getDespesaNome = (id: string) => {
    // Pega nome do pagamento, senão despesa
    const pagamento = despesasPagas.find(p => p.despesaId === id && p.nome);
    if (pagamento && pagamento.nome) return pagamento.nome;
    const despesa = despesas.find(d => d.id === id);
    return despesa?.nome || 'Desconhecida';
  };

  const anosDisponiveis = Array.from(new Set(despesasPagas.map(p => p.dataPagamento.getFullYear())));

  return (
    <div className="p-8 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">💸 Gestão de Despesas</h1>

      {/* Formulário */}
      <Card className="mb-8 shadow-lg rounded-2xl border border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Cadastrar Nova Despesa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Nome da despesa"
            value={novaDespesa.nome ?? ''}
            onChange={(e) => setNovaDespesa({ ...novaDespesa, nome: e.target.value })}
          />
          <Select
            value={novaDespesa.tipo ?? 'pontual'}
            onValueChange={(v) => setNovaDespesa({ ...novaDespesa, tipo: v as 'pontual'|'recorrente'|'parcelado' })}
          >
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent className='bg-white'>
              <SelectItem value="pontual">Pontual</SelectItem>
              <SelectItem value="recorrente">Recorrente</SelectItem>
              <SelectItem value="parcelado">Parcelado</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Valor"
            value={novaDespesa.valor ?? ''}
            onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: parseFloat(e.target.value) })}
          />
          {(novaDespesa.tipo === 'recorrente' || novaDespesa.tipo === 'parcelado') && (
            <Input
              type="number"
              placeholder="Dia vencimento"
              value={novaDespesa.vencimentoDia ?? ''}
              onChange={(e) => setNovaDespesa({ ...novaDespesa, vencimentoDia: parseInt(e.target.value) })}
            />
          )}
          {novaDespesa.tipo === 'parcelado' && (
            <Input
              type="number"
              placeholder="Nº de parcelas"
              value={novaDespesa.parcelas ?? ''}
              onChange={(e) => setNovaDespesa({ ...novaDespesa, parcelas: parseInt(e.target.value) })}
            />
          )}
          <Button className="md:col-span-4" onClick={adicionarDespesa}>+ Adicionar</Button>
        </CardContent>
      </Card>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="flex flex-col justify-center bg-purple-600 border-purple-600 text-white p-4 shadow-md rounded-lg">
          <CardTitle className="text-lg font-semibold">Despesas Mensais</CardTitle>
          <CardContent className="w-full flex justify-between m-0 p-0 font-bold text-2xl">
            <div>€</div>
            <div>{despesasMensais.reduce((acc,d)=>acc+d.valor,0).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-center bg-red-600 border-red-600 text-white p-4 shadow-md rounded-lg">
          <CardTitle className="text-lg font-semibold">Saldo do Mês Atual</CardTitle>
          <CardContent className="w-full flex justify-between m-0 p-0 font-bold text-2xl">
            <div>€</div>
            <div>{saldoMensalAtual.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-center bg-blue-600 border-blue-600 text-white p-4 shadow-md rounded-lg">
          <CardTitle className="text-lg font-semibold">Valor Pago no Mês Atual</CardTitle>
          <CardContent className="w-full flex justify-between m-0 p-0 font-bold text-2xl">
            <div>€</div>
            <div>{totalPagasMesAtual.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-center bg-green-600 border-green-600 text-white p-4 shadow-md rounded-lg">
          <CardTitle className="text-lg font-semibold">Todas as Despesas Pagas</CardTitle>
          <CardContent className="w-full flex justify-between m-0 p-0 font-bold text-2xl">
            <div>€</div>
            <div>{totalPagasHistorico.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-200 p-6 rounded-2xl">
        {/* Despesas Mensais */}
        <div className="bg-white p-4 rounded-3xl">
          <h2 className="text-xl font-bold mb-4 text-red-600">📌 Despesas Mensais</h2>
          {despesasMensaisOrdenadas.map(d => (
            <Card key={d.id} className="p-3 shadow-md rounded-2xl border border-gray-100 hover:shadow-xl transition-all">
              <CardTitle className={corDespesa(d) || corDespesaPaga(d)}>{d.nome}</CardTitle>
              <div className="flex gap-2 items-center">

                <div>Venc.: {d.vencimentoDia} - € {d.valor.toFixed(2)} ({d.tipo})</div>
                <Button size="sm" onClick={() => registrarPagamento(d)}>💰 Pagar</Button>
                <Button size="sm" variant="destructive" onClick={() => excluirDespesa(d.id!)}>Excluir</Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagas do mês atual */}
        <div className="bg-white p-4 rounded-3xl">
          <h2 className="text-xl font-bold mb-4 text-blue-600">✅ Pagas no Mês Atual</h2>
          {pagamentosMesAtual.map(p => (
            <Card key={p.id} className="p-3 shadow-md rounded-2xl border border-gray-100 hover:shadow-xl transition-all">
              <CardTitle>{p.nome || getDespesaNome(p.despesaId)}</CardTitle>
              <div className="flex gap-2 items-center justify-between">
                <div>
                  <div>{p.dataPagamento.toLocaleDateString()} - € {p.valorPago.toFixed(2)}</div>
                  <div>{p.formaPagamento}</div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => excluirPagamento(p.id!)}>Excluir</Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Histórico */}
        <div className="bg-white p-4 rounded-3xl">
          <h2 className="text-xl font-bold mb-4 text-green-600">📚 Histórico de Pagamentos</h2>
          <div className="flex gap-2 mb-4">
            <Select value={mesHistorico.toString()} onValueChange={(v) => setMesHistorico(parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent className='bg-white'>
                <SelectItem value={-1 + ''}>Todos os meses</SelectItem>
                {meses.map((m,i)=><SelectItem key={i} value={i + ''}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={anoHistorico.toString()} onValueChange={(v) => setAnoHistorico(parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent className='bg-white'>
                <SelectItem value={-1 + ''}>Todos os anos</SelectItem>
                {anosDisponiveis.map((a,i)=><SelectItem key={i} value={a + ''}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {pagamentosHistorico.map(p => (
            <Card key={p.id} className="p-3 shadow-md rounded-2xl border border-gray-100 hover:shadow-xl transition-all">
              <CardTitle>{p.nome || getDespesaNome(p.despesaId)}</CardTitle>
              <div className="flex gap-2 items-center justify-between">
                <div>
                  <div>{p.dataPagamento.toLocaleDateString()} - € {p.valorPago.toFixed(2)}</div>
                  <div>{p.formaPagamento}</div>
                </div>
                <Button size="sm" variant="destructive" onClick={() => excluirPagamento(p.id!)}>Excluir</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
