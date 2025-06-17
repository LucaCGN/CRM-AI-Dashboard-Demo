const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`)
  Object.entries(params).forEach(([k,v]) => v != null && url.searchParams.append(k, v))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Erro ${res.status}`)
  return res.json()
}

export function fetchAOV(data_inicial, data_final) {
  return request('/charts/aov', { data_inicial, data_final })
}
export function fetchCategoryMix(data_inicial, data_final) {
  return request('/charts/category-mix', { data_inicial, data_final })
}
export function fetchRepeatFunnel(data_inicial, data_final) {
  return request('/charts/repeat-funnel', { data_inicial, data_final })
}
export function fetchVendasPorMes(data_inicial, data_final) {
  return request('/charts/vendas_por_mes', { data_inicial, data_final })
}
export function fetchEsquema() {
  return fetch(`${API_BASE}/schema-diagram`).then(r => r.blob())
}

export function connectChat(userMessage, onEvent) {
  const source = new EventSource(`${API_BASE}/chat-stream?user_message=${encodeURIComponent(userMessage)}`)
  source.onmessage = e => e.data && onEvent(JSON.parse(e.data))
  source.onerror = () => source.close()
  return source
}