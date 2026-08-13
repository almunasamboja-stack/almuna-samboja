const express = require('express');
const router = express.Router();
const { getCourses, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/courses (publik)
router.get('/', getCourses);

// POST /api/courses (admin)
router.post('/', authMiddleware, requireRole('ADMIN'), createCourse);

// PUT /api/courses/:id (admin)
router.put('/:id', authMiddleware, requireRole('ADMIN'), updateCourse);

// DELETE /api/courses/:id (admin)
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteCourse);

module.exports = router;
