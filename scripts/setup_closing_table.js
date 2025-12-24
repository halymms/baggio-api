const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../db/migrations/create_monthly_closing_data.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration executed successfully: monthly_closing_data table created/verified.');
    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        pool.end();
    }
}

runMigration();
