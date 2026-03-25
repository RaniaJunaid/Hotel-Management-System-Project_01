const router       = require('express').Router();
const authenticate = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');
const {
  getAllTasks,
  createTask,
  updateTaskStatus,
  assignTask,
  getHousekeepingStaff
} = require('../controllers/housekeeping.controller');

// All roles can view tasks (housekeeping sees only their own)
router.get('/',       authenticate, getAllTasks);
router.get('/staff',  authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), getHousekeepingStaff);

// Managers and Admin create tasks
router.post('/',      authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), createTask);

// All roles can update status (housekeeping updates their own)
router.patch('/:id/status', authenticate, updateTaskStatus);
router.patch('/:id/assign', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), assignTask);

module.exports = router;