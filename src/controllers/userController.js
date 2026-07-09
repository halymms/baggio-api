const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

const validRoles = ['admin', 'editor', 'viewer'];

const handleUserError = (error, res) => {
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }
  return res.status(500).json({ error: error.message });
};

const getUsers = async (req, res) => {
  try {
    const users = await userModel.getUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await userModel.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'viewer' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userModel.createUser(name, email, hashedPassword, role);
    res.status(201).json(newUser);
  } catch (error) {
    handleUserError(error, res);
  }
};

const updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email } = req.body;
    const updatedUser = await userModel.updateUser(id, name, email);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    handleUserError(error, res);
  }
};

const deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await userModel.getUserById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    await userModel.deleteUser(id);
    res.status(200).json({ message: `User deleted with ID: ${id}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
