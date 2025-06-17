import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ChatPanel from './components/ChatPanel'

export default function App() {
  const [tema, setTema] = useState('light')
  const [filtros, setFiltros] = useState({ data_inicial: null, data_final: null, categoria: null })
  const [expandido, setExpandido] = useState(null) // id do gráfico expandido

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark')
  }, [tema])

  return (
    <div className="flex flex-col h-screen">
      {/* Navbar */}
      <header className="header-gradient flex items-center justify-between px-6 py-3">
        <h1 className="text-2xl font-bold">Dashboard AI</h1>
        <nav className="space-x-6">
          <a href="#" className="hover:text-accent-blue">Campanhas</a>
          <a href="#" className="hover:text-accent-blue">Análise de Compras</a>
          <a href="#" className="hover:text-accent-blue">Esquema de Dados</a>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-dark-navy p-6">
          <Dashboard
            filtros={filtros}
            setFiltros={setFiltros}
            tema={tema}
            expandido={expandido}
            setExpandido={setExpandido}
          />
        </main>
        <aside className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <ChatPanel
            filtros={filtros}
            setFiltros={setFiltros}
            tema={tema}
            setTema={setTema}
          />
        </aside>
      </div>
    </div>
  )
}