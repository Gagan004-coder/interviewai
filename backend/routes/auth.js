const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const router = express.Router()
const SECRET = process.env.JWT_SECRET || 'interviewai_secret'

// POST /api/auth/register  (role: user | company)
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'user', company_name, industry } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required.' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be 6+ characters.' })
  const allowedRoles = ['user', 'company']
  if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Invalid role.' })
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email.toLowerCase()])
    if (existing.length) return res.status(409).json({ error: 'Account already exists with this email.' })
    const hash = await bcrypt.hash(password, 10)
    const displayName = role === 'company' ? (company_name || name) : name
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
      [displayName.trim(), email.toLowerCase(), hash, role]
    )
    const user = { id: result.insertId, name: displayName.trim(), email: email.toLowerCase(), role, joinedAt: new Date().toISOString() }
    const token = jwt.sign({ userId: user.id, role }, SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' })
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email=?', [email.toLowerCase()])
    if (!rows.length) return res.status(401).json({ error: 'No account found with this email.' })
    const user = rows[0]
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Incorrect password.' })
    const profile = { id: user.id, name: user.name, email: user.email, role: user.role, joinedAt: user.created_at }
    const token = jwt.sign({ userId: user.id, role: user.role }, SECRET, { expiresIn: '30d' })
    res.json({ token, user: profile })
  } catch (err) { res.status(500).json({ error: 'Server error during login.' }) }
})

// POST /api/auth/admin/register  (requires ADMIN_SECRET)
router.post('/admin/register', async (req, res) => {
  const { name, email, password, adminSecret } = req.body
  if (adminSecret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Invalid admin secret.' })
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required.' })
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email.toLowerCase()])
    if (existing.length) return res.status(409).json({ error: 'Account already exists.' })
    const hash = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
      [name.trim(), email.toLowerCase(), hash, 'admin']
    )
    const user = { id: result.insertId, name: name.trim(), email: email.toLowerCase(), role: 'admin' }
    const token = jwt.sign({ userId: user.id, role: 'admin' }, SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch (err) { res.status(500).json({ error: 'Server error.' }) }
})

// POST /api/auth/facebook
router.post('/facebook', async (req, res) => {
  const { accessToken, role = 'user', email: userProvidedEmail } = req.body
  if (!accessToken) return res.status(400).json({ error: 'Missing Facebook access token.' })

  try {
    // 1. Verify token with Facebook
    const fbRes = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`)
    const fbData = await fbRes.json()
    
    if (fbData.error) {
      return res.status(401).json({ error: 'Invalid Facebook token.' })
    }

    const email = fbData.email || userProvidedEmail
    if (!email) {
      return res.json({ emailRequired: true })
    }
    const name = fbData.name || 'Facebook User'

    // 2. Check if user exists
    const [existing] = await pool.query('SELECT * FROM users WHERE email=?', [email.toLowerCase()])
    
    let user;
    if (existing.length) {
      // User exists, just log them in
      user = existing[0]
    } else {
      // Register new user
      const allowedRoles = ['user', 'company']
      const finalRole = allowedRoles.includes(role) ? role : 'user'
      
      // Generate a dummy password since password_hash is NOT NULL
      const dummyPassword = Math.random().toString(36).slice(-10) + Date.now().toString(36)
      const hash = await bcrypt.hash(dummyPassword, 10)
      
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
        [name, email.toLowerCase(), hash, finalRole]
      )
      user = { id: result.insertId, name, email: email.toLowerCase(), role: finalRole, created_at: new Date() }
    }

    // 3. Generate JWT
    const profile = { id: user.id, name: user.name, email: user.email, role: user.role, joinedAt: user.created_at }
    const token = jwt.sign({ userId: user.id, role: user.role }, SECRET, { expiresIn: '30d' })
    
    res.json({ token, user: profile })

  } catch (err) {
    console.error('Facebook login error:', err)
    res.status(500).json({ error: 'Server error during Facebook login.' })
  }
})

module.exports = router
