// Controller data terpadu per siswa (khusus admin): lihat, edit, hapus semua catatan yang terkait 1 siswa -
// nilai harian/bulanan, nilai ujian/tugas, absensi, pelanggaran, pembayaran, dan penilaian bulanan.
const prisma = require('../lib/prisma');

// ---------- helper validasi ----------
function toNumberOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
}
function inRange(n, min, max) {
  return typeof n === 'number' && !Number.isNaN(n) && n >= min && n <= max;
}
function toDate(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Tiap jenis data: nama model Prisma + fungsi yang memvalidasi body & menghasilkan { data } atau { error }.
// Hanya field yang tercantum di sini yang boleh diubah lewat halaman ini.
const TYPES = {
  grades: {
    model: 'grade',
    build(b) {
      const data = {};
      if (b.subject !== undefined) {
        if (!String(b.subject).trim()) return { error: 'Mata pelajaran wajib diisi' };
        data.subject = String(b.subject).trim();
      }
      if (b.type !== undefined) {
        if (!['DAILY', 'MONTHLY'].includes(b.type)) return { error: 'Jenis nilai harus DAILY atau MONTHLY' };
        data.type = b.type;
      }
      if (b.score !== undefined) {
        const n = toNumberOrNull(b.score);
        if (!inRange(n, 0, 100)) return { error: 'Nilai harus di antara 0 - 100' };
        data.score = n;
      }
      if (b.notes !== undefined) data.notes = b.notes ? String(b.notes) : null;
      if (b.date !== undefined) {
        const d = toDate(b.date);
        if (!d) return { error: 'Tanggal tidak valid' };
        data.date = d;
      }
      return { data };
    },
  },
  attendances: {
    model: 'attendance',
    build(b) {
      const data = {};
      if (b.status !== undefined) {
        if (!['PRESENT', 'SICK', 'IZIN', 'ALPHA'].includes(b.status)) return { error: 'Status absensi tidak valid' };
        data.status = b.status;
      }
      if (b.date !== undefined) {
        const d = toDate(b.date);
        if (!d) return { error: 'Tanggal tidak valid' };
        data.date = d;
      }
      return { data };
    },
  },
  violations: {
    model: 'violation',
    build(b) {
      const data = {};
      if (b.violationTypeId !== undefined) {
        const n = toNumberOrNull(b.violationTypeId);
        if (!n) return { error: 'Jenis pelanggaran wajib dipilih' };
        data.violationTypeId = n;
      }
      if (b.notes !== undefined) data.notes = b.notes ? String(b.notes) : null;
      if (b.date !== undefined) {
        const d = toDate(b.date);
        if (!d) return { error: 'Tanggal tidak valid' };
        data.date = d;
      }
      return { data };
    },
  },
  payments: {
    model: 'payment',
    build(b) {
      const data = {};
      if (b.amount !== undefined) {
        const n = toNumberOrNull(b.amount);
        if (!inRange(n, 1, Number.MAX_SAFE_INTEGER)) return { error: 'Jumlah pembayaran harus lebih dari 0' };
        data.amount = n;
      }
      if (b.periodMonth !== undefined) {
        const n = toNumberOrNull(b.periodMonth);
        if (!inRange(n, 1, 12)) return { error: 'Bulan SPP harus 1 - 12' };
        data.periodMonth = n;
      }
      if (b.periodYear !== undefined) {
        const n = toNumberOrNull(b.periodYear);
        if (!inRange(n, 2000, 2100)) return { error: 'Tahun SPP tidak valid' };
        data.periodYear = n;
      }
      if (b.paymentDate !== undefined) {
        const d = toDate(b.paymentDate);
        if (!d) return { error: 'Tanggal bayar tidak valid' };
        data.paymentDate = d;
      }
      if (b.method !== undefined) {
        if (!['CASH', 'TRANSFER'].includes(b.method)) return { error: 'Metode harus CASH atau TRANSFER' };
        data.method = b.method;
      }
      if (b.notes !== undefined) data.notes = b.notes ? String(b.notes) : null;
      return { data };
    },
  },
  assessments: {
    model: 'assessment',
    build(b) {
      const data = {};
      for (const key of ['speaking', 'listening', 'vocabulary', 'reading', 'grammar']) {
        if (b[key] !== undefined) {
          const n = toNumberOrNull(b[key]);
          if (n !== null && !inRange(n, 0, 100)) return { error: `Nilai ${key} harus di antara 0 - 100` };
          data[key] = n;
        }
      }
      if (b.notes !== undefined) data.notes = b.notes ? String(b.notes) : null;
      return { data };
    },
  },
  'exam-attempts': {
    model: 'examAttempt',
    build(b) {
      const data = {};
      if (b.score !== undefined) {
        const n = toNumberOrNull(b.score);
        if (!inRange(n, 0, 100)) return { error: 'Nilai harus di antara 0 - 100' };
        data.score = n;
      }
      if (b.correctCount !== undefined) {
        const n = toNumberOrNull(b.correctCount);
        if (!inRange(n, 0, Number.MAX_SAFE_INTEGER)) return { error: 'Jumlah benar tidak valid' };
        data.correctCount = n;
      }
      if (b.totalQuestions !== undefined) {
        const n = toNumberOrNull(b.totalQuestions);
        if (!inRange(n, 1, Number.MAX_SAFE_INTEGER)) return { error: 'Total soal tidak valid' };
        data.totalQuestions = n;
      }
      if (b.submittedAt !== undefined) {
        const d = toDate(b.submittedAt);
        if (!d) return { error: 'Tanggal tidak valid' };
        data.submittedAt = d;
      }
      return { data };
    },
  },
};

// GET /api/student-data/:studentId -> semua catatan yang terkait 1 siswa
async function getStudentData(req, res) {
  try {
    const studentId = Number(req.params.studentId);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true, email: true } },
        enrollments: { include: { course: { select: { id: true, name: true } } } },
      },
    });
    if (!student) return res.status(404).json({ message: 'Siswa tidak ditemukan' });

    const [grades, examAttempts, attendances, violations, payments, assessments, violationTypes] = await Promise.all([
      prisma.grade.findMany({ where: { studentId }, orderBy: { date: 'desc' } }),
      prisma.examAttempt.findMany({
        where: { studentId },
        include: { exam: { select: { title: true, course: { select: { name: true } } } } },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.attendance.findMany({
        where: { studentId },
        include: { course: { select: { name: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.violation.findMany({
        where: { studentId },
        include: { violationType: { select: { id: true, name: true } }, course: { select: { name: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.payment.findMany({
        where: { studentId },
        include: { course: { select: { name: true } } },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.assessment.findMany({
        where: { studentId },
        include: { course: { select: { name: true } } },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      }),
      prisma.violationType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ]);

    // Ujian/tugas yang tenggatnya SUDAH LEWAT dan tidak dikerjakan siswa ini -> dihitung nilai 0.
    // Berlaku untuk ujian yang dipublikasikan di kelas yang diikuti siswa (atau ujian tanpa kelas),
    // dan kalau ujian dikirim ke siswa tertentu, hanya jika siswa ini termasuk yang ditunjuk.
    const enrolledCourseIds = student.enrollments.map((e) => e.course.id);
    const expiredExams = await prisma.exam.findMany({
      where: {
        isPublished: true,
        deadline: { lt: new Date() },
        AND: [
          { OR: [{ courseId: null }, { courseId: { in: enrolledCourseIds } }] },
          { OR: [{ assignToAll: true }, { assignments: { some: { studentId } } }] },
        ],
      },
      include: {
        course: { select: { name: true } },
        attempts: { where: { studentId }, select: { id: true } },
      },
      orderBy: { deadline: 'desc' },
    });
    const missedExams = expiredExams
      .filter((e) => e.attempts.length === 0)
      .map((e) => ({
        examId: e.id,
        title: e.title,
        courseName: e.course?.name || 'Semua Kelas',
        deadline: e.deadline,
      }));

    res.json({
      student: {
        id: student.id,
        name: student.user.name,
        email: student.user.email,
        courses: student.enrollments.map((e) => e.course.name),
      },
      grades,
      examAttempts,
      missedExams,
      attendances,
      violations,
      payments,
      assessments,
      violationTypes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data siswa' });
  }
}

// PUT /api/student-data/:type/:id -> edit 1 catatan (hanya field yang diizinkan per jenis)
async function updateRecord(req, res) {
  try {
    const { type, id } = req.params;
    const config = TYPES[type];
    if (!config) return res.status(400).json({ message: 'Jenis data tidak dikenal' });

    const existing = await prisma[config.model].findUnique({ where: { id: Number(id) } });
    if (!existing) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const { data, error } = config.build(req.body);
    if (error) return res.status(400).json({ message: error });

    const record = await prisma[config.model].update({ where: { id: Number(id) }, data });
    res.json({ message: 'Data berhasil diperbarui', record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui data' });
  }
}

// DELETE /api/student-data/:type/:id -> hapus 1 catatan
async function deleteRecord(req, res) {
  try {
    const { type, id } = req.params;
    const config = TYPES[type];
    if (!config) return res.status(400).json({ message: 'Jenis data tidak dikenal' });

    const existing = await prisma[config.model].findUnique({ where: { id: Number(id) } });
    if (!existing) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await prisma[config.model].delete({ where: { id: Number(id) } });
    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus data' });
  }
}

module.exports = { getStudentData, updateRecord, deleteRecord };
