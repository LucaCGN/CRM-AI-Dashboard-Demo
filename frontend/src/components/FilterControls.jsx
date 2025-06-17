import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';
import { fetchCategoryMix } from '../api';

export default function FilterControls({ filtros, setFiltros }) {
  const [di, setDi]  = useState(filtros.data_inicial ? new Date(filtros.data_inicial) : null);
  const [df, setDf]  = useState(filtros.data_final   ? new Date(filtros.data_final)   : null);
  const [opts, setOpts] = useState([]);
  const [cat, setCat]   = useState(null);

  useEffect(() => {
    fetchCategoryMix().then(j => {
      const arr = j.data.map(x => ({ value:x.categoria, label:x.categoria }));
      const all = [{ value:null,label:'Todas Categorias'}, ...arr];
      setOpts(all);
      setCat(all.find(o => o.value===filtros.categoria) || all[0]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicar = () => {
    const novo = {
      data_inicial: di ? di.toISOString().slice(0,10) : null,
      data_final:   df ? df.toISOString().slice(0,10) : null,
      categoria:    cat?.value ?? null
    };
    console.log('[FILTROS] →', novo);
    setFiltros(novo);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <DatePicker selected={di} onChange={setDi} dateFormat="yyyy-MM-dd"
                  placeholderText="Data inicial"
                  className="px-3 py-2 border rounded-md" />
      <DatePicker selected={df} onChange={setDf} dateFormat="yyyy-MM-dd"
                  placeholderText="Data final"
                  className="px-3 py-2 border rounded-md" />
      <div className="w-64"><Select options={opts} value={cat} onChange={setCat}/></div>
      <button onClick={aplicar} className="px-4 py-2 bg-accent-blue text-white rounded-md">Aplicar</button>
    </div>
  );
}
