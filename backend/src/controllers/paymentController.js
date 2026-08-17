// Controller pembayaran SPP - dikelola oleh admin, bisa dilihat siswa untuk riwayat sendiri
const prisma = require('../lib/prisma');

const PAYMENT_INCLUDE = {
  student: { include: { user: { select: { name: true, email: true } } } },
  course: { select: { id: true, name: true } },
};

// GET /api/payments?month=8&year=2026 -> daftar pembayaran (khusus admin), bisa difilter per bulan
async function getAllPayments(req, res) {
  try {
    const { month, year } = req.query;

    const payments = await prisma.payment.findMany({
      where: {
        ...(month ? { periodMonth: Number(month) } : {}),
        ...(year ? { periodYear: Number(year) } : {}),
      },
      include: PAYMENT_INCLUDE,
      orderBy: { paymentDate: 'desc' },
    });

    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data pembayaran' });
  }
}

// GET /api/payments/student/:studentId -> riwayat pembayaran 1 siswa (siswa sendiri atau admin)
async function getStudentPayments(req, res) {
  try {
    const { studentId } = req.params;

    // Siswa hanya boleh lihat riwayat pembayaran miliknya sendiri
    if (req.user.role === 'STUDENT') {
      const ownStudent = await prisma.student.findUnique({ where: { userId: req.user.id } });
      if (!ownStudent || ownStudent.id !== Number(studentId)) {
        return res.status(403).json({ message: 'Anda tidak memiliki akses ke data ini' });
      }
    }

    const payments = await prisma.payment.findMany({
      where: { studentId: Number(studentId) },
      include: PAYMENT_INCLUDE,
      orderBy: { paymentDate: 'desc' },
    });

    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil riwayat pembayaran' });
  }
}

// POST /api/payments -> catat pembayaran baru (khusus admin)
// body: { studentId, courseId, amount, periodMonth, periodYear, paymentDate, method, notes }
async function createPayment(req, res) {
  try {
    const { studentId, courseId, amount, periodMonth, periodYear, paymentDate, method, notes } = req.body;

    if (!studentId || !amount || !periodMonth || !periodYear || !method) {
      return res.status(400).json({ message: 'Data pembayaran tidak lengkap' });
    }
    if (!['CASH', 'TRANSFER'].includes(method)) {
      return res.status(400).json({ message: 'Metode pembayaran harus CASH atau TRANSFER' });
    }

    const payment = await prisma.payment.create({
      data: {
        studentId: Number(studentId),
        courseId: courseId ? Number(courseId) : null,
        amount: Number(amount),
        periodMonth: Number(periodMonth),
        periodYear: Number(periodYear),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        method,
        notes: notes || null,
      },
      include: PAYMENT_INCLUDE,
    });

    res.status(201).json({ message: 'Pembayaran berhasil dicatat', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mencatat pembayaran' });
  }
}

// PUT /api/payments/:id -> edit pembayaran (khusus admin)
async function updatePayment(req, res) {
  try {
    const { id } = req.params;
    const { courseId, amount, periodMonth, periodYear, paymentDate, method, notes } = req.body;

    const existing = await prisma.payment.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Data pembayaran tidak ditemukan' });
    }
    if (method && !['CASH', 'TRANSFER'].includes(method)) {
      return res.status(400).json({ message: 'Metode pembayaran harus CASH atau TRANSFER' });
    }

    const payment = await prisma.payment.update({
      where: { id: Number(id) },
      data: {
        courseId: courseId !== undefined ? (courseId ? Number(courseId) : null) : existing.courseId,
        amount: amount !== undefined ? Number(amount) : existing.amount,
        periodMonth: periodMonth !== undefined ? Number(periodMonth) : existing.periodMonth,
        periodYear: periodYear !== undefined ? Number(periodYear) : existing.periodYear,
        paymentDate: paymentDate ? new Date(paymentDate) : existing.paymentDate,
        method: method || existing.method,
        notes: notes !== undefined ? notes : existing.notes,
      },
      include: PAYMENT_INCLUDE,
    });

    res.json({ message: 'Pembayaran berhasil diperbarui', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui pembayaran' });
  }
}

// DELETE /api/payments/:id -> hapus catatan pembayaran (khusus admin)
async function deletePayment(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.payment.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Data pembayaran tidak ditemukan' });
    }

    await prisma.payment.delete({ where: { id: Number(id) } });
    res.json({ message: 'Pembayaran berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus pembayaran' });
  }
}

module.exports = { getAllPayments, getStudentPayments, createPayment, updatePayment, deletePayment };
