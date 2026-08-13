const express = require('express');
const router = express.Router();
const { getClassRecap } = require('../controllers/reportController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/reports/class-recap?courseId=X (admin)
router.get('/class-recap', authMiddleware, requireRole('ADMIN'), getClassRecap);

module.exports = router;
