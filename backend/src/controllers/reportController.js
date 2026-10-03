// Controller rekap per kelas (nilai & kehadiran) - khusus admin
const prisma = require('../lib/prisma');

// GET /api/reports/class-recap?courseId=X&month=M&year=Y -> rekap kehadiran & nilai per siswa
// Jika courseId tidak diberikan, rekap seluruh siswa yang disetujui (semua kelas).
// Kalau courseId diisi, ikut disertakan status pembayaran SPP bulan yang dipilih + nominal SPP kelas itu.
// Jika month & year diberikan, rekap absensi/nilai hanya dihitung dari data bulan tersebut.
async function getClassRecap(req, res) {
  try {
    const { courseId, month, year } = req.query;

    let dateFilter;
    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      dateFilter = { gte: start, lt: end };
    }

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        ...(courseId ? { enrollments: { some: { courseId: Number(courseId) } } } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        enrollments: { include: { course: { select: { id: true, name: true, category: true } } } },
        attendances: {
          select: { status: true, date: true },
          // Kalau lagi lihat 1 kelas spesifik, hitung absensi HANYA untuk kelas itu -
          // supaya siswa yang ikut >1 kelas tidak tercampur rekapnya.
          where: {
            ...(dateFilter ? { date: dateFilter } : {}),
            ...(courseId ? { courseId: Number(courseId) } : {}),
          },
        },
        grades: { select: { type: true, score: true, date: true }, where: dateFilter ? { date: dateFilter } : undefined },
        // Nilai ujian online siswa ini, dipakai untuk kolom "Rata Nilai Ujian".
        // Kalau lagi lihat 1 kelas spesifik, hanya hitung ujian dari kelas itu (sama seperti absensi).
        examAttempts: {
          select: { score: true },
          where: {
            ...(dateFilter ? { submittedAt: dateFilter } : {}),
            ...(courseId ? { exam: { courseId: Number(courseId) } } : {}),
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Kalau lagi lihat 1 kelas spesifik, cek juga siapa saja yang sudah bayar SPP untuk bulan yang dipilih
    // (default: bulan berjalan, kalau month/year tidak diisi)
    let paidStudentIds = new Set();
    let courseFee = null;
    const now = new Date();
    const periodMonth = month ? Number(month) : now.getMonth() + 1;
    const periodYear = year ? Number(year) : now.getFullYear();

    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: Number(courseId) } });
      courseFee = course?.fee ?? null;

      const payments = await prisma.payment.findMany({
        where: {
          courseId: Number(courseId),
          periodMonth,
          periodYear,
          studentId: { in: students.map((s) => s.id) },
        },
        select: { studentId: true },
      });
      paidStudentIds = new Set(payments.map((p) => p.studentId));
    }

    const recap = students.map((s) => {
      const present = s.attendances.filter((a) => a.status === 'PRESENT').length;
      const sick = s.attendances.filter((a) => a.status === 'SICK').length;
      const izin = s.attendances.filter((a) => a.status === 'IZIN').length;
      const alpha = s.attendances.filter((a) => a.status === 'ALPHA').length;
      const totalAttendance = s.attendances.length;
      const attendancePercentage = totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0;

      const dailyGrades = s.grades.filter((g) => g.type === 'DAILY');
      const monthlyGrades = s.grades.filter((g) => g.type === 'MONTHLY');
      const dailyAverage =
        dailyGrades.length > 0
          ? Math.round((dailyGrades.reduce((sum, g) => sum + g.score, 0) / dailyGrades.length) * 10) / 10
          : null;
      const monthlyAverage =
        monthlyGrades.length > 0
          ? Math.round((monthlyGrades.reduce((sum, g) => sum + g.score, 0) / monthlyGrades.length) * 10) / 10
          : null;

      const examAverage =
        s.examAttempts.length > 0
          ? Math.round((s.examAttempts.reduce((sum, a) => sum + a.score, 0) / s.examAttempts.length) * 10) / 10
          : null;

      return {
        studentId: s.id,
        name: s.user.name,
        email: s.user.email,
        courseIds: s.enrollments.map((e) => e.course.id),
        className: s.enrollments.length > 0 ? s.enrollments.map((e) => e.course.name).join(', ') : 'Belum ada kelas',
        category: s.enrollments[0]?.course.category || '-',
        present,
        sick,
        izin,
        alpha,
        totalAttendance,
        attendancePercentage,
        dailyAverage,
        monthlyAverage,
        examAverage,
        ...(courseId
          ? {
              paymentStatus: paidStudentIds.has(s.id) ? 'PAID' : 'UNPAID',
              paymentPeriodMonth: periodMonth,
              paymentPeriodYear: periodYear,
            }
          : {}),
      };
    });

    let courseInfo = null;
    if (courseId) {
      courseInfo = await prisma.course.findUnique({ where: { id: Number(courseId) } });
    }

    res.json({ course: courseInfo, courseFee, students: recap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil rekap kelas' });
  }
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// GET /api/reports/student-letters?courseId=X&month=M&year=Y
// -> data untuk surat laporan formal per siswa dalam 1 kelas: nama lengkap, kelas, absensi,
// rata-rata nilai ujian, pelanggaran, dan catatan guru (dari laporan Assessment bulan terkait).
// Kalau month & year diisi, semua rekap (absensi/nilai ujian/pelanggaran) hanya dihitung dari bulan itu;
// kalau tidak, rekap dihitung dari seluruh data siswa di kelas tersebut.
async function getStudentLetterReport(req, res) {
  try {
    const { courseId, month, year } = req.query;

    if (!courseId) {
      return res.status(400).json({ message: 'Kelas wajib dipilih' });
    }

    let dateFilter;
    let period = null;
    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      dateFilter = { gte: start, lt: end };
      period = { month: m, year: y, label: `${MONTH_NAMES_ID[m - 1]} ${y}` };
    }

    const course = await prisma.course.findUnique({ where: { id: Number(courseId) } });
    if (!course) {
      return res.status(404).json({ message: 'Kelas tidak ditemukan' });
    }

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        enrollments: { some: { courseId: Number(courseId) } },
      },
      include: {
        user: { select: { name: true } },
        attendances: {
          select: { status: true },
          where: { courseId: Number(courseId), ...(dateFilter ? { date: dateFilter } : {}) },
        },
        examAttempts: {
          select: { score: true },
          where: { exam: { courseId: Number(courseId) }, ...(dateFilter ? { submittedAt: dateFilter } : {}) },
        },
        violations: {
          select: { date: true, notes: true, violationType: { select: { name: true } } },
          where: { courseId: Number(courseId), ...(dateFilter ? { date: dateFilter } : {}) },
          orderBy: { date: 'desc' },
        },
        assessments: {
          where: {
            courseId: Number(courseId),
            ...(period ? { periodMonth: period.month, periodYear: period.year } : {}),
          },
          select: { notes: true, periodMonth: true, periodYear: true },
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    const letters = students.map((s) => {
      const present = s.attendances.filter((a) => a.status === 'PRESENT').length;
      const sick = s.attendances.filter((a) => a.status === 'SICK').length;
      const izin = s.attendances.filter((a) => a.status === 'IZIN').length;
      const alpha = s.attendances.filter((a) => a.status === 'ALPHA').length;
      const total = s.attendances.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      const examAverage =
        s.examAttempts.length > 0
          ? Math.round((s.examAttempts.reduce((sum, a) => sum + a.score, 0) / s.examAttempts.length) * 10) / 10
          : null;

      return {
        studentId: s.id,
        name: s.user.name,
        className: course.name,
        attendance: { present, sick, izin, alpha, total, percentage },
        examAverage,
        violations: s.violations.map((v) => ({
          date: v.date,
          typeName: v.violationType.name,
          notes: v.notes,
        })),
        teacherNote: s.assessments[0]?.notes || null,
      };
    });

    res.json({ course: { id: course.id, name: course.name }, period, letters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data surat laporan siswa' });
  }
}

module.exports = { getClassRecap, getStudentLetterReport };
