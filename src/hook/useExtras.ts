import { useEffect, useState } from "react";
import { Extra } from "@/types";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";


export function useExtras(){
    const [extras, setExtras] = useState<Extra[]>([])

    
    const carregaExtras = async ()=>{
        const q = query(collection(db,'extras'),orderBy('nome','asc'))
        const snap = await getDocs(q)
        const lista: Extra[] = snap.docs.map(doc=>{
            const data = doc.data()
            return{
                id: doc.id,
                nome: data.nome || '',
                tipo: data.tipo || '',
                valor: data.valor || 0
            }
        })
        setExtras(lista)
    }

    useEffect(()=>{
        carregaExtras()
    }, [])
    

    return {extras, carregaExtras}
}