const pool = require('./db');

async function migrate() {
  try {
    console.log('Running migration...');
    await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
    console.log('Migration successful: Added role column to users table.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Migration skipped: role column already exists.');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    pool.end();
  }
}

migrate();
