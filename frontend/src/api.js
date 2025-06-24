// frontend/src/api.js

// Base URL (set VITE_API_URL in .env or defaults to localhost)
const API = import.meta.env.VITE_API_URL || "http://localhost:8010";

/* ── tiny GET helper ───────────────────────────────── */
async function get(path, params = {}) {
  const url = new URL(`${API}${path}`);
  // **only** append non-null, non-empty-string values
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") {
      url.searchParams.append(k, v);
    }
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

/* ── CRM / commerce charts ─────────────────────────── */
export const fetchAOV          = (di, df, c) => get("/charts/aov",            { data_inicial: di, data_final: df, categoria: c });
export const fetchCategoryMix  = (di, df, c) => get("/charts/category-mix",   { data_inicial: di, data_final: df, categoria: c });
export const fetchRepeatFunnel = (di, df, c) => get("/charts/repeat-funnel",  { data_inicial: di, data_final: df, categoria: c });
export const fetchVendasPorMes = (di, df, c) => get("/charts/vendas_por_mes", { data_inicial: di, data_final: df, categoria: c });

/* ── MKT / campanhas charts ───────────────────────── */
export const fetchEmailVolume     = (di, df, s) => get("/charts/email-volume",     { data_inicial: di, data_final: df, sender: s });
export const fetchEmailEngagement = (di, df, s) => get("/charts/email-engagement", { data_inicial: di, data_final: df, sender: s });
export const fetchEmailSenderMix  = (di, df)    => get("/charts/email-sender-mix", { data_inicial: di, data_final: df });
export const fetchEmailUnsubRate  = (di, df, s) => get("/charts/email-unsub-rate", { data_inicial: di, data_final: df, sender: s });

/* ── Schema‐diagram (local static asset) ──────────── */
import schemaURL from "./assets/schema.png";
export const fetchEsquema = () => Promise.resolve({ url: schemaURL });

/* ── Chat endpoint ─────────────────────────────────── */
export async function chatRequest(message) {
  const res = await fetch(`${API}/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.json_dict ?? data;
}
