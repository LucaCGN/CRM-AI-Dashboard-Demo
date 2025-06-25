// frontend/src/api.js

// Base URL: 
//  • in dev (localhost) use VITE_API_URL or fallback
//  • in prod (any other hostname) use “relative” (empty string)
const DEV_API = import.meta.env.VITE_API_URL;
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const API = isLocal
  ? DEV_API || "http://localhost:8010"
  : "";

/* ── tiny GET helper ───────────────────────────────── */
async function get(path, params = {}) {
  // strip any trailing slash from API
  const base = API.replace(/\/$/, "");
  // build as a relative URL on prod, or absolute on dev
  const url = new URL(`${base}${path}`, window.location.origin);
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
  const base = API.replace(/\/$/, "");
  const res = await fetch(`${base}/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.json_dict ?? data;
}
