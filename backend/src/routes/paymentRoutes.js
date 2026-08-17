const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getStudentPayments,
  createPayment,
  updatePayment,
  deletePayment,
} = require('../controllers/paymentController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/payments?month=X&year=Y (admin)
router.get('/', authMiddleware, requireRole('ADMIN'), getAllPayments);

// GET /api/payments/student/:studentId (siswa yang bersangkutan atau admin)
router.get('/student/:studentId', authMiddleware, getStudentPayments);

// POST /api/payments (admin)
router.post('/', authMiddleware, requireRole('ADMIN'), createPayment);

// PUT /api/payments/:id (admin)
router.put('/:id', authMiddleware, requireRole('ADMIN'), updatePayment);

// DELETE /api/payments/:id (admin)
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deletePayment);

module.exports = router;
