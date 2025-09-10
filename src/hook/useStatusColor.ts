import { useCallback } from "react";

export function useStatus (){

    const statusColor = useCallback((status: string) => {
        switch (status.toLowerCase()) {
        case 'fila': return 'bg-gray-300 text-gray-800';
        case 'preparando': return 'bg-yellow-200 text-blue-700';
        case 'pronto': return 'bg-blue-100 text-blue-700';
        case 'entregue': return 'bg-green-100 text-green-800';
        case 'cancelado': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-200 text-gray-800';
        }
    },[])

    return {statusColor}

}