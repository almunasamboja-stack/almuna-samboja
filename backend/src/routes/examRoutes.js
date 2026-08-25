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
  getExamSummary,
  createAttempt,
  updateAttempt,
  deleteAttempt,
} = require('../controllers/examController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Catatan: rute berbasis kata kunci tetap (drive-files, summary, results-recap, attempts)
// HARUS didaftarkan SEBELUM rute berpola /:id, supaya tidak salah tertangkap sebagai ID.

// GET /api/exams/drive-files (admin/guru) - daftar file soal dari Google Drive
router.get('/drive-files', authMiddleware, requireRole('TEACHER', 'ADMIN'), getDriveFiles);

// GET /api/exams/summary?courseId=X (admin/guru) - rata-rata nilai PER UJIAN yang diadakan
router.get('/summary', authMiddleware, requireRole('TEACHER', 'ADMIN'), getExamSummary);

// GET /api/exams/results-recap?courseId=X (admin/guru) - rekap nilai per anak per pelajaran
router.get('/results-recap', authMiddleware, requireRole('TEACHER', 'ADMIN'), getExamResultsRecap);

// CRUD nilai ujian (attempt) - admin/guru
router.post('/attempts', authMiddleware, requireRole('TEACHER', 'ADMIN'), createAttempt);
router.put('/attempts/:attemptId', authMiddleware, requireRole('TEACHER', 'ADMIN'), updateAttempt);
router.delete('/attempts/:attemptId', authMiddleware, requireRole('TEACHER', 'ADMIN'), deleteAttempt);

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
