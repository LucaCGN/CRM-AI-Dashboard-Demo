const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* helper with console logging */
async function request(path, params = {}) {
  const url = new URL(`${API}${path}`);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.append(k, v));
  console.info(`[API] → ${url.toString()}`);
  const res = await fetch(url);
  console.info(`[API] ← ${res.status}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

/* charts */
export const fetchAOV          = (di,df,c) => request('/charts/aov',            { data_inicial:di, data_final:df, categoria:c });
export const fetchCategoryMix  = (di,df,c) => request('/charts/category-mix',   { data_inicial:di, data_final:df, categoria:c });
export const fetchRepeatFunnel = (di,df,c) => request('/charts/repeat-funnel',  { data_inicial:di, data_final:df, categoria:c });
export const fetchVendasPorMes = (di,df,c) => request('/charts/vendas_por_mes', { data_inicial:di, data_final:df, categoria:c });

/* schema image */
export const fetchEsquema = () =>
  fetch(`${API}/schema-diagram`).then(r => r.blob());

/* chat SSE */
export function connectChat(msg, onEvt) {
  const src = new EventSource(`${API}/chat-stream?user_message=${encodeURIComponent(msg)}`);
  src.onmessage = e => e.data && onEvt(JSON.parse(e.data));
  src.onerror   = () => src.close();
  return src;
}
