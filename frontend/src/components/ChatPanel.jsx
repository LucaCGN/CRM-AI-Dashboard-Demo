import React, { useState, useEffect, useRef } from 'react';
import { chatRequest } from '../api';

let msgIdCounter = 0;

export default function ChatPanel({ filtros, setFiltros, tema, setTema }) {
  const [msgs, setMsgs]       = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);

  // generate incremental IDs instead of crypto.randomUUID()
  const nextId = () => ++msgIdCounter;

  // add a new message to the stack
  const addMsg = m =>
    setMsgs(a => [...a, { id: nextId(), ...m }]);

  // scroll to bottom after each message or loading change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  // fire off chat on button click or Enter
  const send = async () => {
    if (!input.trim()) return;
    addMsg({ sender: 'user', text: input });
    setLoading(true);
    setInput('');
    try {
      const { query, results, reasoning } = await chatRequest(input);

      // Raciocínio
      addMsg({ sender: 'ai', type: 'reasoning', text: reasoning });

      // Consulta SQL
      addMsg({ sender: 'ai', type: 'query', text: query });

      // Resultados
      addMsg({ sender: 'ai', type: 'results', data: results });
    } catch (e) {
      console.error(e);
      addMsg({ sender: 'system', type: 'error', text: 'Erro ao consultar o assistente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden border">
      <header className="h-12 flex items-center px-4 bg-accent-blue text-white text-lg font-semibold">
        Assistente AI
      </header>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-100 dark:bg-gray-900 space-y-3">
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.sender==='user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-xs p-3 rounded-lg space-y-2 break-words
              ${m.sender==='user'   ? 'bg-blue-500 text-white' :
                m.type==='error'    ? 'bg-red-200 text-red-800 italic' :
                'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'}
            `}>
              {/* user plain text */}
              {m.sender==='user' && (
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
              )}

              {/* AI reasoning */}
              {m.type==='reasoning' && (
                <div>
                  <strong>🧠 Raciocínio</strong>
                  <div className="mt-1 whitespace-pre-wrap break-words">{m.text}</div>
                </div>
              )}

              {/* AI SQL */}
              {m.type==='query' && (
                <div>
                  <strong>💾 Consulta SQL</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded whitespace-pre-wrap break-words">
                    {m.text}
                  </pre>
                </div>
              )}

              {/* AI results */}
              {m.type==='results' && (
                <div className="whitespace-pre-wrap break-words">
                  <strong>📊 Resultados</strong>
                  {Array.isArray(m.data) && m.data.length>0 ? (
                    <table className="mt-1 w-full text-sm table-fixed">
                      <thead>
                        <tr>
                          {Object.keys(m.data[0]).map(col => (
                            <th key={col} className="text-left pr-2 break-words">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.data.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="pr-2 break-words">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="italic mt-1">Sem resultados.</div>
                  )}
                </div>
              )}

              {/* system errors */}
              {m.type==='error' && <div>{m.text}</div>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-gray-200 dark:bg-gray-800 border-t flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && send()}
          placeholder="Pergunte sobre vendas, filtros, tema..."
          className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-accent-blue"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 bg-accent-blue text-white rounded-r-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
