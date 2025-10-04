import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc } from "firebase/firestore";

export async function GET() {
  try {
    const snap = await getDocs(collection(db, "clientes"));
    let count = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();

      if (!data.codigoPais) {
        await updateDoc(docSnap.ref, { codigoPais: "351" });
        count++;
      }
    }

    return NextResponse.json({ message: `✅ Atualizados ${count} clientes sem codigoPais.` });
  } catch (err) {
    console.error("Erro ao atualizar clientes:", err);
    return NextResponse.json({ error: "Erro interno ao atualizar clientes" }, { status: 500 });
  }
}
