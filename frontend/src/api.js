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

export async function sendMessage(payload) {
  const { data } = await client.post('/messages', payload)
  return data
}
