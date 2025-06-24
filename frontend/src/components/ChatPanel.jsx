// frontend/src/components/ChatPanel.jsx

import React, { useState, useEffect, useRef } from "react";
import { chatRequest } from "../api";

export default function ChatPanel() {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);

  // only scroll when the number of messages changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const toggle = () => setOpen((o) => !o);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    // 1) user bubble
    setMessages((m) => [...m, { sender: "user", text, type: "user" }]);
    setInput("");
    setLoading(true);

    try {
      // expect final_answer from backend
      const { reasoning, query, results, final_answer } = await chatRequest(text);

      // 2) reasoning
      setMessages((m) => [
        ...m,
        { sender: "bot", type: "reasoning", text: reasoning },
      ]);

      // 3) query
      setMessages((m) => [
        ...m,
        { sender: "bot", type: "query", text: query },
      ]);

      // 4) results (start closed)
      setMessages((m) => [
        ...m,
        { sender: "bot", type: "results", data: results, open: false },
      ]);

      // 5) conclusão
      setMessages((m) => [
        ...m,
        { sender: "bot", type: "final_answer", text: final_answer },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { sender: "bot", type: "error", text: "Erro ao obter resposta." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Chat window */}
      {open && (
        <div className="mb-2 w-[350px] h-[80vh] bg-white border shadow-lg rounded-t-lg flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-blue-600 text-white px-4 py-2">
            <span className="font-semibold">Assistente AI</span>
            <button onClick={toggle} className="text-white text-xl focus:outline-none">
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-3 space-y-3 bg-gray-100">
            {messages.map((m, i) => {
              switch (m.type) {
                case "reasoning":
                  return (
                    <div key={i} className="bg-white rounded-lg p-3 shadow">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-pink-500">🧠</span>
                        <strong>Raciocínio</strong>
                      </div>
                      <div className="text-gray-800">{m.text}</div>
                    </div>
                  );

                case "query":
                  return (
                    <div key={i} className="bg-white rounded-lg p-3 shadow">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-indigo-500">💾</span>
                        <strong>Consulta SQL</strong>
                      </div>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {m.text}
                      </pre>
                    </div>
                  );

                case "results":
                  return (
                    <div key={i} className="bg-white rounded-lg p-3 shadow">
                      <button
                        onClick={() =>
                          setMessages((all) =>
                            all.map((msg, idx) =>
                              idx === i
                                ? { ...msg, open: !msg.open }
                                : msg
                            )
                          )
                        }
                        className="w-full text-left font-semibold flex justify-between items-center"
                      >
                        <span>📊 Resultados</span>
                        <span>{m.open ? "▲" : "▼"}</span>
                      </button>
                      {m.open && (
                        Array.isArray(m.data) && m.data.length ? (
                          <table className="mt-2 w-full text-xs table-auto">
                            <thead>
                              <tr className="bg-gray-200">
                                {Object.keys(m.data[0]).map((col) => (
                                  <th key={col} className="px-2 py-1 text-left">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.data.map((row, r) => (
                                <tr key={r} className="odd:bg-white even:bg-gray-50">
                                  {Object.values(row).map((v, c) => (
                                    <td key={c} className="px-2 py-1">{v}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="italic text-gray-600 mt-2">
                            Sem resultados.
                          </div>
                        )
                      )}
                    </div>
                  );

                case "final_answer":
                  return (
                    <div key={i} className="bg-white rounded-lg p-3 shadow">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-green-500">💡</span>
                        <strong>Conclusão</strong>
                      </div>
                      <div className="text-gray-800">{m.text}</div>
                    </div>
                  );

                case "error":
                  return (
                    <div key={i} className="bg-red-100 text-red-800 rounded-lg p-3 italic">
                      {m.text}
                    </div>
                  );

                case "user":
                default:
                  return (
                    <div
                      key={i}
                      className="ml-auto max-w-[80%] bg-blue-500 text-white px-3 py-2 rounded-lg break-words"
                    >
                      {m.text}
                    </div>
                  );
              }
            })}

            {/* Spinner */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 spinner" />
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center border-t p-2 bg-white">
            <textarea
              className="flex-1 border rounded px-2 py-1 mr-2 resize-none h-10"
              placeholder="Pergunte sobre vendas, filtros..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggle}
        className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg focus:outline-none"
      >
        {open ? (
          <span className="text-2xl">&times;</span>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.284 0-2.492-.206-3.586-.58L3 20l.58-4.414C3.206 14.492 3 13.284 3 12c0-4.97 3.582-9 8-9s9 4.03 9 9z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
