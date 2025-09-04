'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  dataPagamento: Date;
  valorPago: number;
  formaPagamento: 'transferência' | 'dinheiro' | 'débito direto' | 'cartão';
}

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [despesasPagas, setDespesasPagas] = useState<DespesaPaga[]>([]);
  const [novaDespesa, setNovaDespesa] = useState<Partial<Despesa>>({
    nome: '',
    tipo: 'pontual',
    valor: 0,
  });
  const [formasPagamento] = useState(['transferência', 'dinheiro', 'débito direto', 'cartão']);

  // Carregar despesas
  useEffect(() => {
    async function carregar() {
      // Despesas
      const snapshot = await getDocs(collection(db, 'despesas'));
      const lista = snapshot.docs.map((docSnap) => {
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

      // Despesas pagas
      const snapshotPagas = await getDocs(collection(db, 'despesaspagas'));
      const listaPagas = snapshotPagas.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          despesaId: d.despesaId,
          dataPagamento: d.dataPagamento instanceof Timestamp ? d.dataPagamento.toDate() : new Date(d.dataPagamento),
          valorPago: d.valorPago,
          formaPagamento: d.formaPagamento,
        } as DespesaPaga;
      });
      setDespesasPagas(listaPagas);
    }
    carregar();
  }, []);

  // Adicionar despesa
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

  // Atualizar valor da despesa
  async function atualizarValor(id: string, novoValor: number) {
    const despesaRef = doc(db, 'despesas', id);
    await updateDoc(despesaRef, { valor: novoValor });
    setDespesas(despesas.map(d => d.id === id ? { ...d, valor: novoValor } : d));
  }

  // Registrar pagamento
  async function registrarPagamento(despesa: Despesa) {
    const valorPago = parseFloat(prompt(`Valor pago para ${despesa.nome}?`, despesa.valor.toString()) || '0');
    if (valorPago <= 0) return;

    const formaPagamento = prompt(`Forma de pagamento: ${formasPagamento.join(', ')}`, 'dinheiro');
    if (!formasPagamento.includes(formaPagamento!)) {
      return alert('Forma de pagamento inválida');
    }

    await addDoc(collection(db, 'despesaspagas'), {
      despesaId: despesa.id,
      dataPagamento: new Date(),
      valorPago,
      formaPagamento,
    } as DespesaPaga);

    // Atualiza lista local
    setDespesasPagas([...despesasPagas, {
      despesaId: despesa.id!,
      dataPagamento: new Date(),
      valorPago,
      formaPagamento: formaPagamento as DespesaPaga['formaPagamento'],
    }]);
  }

  // Excluir despesa
  async function excluirDespesa(id: string) {
    await deleteDoc(doc(db, 'despesas', id));
    setDespesas(despesas.filter(d => d.id !== id));
  }

  // Calcula status pelo total pago
  function calcularStatus(d: Despesa) {
    const pagamentos = despesasPagas.filter(p => p.despesaId === d.id);
    const totalPago = pagamentos.reduce((acc, p) => acc + p.valorPago, 0);

    if (totalPago === 0) return 'pendente';
    if (d.tipo === 'parcelado' && (d.parcelas ?? 0) > pagamentos.length) return 'paga';
    if (totalPago >= d.valor) return 'quitada';
    return 'paga';
  }

  // Divisão
  const despesasPendentes = despesas.filter(d => calcularStatus(d) === 'pendente');
  const despesasPagasList = despesas.filter(d => calcularStatus(d) === 'paga' || calcularStatus(d) === 'quitada');

  const totalPendentes = despesasPendentes.reduce((acc, d) => acc + d.valor, 0);
  const totalPagas = despesasPagasList.reduce((acc, d) => acc + d.valor, 0);

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
            placeholder="Nome da despesa (ex: Água, Internet)"
            value={novaDespesa.nome ?? ''}
            onChange={(e) => setNovaDespesa({ ...novaDespesa, nome: e.target.value })}
          />

          <Select
            value={novaDespesa.tipo}
            onValueChange={(v) => setNovaDespesa({ ...novaDespesa, tipo: v as 'pontual' | 'recorrente' | 'parcelado' })}
          >
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
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

          {novaDespesa.tipo === 'recorrente' && (
            <Input
              type="number"
              placeholder="Dia vencimento (1-31)"
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

      {/* Totais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-4 shadow-md rounded-2xl">
          <CardTitle className="text-lg font-semibold">Total Pendentes</CardTitle>
          <CardContent>€ {totalPendentes.toFixed(2)}</CardContent>
        </Card>
        <Card className="p-4 shadow-md rounded-2xl">
          <CardTitle className="text-lg font-semibold">Total Pagas/Quitadas</CardTitle>
          <CardContent>€ {totalPagas.toFixed(2)}</CardContent>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pendentes */}
        <div>
          <h2 className="text-xl font-bold mb-4">Despesas Pendentes</h2>
          {despesasPendentes.map(d => (
            <Card key={d.id} className="shadow-md rounded-2xl border border-gray-100 hover:shadow-xl transition-all mb-4">
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">{d.nome}</CardTitle>
                <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-700">{calcularStatus(d)}</span>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><span className="font-semibold">Tipo:</span> {d.tipo}</p>
                <div className="flex gap-2 items-center">
                  <span className="font-semibold">Valor:</span>
                  <Input
                    type="number"
                    value={d.valor}
                    onChange={(e) => atualizarValor(d.id!, parseFloat(e.target.value))}
                    className="w-24"
                  />
                  <Button size="sm" onClick={() => atualizarValor(d.id!, d.valor)}>Atualizar</Button>
                </div>
                {d.tipo === 'recorrente' && <p><span className="font-semibold">Vencimento:</span> dia {d.vencimentoDia}</p>}
                {d.tipo === 'parcelado' && <p><span className="font-semibold">Parcela:</span> {d.parcelaAtual ?? 0} / {d.parcelas}</p>}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={() => registrarPagamento(d)}>💰 Pagar</Button>
                  <Button size="sm" variant="destructive" onClick={() => excluirDespesa(d.id!)}>Excluir</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagas/Quitadas */}
        <div>
          <h2 className="text-xl font-bold mb-4">Despesas Pagas/Quitadas</h2>
          {despesasPagasList.map(d => (
            <Card key={d.id} className="shadow-md rounded-2xl border border-gray-100 hover:shadow-xl transition-all mb-4">
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">{d.nome}</CardTitle>
                <span className={`px-3 py-1 text-sm rounded-full ${calcularStatus(d) === 'quitada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{calcularStatus(d)}</span>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><span className="font-semibold">Tipo:</span> {d.tipo}</p>
                <p><span className="font-semibold">Valor:</span> € {d.valor.toFixed(2)}</p>
                {d.tipo === 'recorrente' && <p><span className="font-semibold">Vencimento:</span> dia {d.vencimentoDia}</p>}
                {d.tipo === 'parcelado' && <p><span className="font-semibold">Parcela:</span> {d.parcelaAtual ?? 0} / {d.parcelas}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
