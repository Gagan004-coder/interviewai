// Gemini AI via backend proxy — API key is server-side only
const MODEL = 'gemini-flash-latest'

export async function geminiChat(messages, opts = {}) {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      model: opts.model || MODEL,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 1024,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || err?.error || `Gemini error: ${res.status}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

export async function generateQuestions(domain, count = 5) {
  const prompt = `You are a senior technical interviewer. Generate exactly ${count} interview questions for a ${domain} developer role.
Rules:
- Mix of conceptual, practical, and scenario-based questions
- Progressive difficulty (easy → hard)
- Return ONLY a JSON array:
[{"id":1,"question":"...","difficulty":"Easy","hint":"key concept"},...]
- No extra text, just valid JSON.`
  const raw = await geminiChat([{ role: 'user', content: prompt }], { temperature: 0.8, max_tokens: 900 })
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Invalid response format')
  return JSON.parse(match[0])
}

export async function evaluateAnswer(question, answer, domain) {
  if (!answer || answer.trim().length < 10)
    return { relevance: 0, technical: 0, grammar: 50, confidence: 0, overall: 0, feedback: 'No answer provided.', tips: [] }
  const prompt = `You are a strict technical interviewer evaluating a candidate's answer.
Domain: ${domain}
Question: ${question}
Answer: ${answer}
Return ONLY valid JSON:
{"relevance":<0-100>,"technical":<0-100>,"grammar":<0-100>,"confidence":<0-100>,"overall":<0-100>,"feedback":"<2-sentence assessment>","tips":["<tip1>","<tip2>","<tip3>"]}`
  const raw = await geminiChat([{ role: 'user', content: prompt }], { temperature: 0.3, max_tokens: 400 })
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid eval format')
  return JSON.parse(match[0])
}

export async function analyzeResume(resumeText, jobRole) {
  const prompt = `You are an expert ATS resume analyzer.
Resume: ${resumeText.slice(0, 3000)}
Target Role: ${jobRole || 'Software Developer'}
Return ONLY valid JSON:
{"ats_score":<0-100>,"extracted_skills":["..."],"missing_skills":["..."],"strengths":["..."],"weaknesses":["..."],"suggestions":["..."],"detected_role":"...","experience_level":"Fresher|Junior|Mid-Level|Senior"}`
  const raw = await geminiChat([{ role: 'user', content: prompt }], { temperature: 0.2, max_tokens: 800 })
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid resume analysis format')
  return JSON.parse(match[0])
}

export async function generateReportInsights(scores, domain) {
  const prompt = `You are a career coach giving personalized interview feedback.
Domain: ${domain}
Scores: Technical:${scores.technical} Communication:${scores.communication} Confidence:${scores.confidence} Grammar:${scores.grammar} Overall:${scores.overall}
Return ONLY valid JSON:
{"summary":"<2 sentences>","weak_areas":["...","..."],"action_plan":["...","...","...","..."],"resources":[{"title":"...","type":"Course|Book|Practice","url":"#"}]}`
  const raw = await geminiChat([{ role: 'user', content: prompt }], { temperature: 0.4, max_tokens: 600 })
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid insights format')
  return JSON.parse(match[0])
}
