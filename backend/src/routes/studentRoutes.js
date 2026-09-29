const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  getAllStudents,
  createStudent,
  updateStudent,
  updateStudentStatus,
  adminResetPassword,
  deleteStudent,
} = require('../controllers/studentController');
const { authMiddleware, requireRole, requireApprovedStudent } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

// GET /api/students/me -> profil siswa yang sedang login
// Catatan: TIDAK diblok oleh requireApprovedStudent, karena endpoint ini juga dipakai
// untuk mengecek status pendaftaran (PENDING/REJECTED) di halaman "menunggu persetujuan".
router.get('/me', authMiddleware, getMyProfile);

// PUT /api/students/me -> siswa edit biodata sendiri (hanya jika sudah APPROVED)
router.put('/me', authMiddleware, requireRole('STUDENT'), requireApprovedStudent, updateMyProfile);

// GET /api/students -> daftar semua siswa termasuk status pendaftaran (admin)
router.get('/', authMiddleware, requireRole('ADMIN'), getAllStudents);

// POST /api/students -> tambah siswa baru, bisa sekalian unggah foto (admin)
router.post('/', authMiddleware, requireRole('ADMIN'), uploadAvatar.single('avatar'), createStudent);

// PUT /api/students/:id -> edit siswa (admin)
router.put('/:id', authMiddleware, requireRole('ADMIN'), updateStudent);

// PATCH /api/students/:id/status -> setujui / tolak pendaftar (admin)
router.patch('/:id/status', authMiddleware, requireRole('ADMIN'), updateStudentStatus);

// PATCH /api/students/:id/password -> admin ubah password peserta kursus (admin)
router.patch('/:id/password', authMiddleware, requireRole('ADMIN'), adminResetPassword);

// DELETE /api/students/:id -> hapus siswa (admin)
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteStudent);

module.exports = router;
