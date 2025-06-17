import React, { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import Select from 'react-select'
import 'react-datepicker/dist/react-datepicker.css'
import { fetchCategoryMix } from '../api'

export default function FilterControls({ filtros, setFiltros }) {
  const [di, setDi] = useState(filtros.data_inicial ? new Date(filtros.data_inicial) : null)
  const [df, setDf] = useState(filtros.data_final   ? new Date(filtros.data_final)   : null)
  const [opts, setOpts] = useState([])

  useEffect(() => {
    fetchCategoryMix().then(json => {
      const arr = json.data.map(x => ({ value: x.categoria, label: x.categoria }))
      setOpts([{ value: null, label: 'Todas Categorias' }, ...arr])
    })
  }, [])

  const aplicar = () => {
    setFiltros({
      data_inicial: di ? di.toISOString().slice(0,10) : null,
      data_final:   df ? df.toISOString().slice(0,10) : null,
      categoria:    filtros.categoria
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <DatePicker
        selected={di} onChange={setDi}
        dateFormat="yyyy-MM-dd" placeholderText="Data inicial"
        className="px-3 py-2 border rounded-md"
      />
      <DatePicker
        selected={df} onChange={setDf}
        dateFormat="yyyy-MM-dd" placeholderText="Data final"
        className="px-3 py-2 border rounded-md"
      />
      <div className="w-60">
        <Select
          options={opts}
          defaultValue={opts.find(o => o.value === filtros.categoria)}
          onChange={opt => setFiltros(f => ({ ...f, categoria: opt.value }))}
        />
      </div>
      <button
        onClick={aplicar}
        className="px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-blue-600"
      >
        Aplicar
      </button>
    </div>
  )
}