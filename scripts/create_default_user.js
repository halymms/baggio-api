const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT,
    });

async function createDefaultUser() {
  const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@baggio.com';
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const defaultName = 'Admin';
  const defaultRole = 'admin';

  try {
    const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [defaultEmail]);

    if (checkUser.rows.length > 0) {
      console.log(`User ${defaultEmail} already exists. Skipping creation.`);
    } else {
      console.log(`Creating default user: ${defaultEmail}...`);
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        [defaultName, defaultEmail, hashedPassword, defaultRole]
      );

      console.log('Default user created successfully.');
    }
  } catch (error) {
    console.error('Error creating default user:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createDefaultUser();
