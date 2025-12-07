import React, { useEffect, useState } from 'react'
import { fetchStatus, fetchAgents, sendMessage } from './api'

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

export default function App() {
  const [agents, setAgents] = useState([])
  const [status, setStatus] = useState(null)
  const [intent, setIntent] = useState('notify_emotion')
  const [content, setContent] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStatus().then(setStatus)
    fetchAgents().then(setAgents)
  }, [])

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
    } catch (err) {
      setError(err.message || 'Error enviando mensaje A2A')
    }
  }

  return (
    <main className="layout">
      <header>
        <div>
          <p className="eyebrow">ATAI Leo AI v3.5</p>
          <h1>Orquestador MCP + A2A</h1>
          <p className="muted">Frontend React + backend FastAPI minimal para explorar agentes y mensajes.</p>
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
        </div>

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
      </section>
    </main>
  )
}
