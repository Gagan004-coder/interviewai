const express = require('express')
const pool = require('../db')
const auth = require('../middleware/auth')
const router = express.Router()

async function adminOnly(req, res, next) {
  const [rows] = await pool.query('SELECT role FROM users WHERE id=?', [req.userId])
  if (!rows[0] || rows[0].role !== 'admin') return res.status(403).json({ error: 'Admin access required.' })
  next()
}

router.use(auth)
router.use(adminOnly)

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
             COUNT(i.id) AS interviews
      FROM users u LEFT JOIN interviews i ON i.user_id=u.id
      GROUP BY u.id ORDER BY u.created_at DESC`)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body
  if (!['user','company','admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' })
  try {
    await pool.query('UPDATE users SET role=? WHERE id=?', [role, req.params.id])
    res.json({ message: 'Role updated.' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [[{ users }]] = await pool.query('SELECT COUNT(*) AS users FROM users')
    const [[{ companies }]] = await pool.query("SELECT COUNT(*) AS companies FROM users WHERE role='company'")
    const [[{ interviews }]] = await pool.query('SELECT COUNT(*) AS interviews FROM interviews')
    const [[{ avg_score }]] = await pool.query('SELECT ROUND(AVG(overall),1) AS avg_score FROM interviews')
    res.json({ users, companies, interviews, avg_score })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
