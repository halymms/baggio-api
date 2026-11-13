const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const jwtAuth = require('../middlewares/jwtAuth');
const { checkRole } = require('../middlewares/auth');

router.post('/register', jwtAuth, checkRole(['admin']), authController.register);
router.post('/login', authController.login);

module.exports = router;
