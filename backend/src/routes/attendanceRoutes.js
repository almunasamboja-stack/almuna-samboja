const express = require('express');
const router = express.Router();
const {
  getTodayAttendance,
  recordAttendance,
  getStudentAttendance,
  getAttendanceByDate,
  getAttendanceByMonth,
} = require('../controllers/attendanceController');
const { authMiddleware, requireRole, requireApprovedStudent } = require('../middleware/auth');

// GET /api/attendance/today (khusus guru/admin)
router.get('/today', authMiddleware, requireRole('TEACHER', 'ADMIN'), getTodayAttendance);

// GET /api/attendance/recap?date=X&courseId=Y (khusus guru/admin)
router.get('/recap', authMiddleware, requireRole('TEACHER', 'ADMIN'), getAttendanceByDate);

// GET /api/attendance/recap-month?month=M&year=Y&courseId=X (khusus guru/admin)
router.get('/recap-month', authMiddleware, requireRole('TEACHER', 'ADMIN'), getAttendanceByMonth);

// POST /api/attendance (khusus guru/admin)
router.post('/', authMiddleware, requireRole('TEACHER', 'ADMIN'), recordAttendance);

// GET /api/attendance/student/:studentId (siswa yang bersangkutan, guru, atau admin)
router.get('/student/:studentId', authMiddleware, requireApprovedStudent, getStudentAttendance);

module.exports = router;
