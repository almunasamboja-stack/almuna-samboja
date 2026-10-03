const express = require('express');
const router = express.Router();
const { getClassRecap, getStudentLetterReport } = require('../controllers/reportController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/reports/class-recap?courseId=X (admin)
router.get('/class-recap', authMiddleware, requireRole('ADMIN'), getClassRecap);

// GET /api/reports/student-letters?courseId=X&month=M&year=Y (guru/admin)
router.get('/student-letters', authMiddleware, requireRole('TEACHER', 'ADMIN'), getStudentLetterReport);

module.exports = router;
