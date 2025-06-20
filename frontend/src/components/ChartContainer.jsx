import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import {
  fetchAOV, fetchCategoryMix, fetchRepeatFunnel, fetchVendasPorMes
} from '../api';

const COLORS = ['#1E90FF', '#0E3AAA', '#0A183D', '#88BEE6', '#B0D4FF'];

export default function ChartContainer({ tipo, filtros }) {
  const [data, setData] = useState([]);
  const [err,  setErr ] = useState(false);

  useEffect(() => {
    const apiCall = {
      aov:    fetchAOV,
      catmix: fetchCategoryMix,
      funil:  fetchRepeatFunnel,
      vendas: fetchVendasPorMes
    }[tipo];

    setErr(false);
    setData([]);

    apiCall(filtros.data_inicial, filtros.data_final, filtros.categoria)
      .then(r => {
        // normalize field names to what Recharts expects:
        let normalized = [];
        if (tipo === 'aov') {
          normalized = (r.data||[]).map(d => ({
            month: d.mes,
            value: d.valor
          }));
        } else if (tipo === 'catmix') {
          normalized = (r.data||[]).map(d => ({
            name:  d.category,
            value: d.total
          }));
        } else if (tipo === 'funil') {
          normalized = r.data||[];
        } else if (tipo === 'vendas') {
          normalized = (r.data||[]).map(d => ({
            month: d.mes,
            total: d.total
          }));
        }
        setData(normalized);
      })
      .catch(() => setErr(true));
  }, [tipo, filtros]);

  if (err)           return <div className="text-red-500">Erro ao carregar.</div>;
  if (!data.length)  return <div>Carregando…</div>;

  const renderPieLegend = vals => {
    const total = vals.reduce((s, v) => s + v.value, 0);
    return (
      <ul className="text-sm">
        {vals.map((d,i) => (
          <li key={i} className="flex items-center space-x-2">
            <span className="inline-block w-3 h-3 rounded" style={{ background: COLORS[i%COLORS.length] }}/>
            <span>{d.name}</span>
            <span className="ml-auto">{(d.value/total*100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    );
  };

  switch (tipo) {
    case 'aov':
      return (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <XAxis dataKey="month" /><YAxis />
            <Tooltip formatter={v => v.toFixed(2)} />
            <Line type="monotone" dataKey="value" dot={{ r:4 }} stroke={COLORS[0]} />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'catmix':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart margin={{ top:20, right:20, bottom:20, left:20 }}>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={v => v.toFixed(2)} />
            <Legend content={() => renderPieLegend(data)} />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'funil':
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <XAxis dataKey="step" /><YAxis /><Tooltip />
            <Bar dataKey="customers" fill={COLORS[0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'vendas':
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <XAxis dataKey="month" /><YAxis /><Tooltip />
            <Bar dataKey="total" fill={COLORS[0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}
