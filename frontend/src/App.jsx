import React, { useState } from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import ChatPanel from "./components/ChatPanel";
import SchemaPage from "./pages/SchemaPage";

export default function App() {
  const [mode, setMode] = useState("crm"); // "crm" | "mkt"
  const [filtros, setFiltros] = useState({
    data_inicial: null,
    data_final: null,
    categoria: null,
    sender: null,
  });
  const [expandido, setExpandido] = useState(null);
  const { pathname } = useLocation();

  return (
    <div className="h-screen flex flex-col dark:bg-gray-100">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <nav className="bg-accent-blue text-white px-6 py-2 flex items-center gap-6">
        <Link to="/" className="font-bold">
          Dashboard AI
        </Link>
        <Link
          to="/schema"
          className={`opacity-70 hover:opacity-100 ${
            pathname === "/schema" ? "underline" : ""
          }`}
        >
          Esquema de Dados
        </Link>
        <label className="ml-auto text-sm opacity-75">Visão:</label>
        <select
          value={mode}
          onChange={(e) => {
            setExpandido(null);
            setMode(e.target.value);
          }}
          className="text-black rounded px-3 py-1 shadow-sm focus:outline-none"
        >
          <option value="crm">CRM</option>
          <option value="mkt">Campanhas</option>
        </select>
      </nav>

      {/* ── Main area ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dashboard content */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  mode={mode}
                  filtros={filtros}
                  setFiltros={setFiltros}
                  expandido={expandido}
                  setExpandido={setExpandido}
                />
              }
            />
            <Route path="/schema" element={<SchemaPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Chat – now fully overlayed and controlled inside ChatPanel */}
        <ChatPanel />
      </div>
    </div>
  );
}
