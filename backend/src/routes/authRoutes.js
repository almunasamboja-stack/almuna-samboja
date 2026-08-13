const express = require('express');
const router = express.Router();
const { register, login, me, changePassword } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me (butuh token)
router.get('/me', authMiddleware, me);

// PUT /api/auth/password -> ganti password sendiri (admin, guru, siswa)
router.put('/password', authMiddleware, changePassword);

module.exports = router;
