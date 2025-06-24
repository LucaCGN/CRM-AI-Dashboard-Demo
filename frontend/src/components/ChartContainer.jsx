// frontend/src/components/ChartContainer.jsx

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  fetchAOV,
  fetchCategoryMix,
  fetchRepeatFunnel,
  fetchVendasPorMes,
  fetchEmailVolume,
  fetchEmailEngagement,
  fetchEmailSenderMix,
  fetchEmailUnsubRate,
} from "../api";

// Dark, high-contrast blues
const COLORS = [
  "#1e3a8a", // blue-900
  "#2563eb", // blue-600
  "#3b82f6", // blue-500
  "#60a5fa", // blue-400
  "#93c5fd", // blue-300
  "#bfdbfe", // blue-200
];
const GROUP_LIMIT = 5;

export default function ChartContainer({ tipo, filtros, mini = false }) {
  const [data, setData] = useState([]);
  const [err, setErr]   = useState(false);

  useEffect(() => {
    setErr(false);
    const { data_inicial: di, data_final: df, categoria: cat, sender: snd } = filtros;

    const API = {
      aov:    fetchAOV,
      catmix: fetchCategoryMix,
      funil:  fetchRepeatFunnel,
      vendas: fetchVendasPorMes,
      vol:    fetchEmailVolume,
      eng:    fetchEmailEngagement,
      sender: fetchEmailSenderMix,
      unsub:  fetchEmailUnsubRate,
    }[tipo];

    if (!API) {
      setErr(true);
      return;
    }

    const args = ["vol", "eng", "sender", "unsub"].includes(tipo)
      ? [di, df, snd]
      : [di, df, cat];

    API(...args)
      .then((res) => {
        let out = [];

        if (tipo === "catmix") {
          // Top 5 + Outros grouping
          const sorted = [...res.data].sort((a, b) => b.total - a.total);
          const top     = sorted.slice(0, GROUP_LIMIT);
          const rest    = sorted.slice(GROUP_LIMIT);
          const other   = rest.reduce((sum, x) => sum + x.total, 0);

          out = top.map((d) => ({ name: d.category, value: d.total }));
          if (other > 0) out.push({ name: "Outros", value: other });
        }
        else if (tipo === "sender") {
          // Top senders + Outros (weighted open_rate)
          const sorted     = [...res.data].sort((a, b) => b.sends - a.sends);
          const top        = sorted.slice(0, GROUP_LIMIT);
          const rest       = sorted.slice(GROUP_LIMIT);
          const otherSends = rest.reduce((sum, x) => sum + x.sends, 0);
          const weightedOpen =
            rest.reduce((sum, x) => sum + x.sends * x.open_rate, 0) /
            (otherSends || 1);

          out = top.map((d) => ({
            name:      d.sender,
            value:     d.sends,
            open_rate: d.open_rate,
          }));
          if (otherSends > 0) {
            out.push({
              name:      "Outros",
              value:     otherSends,
              open_rate: weightedOpen,
            });
          }
        }
        else {
          // All other mappings
          switch (tipo) {
            case "aov":
              out = res.data.map((d) => ({ x: d.mes, y: d.valor }));
              break;
            case "funil":
              out = res.data;
              break;
            case "vendas":
              out = res.data.map((d) => ({
                x: d.mes,
                y: d.receita ?? d.total,
              }));
              break;
            case "vol":
              out = res.data.map((d) => ({ x: d.mes, y: d.sends }));
              break;
            case "eng":
              out = res.data.map((d) => ({
                x:     d.mes,
                open:  d.open_rate,
                click: d.click_rate,
              }));
              break;
            case "unsub":
              out = res.data.map((d) => ({ x: d.mes, y: d.unsub_rate }));
              break;
            default:
              out = [];
          }
        }

        setData(out);
      })
      .catch(() => {
        setErr(true);
        setData([]);
      });
  }, [tipo, filtros]);

  if (err)
    return <p className="text-sm text-red-500">Erro ao carregar dados.</p>;
  if (!data.length)
    return <p className="text-sm text-gray-400">Carregando…</p>;

  const height = mini ? 80 : 240;

  switch (tipo) {
    case "aov":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis hide={mini} tickFormatter={(v) => `R$ ${v}`} />
            <Tooltip formatter={(v) => `R$ ${v}`} />
            <Line dataKey="y" stroke={COLORS[1]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "catmix": {
      // compute total for % calculation
      const total = data.reduce((sum, d) => sum + d.value, 0);

      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={mini ? 28 : 80}
              innerRadius={mini ? 10 : 40}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            {!mini && (
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                payload={data.map((d, i) => ({
                  id:    d.name,
                  value: `${d.name} – ${total > 0
                    ? ((d.value / total) * 100).toFixed(1)
                    : "0.0"}%`,
                  color: COLORS[i % COLORS.length],
                  type:  "circle",
                }))}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      );
    }

    case "funil":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <XAxis dataKey="step" hide={mini} />
            <YAxis hide={mini} />
            <Tooltip />
            <Bar dataKey="customers" fill={COLORS[1]} barSize={mini ? 12 : 30} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "vendas":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis hide={mini} />
            <Tooltip formatter={(v) => `R$ ${v}`} />
            <Bar dataKey="y" fill={COLORS[1]} barSize={mini ? 12 : 30} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "vol":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis hide={mini} />
            <Tooltip />
            <Bar dataKey="y" fill={COLORS[2]} barSize={mini ? 12 : 30} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "eng":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis
              hide={mini}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip formatter={(v) => `${v}%`} />
            <Line dataKey="open" stroke={COLORS[1]} dot={false} />
            <Line dataKey="click" stroke={COLORS[2]} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "sender":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={mini ? 28 : 80}
              innerRadius={mini ? 10 : 40}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            {!mini && (
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                payload={data.map((d, i) => ({
                  id:    d.name,
                  value: `${d.name} – ${(
                    d.open_rate * 100
                  ).toFixed(1)}% abertura`,
                  color: COLORS[i % COLORS.length],
                  type:  "circle",
                }))}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      );

    case "unsub":
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis
              hide={mini}
              domain={[0, "auto"]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip formatter={(v) => `${v}%`} />
            <Line dataKey="y" stroke={COLORS[1]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}
