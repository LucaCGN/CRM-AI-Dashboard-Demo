const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* helper with console logging */
async function request(path, params = {}) {
  const url = new URL(`${API}${path}`);
  Object.entries(params).forEach(([k, v]) =>
    v != null && url.searchParams.append(k, v)
  );
  console.info(`[API] → ${url.toString()}`);
  const res = await fetch(url);
  console.info(`[API] ← ${res.status}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

/* charts */
export const fetchAOV          = (di, df, c) => request('/charts/aov',            { data_inicial: di, data_final: df, categoria: c });
export const fetchCategoryMix  = (di, df, c) => request('/charts/category-mix',   { data_inicial: di, data_final: df, categoria: c });
export const fetchRepeatFunnel = (di, df, c) => request('/charts/repeat-funnel',  { data_inicial: di, data_final: df, categoria: c });
export const fetchVendasPorMes = (di, df, c) => request('/charts/vendas_por_mes', { data_inicial: di, data_final: df, categoria: c });

/* schema image */
export const fetchEsquema = () =>
  fetch(`${API}/schema-diagram`).then(r => r.blob());

/* one‐shot chat request */
export async function chatRequest(message) {
  console.info(`[API] → ${API}/chat   payload:`, message);
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  console.info(`[API] ← ${res.status}`);
  if (!res.ok) {
    const body = await res.text();
    console.error('Chat error body →', body);
    throw new Error(res.statusText);
  }
  const wrapper = await res.json();
  // our backend wraps the real payload under .json_dict
  // fallback to wrapper itself if .json_dict missing
  return wrapper.json_dict ?? wrapper;
}
