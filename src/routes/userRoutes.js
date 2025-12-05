const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { checkRole } = require('../middlewares/auth');
const jwtAuth = require('../middlewares/jwtAuth');

router.get('/', jwtAuth, userController.getUsers);
router.get('/:id', jwtAuth, userController.getUserById);
router.post('/', jwtAuth, checkRole(['admin']), userController.createUser);
router.put('/:id', jwtAuth, checkRole(['admin', 'editor']), userController.updateUser);
router.delete('/:id', jwtAuth, checkRole(['admin']), userController.deleteUser);

module.exports = router;
