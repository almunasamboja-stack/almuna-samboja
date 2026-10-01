// Controller Pelanggaran Bahasa - kelola jenis pelanggaran (admin) & checklist pelanggaran per siswa per kelas
const prisma = require('../lib/prisma');

// Ratakan 1 tanggal ke jam 00:00:00 lokal, supaya 1 kombinasi siswa+jenis pelanggaran+kelas+tanggal
// selalu merujuk ke hari yang sama persis (dipakai untuk cek ada/tidaknya record saat toggle checklist).
function normalizeDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ===== JENIS PELANGGARAN (admin: tambah, edit, hapus) =====

// GET /api/violations/types -> daftar semua jenis pelanggaran (dipakai jadi kolom checklist)
async function getViolationTypes(req, res) {
  try {
    const types = await prisma.violationType.findMany({
      orderBy: { id: 'asc' },
    });
    res.json({ types });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil jenis pelanggaran' });
  }
}

// POST /api/violations/types -> tambah jenis pelanggaran baru (admin)
// body: { name, description }
async function createViolationType(req, res) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Nama jenis pelanggaran wajib diisi' });
    }

    const type = await prisma.violationType.create({
      data: { name: name.trim(), description: description?.trim() || null },
    });

    res.status(201).json({ message: 'Jenis pelanggaran berhasil ditambahkan', type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menambahkan jenis pelanggaran' });
  }
}

// PUT /api/violations/types/:id -> edit nama/keterangan jenis pelanggaran (admin)
async function updateViolationType(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existing = await prisma.violationType.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Jenis pelanggaran tidak ditemukan' });
    }
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: 'Nama jenis pelanggaran tidak boleh kosong' });
    }

    const type = await prisma.violationType.update({
      where: { id: Number(id) },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
      },
    });

    res.json({ message: 'Jenis pelanggaran berhasil diperbarui', type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui jenis pelanggaran' });
  }
}

// DELETE /api/violations/types/:id -> hapus jenis pelanggaran (admin)
// Catatan: ikut menghapus semua riwayat checklist pelanggaran siswa untuk jenis ini (cascade).
async function deleteViolationType(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.violationType.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Jenis pelanggaran tidak ditemukan' });
    }
    await prisma.violationType.delete({ where: { id: Number(id) } });
    res.json({ message: 'Jenis pelanggaran berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus jenis pelanggaran' });
  }
}

// ===== CHECKLIST PELANGGARAN PER SISWA PER KELAS PER TANGGAL =====

// GET /api/violations?courseId=X&date=YYYY-MM-DD -> daftar siswa 1 kelas + jenis pelanggaran apa saja
// yang sudah dicentang untuk tiap siswa pada tanggal itu (untuk tabel checklist)
async function getChecklist(req, res) {
  try {
    const { courseId, date } = req.query;

    if (!courseId) {
      return res.status(400).json({ message: 'Pilih kelas terlebih dahulu' });
    }

    const targetDate = normalizeDate(date);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        enrollments: { some: { courseId: Number(courseId) } },
      },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        enrollments: { include: { course: { select: { id: true, name: true } } } },
        violations: {
          where: {
            courseId: Number(courseId),
            date: { gte: startOfDay, lte: endOfDay },
          },
          select: { violationTypeId: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    const result = students.map((s) => ({
      studentId: s.id,
      name: s.user.name,
      avatarUrl: s.user.avatarUrl,
      class: s.enrollments.find((e) => e.course.id === Number(courseId))?.course.name || 'Belum ada kelas',
      checkedTypeIds: s.violations.map((v) => v.violationTypeId),
    }));

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil checklist pelanggaran' });
  }
}

// POST /api/violations/toggle -> centang/hapus centang 1 jenis pelanggaran untuk 1 siswa pada 1 tanggal
// body: { studentId, courseId, violationTypeId, date, notes }
// Kalau belum ada record -> dibuat (centang). Kalau sudah ada -> dihapus (hapus centang).
async function toggleViolation(req, res) {
  try {
    const { studentId, courseId, violationTypeId, date, notes } = req.body;

    if (!studentId || !courseId || !violationTypeId) {
      return res.status(400).json({ message: 'studentId, courseId, dan violationTypeId wajib diisi' });
    }

    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      include: { enrollments: true },
    });
    if (!student) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }
    const isEnrolled = student.enrollments.some((e) => e.courseId === Number(courseId));
    if (!isEnrolled) {
      return res.status(400).json({ message: 'Siswa ini tidak terdaftar di kelas tersebut' });
    }

    const targetDate = normalizeDate(date);

    const existing = await prisma.violation.findFirst({
      where: {
        studentId: Number(studentId),
        courseId: Number(courseId),
        violationTypeId: Number(violationTypeId),
        date: targetDate,
      },
    });

    if (existing) {
      await prisma.violation.delete({ where: { id: existing.id } });
      return res.json({ message: 'Centang pelanggaran dibatalkan', checked: false });
    }

    const violation = await prisma.violation.create({
      data: {
        studentId: Number(studentId),
        courseId: Number(courseId),
        violationTypeId: Number(violationTypeId),
        date: targetDate,
        notes: notes?.trim() || null,
      },
    });

    res.status(201).json({ message: 'Pelanggaran dicatat', checked: true, violation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menyimpan pelanggaran' });
  }
}

module.exports = {
  getViolationTypes,
  createViolationType,
  updateViolationType,
  deleteViolationType,
  getChecklist,
  toggleViolation,
};
