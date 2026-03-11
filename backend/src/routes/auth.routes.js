const router       = require('express').Router();
const authenticate = require('../middleware/auth');
const { login, getMe } = require('../controllers/auth.controller');

router.post('/login', login);
router.get('/me',     authenticate, getMe);

module.exports = router;