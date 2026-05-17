const express = require('express')
const router = express.Router()

router.post('/chat', async (req, res) => {
  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(500).json({ error: 'Gemini API key not configured on server.' })
  
  const { messages, model, temperature, max_tokens } = req.body
  const targetModel = model || 'gemini-1.5-flash'
  
  // Convert OpenAI messages format to Gemini contents format
  const contents = [];
  let systemInstruction = null;

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  }

  const payload = {
    contents,
    generationConfig: {
      temperature: temperature ?? 0.7,
      maxOutputTokens: max_tokens ?? 1024,
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    const data = await r.json()
    if (!r.ok) {
      return res.status(r.status).json({ error: data.error?.message || 'Gemini API Error' })
    }
    
    // Convert back to OpenAI response format for the frontend
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({
      choices: [{
        message: { content: text }
      }]
    })
  } catch (err) {
    console.error('Gemini API Error:', err);
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
