const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function createDefaultUser() {
    const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@baggio.com';
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const defaultName = 'Admin';
    const defaultRole = 'admin';

    try {
        // Check if user already exists
        const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [defaultEmail]);

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
        console.error('Error creating default user:', error);
    } finally {
        pool.end();
    }
}

createDefaultUser();
