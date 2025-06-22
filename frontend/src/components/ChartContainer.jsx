import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  /* CRM */
  fetchAOV,
  fetchCategoryMix,
  fetchRepeatFunnel,
  fetchVendasPorMes,
  /* MKT */
  fetchEmailVolume,
  fetchEmailEngagement,
  fetchEmailSenderMix,
  fetchEmailUnsubRate,
} from "../api";

/* Tailwind blue shades */
const COLORS = ["#1E90FF", "#0E3AAA", "#0A183D", "#88BEE6", "#B0D4FF"];

export default function ChartContainer({ tipo, filtros, mini = false }) {
  const [data, setData] = useState([]);
  const [err,  setErr]  = useState(false);

  useEffect(() => {
    const API = {
      /* CRM */
      aov:    fetchAOV,
      catmix: fetchCategoryMix,
      funil:  fetchRepeatFunnel,
      vendas: fetchVendasPorMes,
      /* MKT */
      vol:    fetchEmailVolume,
      eng:    fetchEmailEngagement,
      sender: fetchEmailSenderMix,
      unsub:  fetchEmailUnsubRate,
    }[tipo];

    if (!API) return;

    setErr(false);
    setData([]);

    const isMkt = ["vol", "eng", "sender", "unsub"].includes(tipo);

    API(
      filtros.data_inicial,
      filtros.data_final,
      isMkt ? filtros.sender : filtros.categoria,
    )
      .then((j) => {
        let out = [];
        switch (tipo) {
          /* ── CRM mapping ─────────────────────────── */
          case "aov":
            out = j.data.map((d) => ({ x: d.mes, y: d.valor }));
            break;
          case "catmix":
            out = j.data.map((d) => ({ name: d.category, value: d.total }));
            break;
          case "funil":
            out = j.data;
            break;
          case "vendas":
            out = j.data.map((d) => ({ x: d.mes, y: d.total }));
            break;

          /* ── MKT mapping ─────────────────────────── */
          case "vol":
            out = j.data.map((d) => ({ x: d.mes, y: d.sends }));
            break;
          case "eng":
            out = j.data.map((d) => ({
              x: d.mes,
              open:  d.open_rate,
              click: d.click_rate,
            }));
            break;
          case "sender":
            out = j.data.map((d) => ({
              name: d.sender,
              value: d.sends,
              open_rate: d.open_rate,
            }));
            break;
          case "unsub":
            out = j.data.map((d) => ({ x: d.mes, y: d.unsub_rate }));
            break;
          default:
            break;
        }
        setData(out);
      })
      .catch(() => setErr(true));
  }, [tipo, filtros]);

  if (err)          return <p className="text-sm text-red-500">Erro ao carregar.</p>;
  if (!data.length) return <p className="text-sm text-gray-400">Carregando…</p>;

  const H = mini ? 80 : 240;

  /* ───────────────────────────────────────────────────────────── */
  switch (tipo) {
    /* ── CRM charts ──────────────────────────────────────────── */
    case "aov":
      return (
        <ResponsiveContainer width="100%" height={H}>
          <LineChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis hide={mini} tickFormatter={(v) => `R$ ${v}`} />
            <Tooltip formatter={(v) => `R$ ${v}`} />
            <Line dataKey="y" stroke={COLORS[0]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "catmix":
      return (
        <ResponsiveContainer width="100%" height={H}>
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
                formatter={(name, entry) =>
                  `${name} – ${(entry.percent * 100).toFixed(1)}%`
                }
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      );

    case "funil":
      return (
        <ResponsiveContainer width="100%" height={H}>
          <BarChart data={data}>
            <XAxis dataKey="step" hide={mini} />
            <YAxis hide={mini} />
            <Tooltip />
            <Bar
              dataKey="customers"
              fill={COLORS[0]}
              barSize={mini ? 12 : 30}
            />
          </BarChart>
        </ResponsiveContainer>
      );

    case "vendas":
      return (
        <ResponsiveContainer width="100%" height={H}>
          <BarChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis hide={mini} />
            <Tooltip formatter={(v) => `R$ ${v}`} />
            <Bar dataKey="y" fill={COLORS[0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    /* ── MKT charts ──────────────────────────────────────────── */
    case "vol":
      return (
        <ResponsiveContainer width="100%" height={H}>
          <BarChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis hide={mini} />
            <Tooltip />
            <Bar dataKey="y" fill={COLORS[0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "eng":
      return (
        <ResponsiveContainer width="100%" height={H}>
          <LineChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis hide={mini} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Line dataKey="open"  stroke={COLORS[0]} dot={false} />
            <Line dataKey="click" stroke={COLORS[3]} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "sender":
      return (
        <ResponsiveContainer width="100%" height={H}>
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
                  id: d.name,
                  value: `${d.name} – ${d.open_rate}% abertura`,
                  color: COLORS[i % COLORS.length],
                  type: "circle",
                }))}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      );

    case "unsub":
      return (
        <ResponsiveContainer width="100%" height={H}>
          <LineChart data={data}>
            <XAxis dataKey="x" hide={mini} />
            <YAxis
              hide={mini}
              domain={[0, "auto"]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip formatter={(v) => `${v}%`} />
            <Line dataKey="y" stroke={COLORS[0]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}
