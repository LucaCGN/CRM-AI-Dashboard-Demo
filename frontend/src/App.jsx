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
        <Link to="/campanhas"           className="opacity-60 hover:opacity-100">Campanhas</Link>
        <Link to="/"                    className="opacity-60 hover:opacity-100">Análise de Compras</Link>
        <Link to="/schema" className={`opacity-60 hover:opacity-100 ${pathname==='/schema'?'underline':''}`}>
          Esquema de Dados
        </Link>
      </nav>

      {/* split screen: left = routed page, right = chat */}
      <div className="flex h-[calc(100vh-56px)]">
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={
              <Dashboard
                filtros={filtros} setFiltros={setFiltros}
                tema={tema}
                expandido={expandido} setExpandido={setExpandido}
              />
            }/>
            <Route path="/schema" element={<SchemaPage />} />
            {/* placeholders */}
            <Route path="/campanhas" element={<Navigate to="/" />} />
            <Route path="/analise-de-compras" element={<Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        <div className="w-80 border-l dark:border-gray-700">
          <ChatPanel
            filtros={filtros}  setFiltros={setFiltros}
            tema={tema}        setTema={setTema}
          />
        </div>
      </div>
    </div>
  );
}
