const express = require('express');
const router = express.Router();
const { getGallery, uploadGalleryPhoto, deleteGalleryPhoto } = require('../controllers/galleryController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { uploadGalleryPhoto: uploadMiddleware } = require('../middleware/upload');

// GET /api/gallery (publik)
router.get('/', getGallery);

// POST /api/gallery (admin)
router.post('/', authMiddleware, requireRole('ADMIN'), uploadMiddleware.single('photo'), uploadGalleryPhoto);

// DELETE /api/gallery/:id (admin)
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteGalleryPhoto);

module.exports = router;
