const mysql = require('mysql2/promise')
require('dotenv').config()

// Automatically enable SSL for TiDB Cloud connections to prevent "ssl is required" errors on Render
const isTiDB = process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com');
const useSSL = process.env.DB_SSL === 'true' || isTiDB;

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'interviewai',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  ssl:      useSSL ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
})

module.exports = pool
