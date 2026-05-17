const fs = require('fs');
const pool = require('./db');
const path = require('path');

async function runSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // Simple split by ';' (assuming no ';' inside strings/JSON in schema.sql)
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  for (let stmt of statements) {
    try {
      // TiDB Cloud Serverless limits creating databases, use the one from connection string
      if (stmt.toUpperCase().startsWith('CREATE DATABASE')) continue;
      if (stmt.toUpperCase().startsWith('USE ')) continue;
      
      console.log('Executing:', stmt.substring(0, 60).replace(/\n/g, ' ') + '...');
      await pool.query(stmt);
      console.log('Success.');
    } catch (err) {
      console.error('Error executing statement:', err.message);
    }
  }
  pool.end();
}

runSchema();
