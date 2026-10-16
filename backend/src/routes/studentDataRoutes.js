const express = require('express');
const router = express.Router();
const { getStudentData, updateRecord, deleteRecord } = require('../controllers/studentDataController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Semua rute di sini KHUSUS admin: lihat / edit / hapus semua data yang terkait 1 siswa.
// :type = grades | attendances | violations | payments | assessments | exam-attempts

// GET /api/student-data/:studentId
router.get('/:studentId', authMiddleware, requireRole('ADMIN'), getStudentData);

// PUT /api/student-data/:type/:id
router.put('/:type/:id', authMiddleware, requireRole('ADMIN'), updateRecord);

// DELETE /api/student-data/:type/:id
router.delete('/:type/:id', authMiddleware, requireRole('ADMIN'), deleteRecord);

module.exports = router;
