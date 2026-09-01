const express = require('express');
const router = express.Router();
const { getRecipients, sendBroadcast } = require('../controllers/broadcastController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/broadcast/recipients?courseId=X (admin)
router.get('/recipients', authMiddleware, requireRole('ADMIN'), getRecipients);

// POST /api/broadcast/send (admin)
router.post('/send', authMiddleware, requireRole('ADMIN'), sendBroadcast);

module.exports = router;
