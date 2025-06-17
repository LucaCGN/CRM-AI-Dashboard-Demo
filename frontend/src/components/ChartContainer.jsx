import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts'
import {
  fetchAOV, fetchCategoryMix, fetchRepeatFunnel, fetchVendasPorMes
} from '../api'

const COLORS = ['#1E90FF','#0E3AAA','#0A183D','#88BEE6','#B0D4FF']

export default function ChartContainer({ tipo, filtros }) {
  const [data, setData] = useState([])

  useEffect(() => {
    const fn = {
      aov:    fetchAOV,
      catmix: fetchCategoryMix,
      funil:  fetchRepeatFunnel,
      vendas: fetchVendasPorMes
    }[tipo]

    fn(filtros.data_inicial, filtros.data_final)
      .then(res => setData(res.data || []))
      .catch(() => setData([]))
  }, [tipo, filtros])

  if (!data.length) return <div>Carregando...</div>

  switch (tipo) {
    case 'aov':
      return (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="valor" stroke="#1E90FF" dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )
    case 'catmix':
      return (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="categoria" cx="50%" cy="50%" outerRadius={80} label>
              {data.map((e,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )
    case 'funil':
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <XAxis dataKey="etapa" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="clientes" fill="#1E90FF" barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      )
    case 'vendas':
      return (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#1E90FF" />
          </BarChart>
        </ResponsiveContainer>
      )
    default: return null
  }
}