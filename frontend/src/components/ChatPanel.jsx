import React, { useState, useEffect, useRef } from 'react'
import { connectChat } from '../api'

export default function ChatPanel({ filtros, setFiltros, tema, setTema }) {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const esRef = useRef(null)
  const bottomRef = useRef(null)

  const addMsg = m => setMsgs(a => [...a, { id: crypto.randomUUID(), ...m }])
  const appendText = t => setMsgs(a => {
    const last = a[a.length-1]
    if (!last || last.sender !== 'AI') return a
    return [...a.slice(0,-1), { ...last, text: last.text + t }]
  })

  const send = () => {
    if (!input.trim()) return
    addMsg({ sender: 'user', text: input })
    esRef.current?.close()
    const es = connectChat(input, handleEvt)
    esRef.current = es
    setTyping(true)
    setInput('')
  }

  const handleEvt = evt => {
    switch(evt.type) {
      case 'run_started': setTyping(true); break
      case 'run_finished': setTyping(false); break
      case 'text_message_start': addMsg({ sender:'AI', text:'' }); break
      case 'text_message_content': appendText(evt.delta); break
      case 'text_message_end': setTyping(false); break
      case 'raw': {
        const e = evt.event
        if (e.type === 'filter_update') {
          setFiltros({
            data_inicial: e.filters.start_date || filtros.data_inicial,
            data_final:   e.filters.end_date   || filtros.data_final,
            categoria:    e.filters.category   || filtros.categoria
          })
          addMsg({ sender:'system', text:'*Filtros atualizados.*' })
        }
        if (e.type === 'toggle_theme') {
          if (e.theme) setTema(e.theme)
          else setTema(tema==='dark'?'light':'dark')
          addMsg({ sender:'system', text:'*Tema alternado.*' })
        }
        if (e.type === 'chart') {
          addMsg({ sender:'AI', image: e.image })
        }
      } break
    }
  }

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), [msgs,typing])

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-accent-blue text-white font-semibold">Assistente AI</div>
      <div className="flex-1 p-4 overflow-y-auto bg-gray-100 dark:bg-gray-900">
        {msgs.map(m => (
          <div key={m.id} className={`mb-3 flex ${m.sender==='user'?'justify-end':'justify-start'}`}>
            <div className={`max-w-xs p-2 rounded-lg ${
              m.sender==='user'? 'bg-blue-500 text-white':
              m.sender==='system'? 'bg-gray-300 italic text-gray-800':
              'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
              {m.image && <img src={`data:image/png;base64,${m.image}`} className="rounded" />}
              {m.text && <span dangerouslySetInnerHTML={{__html: m.text}}/>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {typing && <div className="p-2 italic text-gray-600 dark:text-gray-400">AI está digitando...</div>}
      <div className="p-4 bg-gray-200 dark:bg-gray-800">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pergunte sobre vendas, filtros, tema..."
            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-accent-blue"
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="px-4 bg-accent-blue text-white rounded-r-md hover:bg-blue-600 disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}