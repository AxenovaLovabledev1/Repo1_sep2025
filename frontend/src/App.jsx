import React, { useEffect, useState } from 'react'
import { fetchStatus, fetchAgents, fetchHormones, updateHormones, sendMessage, fetchChat, sendChat } from './api'

function ModuleList({ modules }) {
  return (
    <div className="card">
      <h3>Módulos MCP</h3>
      <ul>
        {modules.map((module) => (
          <li key={module.name}>
            <strong>{module.name}</strong> — {module.description} <span className="tag">{module.category}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HormoneCard({ hormones }) {
  const entries = [
    { key: 'dopamine', label: 'Dopamina' },
    { key: 'serotonin', label: 'Serotonina' },
    { key: 'cortisol', label: 'Cortisol' },
    { key: 'oxytocin', label: 'Oxitocina' },
    { key: 'adrenaline', label: 'Adrenalina' }
  ]
  return (
    <div className="card">
      <h3>Hormonal State Manager</h3>
      <p className="muted">Niveles digitales que impactan la motivación y prioridad de CORTEX.</p>
      <div className="gauges">
        {entries.map((entry) => (
          <div key={entry.key} className="gauge">
            <div className="gauge-label">
              <span>{entry.label}</span>
              <strong>{Math.round(hormones?.[entry.key] ?? 0)}</strong>
            </div>
            <div className="bar">
              <span style={{ width: `${Math.round(hormones?.[entry.key] ?? 0)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AgentCard({ agent }) {
  return (
    <div className="card">
      <h3>{agent.name}</h3>
      <p className="muted">{agent.role}</p>
      <p><strong>Purpose:</strong> {agent.purpose.seed}</p>
      <ModuleList modules={agent.modules} />
    </div>
  )
}

function ChatBubble({ turn }) {
  const isCortex = turn.sender === 'cortex'
  return (
    <div className={`chat-bubble ${isCortex ? 'cortex' : 'user'}`}>
      <div className="chat-meta">
        <span className="chat-sender">{isCortex ? 'CORTEX' : 'Tú'}</span>
        <span className="chat-time">{new Date(turn.timestamp).toLocaleTimeString()}</span>
      </div>
      <p>{turn.content}</p>
    </div>
  )
}

function ChatPanel({ history, input, onInputChange, onSend, sending, error }) {
  return (
    <div className="card chat-panel">
      <div className="chat-header">
        <div>
          <p className="eyebrow">Chat directo</p>
          <h3>Interfaz usuario ↔ CORTEX</h3>
          <p className="muted">CORTEX responderá considerando propósito y estado neurohormonal.</p>
        </div>
        <button className="ghost" type="button" onClick={onSend} disabled={sending || !input.trim()}>
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </div>

      <div className="chat-log">
        {history.map((turn) => (
          <ChatBubble key={`${turn.timestamp}-${turn.sender}`} turn={turn} />
        ))}
      </div>

      <label className="chat-input">
        <span>Tu mensaje</span>
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Comparte hallazgos, riesgos o contexto que quieras que CORTEX procese"
          rows={3}
        />
      </label>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export default function App() {
  const [agents, setAgents] = useState([])
  const [status, setStatus] = useState(null)
  const [hormones, setHormones] = useState(null)
  const [hormoneDraft, setHormoneDraft] = useState({})
  const [intent, setIntent] = useState('notify_emotion')
  const [content, setContent] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)
  const [hormoneMessage, setHormoneMessage] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatError, setChatError] = useState(null)
  const [chatSending, setChatSending] = useState(false)

  useEffect(() => {
    fetchStatus().then((data) => {
      setStatus(data)
      setHormones(data.hormonal_state)
      setHormoneDraft(data.hormonal_state)
    })
    fetchAgents().then(setAgents)
    fetchChat().then(setChatHistory)
  }, [])

  const refreshHormones = async () => {
    const data = await fetchHormones()
    setHormones(data)
    setHormoneDraft(data)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    try {
      const response = await sendMessage({
        sender: 'frontend-demo',
        receiver: 'cortex',
        intent,
        content,
      })
      setFeedback(response)
      setContent('')
      await refreshHormones()
    } catch (err) {
      setError(err.message || 'Error enviando mensaje A2A')
    }
  }

  const onHormoneChange = (key, value) => {
    setHormoneDraft((prev) => ({ ...prev, [key]: Number(value) }))
  }

  const onHormoneSubmit = async (event) => {
    event.preventDefault()
    setHormoneMessage(null)
    try {
      const updated = await updateHormones(hormoneDraft)
      setHormones(updated)
      setHormoneMessage('Niveles actualizados por CORTEX')
    } catch (err) {
      setHormoneMessage(err.message || 'No se pudo ajustar el estado hormonal')
    }
  }

  const hormoneEntries = [
    { key: 'dopamine', label: 'Dopamina' },
    { key: 'serotonin', label: 'Serotonina' },
    { key: 'cortisol', label: 'Cortisol' },
    { key: 'oxytocin', label: 'Oxitocina' },
    { key: 'adrenaline', label: 'Adrenalina' }
  ]

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return
    setChatSending(true)
    setChatError(null)
    try {
      const updated = await sendChat(chatInput.trim())
      setChatHistory(updated)
      setChatInput('')
      await refreshHormones()
    } catch (err) {
      setChatError(err.message || 'No se pudo entregar el mensaje a CORTEX')
    } finally {
      setChatSending(false)
    }
  }

  return (
    <main className="layout">
      <header>
        <div>
          <p className="eyebrow">ATAI Leo AI v3.5</p>
          <h1>Orquestador MCP + A2A</h1>
          <p className="muted">Frontend React + backend FastAPI para explorar agentes, mensajes y estado neurohormonal.</p>
        </div>
        {status && (
          <div className="card purpose">
            <p className="eyebrow">Purpose Seed</p>
            <p className="seed">{status.purpose.seed}</p>
            <p className="muted">{status.purpose.description}</p>
          </div>
        )}
      </header>

      <section className="grid">
        <div>
          <h2>Agentes activos</h2>
          <div className="grid">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
          {hormones && <HormoneCard hormones={hormones} />}
        </div>

        <div className="stack">
          <div>
            <h2>Enviar mensaje A2A</h2>
            <form className="card" onSubmit={onSubmit}>
              <label>
                Intent
                <select value={intent} onChange={(e) => setIntent(e.target.value)}>
                  <option value="notify_emotion">notify_emotion</option>
                  <option value="check_alignment">check_alignment</option>
                  <option value="report_decision">report_decision</option>
                  <option value="request_plan">request_plan</option>
                </select>
              </label>

              <label>
                Contenido
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe el evento o decisión que quieres notificar"
                />
              </label>

              <button type="submit">Enviar mensaje</button>
              {error && <p className="error">{error}</p>}
              {feedback && (
                <p className="success">
                  Mensaje aceptado a las {new Date(feedback.message.timestamp).toLocaleTimeString()}
                </p>
              )}
            </form>
          </div>

          <div>
            <h2>Regular Hormonal State Manager</h2>
            <form className="card" onSubmit={onHormoneSubmit}>
              <p className="muted">CORTEX puede influir directamente en su química digital para modular prioridad y enfoque.</p>
              {hormoneEntries.map((entry) => (
                <label key={entry.key} className="slider">
                  <div className="label-row">
                    <span>{entry.label}</span>
                    <strong>{Math.round(hormoneDraft?.[entry.key] ?? 0)}</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hormoneDraft?.[entry.key] ?? 0}
                    onChange={(e) => onHormoneChange(entry.key, e.target.value)}
                  />
                </label>
              ))}
              <button type="submit">Aplicar ajuste</button>
              {hormoneMessage && <p className="success">{hormoneMessage}</p>}
            </form>
          </div>

          <div>
            <h2>Chat con CORTEX</h2>
            <ChatPanel
              history={chatHistory}
              input={chatInput}
              onInputChange={setChatInput}
              onSend={sendChatMessage}
              sending={chatSending}
              error={chatError}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
