const router       = require('express').Router();
const authenticate = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword
} = require('../controllers/users.controller');

// Admin and Manager can view users
router.get('/',    authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), getAllUsers);
router.get('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), getUserById);

// Only Admin and Manager can create users
router.post('/',   authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), createUser);

// Only Admin and Manager can update users
router.patch('/:id',                authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), updateUser);
router.patch('/:id/toggle-status',  authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), toggleUserStatus);
router.patch('/:id/reset-password', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), resetPassword);

module.exports = router;