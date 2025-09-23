import { useEffect, useState } from "react";
import { usePedido } from "@/hook/usePedido";
import { useStados } from "@/hook/useStados";
import { FaturamentoDiario, FaturamentoSemanal, ResumoMensal, meses, moeda, diasSemana, anos } from "@/types";

const produtosMonitorados = [
  { id: "z0nYWvKLubKbRlfwcICA", nome: "Açai 300ml", valor:5 },
  { id: "T1OlBQVKqGHsOj23LMHR", nome: "Açai 500ml", valor:7.5 },
  { id: "lKIAjTOykwD8KBthcJGY", nome: "ME - Pizza Bacon", valor:5 },
  { id: "k85d75DjFHtOXjCdBq2G", nome: "ME - Pizza Chouriço", valor:5 },
  { id: "c8gpimbu2HDkqAXdVLHz", nome: "ME - Pizza Fiambre", valor:5 },
  { id: "7UaaATg9xN1l4jbR8jja", nome: "ME - Pizza Mozzarella", valor: 5 },
  { id: "iILSyuFJVroECe49aVK5", nome: "ME - Esparguete", valor:5 },
  { id: "gmahALnNJZVjJnWGdKhB", nome: "ME - Penne", valor:5 },
  { id: "GonReI3Ot7Vyt29a3vWY", nome: "ME - Tagliatelle", valor:5 },
  { id: "x3iIQ4M0Lk595gm5GqnI", nome: "ME - Hambúrger", valor:5 },
];

export function Faturamento() {
  const stados = useStados();
  const { pedidos } = usePedido(stados);


  const [mesSelecionado, setMesSelecionado] = useState<number>(stados.mesSelecionado);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(stados.anoSelecionado);

  function getCategoriaCard(produtoId: string){
    if(["lKIAjTOykwD8KBthcJGY","k85d75DjFHtOXjCdBq2G",
        "c8gpimbu2HDkqAXdVLHz5","7UaaATg9xN1l4jbR8jja",
        "iILSyuFJVroECe49aVK5","gmahALnNJZVjJnWGdKhB",
        "GonReI3Ot7Vyt29a3vWY", 'x3iIQ4M0Lk595gm5GqnI'].includes(produtoId)
      )
    {
        return 'menuEstudante'
    }

    if(["z0nYWvKLubKbRlfwcICA","T1OlBQVKqGHsOj23LMHR"].includes(produtoId)){
      return 'acai'
    }

    return 'outros'

  }

  // renomeie a função se tiver outro nome no seu arquivo
function getSemanaDoMes(data: Date) {
  const primeiroDiaMes = new Date(data.getFullYear(), data.getMonth(), 1);
  const diaSemanaPrimeiro = primeiroDiaMes.getDay(); // 0 = domingo
  return Math.ceil((data.getDate() + diaSemanaPrimeiro) / 7); // 1..5
}

useEffect(() => {
  stados.setMesSelecionado(mesSelecionado);
  stados.setAnoSelecionado(anoSelecionado);

  const diario: { [key: number]: { diaSemana: string; almoco: FaturamentoDiario; jantar: FaturamentoDiario } } = {};
  const resumo: ResumoMensal = {
    faturamentoTotal: 0,
    totalProdutos: {},
    almocoTotal: 0,
    jantarTotal: 0,
    // se sua interface exigir 'produtos', mantenha; senão remova
    produtos: {},
  };

  const semanal: FaturamentoSemanal = {
    almoco: {},
    jantar: {},
    semanas: [0, 0, 0, 0, 0],
    categorias: {},
  };

  // inicializa totalProdutos
  produtosMonitorados.forEach(p => (resumo.totalProdutos[p.id] = 0));

  const pedidosFiltrados = pedidos.filter(p => {
    const data = p.criadoEm instanceof Date ? p.criadoEm : (p.data ? new Date(p.data) : null);
    if (!data) return false;
    return data.getMonth() === mesSelecionado && data.getFullYear() === anoSelecionado;
  });

  pedidosFiltrados.forEach(pedido => {
    const data = pedido.criadoEm instanceof Date ? pedido.criadoEm : (pedido.data ? new Date(pedido.data) : null);
    if (!data) return;

    const dia = data.getDate();
    const diaSemana = diasSemana[data.getDay()];
    const semana = getSemanaDoMes(data); // 1..5
    const horario = data.getHours() >= 9 && data.getHours() < 18 ? "almoco" : "jantar";

    // inicializa diário
    if (!diario[dia]) {
      diario[dia] = {
        diaSemana,
        almoco: { total: 0, produtos: {}, categorias: { menuEstudante: 0, acai: 0, outros: 0 } },
        jantar: { total: 0, produtos: {}, categorias: { menuEstudante: 0, acai: 0, outros: 0 } },
      };
    }

    const subCard = horario === "almoco" ? diario[dia].almoco : diario[dia].jantar;

    // garante keys de produtos no subcard
    produtosMonitorados.forEach(p => { if (!subCard.produtos[p.id]) subCard.produtos[p.id] = 0; });

    // soma total do pedido (coerce para number)
    const valorPedido = Number(pedido.valor) || 0;
    subCard.total += valorPedido;

    // inicializa semanal estruturas (segura)
    if (!semanal.categorias[semana]) semanal.categorias[semana] = {
      menuEstudante: { valor: 0, quantidade: 0 },
      acai: { valor: 0, quantidade: 0 },
      outros: { valor: 0, quantidade: 0 }
    };


    if (semanal[horario] === undefined) semanal[horario] = {};
    if (semanal[horario][semana] === undefined) semanal[horario][semana] = 0;
    semanal[horario][semana] += valorPedido;

   
    // percorre produtos do pedido
    pedido.produtos?.forEach(prod => {
      const produtoInfo = produtosMonitorados.find(pm => pm.id === prod.id);
      const quantidade = Number(prod.quantidade) || 0;
      const precoUnit = produtoInfo ? Number(produtoInfo.valor) : (prod.preco ? Number(prod.preco) : 0);
      const valorProduto = quantidade * precoUnit;

      // se é produto monitorado, soma quantidade no diário e no resumo de produtos mensais
      if (produtoInfo) {
        subCard.produtos[prod.id] += quantidade;
        resumo.totalProdutos[prod.id] += quantidade;
      }

      // soma categorias (tanto no diário quanto no semanal)
      const categoria = getCategoriaCard(prod.id) as 'menuEstudante'|'acai'|'outros';
      subCard.categorias[categoria] += valorProduto;

      semanal.categorias[semana][categoria].valor += valorProduto;
      semanal.categorias[semana][categoria].quantidade += quantidade;
      
    });

    // soma no resumo mensal
    if (horario === "almoco") resumo.almocoTotal += valorPedido;
      else resumo.jantarTotal += valorPedido;
      resumo.faturamentoTotal += valorPedido;
    });

 
  // salvar nos states (ou no stados)
  stados.setFaturamentoPorDia(diario);
  stados.setResumoMensal(resumo);
  stados.setResumoSemanal(semanal);
}, [pedidos, mesSelecionado, anoSelecionado]);

  
  return (
    <div className="p-6 space-y-6">
      {/* Filtro de mês e ano */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div>
          <label className="font-medium mr-2">Mês:</label>
          <select className="border rounded px-2 py-1" value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))}>
            {meses.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="font-medium mr-2">Ano:</label>
          <select className="border rounded px-2 py-1" value={anoSelecionado} onChange={e => setAnoSelecionado(Number(e.target.value))}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Header resumo mensal */}
      <div className="bg-blue-50 rounded-xl shadow-lg p-6 flex flex-col justify-between items-center gap-4">
        <div className="w-full flex justify-between">
          <div>
            <h2 className="text-3xl font-bold">Resumo do Mês - {meses[mesSelecionado]} {anoSelecionado}</h2>
            <p className="text-gray-700 font-medium mt-1">Faturamento total: €{stados.resumoMensal.faturamentoTotal.toFixed(2)}</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="bg-white p-3 rounded-lg shadow text-center">
              <p className="font-semibold text-gray-600">Almoço</p>
              <p className="font-bold text-green-600">€{stados.resumoMensal.almocoTotal.toFixed(2)}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow text-center">
              <p className="font-semibold text-gray-600">Jantar</p>
              <p className="font-bold text-yellow-600">€{stados.resumoMensal.jantarTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-5 text-center gap-5">
          {stados.resumoSemanal.semanas.map((valor, i) => (
            <div key={i} className="rounded-md shadow-lg bg-blue-500 text-white text-center font-bold text-lg p-3">
              <div className="text-xl mb-2">Semana {i + 1}</div>
              <div className="font-bold">Total: {stados.moeda} {(stados.resumoSemanal.almoco[i+1] + stados.resumoSemanal.jantar[i+1] || 0).toFixed(2)}</div>

              <div className="flex justify-between mt-2 text-sm space-y-1">
                <div className="text-green-200">
                  Almoço: {stados.moeda} {(stados.resumoSemanal.almoco[i + 1] || 0).toFixed(2)}
                </div>
                <div className="text-yellow-200">
                  Jantar: {stados.moeda} {(stados.resumoSemanal.jantar[i + 1] || 0).toFixed(2)}
                </div>
              </div>

              <div className="mt-3 text-sm grid grid-cols-3 gap-2">
                <div className="bg-white/20 rounded p-1">
                  <div>Açaí</div>
                  <div>{stados.moeda} {(stados.resumoSemanal.categorias[i+1]?.acai.valor || 0).toFixed(2)}</div>
                  <div>Qtd: {(stados.resumoSemanal.categorias[i+1]?.acai.quantidade || 0)}</div>
                  
                </div>
                <div className="bg-white/20 rounded p-1">
                  
                  <div>Menu E</div>
                  <div>{stados.moeda} {(stados.resumoSemanal.categorias[i+1]?.menuEstudante.valor || 0).toFixed(2)}</div>                
                  <div>Qtd: {(stados.resumoSemanal.categorias[i+1]?.menuEstudante.quantidade || 0)}</div>
                   
                </div>
                <div className="bg-white/20 rounded p-1">

                  <div>Outros</div>
                  <div>{stados.moeda} {(stados.resumoSemanal.categorias[i+1]?.outros.valor || 0).toFixed(2)}</div>
                  <div>Qtd: {(stados.resumoSemanal.categorias[i+1]?.outros.quantidade || 0)}</div>
                   
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(stados.faturamentoPorDia).sort(([a],[b]) => Number(a) - Number(b)).map(([dia, horarios]) => (
          <div key={dia} className="bg-gray-50 rounded-xl shadow-lg p-4 space-y-4">
            <div className="flex justify-between">
              <h3 className="text-xl font-bold mb-2">Dia {dia} - {horarios.diaSemana}</h3>
              <h3 className="text-xl font-bold mb-2 ">
                Faturamento: 
                <span className="text-blue-600"> {moeda} {(horarios.almoco.total + horarios.jantar.total).toFixed(2)}</span>
              </h3>

            </div>

            {/* Sub-card Almoço */}
            <div className="bg-green-50 p-4 rounded-lg shadow space-y-2">
              <h4 className="font-semibold text-green-700">Almoço</h4>
              {horarios.almoco.total > 0 ? (
                <>
                <div className="">
                    <div className="flex justify-between text-gray-700 font-medium text-lg ">
                      <div>
                        Faturamento 
                      </div>
                      <div>
                        {moeda} {horarios.almoco.total.toFixed(2)}
                      </div>                    
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      
                      <div className="rounded-md shadow-lg bg-blue-500 shadow-blue-600 text-white text-center font-bold">
                        Açai
                        <div>{moeda} {horarios.almoco.categorias.acai.toFixed(2)}</div>
                        
                      </div>

                      <div className="rounded-md shadow-lg bg-blue-500 text-white text-center font-bold">
                        Menu E
                        <div>{moeda} {horarios.almoco.categorias.menuEstudante.toFixed(2)}</div>                        
                      </div>

                      <div className="rounded-md shadow-lg bg-blue-500 text-white text-center font-bold">
                        Outros
                        <div>{moeda} {horarios.almoco.categorias.outros.toFixed(2)}</div>
                      </div>
                    </div>
                </div>
                  {produtosMonitorados.map((p,i) => horarios.almoco.produtos[p.id] > 0 && (
                                        
                    <div key={p.id+i} className="flex justify-between items-center text-sm">
                      <span className="font-bold">{horarios.almoco.produtos[p.id]}</span>
                      <span>{p.nome}</span>
                      <span>{moeda} {(p.valor * horarios.almoco.produtos[p.id]).toFixed(2)}</span>
                    </div>
                                        
                  ))}

                </>
              ) : <p className="text-gray-400 italic">Não teve faturamento</p>}
            </div>

            {/* Sub-card Jantar */}
            <div className="bg-yellow-50 p-4 rounded-lg shadow space-y-2">
              <h4 className="font-semibold text-yellow-700">Jantar</h4>
              {horarios.jantar.total > 0 ? (
                <>
                <div className="">
                    <div className="flex justify-between text-gray-700 font-medium text-lg ">
                      <div>
                        Faturamento 
                      </div>
                      <div>
                        {moeda} {horarios.jantar.total.toFixed(2)}
                      </div>                    
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      
                      <div className="rounded-md shadow-lg bg-blue-500 text-white text-center font-bold">
                        Açai
                        <div>{moeda} {horarios.jantar.categorias.acai.toFixed(2)}</div>
                      </div>

                      <div className="rounded-md shadow-lg bg-blue-500 text-white text-center font-bold">
                        Menu E
                        <div>{moeda} {horarios.jantar.categorias.menuEstudante.toFixed(2)}</div>                        
                      </div>

                      <div className="rounded-md shadow-lg bg-blue-500 text-white text-center font-bold">
                        Outros
                        <div>{moeda} {horarios.jantar.categorias.outros.toFixed(2)}</div>
                      </div>
                    </div>
                </div>
                  {produtosMonitorados.map((p,i) => horarios.jantar.produtos[p.id] > 0 && (
                                        
                    <div key={p.id+i} className="flex justify-between items-center text-sm">
                      <span className="font-bold">{horarios.jantar.produtos[p.id]}</span>
                      <span>{p.nome}</span>
                      <span>{moeda} {(p.valor * horarios.jantar.produtos[p.id]).toFixed(2)}</span>
                    </div>
                    
                  ))}
                </>
              ) : <p className="text-gray-400 italic">Não teve faturamento</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
