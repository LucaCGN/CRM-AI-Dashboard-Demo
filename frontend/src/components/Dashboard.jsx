// src/components/Dashboard.jsx
import React from 'react';
import FilterControls  from './FilterControls';
import ChartContainer  from './ChartContainer';

/**
 * Shows four KPI charts.
 * – Clicking any card enlarges it to fill the main area
 *   while the other three collapse into 80×80 px thumbnails
 *   stacked on the right (see wire-frame).
 * – Clicking ✕ or any thumbnail restores / switches focus.
 */
export default function Dashboard({ filtros, setFiltros, expandido, setExpandido }) {
  const charts = [
    { id: 'aov',    title: 'Valor Médio por Pedido', subt: 'Ticket médio (R$)' },
    { id: 'catmix', title: 'Mix de Categoria',       subt: 'Receita por categoria' },
    { id: 'funil',  title: 'Funil de Recompra',      subt: 'Clientes 1+, 2+, 3+ pedidos' },
    { id: 'vendas', title: 'Vendas por Mês',         subt: 'Faturamento mensal (R$)' }
  ];

  const expandedChart = charts.find(c => c.id === expandido);
  const otherCharts   = charts.filter(c => c.id !== expandido);
  const hasExpanded   = Boolean(expandido);

  return (
    <div className="space-y-6 p-6">
      {/* top filters */}
      <FilterControls filtros={filtros} setFiltros={setFiltros} />

      {/* ───────────────────────────────────── main grid */}
      {!hasExpanded && (
        /* Normal 2×2 grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {charts.map(c => (
            <ChartCard
              key={c.id}
              chart={c}
              filtros={filtros}
              onExpand={() => setExpandido(c.id)}
            />
          ))}
        </div>
      )}

      {hasExpanded && (
        /* 2-column layout: 2 fr main area + 80 px thumbnail column */
        <div className="grid gap-4 grid-cols-[2fr_80px] auto-rows-[minmax(0,1fr)]">
          {/* ── big chart area */}
          <div className="space-y-4">
            <ChartCard
              chart={expandedChart}
              filtros={filtros}
              expanded
              onExpand={() => setExpandido(null)}
            />
          </div>

          {/* ── thumbnail stack */}
          <div className="flex flex-col gap-4">
            {otherCharts.map(c => (
              <ChartCard
                key={c.id}
                chart={c}
                filtros={filtros}
                mini
                onExpand={() => setExpandido(c.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── helper component for each card */
function ChartCard ({ chart, filtros, expanded = false, mini = false, onExpand }) {
  return (
    <div
      className={`
        relative transition-all duration-300 ease-in-out
        bg-white dark:bg-gray-800 rounded-xl shadow-sm
        ${mini ? 'w-20 h-20 p-1 overflow-hidden cursor-pointer' : 'p-4'}
      `}
      onClick={onExpand}
    >
      {/* close button on expanded card */}
      {expanded && (
        <button
          className="absolute top-2 right-2 text-white bg-accent-blue rounded-full p-1 w-6 h-6 flex items-center justify-center"
          onClick={e => { e.stopPropagation(); onExpand(); }}
        >
          ✕
        </button>
      )}

      {/* hide titles inside 80×80 thumbnails */}
      {!mini && (
        <>
          <h2 className="text-lg font-semibold">{chart.title}</h2>
          <p className="mb-2 text-sm text-gray-500">{chart.subt}</p>
        </>
      )}

      {/* Chart itself */}
      <ChartContainer tipo={chart.id} filtros={filtros} mini={mini} />
    </div>
  );
}
