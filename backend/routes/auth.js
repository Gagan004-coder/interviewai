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

  // Ensure facebook_id column exists (splitting column addition and unique index creation for TiDB compatibility)
  try {
    await pool.query('ALTER TABLE users ADD COLUMN facebook_id VARCHAR(100) NULL')
    try {
      await pool.query('ALTER TABLE users ADD UNIQUE INDEX idx_facebook_id (facebook_id)')
    } catch (idxErr) {
      // Index already exists, ignore
    }
  } catch (e) {
    // Column already exists, ignore
  }

  try {
    // 1. Verify token with Facebook (only request ID and Name to respect privacy)
    const fbRes = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name`)
    const fbData = await fbRes.json()
    
    if (fbData.error) {
      return res.status(401).json({ error: 'Invalid Facebook token.' })
    }

    const fbId = fbData.id
    const name = fbData.name || 'Facebook User'

    // 2. Check if user already linked this Facebook account
    const [existing] = await pool.query('SELECT * FROM users WHERE facebook_id=?', [fbId])
    
    let user;
    if (existing.length) {
      // Secure returning user, log in directly
      user = existing[0]
    } else {
      // New user or linking existing account. Verify if email was provided
      if (!userProvidedEmail) {
        return res.json({ emailRequired: true })
      }

      const email = userProvidedEmail.trim().toLowerCase()

      // Check if a user with this email already exists to link them
      const [existingEmail] = await pool.query('SELECT * FROM users WHERE email=?', [email])
      
      if (existingEmail.length) {
        // Link Facebook to existing account
        await pool.query('UPDATE users SET facebook_id=? WHERE id=?', [fbId, existingEmail[0].id])
        user = existingEmail[0]
        user.facebook_id = fbId
      } else {
        // Register a new user
        const allowedRoles = ['user', 'company']
        const finalRole = allowedRoles.includes(role) ? role : 'user'
        
        const dummyPassword = Math.random().toString(36).slice(-10) + Date.now().toString(36)
        const hash = await bcrypt.hash(dummyPassword, 10)
        
        const [result] = await pool.query(
          'INSERT INTO users (name, email, password_hash, role, facebook_id) VALUES (?,?,?,?,?)',
          [name, email, hash, finalRole, fbId]
        )
        user = { id: result.insertId, name, email, role: finalRole, facebook_id: fbId, created_at: new Date() }
      }
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
