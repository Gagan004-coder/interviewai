const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'interviewai_secret'

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authentication required.' })

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, SECRET)
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' })
  }
}
