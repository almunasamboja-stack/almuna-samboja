const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  uploadMyAvatar,
  deleteMyAvatar,
  uploadUserAvatar,
  deleteUserAvatar,
} = require('../controllers/userController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

// GET /api/users -> daftar semua akun (admin) - untuk kelola foto guru/admin
router.get('/', authMiddleware, requireRole('ADMIN'), getAllUsers);

// Foto profil sendiri (berlaku untuk admin, guru, maupun siswa yang sedang login)
router.post('/me/avatar', authMiddleware, uploadAvatar.single('avatar'), uploadMyAvatar);
router.delete('/me/avatar', authMiddleware, deleteMyAvatar);

// Admin mengelola foto profil akun manapun (admin/guru/siswa)
router.post('/:id/avatar', authMiddleware, requireRole('ADMIN'), uploadAvatar.single('avatar'), uploadUserAvatar);
router.delete('/:id/avatar', authMiddleware, requireRole('ADMIN'), deleteUserAvatar);

module.exports = router;
