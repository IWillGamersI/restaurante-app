import { ClasseButtonsProps } from "@/types";
import React from "react";

export function ClasseButtons({ classes, classeSelecionada, setClasseSelecionada, classeTodos }: ClasseButtonsProps) {
  return (
    <div className="flex justify-between gap-2 flex-wrap  bg-white p-2 rounded-lg shadow shadow-blue-600">
      {classeTodos ? <button
          className={classeSelecionada === 'todos'? "bg-blue-500 text-white px-4 py-2 rounded cursor-pointer": "bg-gray-200 text-gray-700 px-4 py-2 rounded cursor-pointer"}
           onClick={()=> setClasseSelecionada('todos')} >Todos
      </button>:''}

      {classes.map(c => (
        <button
          key={c}
          onClick={() => setClasseSelecionada(c)}
          className={`px-4 py-2 rounded cursor-pointer ${
            classeSelecionada.toLowerCase() === c.toLowerCase()
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`
        }
        >
          {c}
        </button>
      ))}
    </div>
  );
}
