const express = require('express')
const pool    = require('../db')
const auth    = require('../middleware/auth')
const router  = express.Router()

// All interview routes require a valid JWT
router.use(auth)

// GET /api/interviews — fetch all interviews for the logged-in user
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM interviews WHERE user_id = ? ORDER BY date DESC',
      [req.userId]
    )
    const interviews = rows.map(r => ({
      id:            r.id,
      domain:        r.domain,
      overall:       r.overall,
      technical:     r.technical,
      communication: r.communication,
      confidence:    r.confidence,
      grammar:       r.grammar,
      answers:       (function() {
        if (typeof r.answers === 'string') {
          try { return JSON.parse(r.answers) } catch (e) { return [] }
        }
        return r.answers || []
      })(),
      date:          r.date,
    }))
    res.json(interviews)
  } catch (err) {
    console.error('Get interviews error:', err)
    res.status(500).json({ error: 'Failed to fetch interviews.' })
  }
})

// POST /api/interviews — save a new interview
router.post('/', async (req, res) => {
  const { domain, overall, technical, communication, confidence, grammar, answers, date } = req.body
  if (!domain) return res.status(400).json({ error: 'Domain is required.' })

  try {
    const [result] = await pool.query(
      `INSERT INTO interviews (user_id, domain, overall, technical, communication, confidence, grammar, answers, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        domain,
        overall       || 0,
        technical     || 0,
        communication || 0,
        confidence    || 0,
        grammar       || 0,
        JSON.stringify(answers || []),
        date ? new Date(date) : new Date(),
      ]
    )
    res.json({ id: result.insertId, message: 'Interview saved successfully.' })
  } catch (err) {
    console.error('Save interview error:', err)
    res.status(500).json({ error: 'Failed to save interview.' })
  }
})

// DELETE /api/interviews — clear all interview history for user
router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM interviews WHERE user_id = ?', [req.userId])
    res.json({ message: 'Interview history cleared.' })
  } catch (err) {
    console.error('Delete interviews error:', err)
    res.status(500).json({ error: 'Failed to clear interview history.' })
  }
})

module.exports = router
