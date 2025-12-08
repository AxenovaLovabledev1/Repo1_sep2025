import axios from 'axios'

const client = axios.create({
  baseURL: '/api'
})

export async function fetchStatus() {
  const { data } = await client.get('/status')
  return data
}

export async function fetchAgents() {
  const { data } = await client.get('/agents')
  return data
}

export async function fetchHormones() {
  const { data } = await client.get('/hormones')
  return data
}

export async function updateHormones(payload) {
  const { data } = await client.post('/hormones', payload)
  return data
}

export async function fetchLLMConfig() {
  const { data } = await client.get('/llm/config')
  return data
}

export async function updateLLMConfig(payload) {
  const { data } = await client.post('/llm/config', payload)
  return data
}

export async function sendMessage(payload) {
  const { data } = await client.post('/messages', payload)
  return data
}

export async function fetchChat() {
  const { data } = await client.get('/chat')
  return data
}

export async function sendChat(message) {
  const { data } = await client.post('/chat', { message })
  return data
}

export async function orchestrate(payload) {
  const { data } = await client.post('/orchestrate', payload)
  return data
}
