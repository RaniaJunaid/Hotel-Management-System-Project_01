const router       = require('express').Router();
const authenticate = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const {
  getAllGuests, getGuestById,
  createGuest, updateGuest
} = require('../controllers/guests.controller');

router.get('/',    authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), getAllGuests);
router.get('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), getGuestById);
router.post('/',   authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), createGuest);
router.patch('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), updateGuest);

module.exports = router;