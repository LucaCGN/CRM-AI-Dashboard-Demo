import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import Select from "react-select";
import "react-datepicker/dist/react-datepicker.css";
import { fetchCategoryMix } from "../api";

export default function FilterControls({ filtros, setFiltros, mode }) {
  const [di, setDi] = useState(
    filtros.data_inicial ? new Date(filtros.data_inicial) : null
  );
  const [df, setDf] = useState(
    filtros.data_final ? new Date(filtros.data_final) : null
  );

  const [catOpts, setCatOpts] = useState([]);
  const [catSel,  setCatSel]  = useState(null);

  /* load categories only when in CRM mode */
  useEffect(() => {
    if (mode !== "crm") return;

    fetchCategoryMix(null, null, null)
      .then((j) => {
        const opts = j.data.map((x) => ({ value: x.category, label: x.category }));
        const all  = [{ value: null, label: "Todas Categorias" }, ...opts];
        setCatOpts(all);
        setCatSel(all.find((o) => o.value === filtros.categoria) || all[0]);
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const aplicar = () => {
    setFiltros({
      data_inicial: di ? di.toISOString().slice(0, 10) : null,
      data_final:   df ? df.toISOString().slice(0, 10) : null,
      categoria:    mode === "crm" ? catSel?.value ?? null : null,
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

      {mode === "crm" && (
        <div className="w-64">
          <Select
            value={catSel}
            onChange={setCatSel}
            options={catOpts}
            styles={{
              control: (base) => ({
                ...base,
                borderRadius: "6px",
                minHeight: "36px",
              }),
            }}
          />
        </div>
      )}

      <button
        onClick={aplicar}
        className="px-4 py-2 bg-accent-blue text-white rounded-md"
      >
        Aplicar
      </button>
    </div>
  );
}
