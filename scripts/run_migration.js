const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function runMigration() {
    const migrationFile = path.join(__dirname, '../db/migrations/create_manager_commission_data.sql');

    try {
        console.log('Reading migration file...');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('Executing migration...');
        await pool.query(sql);

        console.log('Migration executed successfully!');
    } catch (error) {
        console.error('Error executing migration:', error);
    } finally {
        pool.end();
    }
}

runMigration();
