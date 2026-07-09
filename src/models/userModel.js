const pool = require('../config/db');

const USER_COLUMNS = 'id, name, email, role, created_at';

const getUsers = async () => {
  const result = await pool.query(`SELECT ${USER_COLUMNS} FROM users ORDER BY id ASC`);
  return result.rows;
};

const getUserById = async (id) => {
  const result = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return result.rows[0];
};

const getUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

const createUser = async (name, email, password, role = 'viewer') => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING ${USER_COLUMNS}`,
    [name, email, password, role]
  );
  return result.rows[0];
};

const updateUser = async (id, name, email) => {
  const result = await pool.query(
    `UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING ${USER_COLUMNS}`,
    [name, email, id]
  );
  return result.rows[0];
};

const deleteUser = async (id) => {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
  return { id };
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserByEmail,
};
