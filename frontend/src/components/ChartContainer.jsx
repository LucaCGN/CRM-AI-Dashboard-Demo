import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
import {
  fetchAOV,
  fetchCategoryMix,
  fetchRepeatFunnel,
  fetchVendasPorMes,
} from '../api';

const COLORS = ['#1E90FF', '#0E3AAA', '#0A183D', '#88BEE6', '#B0D4FF'];

export default function ChartContainer({ tipo, filtros, mini = false }) {
  const [data, setData] = useState([]);
  const [err, setErr]   = useState(false);

  useEffect(() => {
    const apiCall = {
      aov:    fetchAOV,
      catmix: fetchCategoryMix,
      funil:  fetchRepeatFunnel,
      vendas: fetchVendasPorMes,
    }[tipo];

    if (!apiCall) return;

    setErr(false);
    setData([]);

    apiCall(filtros.data_inicial, filtros.data_final, filtros.categoria)
      .then((r) => {
        /* ── NORMALISE API PAYLOAD → RECHARTS ───────────────────── */
        let normalised = [];
        switch (tipo) {
          case 'aov':
            normalised = (r.data || []).map((d) => ({
              month: d.mes,
              value: d.valor,
            }));
            break;
          case 'catmix':
            normalised = (r.data || []).map((d) => ({
              name:  d.category,
              value: d.total,
            }));
            break;
          case 'funil':        // already in correct shape
            normalised = r.data || [];
            break;
          case 'vendas':
            normalised = (r.data || []).map((d) => ({
              month: d.mes,
              total: d.total,
            }));
            break;
          default:
            break;
        }
        setData(normalised);
      })
      .catch(() => setErr(true));
  }, [tipo, filtros]);

  if (err)          return <p className="text-sm text-red-500">Erro ao carregar.</p>;
  if (!data.length) return <p className="text-sm text-gray-400">Carregando…</p>;

  /* thumbnail vs full size */
  const H = mini ? 80 : 240;

  /* ────────────────────────────────────────────────────────────── */
  switch (tipo) {
    case 'aov':
      return (
        <ResponsiveContainer width="100%" height={H}>
          <LineChart data={data}>
            <XAxis dataKey="month" hide={mini} />
            <YAxis hide={mini} tickFormatter={(v) => `R$ ${v}`} />
            <Tooltip formatter={(v) => `R$ ${v}`} />
            <Line dataKey="value" stroke={COLORS[0]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'catmix':
      return (
        <ResponsiveContainer width="100%" height={H}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={mini ? 30 : 80}
              innerRadius={mini ? 10 : 40}
              labelLine={false}
              label={
                !mini && (({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`)
              }
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
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      );

    case 'funil':
      return (
        <ResponsiveContainer width="100%" height={H}>
          <BarChart data={data}>
            <XAxis dataKey="step" hide={mini} />
            <YAxis hide={mini} />
            <Tooltip />
            <Bar dataKey="customers" fill={COLORS[0]} barSize={mini ? 12 : 30} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'vendas':
      return (
        <ResponsiveContainer width="100%" height={H}>
          <BarChart data={data}>
            <XAxis dataKey="month" hide={mini} />
            <YAxis hide={mini} />
            <Tooltip formatter={(v) => `R$ ${v}`} />
            <Bar dataKey="total" fill={COLORS[0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}
