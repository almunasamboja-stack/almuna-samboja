const express = require('express');
const router = express.Router();
const {
  getStudentGrades,
  getClassDailyGrades,
  addGrade,
  updateGrade,
  deleteGrade,
} = require('../controllers/gradeController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/grades/class-today?courseId=X (khusus guru/admin)
router.get('/class-today', authMiddleware, requireRole('TEACHER', 'ADMIN'), getClassDailyGrades);

// GET /api/grades/student/:studentId
router.get('/student/:studentId', authMiddleware, getStudentGrades);

// POST /api/grades (khusus guru/admin)
router.post('/', authMiddleware, requireRole('TEACHER', 'ADMIN'), addGrade);

// PUT /api/grades/:id (khusus guru/admin)
router.put('/:id', authMiddleware, requireRole('TEACHER', 'ADMIN'), updateGrade);

// DELETE /api/grades/:id (khusus guru/admin)
router.delete('/:id', authMiddleware, requireRole('TEACHER', 'ADMIN'), deleteGrade);

module.exports = router;
