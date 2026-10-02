const express = require('express');
const router = express.Router();
const {
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Pengeluaran kursus - data keuangan, khusus admin
router.get('/', authMiddleware, requireRole('ADMIN'), getAllExpenses);
router.post('/', authMiddleware, requireRole('ADMIN'), createExpense);
router.put('/:id', authMiddleware, requireRole('ADMIN'), updateExpense);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteExpense);

module.exports = router;
