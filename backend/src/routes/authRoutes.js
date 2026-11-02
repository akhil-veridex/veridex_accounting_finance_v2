const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public SaaS Auth
router.post('/register-tenant', authController.registerTenant);
router.post('/login', authController.login);

// Authenticated Endpoints
router.get('/me', requireAuth, authController.getMe);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
