const express = require('express');
const router = express.Router();
const {
  getClassAssessments,
  upsertAssessment,
  getStudentAssessments,
} = require('../controllers/assessmentController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/assessments?month=X&year=Y&courseId=Z (admin/guru)
router.get('/', authMiddleware, requireRole('TEACHER', 'ADMIN'), getClassAssessments);

// GET /api/assessments/student/:studentId (siswa sendiri atau admin/guru)
router.get('/student/:studentId', authMiddleware, getStudentAssessments);

// PUT /api/assessments/:studentId (admin/guru)
router.put('/:studentId', authMiddleware, requireRole('TEACHER', 'ADMIN'), upsertAssessment);

module.exports = router;
