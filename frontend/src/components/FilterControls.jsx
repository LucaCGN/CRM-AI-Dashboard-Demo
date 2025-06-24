// frontend/src/components/FilterControls.jsx

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function FilterControls({ filtros, setFiltros }) {
  const [di, setDi] = useState(
    filtros.data_inicial ? new Date(filtros.data_inicial) : null
  );
  const [df, setDf] = useState(
    filtros.data_final ? new Date(filtros.data_final) : null
  );

  const aplicar = () => {
    setFiltros({
      data_inicial: di ? di.toISOString().slice(0, 10) : null,
      data_final:   df ? df.toISOString().slice(0, 10) : null,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <DatePicker
        selected={di}
        onChange={setDi}
        dateFormat="yyyy-MM-dd"
        placeholderText="Data inicial"
        className="px-3 py-2 border rounded-md"
      />

      <DatePicker
        selected={df}
        onChange={setDf}
        dateFormat="yyyy-MM-dd"
        placeholderText="Data final"
        className="px-3 py-2 border rounded-md"
      />

      <button
        onClick={aplicar}
        className="px-4 py-2 bg-accent-blue text-white rounded-md"
      >
        Aplicar
      </button>
    </div>
  );
}
