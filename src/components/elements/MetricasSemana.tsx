import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShoppingCartIcon, DollarSignIcon } from "lucide-react";
import { FiltroPeriodo, Pedido } from "@/types";
import { useStados } from "@/hook/useStados";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@radix-ui/react-select";
import { moeda } from "@/types";

interface MetricasSemanaProps {
  pedidos: Pedido[];
  moeda: string;
  filtrarPedidos: (filtro: string, pedidos: Pedido[]) => Pedido[];
}

export function MetricasSemana({ pedidos, filtrarPedidos }: MetricasSemanaProps) {
    
    const {filtroPeriodo, setFiltroPeriodo} = useStados()

    // Função que calcula cards e gráfico
    const { cardsSemana, pedidosPorDia } = (() => {
    const pedidosFiltrados = filtrarPedidos(filtroPeriodo, pedidos);

    const cardsSemana = [
      {
        title: "Total de Pedidos",
        value: pedidosFiltrados.length,
        icon: <ShoppingCartIcon className="text-blue-500" />,
      },
      {
        title: "Faturamento",
        value: pedidosFiltrados.reduce((acc, p) => acc + Number(p.valor || 0), 0),
        icon: <DollarSignIcon className="text-green-500" />,
      },
    ];

    const pedidosPorDia = Array.from({ length: 7 }, (_, i) => {
      const dia = new Date();
      dia.setDate(dia.getDate() - (6 - i));

      const totalDia = pedidosFiltrados
        .filter((p) => new Date(p.criadoEm).toDateString() === dia.toDateString())
        .reduce((acc, p) => acc + Number(p.valor || 0), 0);

      const diaString = dia.toLocaleDateString("pt-PT", { weekday: "short" });
      return { dia: diaString, faturamento: totalDia };
    });

    return { cardsSemana, pedidosPorDia };
  })();

  return (
    <div>
      {/* Filtro */}
      <div className="mb-6 w-64">
        <Select onValueChange={(v) => setFiltroPeriodo(v as FiltroPeriodo)} defaultValue="semana">
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent className="bg-white cursor-pointer">
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Semana</SelectItem>
            <SelectItem value="semana-passada">Semana Passada</SelectItem>
            <SelectItem value="quinzenal">15 Dias</SelectItem>
            <SelectItem value="mes">Mês</SelectItem>
            <SelectItem value="ano">Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cardsSemana.map((card, i) => (
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

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento por dia da semana</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={pedidosPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`${moeda} ${value.toFixed(2)}`, "Faturamento"]} />
              <Legend />
              <Line type="monotone" dataKey="faturamento" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
