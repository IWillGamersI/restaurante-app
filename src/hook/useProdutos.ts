import { db } from "@/lib/firebase";
import { Extra, Produto } from "@/types";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";


export function UseProdutos(){
    const [produtos, setProdutos] = useState<Produto[]>([])

    const carregarProdutos = async () =>{
        const q = query(collection(db, 'produtos'), orderBy('nome', 'asc'))
        const snap = await getDocs(q)
        const lista: Produto[] = snap.docs.map(doc=>{
            const data = doc.data()
            return {
                id: doc.id,
                img: data.imagemUrl,
                nome: data.nome || '',
                preco: data.preco || 0,
                classe: data.classe || '',
                categoria: data.categoria || ''
            }
        })
        setProdutos(lista)
    }

   
    // Pega todas as classes distintas
    const classes = [...new Set(produtos.map(p => p.classe))];

    useEffect(()=>{
        carregarProdutos()
    },[])


    return {produtos, carregarProdutos,classes}
}