const express = require('express')
const pool = require('../db')
const auth = require('../middleware/auth')
const router = express.Router()

// Middleware: must be company role
async function companyOnly(req, res, next) {
  const [rows] = await pool.query('SELECT role FROM users WHERE id=?', [req.userId])
  if (!rows[0] || rows[0].role !== 'company') return res.status(403).json({ error: 'Company access required.' })
  next()
}

router.use(auth)
router.use(companyOnly)

// GET /api/company/candidates — all users with completed interviews
router.get('/candidates', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at,
             COUNT(i.id) AS interview_count,
             ROUND(AVG(i.overall),1) AS avg_score
      FROM users u
      LEFT JOIN interviews i ON i.user_id = u.id
      WHERE u.role = 'user'
      GROUP BY u.id ORDER BY interview_count DESC`)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/company/candidate/:id — detailed interviews of a candidate
router.get('/candidate/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM interviews WHERE user_id=? ORDER BY created_at DESC', [req.params.id])
    const interviews = rows.map(r => ({
      ...r, date: r.created_at || r.date, answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers
    }))
    res.json(interviews)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
