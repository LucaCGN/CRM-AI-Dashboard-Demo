import React from 'react';
import FilterControls from './FilterControls';
import ChartContainer from './ChartContainer';

export default function Dashboard({ filtros, setFiltros, expandido, setExpandido }) {
  const charts = [
    { id:'aov',    title:'Valor Médio por Pedido', subt:'Ticket médio (R$)' },
    { id:'catmix', title:'Mix de Categoria',       subt:'Receita por categoria' },
    { id:'funil',  title:'Funil de Recompra',      subt:'Clientes 1+, 2+, 3+ pedidos' },
    { id:'vendas', title:'Vendas por Mês',         subt:'Faturamento mensal (R$)' }
  ];

  return (
    <div className="space-y-6 p-6">
      <FilterControls filtros={filtros} setFiltros={setFiltros} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map(c => (
          <div
            key={c.id}
            className={`card relative ${expandido===c.id?'chart-expanded':''}`}
            onClick={() => setExpandido(expandido===c.id?null:c.id)}
          >
            {expandido===c.id && (
              <button
                className="absolute top-4 right-4 text-white bg-accent-blue rounded-full p-2"
                onClick={e=>{e.stopPropagation(); setExpandido(null);}}
              >✕</button>
            )}
            <h2 className="text-xl font-semibold">{c.title}</h2>
            <p className="mb-4 text-sm text-gray-500">{c.subt}</p>
            <ChartContainer tipo={c.id} filtros={filtros}/>
          </div>
        ))}
      </div>
    </div>
  );
}
