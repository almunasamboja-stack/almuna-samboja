// Controller Pengeluaran - kebutuhan operasional kursus (ATK, sewa, gaji, dll), khusus admin
const prisma = require('../lib/prisma');

const EXPENSE_INCLUDE = {
  course: { select: { id: true, name: true } },
};

// GET /api/expenses?month=M&year=Y&courseId=X&category=C -> daftar pengeluaran + total (admin)
// Semua filter opsional. Tanpa month/year -> semua periode. Tanpa courseId -> semua kelas (termasuk yang umum/tidak spesifik).
async function getAllExpenses(req, res) {
  try {
    const { month, year, courseId, category } = req.query;

    let dateFilter;
    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      dateFilter = { gte: start, lt: end };
    }

    const expenses = await prisma.expense.findMany({
      where: {
        ...(dateFilter ? { date: dateFilter } : {}),
        ...(courseId ? { courseId: Number(courseId) } : {}),
        ...(category ? { category } : {}),
      },
      include: EXPENSE_INCLUDE,
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Daftar kategori yang pernah dipakai, buat dropdown filter/isian di frontend
    const allCategories = await prisma.expense.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    res.json({ expenses, total, categories: allCategories.map((c) => c.category) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data pengeluaran' });
  }
}

// POST /api/expenses -> catat pengeluaran baru (admin)
// body: { title, category, amount, courseId, date, notes }
async function createExpense(req, res) {
  try {
    const { title, category, amount, courseId, date, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Nama/keperluan pengeluaran wajib diisi' });
    }
    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Jumlah pengeluaran harus lebih dari 0' });
    }

    const expense = await prisma.expense.create({
      data: {
        title: title.trim(),
        category: category?.trim() || 'Umum',
        amount: Number(amount),
        courseId: courseId ? Number(courseId) : null,
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null,
      },
      include: EXPENSE_INCLUDE,
    });

    res.status(201).json({ message: 'Pengeluaran berhasil dicatat', expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mencatat pengeluaran' });
  }
}

// PUT /api/expenses/:id -> edit pengeluaran (admin)
async function updateExpense(req, res) {
  try {
    const { id } = req.params;
    const { title, category, amount, courseId, date, notes } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Pengeluaran tidak ditemukan' });
    }
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ message: 'Nama/keperluan pengeluaran tidak boleh kosong' });
    }
    if (amount !== undefined && Number(amount) <= 0) {
      return res.status(400).json({ message: 'Jumlah pengeluaran harus lebih dari 0' });
    }

    const expense = await prisma.expense.update({
      where: { id: Number(id) },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        category: category !== undefined ? category?.trim() || 'Umum' : existing.category,
        amount: amount !== undefined ? Number(amount) : existing.amount,
        courseId: courseId !== undefined ? (courseId ? Number(courseId) : null) : existing.courseId,
        date: date !== undefined ? new Date(date) : existing.date,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
      },
      include: EXPENSE_INCLUDE,
    });

    res.json({ message: 'Pengeluaran berhasil diperbarui', expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui pengeluaran' });
  }
}

// DELETE /api/expenses/:id -> hapus pengeluaran (admin)
async function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.expense.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Pengeluaran tidak ditemukan' });
    }
    await prisma.expense.delete({ where: { id: Number(id) } });
    res.json({ message: 'Pengeluaran berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus pengeluaran' });
  }
}

module.exports = { getAllExpenses, createExpense, updateExpense, deleteExpense };
