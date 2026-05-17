require('dotenv').config()
const express = require('express')
const cors = require('cors')
const pool = require('./db')
const path = require('path')

const authRoutes      = require('./routes/auth')
const interviewRoutes = require('./routes/interviews')
const geminiRoutes    = require('./routes/gemini')
const companyRoutes   = require('./routes/company')
const adminRoutes     = require('./routes/admin')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }))
app.use(express.json())

app.use('/api/auth',       authRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/gemini',     geminiRoutes)
app.use('/api/company',    companyRoutes)
app.use('/api/admin',      adminRoutes)

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message })
  }
})

// Serve React Frontend (For Render Deployment)
app.use(express.static(path.join(__dirname, '../dist')))

// Catch-all route to hand off routing to React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`\n✅ InterviewAI backend running on http://localhost:${PORT}`)
  console.log(`   Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`)
  console.log(`   Gemini AI:${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing key'}`)
  console.log(`   Health:   http://localhost:${PORT}/api/health\n`)
})
