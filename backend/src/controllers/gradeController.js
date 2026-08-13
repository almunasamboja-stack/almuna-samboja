// Controller nilai siswa
const prisma = require('../lib/prisma');

// GET /api/grades/student/:studentId -> nilai harian & bulanan
async function getStudentGrades(req, res) {
  try {
    const { studentId } = req.params;

    const daily = await prisma.grade.findMany({
      where: { studentId: Number(studentId), type: 'DAILY' },
      orderBy: { date: 'desc' },
      take: 20,
    });

    const monthly = await prisma.grade.findMany({
      where: { studentId: Number(studentId), type: 'MONTHLY' },
      orderBy: { date: 'asc' },
    });

    res.json({ daily, monthly });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data nilai' });
  }
}

// GET /api/grades/class-today?courseId=X -> daftar siswa 1 kelas + nilai harian yang sudah
// diinput hari ini (untuk halaman "Nilai Harian" guru/admin). courseId opsional.
async function getClassDailyGrades(req, res) {
  try {
    const { courseId } = req.query;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        ...(courseId ? { courseId: Number(courseId) } : {}),
      },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        course: { select: { name: true } },
        grades: {
          where: { type: 'DAILY', date: { gte: startOfDay, lte: endOfDay } },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    const result = students.map((s) => ({
      studentId: s.id,
      name: s.user.name,
      avatarUrl: s.user.avatarUrl,
      class: s.course?.name || 'Belum ada kelas',
      todayGrades: s.grades.map((g) => ({ id: g.id, subject: g.subject, score: g.score })),
    }));

    res.json({ students: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data nilai harian' });
  }
}

// POST /api/grades -> tambah nilai (guru/admin)
// body: { studentId, subject, type: 'DAILY'|'MONTHLY', score, date }
async function addGrade(req, res) {
  try {
    const { studentId, subject, type, score, date } = req.body;

    if (!studentId || !subject || !type || score === undefined) {
      return res.status(400).json({ message: 'Data nilai tidak lengkap' });
    }
    if (Number(score) < 0 || Number(score) > 100) {
      return res.status(400).json({ message: 'Nilai harus di antara 0 - 100' });
    }

    const grade = await prisma.grade.create({
      data: {
        studentId: Number(studentId),
        subject,
        type,
        score: Number(score),
        date: date ? new Date(date) : new Date(),
      },
    });

    res.status(201).json({ message: 'Nilai berhasil ditambahkan', grade });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menambahkan nilai' });
  }
}

// PUT /api/grades/:id -> edit nilai (guru/admin)
// body: { subject, score }
async function updateGrade(req, res) {
  try {
    const { id } = req.params;
    const { subject, score } = req.body;

    const existing = await prisma.grade.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Data nilai tidak ditemukan' });
    }
    if (score !== undefined && (Number(score) < 0 || Number(score) > 100)) {
      return res.status(400).json({ message: 'Nilai harus di antara 0 - 100' });
    }

    const grade = await prisma.grade.update({
      where: { id: Number(id) },
      data: {
        subject: subject ?? existing.subject,
        score: score !== undefined ? Number(score) : existing.score,
      },
    });

    res.json({ message: 'Nilai berhasil diperbarui', grade });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui nilai' });
  }
}

// DELETE /api/grades/:id -> hapus nilai (guru/admin)
async function deleteGrade(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.grade.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Data nilai tidak ditemukan' });
    }

    await prisma.grade.delete({ where: { id: Number(id) } });
    res.json({ message: 'Nilai berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus nilai' });
  }
}

module.exports = { getStudentGrades, getClassDailyGrades, addGrade, updateGrade, deleteGrade };
