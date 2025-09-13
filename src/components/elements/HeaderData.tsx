import { useCodigos } from "@/hook/useCodigos"
import { HeaderDataProps } from "@/types"
import React from "react"



export function HeaderData({icon, titulo}: HeaderDataProps) {

    const { hoje } = useCodigos()

    return(
        
        <div className="flex flex-col gap-3 bg-white p-6 rounded-lg shadow shadow-blue-600">
            <div className='flex flex-col justify-between items-center md:flex-row'>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                    {icon} <span>{titulo}</span>
                </h2>
                <div className="flex justify-center items-center rounded font-bold text-3xl">
                    <p>{hoje.toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
            
        </div>
        
    )
}