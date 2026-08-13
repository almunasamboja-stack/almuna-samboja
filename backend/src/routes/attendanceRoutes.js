const express = require('express');
const router = express.Router();
const {
  getTodayAttendance,
  recordAttendance,
  getStudentAttendance,
} = require('../controllers/attendanceController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/attendance/today (khusus guru/admin)
router.get('/today', authMiddleware, requireRole('TEACHER', 'ADMIN'), getTodayAttendance);

// POST /api/attendance (khusus guru/admin)
router.post('/', authMiddleware, requireRole('TEACHER', 'ADMIN'), recordAttendance);

// GET /api/attendance/student/:studentId (siswa yang bersangkutan, guru, atau admin)
router.get('/student/:studentId', authMiddleware, getStudentAttendance);

module.exports = router;
