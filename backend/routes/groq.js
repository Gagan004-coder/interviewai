const express = require('express')
const router = express.Router()
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

router.post('/chat', async (req, res) => {
  const key = process.env.GROQ_API_KEY
  if (!key) return res.status(500).json({ error: 'Groq API key not configured on server.' })
  const { messages, model, temperature, max_tokens } = req.body
  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || MODEL, messages, temperature: temperature ?? 0.7, max_tokens: max_tokens ?? 1024 })
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json(data)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
