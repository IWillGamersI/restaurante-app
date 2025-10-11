import { collection, getDocs, doc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; // seu Firebase já inicializado

async function deletarPedidosInvalidos() {
  try {
    const pedidosRef = collection(db, "pedidos");
    const snapshot = await getDocs(pedidosRef);

    let contador = 0;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const pedidoDoc of snapshot.docs) {
      const criadoEm = pedidoDoc.data().criadoEm;
      const data = criadoEm instanceof Timestamp ? criadoEm.toDate() : new Date(criadoEm);

      // Se a data for inválida, deleta
      if (!(data instanceof Date) || isNaN(data.getTime())) {
        batch.delete(doc(db, "pedidos", pedidoDoc.id));
        contador++;
        batchCount++;

        // Commit a cada 500 documentos
        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }

    // Commit final para qualquer resto
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`Total de pedidos deletados: ${contador}`);
  } catch (err) {
    console.error("Erro ao deletar pedidos inválidos:", err);
  }
}

// Executa a função
deletarPedidosInvalidos();
