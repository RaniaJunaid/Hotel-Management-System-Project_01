const router       = require('express').Router();
const authenticate = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const {
  getAllRooms, getRoomById,
  getAvailableRooms, updateRoomStatus
} = require('../controllers/rooms.controller');

router.get('/available', authenticate, getAvailableRooms);
router.get('/',          authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), getAllRooms);
router.get('/:id',       authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), getRoomById);
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), updateRoomStatus);

module.exports = router;