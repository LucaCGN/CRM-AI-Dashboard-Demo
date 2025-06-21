import React, { useState, useEffect, useRef } from 'react';
import { chatRequest } from '../api';

let msgId = 0;

export default function ChatPanel() {
  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [openIds, setOpenIds]   = useState(new Set());
  const bottomRef               = useRef(null);

  /* ----- helpers --------------------------------------------------- */
  const addMsg = (m) => setMsgs((a) => [...a, { id: ++msgId, ts: Date.now(), ...m }]);

  const historyArray = () =>
    msgs
      .filter((m) => m.sender === 'user' || m.sender === 'ai')
      .flatMap((m) => {
        if (m.sender === 'user')     return { role: 'user',      content: m.text };
        if (m.type === 'reasoning')  return { role: 'assistant', content: m.text };
        if (m.type === 'query')      return { role: 'assistant', content: m.text };
        if (m.type === 'results')    return { role: 'assistant', content: JSON.stringify(m.data) };
        return [];
      });

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, loading]);

  /* ----- send ------------------------------------------------------ */
  const send = async () => {
    if (!input.trim()) return;
    addMsg({ sender: 'user', text: input });
    setLoading(true);
    setInput('');

    const payloadObj = { question: input, history: historyArray() };
    const payloadStr = JSON.stringify(payloadObj);

    try {
      const { query, results, reasoning } = await chatRequest(payloadStr);
      addMsg({ sender: 'ai', type: 'reasoning', text: reasoning });
      addMsg({ sender: 'ai', type: 'query',     text: query     });
      addMsg({ sender: 'ai', type: 'results',   data: results   });
    } catch (e) {
      addMsg({ sender: 'system', type: 'error', text: 'Erro ao consultar o assistente.' });
    } finally {
      setLoading(false);
    }
  };

  /* ----- render ---------------------------------------------------- */
  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden border">
      <header className="h-12 flex items-center px-4 bg-accent-blue text-white text-lg font-semibold">
        Assistente AI
      </header>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-100 dark:bg-gray-900 space-y-3">
        {msgs.map((m) => {
          const isOpen = openIds.has(m.id);
          return (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`
                  w-full p-3 rounded-lg space-y-2 break-words transition-colors
                  ${m.sender==='user'
                    ? 'bg-blue-500 text-white'
                    : m.type==='error'
                    ? 'bg-red-200 text-red-800 italic'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'}
                `}
              >
                {/* user bubble */}
                {m.sender === 'user' && <div>{m.text}</div>}

                {/* reasoning */}
                {m.type === 'reasoning' && (
                  <div>
                    <strong>🧠 Raciocínio</strong>
                    <div className="mt-1 whitespace-pre-wrap">{m.text}</div>
                  </div>
                )}

                {/* SQL */}
                {m.type === 'query' && (
                  <div>
                    <strong>💾 Consulta SQL</strong>
                    <pre className="mt-1 p-2 bg-gray-100 rounded whitespace-pre-wrap text-xs">
                      {m.text}
                    </pre>
                  </div>
                )}

                {/* results */}
                {m.type === 'results' && (
                  <div>
                    <button
                      onClick={() =>
                        setOpenIds((s) => {
                          const n = new Set(s);
                          n.has(m.id) ? n.delete(m.id) : n.add(m.id);
                          return n;
                        })
                      }
                      className="w-full text-left font-semibold flex justify-between items-center"
                    >
                      📊 Resultados <span>{isOpen ? '▲' : '▼'}</span>
                    </button>

                    <div
                      className={`transition-max-h duration-300 overflow-hidden ${
                        isOpen ? 'max-h-96' : 'max-h-0'
                      }`}
                    >
                      {Array.isArray(m.data) && m.data.length ? (
                        <table className="mt-2 w-full text-xs">
                          <thead>
                            <tr>
                              {Object.keys(m.data[0]).map((c) => (
                                <th key={c} className="text-left pr-2">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {m.data.map((r, i) => (
                              <tr key={i}>
                                {Object.values(r).map((v, j) => (
                                  <td key={j} className="pr-2">{v}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="italic mt-1">Sem resultados.</div>
                      )}
                    </div>
                  </div>
                )}

                {m.type === 'error' && <div>{m.text}</div>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-gray-200 dark:bg-gray-800 border-t flex space-x-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Pergunte sobre vendas, filtros, tema..."
          className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-accent-blue"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 bg-accent-blue text-white rounded-r-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
