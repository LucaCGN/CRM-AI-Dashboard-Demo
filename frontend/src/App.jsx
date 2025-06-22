import React, { useState } from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import ChatPanel from "./components/ChatPanel";
import SchemaPage from "./pages/SchemaPage";

export default function App() {
  const [mode, setMode]         = useState("crm");   // "crm" | "mkt"
  const [filtros, setFiltros]   = useState({
    data_inicial: null,
    data_final:   null,
    categoria:    null,  // CRM
    sender:       null,  // MKT (future)
  });
  const [expandido, setExpandido] = useState(null);
  const { pathname } = useLocation();

  return (
    <div className="h-screen flex flex-col dark:bg-gray-900">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <nav className="bg-accent-blue text-white px-6 py-[10px] flex items-center gap-6">
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

        {/* Dashboard selector */}
        <label className="ml-auto text-sm opacity-75 mr-2">Visão:</label>
        <select
          value={mode}
          onChange={(e) => {
            setExpandido(null);
            setMode(e.target.value);
          }}
          className="
            text-black rounded-md px-3 py-1
            focus:outline-none focus:ring-2 focus:ring-white/60
            shadow-sm
          "
        >
          <option value="crm">CRM</option>
          <option value="mkt">Campanhas</option>
        </select>
      </nav>

      {/* ── Main area (dashboard + chat) ────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dashboards */}
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

        {/* Chat – resizable */}
        <div
          className="
            min-w-[300px] w-96 resize-x overflow-auto
            flex-shrink-0 flex flex-col
            border-l border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800
          "
        >
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
