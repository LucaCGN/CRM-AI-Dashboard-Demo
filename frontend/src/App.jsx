import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard  from './components/Dashboard';
import ChatPanel  from './components/ChatPanel';
import SchemaPage from './pages/SchemaPage';

export default function App() {
  const [filtros,   setFiltros]   = useState({ data_inicial:null, data_final:null, categoria:null });
  const [tema,      setTema]      = useState('light');
  const [expandido, setExpandido] = useState(null);
  const { pathname } = useLocation();

  return (
    <div className={tema === 'dark' ? 'dark' : ''}>
      <nav className="bg-accent-blue text-white px-6 py-3 flex items-center space-x-6">
        <Link to="/" className="font-bold">Dashboard AI</Link>
        <Link to="/schema" className={`opacity-60 hover:opacity-100 ${pathname==='/schema'?'underline':''}`}>
          Esquema de Dados
        </Link>
      </nav>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Main dashboard area */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={
              <Dashboard
                filtros={filtros}
                setFiltros={setFiltros}
                expandido={expandido}
                setExpandido={setExpandido}
              />
            }/>
            <Route path="/schema" element={<SchemaPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Chat column */}
        <div className="w-96 flex-shrink-0 flex flex-col p-4 border-l dark:border-gray-700 bg-white dark:bg-gray-800 rounded-l-lg">
          <ChatPanel
            filtros={filtros}
            setFiltros={setFiltros}
            tema={tema}
            setTema={setTema}
          />
        </div>
      </div>
    </div>
  );
}
