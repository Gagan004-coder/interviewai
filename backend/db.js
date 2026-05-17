const mysql = require('mysql2/promise')
require('dotenv').config()

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'interviewai',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  ssl:      process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
})

module.exports = pool
