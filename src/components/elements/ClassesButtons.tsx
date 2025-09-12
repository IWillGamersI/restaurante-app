import { ClasseButtonsProps } from "@/types";
import React from "react";

export function ClasseButtons({ classes, classeSelecionada, setClasseSelecionada }: ClasseButtonsProps) {
  return (
    <div className="flex justify-between gap-2 flex-wrap">
      {classes.map(c => (
        <button
          key={c}
          onClick={() => setClasseSelecionada(c)}
          className={`px-4 py-2 rounded cursor-pointer ${
            classeSelecionada.toLowerCase() === c.toLowerCase()
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
