/* Backend root (env var or localhost) */
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ── tiny GET helper ─────────────────────────────── */
async function get(path, params = {}) {
  const url = new URL(`${API}${path}`);
  Object.entries(params).forEach(([k, v]) =>
    v != null && url.searchParams.append(k, v)
  );
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

/* ── chart endpoints ─────────────────────────────── */
export const fetchAOV          = (di, df, c) => get('/charts/aov',            { data_inicial: di, data_final: df, categoria: c });
export const fetchCategoryMix  = (di, df, c) => get('/charts/category-mix',   { data_inicial: di, data_final: df, categoria: c });
export const fetchRepeatFunnel = (di, df, c) => get('/charts/repeat-funnel',  { data_inicial: di, data_final: df, categoria: c });
export const fetchVendasPorMes = (di, df, c) => get('/charts/vendas_por_mes', { data_inicial: di, data_final: df, categoria: c });

/* ── schema diagram (local asset fallback) ───────── */
import schemaURL from './assets/schema.png';
export const fetchEsquema = () => Promise.resolve(schemaURL);

/* ── chat endpoint  (expects { message: "<string>" }) ───────── */
export async function chatRequest(messageString) {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: messageString }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('Chat error →', errBody);
    throw new Error(res.statusText);
  }

  const data = await res.json();
  /* backend sometimes wraps answer inside .json_dict */
  return data.json_dict ?? data;
}
