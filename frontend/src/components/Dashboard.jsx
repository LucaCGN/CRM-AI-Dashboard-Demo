import React from "react";
import FilterControls from "./FilterControls";
import ChartContainer from "./ChartContainer";

/* Chart definitions for each dashboard mode */
const CHARTS = {
  crm: [
    { id: "aov",    title: "Valor Médio por Pedido", subt: "Ticket médio (R$)" },
    { id: "catmix", title: "Mix de Categoria",       subt: "Receita por categoria" },
    { id: "funil",  title: "Funil de Recompra",      subt: "Clientes 1+, 2+, 3+ pedidos" },
    { id: "vendas", title: "Vendas por Mês",         subt: "Faturamento mensal (R$)" },
  ],
  mkt: [
    { id: "vol",    title: "Envios por Mês",         subt: "Total de envios" },
    { id: "eng",    title: "Engajamento",            subt: "% abertura & clique" },
    { id: "sender", title: "Top Remetentes",         subt: "Volume e % abertura" },
    { id: "unsub",  title: "Descadastros",           subt: "% descadastro por mês" },
  ],
};

export default function Dashboard({
  mode,
  filtros,
  setFiltros,
  expandido,
  setExpandido,
}) {
  const charts = CHARTS[mode];
  const main   = charts.find((c) => c.id === expandido);
  const thumbs = charts.filter((c) => c.id !== expandido);

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-4">
      {/* ── filtros ─────────────────────────────────────────────── */}
      <FilterControls filtros={filtros} setFiltros={setFiltros} mode={mode} />

      {/* ── grid ───────────────────────────────────────────────── */}
      {!expandido && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {charts.map((c) => (
            <ChartCard
              key={c.id}
              chart={c}
              filtros={filtros}
              onExpand={() => setExpandido(c.id)}
            />
          ))}
        </div>
      )}

      {expandido && (
        <div className="grid grid-cols-[1fr_auto] gap-4 flex-1">
          {/* main chart – centered with max-width */}
          <div className="flex items-start justify-center">
            <ChartCard
              chart={main}
              filtros={filtros}
              expanded
              onExpand={() => setExpandido(null)}
            />
          </div>

          {/* mini thumbs */}
          <div className="flex flex-col gap-4">
            {thumbs.map((c) => (
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

function ChartCard({ chart, filtros, expanded = false, mini = false, onExpand }) {
  const base =
    "bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300";
  const normal = mini ? "w-20 h-20 p-1 overflow-hidden cursor-pointer" : "p-4 h-full";
  const expand = expanded ? "max-w-5xl w-full h-[70vh] mx-auto" : "";

  return (
    <div className={`${base} ${normal} ${expand}`} onClick={mini ? onExpand : undefined}>
      {expanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="absolute top-3 right-3 text-white bg-accent-blue rounded-full w-7 h-7 flex items-center justify-center"
        >
          ✕
        </button>
      )}

      {!mini && (
        <>
          <h2 className="text-lg font-semibold">{chart.title}</h2>
          <p className="text-sm text-gray-500 mb-2">{chart.subt}</p>
        </>
      )}

      <ChartContainer tipo={chart.id} filtros={filtros} mini={mini} />
    </div>
  );
}
