const express = require('express');
const router = express.Router();
const {
  getDriveFiles,
  getAllExams,
  createExam,
  updateExam,
  togglePublish,
  deleteExam,
  getExamAttempts,
  getExamResultsRecap,
} = require('../controllers/examController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/exams/drive-files (admin/guru) - daftar file soal dari Google Drive
router.get('/drive-files', authMiddleware, requireRole('TEACHER', 'ADMIN'), getDriveFiles);

// GET /api/exams/results-recap?courseId=X (admin/guru) - rekap nilai per anak per pelajaran
// Catatan: harus didaftarkan SEBELUM /:id supaya "results-recap" tidak ketangkap sebagai :id
router.get('/results-recap', authMiddleware, requireRole('TEACHER', 'ADMIN'), getExamResultsRecap);

// GET /api/exams (admin/guru)
router.get('/', authMiddleware, requireRole('TEACHER', 'ADMIN'), getAllExams);

// POST /api/exams (admin/guru)
router.post('/', authMiddleware, requireRole('TEACHER', 'ADMIN'), createExam);

// PUT /api/exams/:id (admin/guru)
router.put('/:id', authMiddleware, requireRole('TEACHER', 'ADMIN'), updateExam);

// PATCH /api/exams/:id/publish (admin/guru)
router.patch('/:id/publish', authMiddleware, requireRole('TEACHER', 'ADMIN'), togglePublish);

// DELETE /api/exams/:id (admin/guru)
router.delete('/:id', authMiddleware, requireRole('TEACHER', 'ADMIN'), deleteExam);

// GET /api/exams/:id/attempts (admin/guru) - hasil semua siswa untuk 1 ujian
router.get('/:id/attempts', authMiddleware, requireRole('TEACHER', 'ADMIN'), getExamAttempts);

module.exports = router;
