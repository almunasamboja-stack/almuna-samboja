const express = require('express');
const router = express.Router();
const {
  getViolationTypes,
  createViolationType,
  updateViolationType,
  deleteViolationType,
  getChecklist,
  toggleViolation,
} = require('../controllers/violationController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Jenis pelanggaran - guru/admin boleh LIHAT, tapi tambah/edit/hapus KHUSUS admin
router.get('/types', authMiddleware, requireRole('TEACHER', 'ADMIN'), getViolationTypes);
router.post('/types', authMiddleware, requireRole('ADMIN'), createViolationType);
router.put('/types/:id', authMiddleware, requireRole('ADMIN'), updateViolationType);
router.delete('/types/:id', authMiddleware, requireRole('ADMIN'), deleteViolationType);

// Checklist pelanggaran per kelas per tanggal - guru & admin boleh catat
router.get('/', authMiddleware, requireRole('TEACHER', 'ADMIN'), getChecklist);
router.post('/toggle', authMiddleware, requireRole('TEACHER', 'ADMIN'), toggleViolation);

module.exports = router;
