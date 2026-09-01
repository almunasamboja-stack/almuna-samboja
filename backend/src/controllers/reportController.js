// Controller rekap per kelas (nilai & kehadiran) - khusus admin
const prisma = require('../lib/prisma');

// GET /api/reports/class-recap?courseId=X -> rekap kehadiran & nilai per siswa
// Jika courseId tidak diberikan, rekap seluruh siswa yang disetujui (semua kelas).
// Kalau courseId diisi, ikut disertakan status pembayaran SPP bulan berjalan + nominal SPP kelas itu.
async function getClassRecap(req, res) {
  try {
    const { courseId } = req.query;

    const students = await prisma.student.findMany({
      where: {
        status: 'APPROVED',
        ...(courseId ? { enrollments: { some: { courseId: Number(courseId) } } } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
        enrollments: { include: { course: { select: { id: true, name: true, category: true } } } },
        attendances: { select: { status: true } },
        grades: { select: { type: true, score: true } },
      },
      orderBy: { id: 'asc' },
    });

    // Kalau lagi lihat 1 kelas spesifik, cek juga siapa saja yang sudah bayar SPP bulan ini
    let paidStudentIds = new Set();
    let courseFee = null;
    const now = new Date();
    const periodMonth = now.getMonth() + 1;
    const periodYear = now.getFullYear();

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

module.exports = { getClassRecap };
