const pool = require('./db');

async function checkInterviews() {
  try {
    console.log("Checking interviews table...");
    const [columns] = await pool.query("SHOW COLUMNS FROM interviews");
    console.log("Columns in 'interviews' table:", columns.map(c => c.Field));
    
    console.log("Checking if we can run a select query...");
    const [rows] = await pool.query("SELECT * FROM interviews LIMIT 1");
    console.log("Success! Sample row:", rows);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    pool.end();
  }
}

checkInterviews();
