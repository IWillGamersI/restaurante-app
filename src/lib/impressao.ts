// src/lib/impressao.ts

export async function imprimir(pedido: any, vias: number = 1) {
  try {
    const res = await fetch("http://localhost:3001/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedido, vias }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Erro ao imprimir:", data.error);
      alert(`❌ Erro ao imprimir: ${data.error}`);
      return;
    }

    console.log("✅ Pedido enviado para impressão!", data);
    alert("✅ Pedido enviado para impressão!");
  } catch (err) {
    console.error("Erro ao imprimir pedido:", err);
    alert("❌ Ocorreu um erro ao tentar imprimir o pedido.");
  }
}
