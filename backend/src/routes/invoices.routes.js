const router       = require('express').Router();
const authenticate = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const {
  getAllInvoices, getInvoiceById,
  getOverdueInvoices, recordPayment,
  getInvoiceReceipt
} = require('../controllers/invoices.controller');

router.get('/',           authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), getAllInvoices);
router.get('/overdue',    authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), getOverdueInvoices);
router.get('/:id/receipt',       authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), getInvoiceReceipt);
router.get('/:id',        authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), getInvoiceById);
router.post('/:id/payments', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.RECEPTIONIST), recordPayment);

module.exports = router;