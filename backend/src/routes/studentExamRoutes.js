const express = require('express');
const router = express.Router();
const {
  getAvailableExams,
  getExamToTake,
  submitExam,
  getMyAttempts,
  getAttemptDetail,
} = require('../controllers/studentExamController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/student-exams (siswa) - daftar ujian tersedia
router.get('/', authMiddleware, requireRole('STUDENT'), getAvailableExams);

// GET /api/student-exams/attempts/me (siswa) - riwayat hasil ujian sendiri
// Catatan: harus didaftarkan SEBELUM /:id supaya "attempts" tidak ketangkap sebagai :id
router.get('/attempts/me', authMiddleware, requireRole('STUDENT'), getMyAttempts);

// GET /api/student-exams/attempts/:attemptId (siswa untuk milik sendiri, atau admin/guru)
router.get('/attempts/:attemptId', authMiddleware, getAttemptDetail);

// GET /api/student-exams/:id (siswa) - detail ujian untuk dikerjakan
router.get('/:id', authMiddleware, requireRole('STUDENT'), getExamToTake);

// POST /api/student-exams/:id/submit (siswa) - submit jawaban
router.post('/:id/submit', authMiddleware, requireRole('STUDENT'), submitExam);

module.exports = router;
