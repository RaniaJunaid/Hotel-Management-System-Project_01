const router       = require('express').Router();
const authenticate = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const {
  getAllReservations,
  getReservationById,
  createReservation,
  checkinReservation,
  checkoutReservation,
  cancelReservation
} = require('../controllers/reservations.controller');

router.get('/',    authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), getAllReservations);
router.post('/',   authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), createReservation);

router.patch('/:id/checkin',  authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), checkinReservation);
router.patch('/:id/checkout', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), checkoutReservation);
router.patch('/:id/cancel',   authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), cancelReservation);

router.get('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), getReservationById);

module.exports = router;