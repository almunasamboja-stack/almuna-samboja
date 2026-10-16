const express = require('express');
const router = express.Router();
const { getStudentData, getMyProgress, updateRecord, deleteRecord } = require('../controllers/studentDataController');
const { authMiddleware, requireRole, requireApprovedStudent } = require('../middleware/auth');

// Rute /me untuk siswa (hanya data miliknya sendiri). Rute lainnya KHUSUS admin: lihat / edit / hapus semua data yang terkait 1 siswa.
// :type = grades | attendances | violations | payments | assessments | exam-attempts

// GET /api/student-data/me -> data grafik milik siswa yang login (HARUS di atas rute /:studentId)
router.get('/me', authMiddleware, requireRole('STUDENT'), requireApprovedStudent, getMyProgress);

// GET /api/student-data/:studentId (admin)
router.get('/:studentId', authMiddleware, requireRole('ADMIN'), getStudentData);

// PUT /api/student-data/:type/:id
router.put('/:type/:id', authMiddleware, requireRole('ADMIN'), updateRecord);

// DELETE /api/student-data/:type/:id
router.delete('/:type/:id', authMiddleware, requireRole('ADMIN'), deleteRecord);

module.exports = router;
