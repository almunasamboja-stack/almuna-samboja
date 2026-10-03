const express = require('express');
const router = express.Router();
const { getCourses, createCourse, updateCourse, deleteCourse, getCourseStudents } = require('../controllers/courseController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/courses (publik)
router.get('/', getCourses);

// GET /api/courses/:id/students -> daftar siswa di 1 kelas (guru/admin)
router.get('/:id/students', authMiddleware, requireRole('TEACHER', 'ADMIN'), getCourseStudents);

// POST /api/courses (admin)
router.post('/', authMiddleware, requireRole('ADMIN'), createCourse);

// PUT /api/courses/:id (admin)
router.put('/:id', authMiddleware, requireRole('ADMIN'), updateCourse);

// DELETE /api/courses/:id (admin)
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteCourse);

module.exports = router;
