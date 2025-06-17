import React, { useEffect, useState } from 'react'
import FilterControls from './FilterControls'
import ChartContainer from './ChartContainer'
import { fetchEsquema } from '../api'

export default function Dashboard({ filtros, setFiltros, tema, expandido, setExpandido }) {
  const graficos = [
    { id: 'aov',    titulo: 'Valor Médio por Pedido',    fetch: 'fetchAOV' },
    { id: 'catmix', titulo: 'Mix de Categoria',          fetch: 'fetchCategoryMix' },
    { id: 'funil',  titulo: 'Funil de Recompra',         fetch: 'fetchRepeatFunnel' },
    { id: 'vendas', titulo: 'Vendas por Mês',            fetch: 'fetchVendasPorMes' }
  ]
  const [schemaImg, setSchemaImg] = useState(null)

  useEffect(() => {
    fetchEsquema().then(blob => {
      const url = URL.createObjectURL(blob)
      setSchemaImg(url)
    })
  }, [])

  return (
    <div className="space-y-6">
      <FilterControls filtros={filtros} setFiltros={setFiltros} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {graficos.map(g => (
          <div
            key={g.id}
            className={`card relative ${expandido===g.id?'chart-expanded':''}`}
            onClick={() => setExpandido(expandido===g.id?null:g.id)}
          >
            {expandido===g.id && (
              <button
                className="absolute top-4 right-4 text-white bg-accent-blue rounded-full p-2"
                onClick={() => setExpandido(null)}
              >✕</button>
            )}
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
              {g.titulo}
            </h2>
            <ChartContainer
              tipo={g.id}
              filtros={filtros}
            />
          </div>
        ))}
      </div>

      {/* Diagrama de Esquema */}
      {schemaImg && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Diagrama de Esquema de Dados</h2>
          <img src={schemaImg} alt="Esquema de Dados" />
        </div>
      )}
    </div>
  )
}