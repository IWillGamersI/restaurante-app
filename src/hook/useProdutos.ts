import { db } from "@/lib/firebase";
import { Produto } from "@/types";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";

export function useProdutos(){  
    const [classeSelecionada, setClasseSelecionada] = useState("");
    const [produtos, setProdutos] = useState<Produto[]>([])

    const carregarProdutos = async () =>{
        const q = query(collection(db, 'produtos'), orderBy('nome', 'asc'))
        const snap = await getDocs(q)
        const lista: Produto[] = snap.docs.map(doc=>{
            const data = doc.data()
            return {
                id: doc.id,
                imagemUrl: data.imagemUrl,
                nome: data.nome || '',
                precoVenda: data.preco || 0,
                classe: data.classe || '',
                categoria: data.categoria || '',
                descricao: data.descricao || '',
                custo: data.precoCusto || ''
            }
        })
        setProdutos(lista)
    }
    
    useEffect(()=>{
        carregarProdutos()
    },[])

   
    // Pega todas as classes distintas
    const classes = [...new Set(produtos.map(p => p.classe))];
    
    // Filtra produtos pela classe escolhida
    const produtosFiltrados = classeSelecionada
    ? produtos.filter(p => p.classe.toLowerCase() === classeSelecionada.toLowerCase() || classeSelecionada === 'todos')
    : produtos;
  
    
    return {produtos, carregarProdutos, produtosFiltrados, classes, classeSelecionada, setClasseSelecionada}
}